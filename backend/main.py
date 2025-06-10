import asyncio
import json
import os
from typing import Dict, Any, List
import websockets
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from deepgram import DeepgramClient, DeepgramClientOptions, LiveTranscriptionEvents
from deepgram.clients.live.v1 import LiveOptions
from dotenv import load_dotenv
import google.generativeai as genai

# Load environment variables
load_dotenv()

# Create FastAPI app
app = FastAPI(title="AI Note Taker API", description="Real-time transcription with AI-powered summaries")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
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
    This class handles real-time transcription using Deepgram.
    It's like a bridge between your microphone and Deepgram's AI.
    """
    
    def __init__(self):
        self.api_key = os.getenv("DEEPGRAM_API_KEY")
        if not self.api_key:
            raise ValueError("DEEPGRAM_API_KEY not found in environment variables")
        
        self.deepgram = DeepgramClient(self.api_key)
        self.connection = None
        self.websocket = None
        self.full_transcript = ""  # Store complete transcript
    
    async def start_transcription(self, websocket: WebSocket):
        """Start real-time transcription with Deepgram"""
        try:
            self.websocket = websocket
            
            # Configure Deepgram options
            options = LiveOptions(
                model="nova-2",
                language="en-US",
                smart_format=True,
                interim_results=True,
                utterance_end_ms=1000,
                vad_events=True,
                punctuate=True,
                diarize=True,  # Speaker identification
            )
            
            # Create connection
            self.connection = self.deepgram.listen.websocket.v("1")
            
            # Set up event handlers
            self.connection.on(LiveTranscriptionEvents.Open, self.on_open)
            self.connection.on(LiveTranscriptionEvents.Transcript, self.on_message)
            self.connection.on(LiveTranscriptionEvents.Error, self.on_error)
            self.connection.on(LiveTranscriptionEvents.Close, self.on_close)
            
            # Start connection
            if not await self.connection.start(options):
                raise Exception("Failed to start Deepgram connection")
                
            return True
            
        except Exception as e:
            print(f"Error starting transcription: {e}")
            return False
    
    async def on_open(self, *args, **kwargs):
        """Called when Deepgram connection opens"""
        print("Deepgram connection opened")
        if self.websocket:
            await self.websocket.send_text(json.dumps({
                "type": "connection_opened",
                "message": "Connected to Deepgram"
            }))
    
    async def on_message(self, *args, **kwargs):
        """Handle transcription results from Deepgram"""
        try:
            result = kwargs.get('result')
            if result:
                sentence = result.channel.alternatives[0].transcript
                
                if len(sentence.strip()) > 0:
                    is_final = result.is_final
                    
                    # Add to full transcript if final
                    if is_final:
                        self.full_transcript += " " + sentence
                    
                    # Send to frontend
                    if self.websocket:
                        await self.websocket.send_text(json.dumps({
                            "type": "transcription",
                            "text": sentence,
                            "is_final": is_final,
                            "full_transcript": self.full_transcript.strip()
                        }))
                        
        except Exception as e:
            print(f"Error processing transcription: {e}")
    
    async def on_error(self, error, **kwargs):
        """Handle Deepgram errors"""
        print(f"Deepgram error: {error}")
        if self.websocket:
            await self.websocket.send_text(json.dumps({
                "type": "error",
                "message": str(error)
            }))
    
    async def on_close(self, *args, **kwargs):
        """Handle connection close"""
        print("Deepgram connection closed")
        if self.websocket:
            await self.websocket.send_text(json.dumps({
                "type": "connection_closed",
                "message": "Disconnected from Deepgram"
            }))
    
    async def send_audio(self, audio_data: bytes):
        """Send audio data to Deepgram"""
        if self.connection:
            self.connection.send(audio_data)
    
    async def close(self):
        """Clean up connections"""
        if self.connection:
            await self.connection.finish()

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
    
    transcription_manager = TranscriptionManager()
    
    try:
        success = await transcription_manager.start_transcription(websocket)
        
        if not success:
            await websocket.send_text(json.dumps({
                "type": "error",
                "message": "Failed to connect to Deepgram"
            }))
            return
        
        while True:
            data = await websocket.receive_bytes()
            await transcription_manager.send_audio(data)
            
    except WebSocketDisconnect:
        print("Client disconnected")
    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        await transcription_manager.close()

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