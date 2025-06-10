import asyncio
import json
import os
from typing import Dict, Any, List
import websockets
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from deepgram import DeepgramClient, PrerecordedOptions, LiveTranscriptionEvents, LiveOptions, ClientOptionsFromEnv
from dotenv import load_dotenv
import google.generativeai as genai
import ssl
import certifi
import queue
import threading

# Enhanced SSL certificate setup for macOS
def setup_ssl():
    """Setup SSL certificates for macOS"""
    cert_file = certifi.where()
    os.environ['SSL_CERT_FILE'] = cert_file
    os.environ['REQUESTS_CA_BUNDLE'] = cert_file
    os.environ['CURL_CA_BUNDLE'] = cert_file
    
    # Create SSL context for better compatibility
    ssl_context = ssl.create_default_context(cafile=cert_file)
    return ssl_context

# Call SSL setup
setup_ssl()

# Load environment variables
load_dotenv()

# Create FastAPI app
app = FastAPI(title="AI Note Taker API", description="Real-time transcription with AI-powered summaries")

# Add CORS middleware - Updated to include port 3001
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure Gemini AI
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel('gemini-1.5-flash')

# Pydantic models for API requests
class SummaryRequest(BaseModel):
    text: str
    summary_type: str = "meeting"  # meeting, action_items, key_points

class TranscriptionManager:
    """
    This class handles real-time transcription using Deepgram SDK v3.2.7.
    It's like a bridge between your microphone and Deepgram's AI.
    """
    
    def __init__(self):
        self.api_key = os.getenv("DEEPGRAM_API_KEY")
        if not self.api_key:
            raise ValueError("DEEPGRAM_API_KEY not found in environment variables")
        
        # Use DeepgramClient for SDK v3 with SSL configuration
        self.deepgram = DeepgramClient(self.api_key)
        self.connection = None
        self.websocket = None
        self.full_transcript = ""  # Store complete transcript
        self.is_connected = False
        self.message_queue = queue.Queue()  # Queue for messages from callbacks
        self.loop = None  # Store the event loop
    
    async def start_transcription(self, websocket: WebSocket):
        """Start real-time transcription with enhanced Deepgram features
        
        Supported features in this SDK version:
        ✅ Diarization (Speaker identification)
        ✅ Punctuation (Auto punctuation and capitalization)  
        ✅ Smart Format (Enhanced number, date, currency formatting)
        ❌ Redaction (Not available in this SDK version)
        ❌ Paragraphs (Not available in this SDK version)
        """
        try:
            self.websocket = websocket
            self.loop = asyncio.get_event_loop()  # Store the current event loop
            
            # 🚀 ENHANCED DEEPGRAM OPTIONS - Using supported features only
            options = LiveOptions(
                # Core model configuration
                model="nova-2",
                language="en-US",
                
                # 🎤 DIARIZATION - Speaker identification 
                # This will tell us when different speakers are talking
                diarize=True,
                
                # ✏️ PUNCTUATION - Add punctuation and capitalization
                # Makes text properly formatted with periods, commas, etc.
                punctuate=True,
                
                # 🤖 SMART FORMAT - Enhanced formatting
                # Formats dates, times, numbers, currencies properly
                # Example: "twenty five dollars" → "$25"
                smart_format=True,
                
                # Additional quality improvements
                interim_results=True,      # Show partial results as user speaks
                utterance_end_ms=1000,     # End utterance after 1 second silence
                vad_events=True,           # Voice activity detection
                profanity_filter=False,    # Keep original speech
            )
            
            # Create live transcription connection
            self.connection = self.deepgram.listen.live.v("1")
            
            # Set up event handlers
            self.connection.on(LiveTranscriptionEvents.Open, self.on_open)
            self.connection.on(LiveTranscriptionEvents.Transcript, self.on_message)
            self.connection.on(LiveTranscriptionEvents.Error, self.on_error)
            self.connection.on(LiveTranscriptionEvents.Close, self.on_close)
            
            # FIXED: Don't await the start method - it returns a boolean, not a coroutine
            result = self.connection.start(options)
            
            if result:
                self.is_connected = True
                return True
            else:
                raise Exception("Failed to start Deepgram connection")
            
        except Exception as e:
            print(f"Error starting transcription: {e}")
            await websocket.send_text(json.dumps({
                "type": "error",
                "message": f"Failed to start transcription: {str(e)}"
            }))
            return False
    
    def on_open(self, *args, **kwargs):
        """Called when Deepgram connection opens"""
        print("Deepgram connection opened")
        self.is_connected = True
        self.queue_message({
            "type": "connection_opened",
            "message": "Connected to Deepgram"
        })
    
    def on_message(self, *args, **kwargs):
        """Handle enhanced transcription results from Deepgram"""
        try:
            result = kwargs.get('result')
            if result and hasattr(result, 'channel'):
                alternatives = result.channel.alternatives
                if alternatives and len(alternatives) > 0:
                    transcript_data = alternatives[0]
                    sentence = transcript_data.transcript
                    
                    if len(sentence.strip()) > 0:
                        is_final = result.is_final
                        
                        # Extract enhanced features
                        words = getattr(transcript_data, 'words', [])
                        
                        # Speaker information (if diarization is enabled)
                        speaker_info = None
                        if words and len(words) > 0:
                            # Check if speaker information is available
                            first_word = words[0]
                            if hasattr(first_word, 'speaker'):
                                speaker_info = first_word.speaker
                        
                        # Add to full transcript if final
                        if is_final:
                            if speaker_info is not None:
                                self.full_transcript += f"\n[Speaker {speaker_info}]: {sentence}"
                            else:
                                self.full_transcript += " " + sentence
                        
                        # Enhanced message with all features
                        message = {
                            "type": "transcription",
                            "text": sentence,
                            "is_final": is_final,
                            "full_transcript": self.full_transcript.strip(),
                            # NEW: Enhanced features
                            "speaker": speaker_info,
                            "has_diarization": speaker_info is not None,
                            "word_count": len(words),
                            "features_used": {
                                "diarization": True,
                                "redaction": False,      # Not supported in this SDK version
                                "paragraphs": False,     # Not supported in this SDK version
                                "punctuation": True,
                                "smart_format": True
                            }
                        }
                        
                        self.queue_message(message)
                        
        except Exception as e:
            print(f"Error processing transcription: {e}")
    
    def on_error(self, error, **kwargs):
        """Handle Deepgram errors"""
        print(f"Deepgram error: {error}")
        self.queue_message({
            "type": "error",
            "message": str(error)
        })
    
    def on_close(self, *args, **kwargs):
        """Handle connection close"""
        print("Deepgram connection closed")
        self.is_connected = False
        self.queue_message({
            "type": "connection_closed",
            "message": "Disconnected from Deepgram"
        })
    
    def queue_message(self, message: Dict[str, Any]):
        """Queue a message to be sent to the WebSocket"""
        try:
            self.message_queue.put_nowait(message)
        except Exception as e:
            print(f"Error queuing message: {e}")
    
    async def process_messages(self):
        """Process queued messages and send them to WebSocket"""
        while self.is_connected:
            try:
                if not self.message_queue.empty():
                    message = self.message_queue.get_nowait()
                    if self.websocket:
                        await self.websocket.send_text(json.dumps(message))
                await asyncio.sleep(0.01)  # Small delay to prevent busy waiting
            except queue.Empty:
                await asyncio.sleep(0.01)
            except Exception as e:
                print(f"Error processing message: {e}")
                await asyncio.sleep(0.1)
    
    def send_audio(self, audio_data: bytes):
        """Send audio data to Deepgram"""
        if self.connection and self.is_connected:
            try:
                self.connection.send(audio_data)
            except Exception as e:
                print(f"Error sending audio data: {e}")
    
    def close(self):
        """Clean up connections"""
        self.is_connected = False
        if self.connection:
            try:
                # FIXED: Better error handling for connection cleanup
                if hasattr(self.connection, 'finish'):
                    self.connection.finish()
                elif hasattr(self.connection, 'close'):
                    self.connection.close()
            except Exception as e:
                print(f"Error closing connection: {e}")
                pass

class AIProcessor:
    """
    This class handles AI processing using Google's Gemini.
    It takes transcribed text and creates summaries, action items, etc.
    """
    
    @staticmethod
    async def generate_summary(text: str, summary_type: str = "meeting") -> Dict[str, Any]:
        """Generate AI summary using Gemini"""
        if not GEMINI_API_KEY:
            return {"error": "Gemini API key not configured"}
        
        try:
            # Different prompts for different summary types
            prompts = {
                "meeting": """
                Analyze this meeting transcript and provide:
                1. A brief summary (2-3 sentences)
                2. Key discussion points (bullet points)
                3. Action items with responsible parties if mentioned
                4. Important decisions made
                5. Next steps
                
                Transcript: {text}
                
                Format your response as JSON with keys: summary, key_points, action_items, decisions, next_steps
                """,
                
                "action_items": """
                Extract all action items and tasks from this transcript.
                For each action item, identify:
                - The task description
                - Who is responsible (if mentioned)
                - Any deadlines or timeframes mentioned
                
                Transcript: {text}
                
                Format as JSON with key 'action_items' containing an array of objects with task, responsible_party, deadline
                """,
                
                "key_points": """
                Extract the most important points and insights from this transcript.
                Focus on:
                - Main topics discussed
                - Important information shared
                - Key insights or conclusions
                
                Transcript: {text}
                
                Format as JSON with key 'key_points' containing an array of important points
                """,
                
                # 🆕 NEW: Speaker Analysis for diarization
                "speaker_analysis": """
                Analyze this transcript that includes speaker identification (e.g., [Speaker 0], [Speaker 1]).
                Provide a detailed analysis for each speaker:
                
                For each speaker, identify:
                - Main points they made
                - Questions they asked
                - Action items they committed to
                - Their role/contribution to the conversation
                - Key insights or decisions they provided
                
                Transcript: {text}
                
                Format as JSON with keys: 
                - speaker_summary: array of objects with speaker_id, main_points, action_items, role_in_conversation
                - overall_summary: brief overview of the multi-speaker conversation
                - speaker_interactions: how speakers built on each other's ideas
                """
            }
            
            prompt = prompts.get(summary_type, prompts["meeting"]).format(text=text)
            
            response = model.generate_content(prompt)
            
            # Try to parse as JSON, fallback to plain text
            try:
                # Clean the response text to extract JSON
                response_text = response.text.strip()
                if response_text.startswith('```json'):
                    response_text = response_text[7:-3]
                elif response_text.startswith('```'):
                    response_text = response_text[3:-3]
                
                result = json.loads(response_text)
                return result
            except json.JSONDecodeError:
                return {
                    "summary": response.text,
                    "type": summary_type,
                    "raw_response": response.text
                }
                
        except Exception as e:
            print(f"Error generating summary: {e}")
            return {"error": f"Failed to generate summary: {str(e)}"}

# WebSocket endpoint for real-time transcription
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time communication"""
    await websocket.accept()
    
    transcription_manager = None
    message_task = None
    
    try:
        transcription_manager = TranscriptionManager()
        success = await transcription_manager.start_transcription(websocket)
        
        if not success:
            await websocket.send_text(json.dumps({
                "type": "error",
                "message": "Failed to connect to Deepgram"
            }))
            return
        
        # Send success message
        await websocket.send_text(json.dumps({
            "type": "ready",
            "message": "Ready to receive audio"
        }))
        
        # Start message processing task
        message_task = asyncio.create_task(transcription_manager.process_messages())
        
        while True:
            try:
                data = await websocket.receive_bytes()
                transcription_manager.send_audio(data)
            except WebSocketDisconnect:
                print("Client disconnected")
                break
            except Exception as e:
                print(f"Error receiving audio data: {e}")
                break
            
    except WebSocketDisconnect:
        print("Client disconnected during setup")
    except Exception as e:
        print(f"WebSocket error: {e}")
        try:
            await websocket.send_text(json.dumps({
                "type": "error",
                "message": f"WebSocket error: {str(e)}"
            }))
        except:
            pass
    finally:
        if transcription_manager:
            transcription_manager.close()
        if message_task:
            message_task.cancel()

# REST API endpoints
@app.post("/api/summarize")
async def create_summary(request: SummaryRequest):
    """Generate AI summary of transcribed text"""
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    
    result = await AIProcessor.generate_summary(request.text, request.summary_type)
    return result

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "deepgram_configured": bool(os.getenv("DEEPGRAM_API_KEY")),
        "gemini_configured": bool(os.getenv("GEMINI_API_KEY"))
    }

@app.get("/")
async def root():
    """API information"""
    return {
        "name": "AI Note Taker API",
        "version": "1.0.0",
        "description": "Real-time transcription with AI-powered summaries",
        "endpoints": {
            "websocket": "/ws",
            "summarize": "/api/summarize",
            "health": "/api/health"
        }
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("BACKEND_PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port) 