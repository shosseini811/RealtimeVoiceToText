import asyncio
import json
import os
from typing import Dict, Any
import websockets
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from deepgram import DeepgramClient, DeepgramClientOptions, LiveTranscriptionEvents
from deepgram.clients.live.v1 import LiveOptions
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Create FastAPI app
app = FastAPI(title="Real-time Voice to Text API")

# Add CORS middleware to allow React frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TranscriptionManager:
    """
    This class manages the connection between our app and Deepgram's API.
    Think of it as a translator that takes audio from your microphone
    and converts it to text using Deepgram's service.
    """
    
    def __init__(self):
        # Get your Deepgram API key from environment variables
        # You'll need to set this in a .env file
        self.api_key = os.getenv("DEEPGRAM_API_KEY")
        if not self.api_key:
            raise ValueError("DEEPGRAM_API_KEY not found in environment variables")
        
        # Create Deepgram client - this is our connection to Deepgram's service
        self.deepgram = DeepgramClient(self.api_key)
        self.connection = None
        self.websocket = None
    
    async def start_transcription(self, websocket: WebSocket):
        """
        Start the transcription process.
        This creates a connection to Deepgram and sets up event handlers.
        """
        try:
            self.websocket = websocket
            
            # Configure transcription options
            # These settings tell Deepgram how we want our audio processed
            options = LiveOptions(
                model="nova-2",              # Use Deepgram's latest model
                language="en-US",            # Set language to English (US)
                smart_format=True,           # Automatically format text (punctuation, etc.)
                interim_results=True,        # Get partial results as user speaks
                utterance_end_ms=1000,       # Wait 1 second after speech ends
                vad_events=True,             # Voice Activity Detection events
            )
            
            # Create connection to Deepgram's live transcription service
            self.connection = self.deepgram.listen.websocket.v("1")
            
            # Set up event handlers - these functions run when certain events happen
            self.connection.on(LiveTranscriptionEvents.Open, self.on_open)
            self.connection.on(LiveTranscriptionEvents.Transcript, self.on_message)
            self.connection.on(LiveTranscriptionEvents.Error, self.on_error)
            self.connection.on(LiveTranscriptionEvents.Close, self.on_close)
            
            # Start the connection
            if not await self.connection.start(options):
                raise Exception("Failed to start Deepgram connection")
                
            return True
            
        except Exception as e:
            print(f"Error starting transcription: {e}")
            return False
    
    async def on_open(self, *args, **kwargs):
        """Called when connection to Deepgram opens successfully"""
        print("Deepgram connection opened")
        if self.websocket:
            await self.websocket.send_text(json.dumps({
                "type": "connection_opened",
                "message": "Connected to Deepgram"
            }))
    
    async def on_message(self, *args, **kwargs):
        """
        Called when we receive transcription results from Deepgram.
        This is where the magic happens - audio becomes text!
        """
        try:
            # The result contains the transcribed text
            result = kwargs.get('result')
            if result:
                # Extract the transcript from the result
                sentence = result.channel.alternatives[0].transcript
                
                # Only send non-empty transcripts
                if len(sentence.strip()) > 0:
                    # Determine if this is a final result or interim (partial) result
                    is_final = result.is_final
                    
                    # Send the transcription to our React frontend
                    if self.websocket:
                        await self.websocket.send_text(json.dumps({
                            "type": "transcription",
                            "text": sentence,
                            "is_final": is_final
                        }))
                        
        except Exception as e:
            print(f"Error processing transcription: {e}")
    
    async def on_error(self, error, **kwargs):
        """Called when there's an error with Deepgram connection"""
        print(f"Deepgram error: {error}")
        if self.websocket:
            await self.websocket.send_text(json.dumps({
                "type": "error",
                "message": str(error)
            }))
    
    async def on_close(self, *args, **kwargs):
        """Called when Deepgram connection closes"""
        print("Deepgram connection closed")
        if self.websocket:
            await self.websocket.send_text(json.dumps({
                "type": "connection_closed",
                "message": "Disconnected from Deepgram"
            }))
    
    async def send_audio(self, audio_data: bytes):
        """
        Send audio data to Deepgram for transcription.
        This is called whenever we receive audio from the frontend.
        """
        if self.connection:
            self.connection.send(audio_data)
    
    async def close(self):
        """Clean up connections when done"""
        if self.connection:
            await self.connection.finish()

# WebSocket endpoint for real-time communication with React frontend
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    This is the main communication channel between our React app and Python backend.
    WebSocket allows real-time, two-way communication.
    """
    await websocket.accept()
    
    # Create a new transcription manager for this connection
    transcription_manager = TranscriptionManager()
    
    try:
        # Start the transcription service
        success = await transcription_manager.start_transcription(websocket)
        
        if not success:
            await websocket.send_text(json.dumps({
                "type": "error",
                "message": "Failed to connect to Deepgram"
            }))
            return
        
        # Keep the connection alive and handle incoming messages
        while True:
            # Wait for data from the React frontend
            data = await websocket.receive_bytes()
            
            # Send the audio data to Deepgram for transcription
            await transcription_manager.send_audio(data)
            
    except WebSocketDisconnect:
        print("Client disconnected")
    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        # Clean up when connection ends
        await transcription_manager.close()

# Health check endpoint
@app.get("/health")
async def health_check():
    """Simple endpoint to check if the server is running"""
    return {"status": "healthy", "message": "Voice to Text API is running"}

# Root endpoint with basic info
@app.get("/")
async def root():
    """Basic information about the API"""
    return {
        "message": "Real-time Voice to Text API",
        "version": "1.0.0",
        "endpoints": {
            "websocket": "/ws",
            "health": "/health"
        }
    }

if __name__ == "__main__":
    import uvicorn
    # Run the server
    uvicorn.run(app, host="0.0.0.0", port=8000) 