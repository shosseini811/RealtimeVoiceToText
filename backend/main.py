# 🐍 PYTHON BACKEND FOR AI NOTE TAKER
# This file creates a web server that handles real-time audio transcription and AI summaries

# 📦 IMPORTS - Bringing in code from other libraries
# These are like tools we need to build our application

# asyncio - helps handle multiple tasks at the same time (asynchronous programming)
import asyncio
# json - converts Python objects to/from JSON format for web communication
import json
# logging - provides professional logging capabilities instead of print statements
import logging
# os - lets us access environment variables and system settings
import os
# typing - helps with type hints to make code clearer and catch bugs
from typing import Dict, Any, List

# websockets - enables real-time communication between frontend and backend
import websockets
# FastAPI - modern web framework for building APIs quickly
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
# CORS middleware - allows our React frontend to communicate with this backend
from fastapi.middleware.cors import CORSMiddleware
# pydantic - validates data structures and converts them automatically
from pydantic import BaseModel

# Deepgram - AI service for speech-to-text transcription
from deepgram import DeepgramClient, PrerecordedOptions, LiveTranscriptionEvents, LiveOptions, ClientOptionsFromEnv
# dotenv - loads environment variables from .env file
from dotenv import load_dotenv
# Google Generative AI - Google's AI service for generating summaries
import google.generativeai as genai

# SSL and certificate handling - ensures secure connections
import ssl
import certifi
# Threading tools for handling multiple tasks
import queue
import threading

# 🔐 ENHANCED SSL CERTIFICATE SETUP FOR MACOS
# This function fixes common SSL certificate issues on Mac computers
def setup_ssl():
    """
    Setup SSL certificates for macOS
    
    SSL certificates are like digital ID cards that prove websites are legitimate.
    macOS sometimes has issues finding the right certificates, so we set them explicitly.
    """
    # certifi.where() returns the path to trusted certificate bundle
    cert_file = certifi.where()
    
    # Set environment variables so all our network requests use these certificates
    os.environ['SSL_CERT_FILE'] = cert_file        # For general SSL connections
    os.environ['REQUESTS_CA_BUNDLE'] = cert_file   # For requests library
    os.environ['CURL_CA_BUNDLE'] = cert_file       # For curl commands
    
    # Create SSL context for better compatibility
    # This is like setting up a secure communication channel
    ssl_context = ssl.create_default_context(cafile=cert_file)
    return ssl_context

# Call the SSL setup function immediately when the server starts
setup_ssl()

# 📝 CONFIGURE LOGGING SYSTEM
# Set up professional logging with proper formatting and levels
logging.basicConfig(
    level=logging.DEBUG,  # Set to DEBUG for more detailed logs, INFO for normal operation
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),  # Output to console
        # Uncomment below to also log to file:
        # logging.FileHandler('ai_note_taker.log')
    ]
)

# Create a logger specifically for our AI processing
logger = logging.getLogger('AINoteTaker')

# 🌍 LOAD ENVIRONMENT VARIABLES
# Environment variables store secret keys and configuration
# They're kept in a .env file that's not shared publicly
load_dotenv()

# 🚀 CREATE FASTAPI APPLICATION
# FastAPI is our web server framework - it handles HTTP requests and responses
app = FastAPI(
    title="AI Note Taker API",                    # Name shown in API documentation
    description="Real-time transcription with AI-powered summaries"  # Description for docs
)

# 🔗 ADD CORS MIDDLEWARE
# CORS (Cross-Origin Resource Sharing) allows our React frontend to talk to this backend
# Without this, browsers would block the connection for security reasons
app.add_middleware(
    CORSMiddleware,
    # allow_origins: which websites can connect to our API
    allow_origins=["http://localhost:3000", "http://localhost:3001"],  # React dev servers
    allow_credentials=True,    # Allow cookies and authentication
    allow_methods=["*"],       # Allow all HTTP methods (GET, POST, etc.)
    allow_headers=["*"],       # Allow all HTTP headers
)

# 🤖 CONFIGURE GEMINI AI
# Gemini is Google's AI that will generate our summaries
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")  # Get API key from environment variables
if GEMINI_API_KEY:
    # Configure the AI with our API key
    genai.configure(api_key=GEMINI_API_KEY)
    # Create a model instance - 'gemini-1.5-flash' is fast and good for text processing
    model = genai.GenerativeModel('gemini-1.5-flash')

# 📋 PYDANTIC MODELS FOR API REQUESTS
# These define the structure of data our API expects to receive
class SummaryRequest(BaseModel):
    """
    Data structure for summary requests from the frontend
    
    BaseModel automatically validates that incoming data matches this structure
    If someone sends invalid data, Pydantic will reject it automatically
    """
    text: str                           # The transcribed text to summarize (required)
    summary_type: str = "meeting"       # Type of summary (optional, defaults to "meeting")

# 🎙️ TRANSCRIPTION MANAGER CLASS
# This class handles all the real-time speech-to-text functionality
class TranscriptionManager:
    """
    This class handles real-time transcription using Deepgram SDK v3.2.7.
    
    Think of it as a bridge between your microphone and Deepgram's AI.
    It receives audio data from the frontend and sends back transcribed text.
    """
    
    def __init__(self):
        """
        Initialize the TranscriptionManager
        
        __init__ is a special method that runs when we create a new instance of this class
        It sets up all the initial values and connections we need
        """
        # Get Deepgram API key from environment variables
        self.api_key = os.getenv("DEEPGRAM_API_KEY")
        if not self.api_key:
            # If no API key found, raise an error - we can't work without it
            raise ValueError("DEEPGRAM_API_KEY not found in environment variables")
        
        # Create Deepgram client - this is our connection to Deepgram's AP service
        self.deepgram = DeepgramClient(self.api_key)
        print(f"🔗 [ASYNC] Deepgram client created: {self.deepgram}")
        
        # Initialize instance variables (these belong to each specific instance)
        self.connection = None          # Will hold our live transcription connection
        self.websocket = None          # Will hold our WebSocket connection to frontend
        self.full_transcript = ""      # Stores the complete transcript as it builds up
        self.is_connected = False      # Tracks whether we're connected to Deepgram
        self.message_queue = queue.Queue()  # Queue for messages from callbacks
        self.loop = None               # Will store the event loop for async operations
    
    async def start_transcription(self, websocket: WebSocket):
        """
        Start real-time transcription with enhanced Deepgram features
        
        This method sets up the connection to Deepgram and configures all the AI features
        
        Supported features in this SDK version:
        ✅ Diarization (Speaker identification) - tells us who is speaking
        ✅ Punctuation (Auto punctuation and capitalization) - adds periods, commas, etc.
        ✅ Smart Format (Enhanced number, date, currency formatting) - formats numbers properly
        ❌ Redaction (Not available in this SDK version) - would hide sensitive information
        ❌ Paragraphs (Not available in this SDK version) - would break text into paragraphs
        """
        try:
            print("🚀 [ASYNC] Starting transcription setup...")
            # Store the WebSocket connection so we can send messages back to frontend
            self.websocket = websocket
            print(f"📡 [ASYNC] WebSocket stored: {id(websocket)}")
            
            # Store the current event loop for handling async operations
            self.loop = asyncio.get_event_loop()
            print(f"🔄 [ASYNC] Event loop captured: {id(self.loop)}")
            
            # 🚀 ENHANCED DEEPGRAM OPTIONS - Using supported features only
            # LiveOptions configures how Deepgram processes our audio
            options = LiveOptions(
                # 🎯 CORE MODEL CONFIGURATION
                model="nova-3",        # Deepgram's newest and most accurate model
                language="en-US",      # English (United States)
                
                # 🎤 DIARIZATION - Speaker identification 
                # This will tell us when different speakers are talking
                # Very useful for meetings with multiple people
                diarize=True,
                
                # ✏️ PUNCTUATION - Add punctuation and capitalization
                # Makes text properly formatted with periods, commas, capital letters, etc.
                # Without this, text would be all lowercase with no punctuation
                punctuate=True,
                
                # 🤖 SMART FORMAT - Enhanced formatting
                # Formats dates, times, numbers, currencies properly
                # Example: "twenty five dollars" → "$25"
                # Example: "january first twenty twenty four" → "January 1st, 2024"
                smart_format=True,
                
                # 📊 ADDITIONAL QUALITY IMPROVEMENTS
                interim_results=True,      # Show partial results as user speaks (live feedback)
                utterance_end_ms=1000,     # End utterance after 1 second of silence
                vad_events=True,           # Voice activity detection (knows when someone starts/stops talking)
                profanity_filter=False,    # Keep original speech (don't censor bad words)
            )
            
            # 🔗 CREATE LIVE TRANSCRIPTION CONNECTION
            # This creates a persistent connection to Deepgram's servers
            self.connection = self.deepgram.listen.live.v("1")  # Version 1 of the live API
            
            # 📡 SET UP EVENT HANDLERS (callbacks)
            # Deepgram will invoke these methods automatically from its own thread.
            # 1️⃣ Open       → self.on_open()      – fires once the WebSocket handshake succeeds.
            # 2️⃣ Transcript  → self.on_message()   – fires every time Deepgram sends a (partial or final) transcript.
            # 3️⃣ Error      → self.on_error()     – fires if Deepgram reports any problem during streaming.
            # 4️⃣ Close      → self.on_close()     – fires when the WebSocket closes, either normally or due to an error.
            self.connection.on(LiveTranscriptionEvents.Open, self.on_open)
            self.connection.on(LiveTranscriptionEvents.Transcript, self.on_message)
            self.connection.on(LiveTranscriptionEvents.Error, self.on_error)
            self.connection.on(LiveTranscriptionEvents.Close, self.on_close)
            
            # 🚀 START THE CONNECTION
            # FIXED: Don't await the start method - it returns a boolean, not a coroutine
            print("🔗 [ASYNC] Starting Deepgram connection...")
            result = self.connection.start(options)
            
            if result:
                # Connection started successfully
                self.is_connected = True
                print("✅ [ASYNC] Deepgram connection started successfully!")
                return True
            else:
                # Connection failed to start
                print("❌ [ASYNC] Failed to start Deepgram connection")
                raise Exception("Failed to start Deepgram connection")
            
        except Exception as e:
            # If anything goes wrong, log the error and notify the frontend
            print(f"Error starting transcription: {e}")
            await websocket.send_text(json.dumps({
                "type": "error",
                "message": f"Failed to start transcription: {str(e)}"
            }))
            return False
    
    def on_open(self, *args, **kwargs):
        """
        Called when Deepgram connection opens successfully
        
        *args and **kwargs allow this function to accept any arguments
        (Deepgram might pass different arguments in different versions)
        """
        print("🎤 [CALLBACK] Deepgram connection opened (running in callback thread)")
        print(f"🧵 [CALLBACK] Current thread: {threading.current_thread().name}")
        self.is_connected = True
        # Queue a message to send to the frontend
        self.queue_message({
            "type": "connection_opened",
            "message": "Connected to Deepgram"
        })
        print("📬 [CALLBACK] Connection opened message queued")
    
    def on_message(self, *args, **kwargs):
        """
        Handle enhanced transcription results from Deepgram
        
        This is the most important function - it processes the speech-to-text results
        and sends them back to the frontend with all the enhanced features
        """
        try:
            # Extract the result from the callback arguments
            result = kwargs.get('result')
            
            # Check if we have a valid result with transcription data
            if result and hasattr(result, 'channel'):
                # Get the transcription alternatives (Deepgram usually provides the best one first)
                alternatives = result.channel.alternatives
                
                if alternatives and len(alternatives) > 0:
                    # Get the best transcription result
                    transcript_data = alternatives[0]
                    sentence = transcript_data.transcript  # The actual transcribed text
                    
                    # Only process if we have actual text (not empty)
                    if len(sentence.strip()) > 0:
                        # Check if this is final or interim (temporary) text
                        is_final = result.is_final
                        
                        # 🔍 EXTRACT ENHANCED FEATURES
                        # Get individual words with timing and speaker information
                        words = getattr(transcript_data, 'words', [])
                        
                        # 👤 SPEAKER INFORMATION (if diarization is enabled)
                        speaker_info = None
                        if words and len(words) > 0:
                            # Check if speaker information is available in the first word
                            first_word = words[0]
                            if hasattr(first_word, 'speaker'):
                                speaker_info = first_word.speaker  # Speaker ID (0, 1, 2, etc.)
                        
                        # 📝 ADD TO FULL TRANSCRIPT (only for final results)
                        if is_final:
                            if speaker_info is not None:
                                # Add speaker label to transcript
                                self.full_transcript += f"\n[Speaker {speaker_info}]: {sentence}"
                            else:
                                # Add text without speaker label
                                self.full_transcript += " " + sentence
                        
                        # 📤 CREATE ENHANCED MESSAGE FOR FRONTEND
                        # This message contains all the information our React app needs
                        message = {
                            "type": "transcription",              # Message type
                            "text": sentence,                     # The transcribed text
                            "is_final": is_final,                 # Whether this is final or still changing
                            "full_transcript": self.full_transcript.strip(),  # Complete transcript so far
                            
                            # 🆕 NEW: Enhanced features information
                            "speaker": speaker_info,              # Which speaker is talking (0, 1, 2, etc.)
                            "has_diarization": speaker_info is not None,  # Whether speaker detection worked
                            "word_count": len(words),             # Number of words in this segment
                            
                            # Status of which features are currently active
                            "features_used": {
                                "diarization": True,              # Speaker ID is enabled
                                "redaction": False,               # Not supported in this SDK version
                                "paragraphs": False,              # Not supported in this SDK version
                                "punctuation": True,              # Auto punctuation is enabled
                                "smart_format": True              # Smart formatting is enabled
                            }
                        }
                        
                        # Add message to queue to be sent to frontend
                        self.queue_message(message)
                        print(f"📬 [CALLBACK] Transcription queued: '{sentence[:50]}...' (is_final: {is_final})")
                        
        except Exception as e:
            # If anything goes wrong processing the transcription, log it
            print(f"❌ [CALLBACK] Error processing transcription: {e}")
            self.queue_message({
                "type": "error",
                "message": f"Error processing transcription: {str(e)}"
            })
    
    def on_error(self, error, **kwargs):
        """
        Called when there's an error with the Deepgram connection
        """
        print(f"Deepgram error: {error}")
        self.queue_message({
            "type": "error",
            "message": f"Transcription error: {str(error)}"
        })
    
    def on_close(self, *args, **kwargs):
        """
        Called when the Deepgram connection closes
        """
        print("Deepgram connection closed")
        self.is_connected = False
        self.queue_message({
            "type": "connection_closed",
            "message": "Disconnected from Deepgram"
        })
    
    def queue_message(self, message: Dict[str, Any]):
        """
        Add a message to the queue to be sent to the frontend
        
        We use a queue because the Deepgram callbacks run in different threads
        than our main WebSocket connection, so we need a thread-safe way to pass messages
        """
        try:
            print(f"📥 [QUEUE] Adding message to queue (thread: {threading.current_thread().name})")
            self.message_queue.put_nowait(message)  # Add message to queue without waiting
            print(f"📊 [QUEUE] Queue size now: {self.message_queue.qsize()}")
        except queue.Full:
            print("⚠️ [QUEUE] Message queue is full, dropping message")
    
    async def process_messages(self):
        """
        Process messages from the queue and send them to the frontend
        
        This runs continuously in the background, checking for new messages
        and sending them through the WebSocket connection
        """
        print(f"🔄 [PROCESSOR] Message processor started (thread: {threading.current_thread().name})")
        message_count = 0
        
        while True:
            try:
                # Check if there are any messages in the queue
                if not self.message_queue.empty():
                    message = self.message_queue.get_nowait()  # Get message without waiting
                    message_count += 1
                    
                    print(f"📤 [PROCESSOR] Processing message #{message_count}: {message.get('type', 'unknown')}")
                    
                    # Send message to frontend if WebSocket is still connected
                    if self.websocket:
                        await self.websocket.send_text(json.dumps(message))
                        print(f"✅ [PROCESSOR] Message sent via WebSocket")
                    else:
                        print("⚠️ [PROCESSOR] No WebSocket connection available")
                
                # Wait a tiny bit before checking again (prevents busy waiting)
                await asyncio.sleep(0.01)  # 10 milliseconds
                
            except Exception as e:
                print(f"❌ [PROCESSOR] Error processing messages: {e}")
                break
        
        print("🛑 [PROCESSOR] Message processor stopped")
    
    def send_audio(self, audio_data: bytes):
        """
        Send audio data to Deepgram for transcription
        
        This method receives audio data from the frontend and forwards it to Deepgram
        """
        try:
            # Only send if we have a connection and it's active
            if self.connection and self.is_connected:  # ← SAFETY CHECK!
                self.connection.send(audio_data)  # Send raw audio bytes to Deepgram
        except Exception as e:
            print(f"Error sending audio: {e}")
    
    def close(self):
        """
        Clean up and close all connections
        
        This method is called when we're done with transcription
        It properly closes connections and cleans up resources
        """
        try:
            self.is_connected = False
            
            # Close Deepgram connection if it exists
            if self.connection:
                self.connection.finish()  # Properly close the connection
                self.connection = None
                
        except Exception as e:
            print(f"Error closing transcription manager: {e}")

# 🤖 AI PROCESSOR CLASS
# This class handles all AI-related functionality (generating summaries)
class AIProcessor:
    """
    This class handles AI processing using Google's Gemini API
    It takes transcribed text and generates intelligent summaries
    """
    
    @staticmethod
    def _clean_json_response(response: str) -> str:
        """
        Clean Gemini API response to extract pure JSON
        
        Sometimes Gemini API returns JSON wrapped in markdown code blocks like:
        ```json
        {"key": "value"}
        ```
        
        This method removes the markdown formatting and extracts just the JSON.
        
        Args:
            response: Raw Gemini API response that might contain markdown formatting
            
        Returns:
            Clean JSON string ready for parsing
        """
        # Remove leading/trailing whitespace
        cleaned = response.strip()
        
        # Check if response is wrapped in markdown code blocks
        if cleaned.startswith('```json') and cleaned.endswith('```'):
            # Remove the ```json at the start and ``` at the end
            cleaned = cleaned[7:-3]  # Remove first 7 chars (```json\n) and last 3 chars (\n```)
            cleaned = cleaned.strip()  # Remove any remaining whitespace
        elif cleaned.startswith('```') and cleaned.endswith('```'):
            # Handle generic code blocks without 'json' specifier
            cleaned = cleaned[3:-3]  # Remove first 3 chars (```) and last 3 chars (```)
            cleaned = cleaned.strip()
        
        # Log for better understanding of output
        logger.debug(f"[_clean_json_response] Raw response:\n{response}")
        logger.debug(f"[_clean_json_response] Cleaned response:\n{cleaned}")
        return cleaned
    
    @staticmethod
    async def generate_summary(text: str, summary_type: str = "meeting") -> Dict[str, Any]:
        """
        Generate Gemini API summary using Google Gemini
        
        This method takes transcribed text and uses Gemini API to create:
        - Overall summary
        - Key points
        - Action items
        - Decisions made
        - Next steps
        
        Args:
            text: The transcribed text to summarize
            summary_type: Type of summary to generate ("meeting", "action_items", etc.)
        
        Returns:
            Dictionary containing the Gemini API-generated summary and analysis
        """
        logger.info("="*50)
        logger.info("🤖 [GENERATE_SUMMARY] Starting Gemini API summary generation...")
        logger.info("="*50)
        
        try:
            # 🔑 Log input parameters for debugging
            logger.info("📥 [INPUT] Function called with parameters:")
            logger.debug(f"   📝 text parameter type: {type(text)}")
            logger.info(f"   📝 text length: {len(text)} characters")
            logger.info(f"   📝 summary_type: '{summary_type}'")
            logger.debug(f"   📝 summary_type type: {type(summary_type)}")
            
            # Show a preview of the text (first 150 characters)
            preview_text = text[:150] + ("..." if len(text) > 150 else "")
            logger.debug(f"   📖 text preview: '{preview_text}'")
            
            # 🔐 Check if we have Gemini configured
            logger.info("🔐 [CONFIG] Checking API configuration...")
            gemini_key_exists = bool(GEMINI_API_KEY)
            logger.info(f"   🔑 GEMINI_API_KEY exists: {gemini_key_exists}")
            if GEMINI_API_KEY:
                # Show only first 10 characters of API key for security
                key_preview = GEMINI_API_KEY[:10] + "..." if len(GEMINI_API_KEY) > 10 else GEMINI_API_KEY
                logger.debug(f"   🔑 API key preview: '{key_preview}'")
            
            if not GEMINI_API_KEY:
                error_response = {
                    "error": "Gemini AI not configured. Please add GEMINI_API_KEY to your environment variables."
                }
                logger.error(f"❌ [ERROR] No API key found, returning: {error_response}")
                return error_response

            # 📝 CREATE GEMINI API PROMPT BASED ON SUMMARY TYPE
            logger.info("📝 [PROMPT] Creating Gemini API prompt based on summary type...")
            logger.info(f"   🎯 Summary type received: '{summary_type}'")
            
            # Different prompts for different types of analysis
            if summary_type == "action_items":
                logger.info("   📋 Using ACTION_ITEMS prompt template")
                # Focus on tasks and to-dos
                prompt = f"""
                Analyze this transcription and extract action items, tasks, and to-dos:
                
                Text: {text}
                
                Please provide a JSON response with:
                - action_items: List of specific tasks or actions mentioned
                - Each action item should include task, responsible_party (if mentioned), and deadline (if mentioned)
                """
                
            elif summary_type == "key_points":
                logger.info("   🔑 Using KEY_POINTS prompt template")
                # Focus on main takeaways
                prompt = f"""
                Analyze this transcription and extract the key points and main takeaways:
                
                Text: {text}
                
                Please provide a JSON response with:
                - key_points: List of the most important points discussed
                - summary: Brief overall summary
                """
                
            elif summary_type == "speaker_analysis":
                logger.info("   👥 Using SPEAKER_ANALYSIS prompt template")
                # Focus on what each speaker contributed
                prompt = f"""
                Analyze this transcription and provide per-speaker analysis:
                
                Text: {text}
                
                Please provide a JSON response with:
                - speaker_summary: List of objects with speaker_id, main_points, and action_items for each speaker
                - summary: Overall summary of the conversation
                """
                
            else:
                logger.info("   📊 Using DEFAULT MEETING prompt template")
                # Default comprehensive meeting summary
                prompt = f"""
                Analyze this meeting transcription and provide a comprehensive summary:
                
                Text: {text}
                
                Please provide a JSON response with:
                - summary: Brief overall summary (2-3 sentences)
                - key_points: List of main discussion points
                - action_items: List of tasks/actions with responsible_party and deadline if mentioned
                - decisions: List of decisions made
                - next_steps: List of next steps or follow-ups
                
                Make sure the response is valid JSON format.
                """
            
            # Log prompt information for debugging
            prompt_length = len(prompt)
            logger.info(f"   📏 Generated prompt length: {prompt_length} characters")
            # Show first 200 characters of prompt (without the full text to avoid spam)
            prompt_start = prompt.split("Text: {text}")[0] if "Text: {text}" in prompt else prompt[:200]
            prompt_preview = prompt_start[:200] + ("..." if len(prompt_start) > 200 else "")
            logger.debug(f"   📖 Prompt preview (without full text): '{prompt_preview}'")
            
            # 🤖 SEND REQUEST TO GEMINI API
            logger.info("🤖 [GEMINI_REQUEST] Sending request to Gemini API...")
            logger.debug(f"   🔗 Using model: {model}")
            logger.info("   📤 Sending prompt to Gemini API (this may take a few seconds)...")
            
            # Generate content using the Gemini API model
            response = model.generate_content(prompt)
            logger.info("   ✅ Received response from Gemini API")
            
            # Extract the text response from Gemini
            ai_response = response.text
            logger.info("📨 [GEMINI_RESPONSE] Processing Gemini API response...")
            logger.info(f"   📏 Raw response length: {len(ai_response)} characters")
            logger.debug(f"   🔤 Response type: {type(ai_response)}")
            
            # Show first 300 characters of response for debugging
            response_preview = ai_response[:300] + ("..." if len(ai_response) > 300 else "")
            logger.debug(f"   📖 Raw response preview:\n'{response_preview}'")
            
            # 🔍 TRY TO PARSE AS JSON
            logger.info("🔍 [JSON_PARSING] Attempting to parse response as JSON...")
            # The AI should return JSON, but sometimes it includes extra text or markdown formatting
            try:
                # Clean the AI response to extract pure JSON
                logger.debug("   🧹 Cleaning response with _clean_json_response()...")
                cleaned_response = AIProcessor._clean_json_response(ai_response)
                logger.debug(f"   📏 Cleaned response length: {len(cleaned_response)} characters")
                
                # Show preview of cleaned response
                cleaned_preview = cleaned_response[:200] + ("..." if len(cleaned_response) > 200 else "")
                logger.debug(f"   📖 Cleaned response preview:\n'{cleaned_preview}'")
                
                # Try to parse the cleaned response as JSON
                logger.debug("   🔧 Attempting json.loads()...")
                summary_data = json.loads(cleaned_response)
                logger.info("   ✅ JSON parsing successful!")
                logger.debug(f"   📊 Parsed data type: {type(summary_data)}")
                
                if isinstance(summary_data, dict):
                    logger.debug(f"   🔑 Dictionary keys found: {list(summary_data.keys())}")
                
                # Add metadata about the response
                logger.debug("   📝 Adding metadata to response...")
                summary_data["type"] = summary_type
                summary_data["raw_response"] = ai_response
                
                logger.info("   📤 Returning processed summary data")
                return summary_data
                
            except json.JSONDecodeError as json_error:
                # If JSON parsing fails, return the raw response
                logger.warning(f"   ❌ JSON parsing failed: {json_error}")
                logger.debug(f"   📄 Problematic text: '{ai_response[:100]}...'")
                
                error_response = {
                    "summary": "AI generated a response but it wasn't in the expected format.",
                    "raw_response": ai_response,
                    "type": summary_type,
                    "error": "Response format error - see raw_response for actual AI output",
                    "json_error": str(json_error)
                }
                logger.warning(f"   📤 Returning JSON error response")
                return error_response
                
        except Exception as e:
            # Handle any errors that occur during AI processing
            logger.error("❌ [EXCEPTION] Unexpected error in generate_summary:")
            logger.error(f"   🚨 Error type: {type(e).__name__}")
            logger.error(f"   📝 Error message: {str(e)}")
            logger.error(f"   📊 Summary type that was being processed: '{summary_type}'")
            logger.error(f"   📏 Text length when error occurred: {len(text) if 'text' in locals() else 'unknown'}")
            
            error_response = {
                "error": f"Failed to generate summary: {str(e)}",
                "type": summary_type,
                "error_type": type(e).__name__
            }
            logger.error(f"   📤 Returning error response")
            logger.info("="*50)
            return error_response

# 🌐 API ENDPOINTS
# These are the different ways our React frontend can communicate with this backend

# 🔌 WEBSOCKET ENDPOINT FOR REAL-TIME TRANSCRIPTION
# WebSocket allows real-time, two-way communication between frontend and backend
# Unlike regular HTTP requests, WebSocket connections stay open for continuous data flow
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for real-time audio transcription
    
    This endpoint handles the real-time connection between our React frontend
    and the Python backend. It receives audio data and sends back transcription results.
    
    How it works:
    1. Frontend connects to ws://localhost:8000/ws
    2. Backend accepts the connection
    3. Frontend sends audio data continuously
    4. Backend forwards audio to Deepgram and sends transcription back
    5. Connection stays open until user stops recording
    """
    # 🔍 DEBUG: CHECK INITIAL WEBSOCKET STATE
    print(f"🔍 [DEBUG] Initial WebSocket state: {websocket.client_state}")  # Should be CONNECTING
    print(f"🔍 [DEBUG] Initial application state: {websocket.application_state}")  # Should be CONNECTING
    
    # 🤝 ACCEPT THE WEBSOCKET CONNECTION
    # This tells the frontend "Yes, I'm ready to communicate"
    # Send the 101 Switching Protocols response to complete the WebSocket handshake.
    # After this coroutine completes, the connection state becomes "OPEN" and both
    # client and server can freely exchange WebSocket frames.
    await websocket.accept()
    
    # 🔍 DEBUG: CHECK WEBSOCKET STATE AFTER ACCEPT
    print(f"🔍 [DEBUG] After accept - WebSocket state: {websocket.client_state}")  # Should be CONNECTED
    print(f"🔍 [DEBUG] After accept - application state: {websocket.application_state}")  # Should be CONNECTED
    
    # Initialize variables to track our connections
    # Placeholders that will be populated once the handshake succeeds:
    #   • transcription_manager → manages the audio stream to Deepgram for THIS socket
    #   • message_task         → background asyncio Task that forwards transcripts
    transcription_manager = None
    message_task = None
    
    try:
        # 🎙️ CREATE AND START TRANSCRIPTION MANAGER
        # This sets up the connection to Deepgram's AI transcription service
        # Instantiate a dedicated TranscriptionManager for this client connection.
        # This keeps concurrent browser sessions isolated from each other.
        print(f"🏗️ [WEBSOCKET] Creating new TranscriptionManager for WebSocket {id(websocket)}")
        transcription_manager = TranscriptionManager()
        
        # 🔍 DEBUG: CHECK DEEPGRAM STATE BEFORE START
        print(f"🔍 [DEBUG] Deepgram connected (before start): {transcription_manager.is_connected}")  # Should be False
        
        success = await transcription_manager.start_transcription(websocket)
        
        # 🔍 DEBUG: CHECK DEEPGRAM STATE AFTER START
        print(f"🔍 [DEBUG] Deepgram connected (after start): {transcription_manager.is_connected}")  # Should be True if successful
        print(f"🔍 [DEBUG] Start transcription success: {success}")  # Should be True if successful
        
        # Check if Deepgram connection was successful
        if not success:
            # If connection failed, tell frontend and exit
            await websocket.send_text(json.dumps({
                "type": "error",
                "message": "Failed to connect to Deepgram"
            }))
            return
        
        # 🎉 SEND SUCCESS MESSAGE TO FRONTEND
        # Let the React app know we're ready to receive audio
        await websocket.send_text(json.dumps({
            "type": "ready",
            "message": "Ready to receive audio"
        }))
        
        # 🚀 START BACKGROUND MESSAGE PROCESSING
        # This task runs in parallel, continuously checking for messages from Deepgram
        # and sending them to the frontend
        print(f"🚀 [WEBSOCKET] Starting background message processing task...")
        message_task = asyncio.create_task(transcription_manager.process_messages())
        print(f"✅ [WEBSOCKET] Background task created: {id(message_task)}")
        
        # 🔄 MAIN LOOP - RECEIVE AUDIO DATA
        # This loop runs continuously, waiting for audio data from the frontend
        print("🔄 [WEBSOCKET] Starting main audio receive loop...")
        audio_chunk_count = 0
        
        while True:
            try:
                # Wait for audio data from the frontend
                # receive_bytes() gets raw audio data (not text)
                data = await websocket.receive_bytes()
                audio_chunk_count += 1
                
                if audio_chunk_count % 50 == 0:  # Print every 50th chunk to avoid spam
                    print(f"🎵 [WEBSOCKET] Received audio chunk #{audio_chunk_count} ({len(data)} bytes)")
                
                # Forward the audio data to Deepgram for transcription
                transcription_manager.send_audio(data)
                
            except WebSocketDisconnect:
                # This happens when the user closes their browser or stops recording
                print(f"🔌 [WEBSOCKET] Client disconnected (processed {audio_chunk_count} audio chunks)")
                break
                
            except Exception as e:
                # Handle any other errors that might occur
                print(f"Error receiving audio data: {e}")
                await websocket.send_text(json.dumps({
                    "type": "error",
                    "message": f"Error processing audio: {str(e)}"
                }))
                break
    
    except Exception as e:
        # Handle any errors that occur during setup
        print(f"WebSocket error: {e}")
        try:
            # Try to send error message to frontend
            await websocket.send_text(json.dumps({
                "type": "error",
                "message": f"WebSocket error: {str(e)}"
            }))
        except:
            # If we can't send the error message, just log it
            print("Could not send error message to client")
    
    finally:
        # 🧹 CLEANUP - This always runs when the connection ends
        # Clean up all resources to prevent memory leaks
        print("🧹 [WEBSOCKET] Starting cleanup process...")
        
        # Cancel the background message processing task
        if message_task:
            print("🛑 [WEBSOCKET] Canceling background message task...")
            message_task.cancel()
            try:
                await message_task  # Wait for it to finish canceling
                print("✅ [WEBSOCKET] Background task canceled successfully")
            except asyncio.CancelledError:
                print("✅ [WEBSOCKET] Background task cancellation confirmed")
                pass  # This is expected when canceling a task
        
        # Close the Deepgram connection
        if transcription_manager:
            print("🔌 [WEBSOCKET] Closing Deepgram connection...")
            transcription_manager.close()
        
        print("✅ [WEBSOCKET] WebSocket connection closed and cleaned up")

# 📝 HTTP POST ENDPOINT FOR AI SUMMARIES
# This endpoint receives transcribed text and returns AI-generated summaries
@app.post("/api/summarize")
async def create_summary(request: SummaryRequest):
    """
    Create AI summary from transcribed text
    
    This endpoint takes the transcribed text from our frontend and uses
    Google's Gemini AI to generate intelligent summaries, action items, and insights.
    
    Request body (JSON):
    {
        "text": "The transcribed text to summarize",
        "summary_type": "meeting" | "action_items" | "key_points" | "speaker_analysis"
    }
    
    Response (JSON):
    {
        "summary": "Brief summary text",
        "key_points": ["point 1", "point 2"],
        "action_items": [{"task": "...", "responsible_party": "...", "deadline": "..."}],
        "decisions": ["decision 1", "decision 2"],
        "next_steps": ["step 1", "step 2"]
    }
    """
    try:
        # 🔍 VALIDATE INPUT
        # Check if we have text to summarize
        if not request.text or not request.text.strip():
            # If no text provided, return error
            raise HTTPException(status_code=400, detail="No text provided for summarization")
        
        # 🤖 GENERATE AI SUMMARY
        # Call our AI processor to create the summary
        summary = await AIProcessor.generate_summary(request.text, request.summary_type)
        
        # 📤 RETURN THE SUMMARY
        # FastAPI automatically converts our dictionary to JSON
        return summary
        
    except HTTPException:
        # Re-raise HTTP exceptions (these are handled by FastAPI)
        raise
        
    except Exception as e:
        # Handle any unexpected errors
        print(f"Error in summarize endpoint: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

# 🏥 HEALTH CHECK ENDPOINT
# This endpoint tells us if the server is running properly
@app.get("/api/health")
async def health_check():
    """
    Health check endpoint
    
    This endpoint is used to check if the server is running and all services are working.
    It's useful for monitoring, debugging, and automated health checks.
    
    Returns:
    {
        "status": "healthy",
        "deepgram_configured": true/false,
        "gemini_configured": true/false
    }
    """
    # Check if our AI services are properly configured
    deepgram_configured = bool(os.getenv("DEEPGRAM_API_KEY"))  # Convert to boolean
    gemini_configured = bool(os.getenv("GEMINI_API_KEY"))      # Convert to boolean
    
    return {
        "status": "healthy",                          # Server is running
        "deepgram_configured": deepgram_configured,   # Speech-to-text service status
        "gemini_configured": gemini_configured,       # AI summary service status
        "timestamp": asyncio.get_event_loop().time()  # Current server time
    }

# 🏠 ROOT ENDPOINT
# This is what you see when you visit http://localhost:8000 in your browser
@app.get("/")
async def root():
    """
    Root endpoint - welcome message
    
    This endpoint provides basic information about the API.
    It's the default page users see when they visit the server URL.
    """
    return {
        "message": "🎤 AI Note Taker API",
        "description": "Real-time transcription with AI-powered summaries",
        "version": "1.0.0",
        "endpoints": {
            "websocket": "/ws - Real-time audio transcription",
            "summarize": "/api/summarize - Generate AI summaries",
            "health": "/api/health - Server health check",
            "docs": "/docs - API documentation (Swagger UI)"
        },
        "features": [
            "🎤 Real-time speech-to-text with Deepgram",
            "👥 Speaker identification (diarization)",
            "✏️ Auto-punctuation and smart formatting",
            "🤖 AI-powered summaries with Google Gemini",
            "📋 Action item extraction",
            "🔑 Key point identification",
            "👤 Per-speaker analysis"
        ]
    }

# 🚀 SERVER STARTUP
# This code runs when we start the server with: python main.py
if __name__ == "__main__":
    """
    Start the server when this file is run directly
    
    This is the entry point for our application. When you run 'python main.py',
    this code starts the web server and makes it available at http://localhost:8000
    """
    import uvicorn
    import sys
    
    print("🚀 Starting AI Note Taker API server...")
    print("📡 WebSocket endpoint: ws://localhost:8000/ws")
    print("🌐 HTTP API: http://localhost:8000")
    print("📚 API Documentation: http://localhost:8000/docs")
    print("🏥 Health Check: http://localhost:8000/api/health")
    
    # Check if we're running in debug mode
    # In debug mode, we don't want uvicorn.run() to take control
    if hasattr(sys, 'gettrace') and sys.gettrace() is not None:
        print("🐛 Debug mode detected - server ready for debugging")
        print("💡 Set breakpoints and use the debugger controls")
        # Don't call uvicorn.run() in debug mode
        # The debugger will handle running the app
    else:
        # Normal mode - start the server
        uvicorn.run(app, host="0.0.0.0", port=8000, reload=True) 