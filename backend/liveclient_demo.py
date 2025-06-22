#!/usr/bin/env python3
"""
🎤 DEEPGRAM LIVECLIENT USAGE DEMO

This file demonstrates how to use the LiveClient object you get from:
deepgram.listen.live.v("1")

Perfect for TypeScript beginners learning Python and real-time transcription!

WHAT YOU'LL LEARN:
- How to use the LiveClient object step by step
- What each method does in simple terms
- How to handle events (like addEventListener in JavaScript)
- Complete working examples you can run and modify

HOW TO RUN:
1. Make sure you have your .env file with DEEPGRAM_API_KEY
2. Run: python backend/liveclient_demo.py
3. Follow the prompts to test different features

JAVASCRIPT/TYPESCRIPT COMPARISON:
- LiveClient.on() is like addEventListener()
- LiveClient.start() is like WebSocket.open()
- LiveClient.send() is like WebSocket.send()
- LiveClient.finish() is like WebSocket.close()
"""

import os
import sys
import time
import asyncio
import threading
from typing import Any, Dict
from dotenv import load_dotenv

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Try to import Deepgram
try:
    from deepgram import DeepgramClient, LiveOptions, LiveTranscriptionEvents
    print("✅ Deepgram SDK imported successfully!")
except ImportError as e:
    print(f"❌ Failed to import Deepgram SDK: {e}")
    print("💡 Try: pip install deepgram-sdk==3.2.7")
    sys.exit(1)

class LiveClientDemo:
    """
    A demo class that shows how to use Deepgram's LiveClient
    
    This class is like a tutorial that walks you through each step
    of using real-time transcription with clear explanations.
    """
    
    def __init__(self):
        """Initialize the demo with API key and client"""
        print("🚀 LIVECLIENT DEMO INITIALIZATION")
        print("=" * 50)
        
        # Load environment variables
        load_dotenv()
        
        # Get API key
        self.api_key = os.getenv("DEEPGRAM_API_KEY")
        if not self.api_key:
            print("❌ DEEPGRAM_API_KEY not found in environment variables")
            print("💡 Please add your API key to the .env file")
            sys.exit(1)
        
        print(f"✅ API key loaded: {self.api_key[:10]}...")
        
        # Create Deepgram client
        self.deepgram = DeepgramClient(self.api_key)
        print(f"✅ Deepgram client created: {self.deepgram}")
        
        # Initialize connection variable
        self.connection = None
        self.is_connected = False
        
        # You can verify this yourself:
        print(f"Type of self.deepgram: {type(self.deepgram)}")
        # Output: <class 'deepgram.client.DeepgramClient'>

        print(f"Type of self.deepgram.listen: {type(self.deepgram.listen)}")  
        # Output: <class 'deepgram.clients.listen.Listen'>

        print(f"Type of self.deepgram.listen.live: {type(self.deepgram.listen.live)}")
        # Output: <class 'deepgram.clients.listen.Listen.Version'>

        print(f"Type of self.deepgram.listen.live.v('1'): {type(self.deepgram.listen.live.v('1'))}")
        # Output: <class 'deepgram.clients.live.v1.client.LiveClient'>
        
    def create_live_client(self):
        """
        STEP 1: Create a LiveClient object
        
        This is what you get when you call deepgram.listen.live.v("1")
        Think of it as creating a "phone line" that can understand speech
        """
        print("\n🔗 STEP 1: CREATING LIVECLIENT")
        print("-" * 30)
        
        # This is the line you asked about!
        # Let's break down why we don't need parentheses:
        # 
        # self.deepgram                    → DeepgramClient object (instance)
        # self.deepgram.listen             → @property (no parentheses needed!)
        # self.deepgram.listen.live        → @property (no parentheses needed!)  
        # self.deepgram.listen.live.v("1") → method call (parentheses required!)
        #
        # WHY NO PARENTHESES for .listen and .live?
        # Because they use @property decorator in the Deepgram SDK:
        #
        # @property
        # def listen(self):
        #     return Listen(self.config)
        #
        # @property  
        # def live(self):
        #     return Version(self.config, "live")
        #
        # Properties act like attributes, so you access them without ()
        # Only the final .v("1") needs () because it's a regular method
        #
        # This creates the clean, fluent interface: self.deepgram.listen.live.v("1") 
        # instead of the more verbose self.deepgram.listen().live().v("1") 🚀
        self.connection = self.deepgram.listen.live.v("1")
        
        print(f"✅ LiveClient created: {self.connection}")
        print(f"📊 Type: {type(self.connection)}")
        print(f"📊 Module: {self.connection.__module__}")
        
        # Show available methods
        methods = [method for method in dir(self.connection) 
                  if not method.startswith('_') and callable(getattr(self.connection, method))]
        print(f"🛠️  Available methods: {methods}")
        
        return self.connection
    
    def setup_options(self):
        """
        STEP 2: Configure LiveOptions
        
        LiveOptions tells Deepgram how you want your audio processed
        Like setting up preferences for your smart assistant
        """
        print("\n⚙️  STEP 2: CONFIGURING OPTIONS")
        print("-" * 30)
        
        options = LiveOptions(
            # 🎯 CORE SETTINGS
            model="nova-3",        # Smartest AI model (like GPT-4 vs GPT-3)
            language="en-US",      # What language you're speaking
            
            # 🎤 ADVANCED FEATURES
            diarize=True,          # Tell me who's speaking (Speaker 1, Speaker 2, etc.)
            punctuate=True,        # Add periods, commas, capital letters
            smart_format=True,     # Format numbers/dates nicely
            
            # 📊 REAL-TIME SETTINGS
            interim_results=True,      # Show live results as you speak
            utterance_end_ms=1000,     # End sentence after 1 second of silence
            vad_events=True,           # Detect when speech starts/stops
            profanity_filter=False     # Don't censor words
        )
        
        print("✅ Options configured:")
        print(f"   🤖 Model: {options.model}")
        print(f"   🌍 Language: {options.language}")
        print(f"   👥 Speaker ID: {options.diarize}")
        print(f"   ✏️  Punctuation: {options.punctuate}")
        print(f"   🤖 Smart Format: {options.smart_format}")
        print(f"   ⚡ Live Results: {options.interim_results}")
        
        return options
    
    def setup_event_handlers(self):
        """
        STEP 3: Set up event handlers
        
        Event handlers are functions that run when specific things happen
        Like addEventListener in JavaScript - "when X happens, do Y"
        """
        print("\n📡 STEP 3: SETTING UP EVENT HANDLERS")
        print("-" * 30)
        
        # 🎉 CONNECTION OPENED
        def on_open(*args, **kwargs):
            """Called when connection opens successfully"""
            print("🎉 [EVENT] Connection opened! Ready to listen!")
            print(f"🧵 [EVENT] Running in thread: {threading.current_thread().name}")
            self.is_connected = True
        
        # 📝 TRANSCRIPTION RECEIVED
        def on_message(*args, **kwargs):
            """Called every time Deepgram sends transcription"""
            print("📝 [EVENT] Transcription received!")
            
            try:
                # Extract the result from the callback
                result = kwargs.get('result')
                
                if result and hasattr(result, 'channel'):
                    alternatives = result.channel.alternatives
                    
                    if alternatives and len(alternatives) > 0:
                        transcript_data = alternatives[0]
                        text = transcript_data.transcript
                        
                        if len(text.strip()) > 0:
                            is_final = result.is_final
                            
                            # 👤 Check for speaker information
                            speaker_info = None
                            words = getattr(transcript_data, 'words', [])
                            if words and len(words) > 0:
                                first_word = words[0]
                                if hasattr(first_word, 'speaker'):
                                    speaker_info = first_word.speaker
                            
                            # 📊 Display the result
                            status = "FINAL" if is_final else "INTERIM"
                            speaker = f"[Speaker {speaker_info}] " if speaker_info is not None else ""
                            print(f"   📝 {status}: {speaker}{text}")
                            
            except Exception as e:
                print(f"   ❌ Error processing transcription: {e}")
        
        # ❌ ERROR OCCURRED
        def on_error(error, **kwargs):
            """Called when there's an error"""
            print(f"❌ [EVENT] Error occurred: {error}")
            self.is_connected = False
        
        # 📞 CONNECTION CLOSED
        def on_close(*args, **kwargs):
            """Called when connection closes"""
            print("📞 [EVENT] Connection closed")
            self.is_connected = False
        
        # 🔗 ATTACH EVENT HANDLERS TO CONNECTION
        print("🔗 Attaching event handlers...")
        self.connection.on(LiveTranscriptionEvents.Open, on_open)
        self.connection.on(LiveTranscriptionEvents.Transcript, on_message)
        self.connection.on(LiveTranscriptionEvents.Error, on_error)
        self.connection.on(LiveTranscriptionEvents.Close, on_close)
        
        print("✅ Event handlers attached:")
        print(f"   🎉 Open → on_open()")
        print(f"   📝 Transcript → on_message()")
        print(f"   ❌ Error → on_error()")
        print(f"   📞 Close → on_close()")
        
        return {
            'on_open': on_open,
            'on_message': on_message,
            'on_error': on_error,
            'on_close': on_close
        }
    
    def start_connection(self, options):
        """
        STEP 4: Start the connection
        
        This is like "dialing the phone number" - actually connecting to Deepgram
        """
        print("\n🚀 STEP 4: STARTING CONNECTION")
        print("-" * 30)
        
        print("📞 Calling connection.start(options)...")
        result = self.connection.start(options)
        
        if result:
            print("✅ Connection started successfully!")
            print("📊 Connection Status:")
            print(f"   🔗 Connected: {self.is_connected}")
            print(f"   📞 Ready to receive audio")
            return True
        else:
            print("❌ Failed to start connection")
            return False
    
    def simulate_audio_sending(self):
        """
        STEP 5: Simulate sending audio data
        
        In a real app, this would be audio from your microphone
        Here we just show what the method call looks like
        """
        print("\n🎵 STEP 5: SENDING AUDIO DATA")
        print("-" * 30)
        
        print("📊 In a real application, you would:")
        print("   1. Get audio from microphone")
        print("   2. Convert to bytes")
        print("   3. Send using connection.send(audio_bytes)")
        print()
        print("🔧 Example code:")
        print("   # Get audio data (this would be real audio bytes)")
        print("   audio_data = b'fake_audio_bytes_here'")
        print("   ")
        print("   # Send to Deepgram for transcription")
        print("   connection.send(audio_data)")
        print()
        print("💡 The connection.send() method accepts:")
        print("   - Raw audio bytes (from microphone)")
        print("   - Supported formats: WAV, MP3, FLAC, etc.")
        print("   - Recommended: 16kHz sample rate, mono channel")
        
        # We won't actually send audio in this demo
        print("⚠️  Not sending real audio in this demo (would need microphone)")
    
    def close_connection(self):
        """
        STEP 6: Close the connection
        
        Always clean up when you're done - like hanging up the phone
        """
        print("\n📞 STEP 6: CLOSING CONNECTION")
        print("-" * 30)
        
        if self.connection:
            print("📞 Calling connection.finish()...")
            self.connection.finish()
            print("✅ Connection closed successfully")
            self.is_connected = False
        else:
            print("⚠️  No connection to close")
    
    def show_available_events(self):
        """
        BONUS: Show all available events you can listen for
        
        These are like different types of notifications you can subscribe to
        """
        print("\n📚 BONUS: AVAILABLE EVENTS")
        print("-" * 30)
        
        events = [attr for attr in dir(LiveTranscriptionEvents) if not attr.startswith('_')]
        print("🎯 Events you can listen for:")
        
        for event in events:
            event_value = getattr(LiveTranscriptionEvents, event)
            print(f"   📡 {event:<20} = '{event_value}'")
        
        print("\n💡 Usage example:")
        print("   connection.on(LiveTranscriptionEvents.Open, my_function)")
        print("   connection.on(LiveTranscriptionEvents.Transcript, my_function)")
    
    def run_complete_demo(self):
        """
        Run the complete demo from start to finish
        
        This shows you the entire process of using a LiveClient
        """
        print("\n🎬 COMPLETE LIVECLIENT DEMO")
        print("=" * 50)
        
        try:
            # Step 1: Create LiveClient
            self.create_live_client()
            
            # Step 2: Configure options
            options = self.setup_options()
            
            # Step 3: Set up event handlers
            self.setup_event_handlers()
            
            # Step 4: Start connection
            success = self.start_connection(options)
            
            if success:
                # Step 5: Simulate audio sending
                self.simulate_audio_sending()
                
                # Wait a moment to show connection is active
                print("\n⏱️  Connection is active for 3 seconds...")
                time.sleep(3)
                
                # Step 6: Close connection
                self.close_connection()
            
            # Bonus: Show available events
            self.show_available_events()
            
        except Exception as e:
            print(f"❌ Demo error: {e}")
            if self.connection:
                self.close_connection()
    
    def interactive_mode(self):
        """
        Interactive mode - let user choose what to explore
        """
        print("\n🎮 INTERACTIVE MODE")
        print("=" * 50)
        
        while True:
            print("\n📋 What would you like to do?")
            print("1. 🔗 Create LiveClient")
            print("2. ⚙️  Configure Options")
            print("3. 📡 Set up Event Handlers")
            print("4. 🚀 Start Connection")
            print("5. 🎵 Show Audio Sending Example")
            print("6. 📞 Close Connection")
            print("7. 📚 Show Available Events")
            print("8. 🎬 Run Complete Demo")
            print("9. ❌ Exit")
            
            choice = input("\n👉 Enter your choice (1-9): ").strip()
            
            try:
                if choice == '1':
                    self.create_live_client()
                elif choice == '2':
                    options = self.setup_options()
                elif choice == '3':
                    if self.connection:
                        self.setup_event_handlers()
                    else:
                        print("⚠️  Please create LiveClient first (option 1)")
                elif choice == '4':
                    if self.connection:
                        options = self.setup_options()
                        self.setup_event_handlers()
                        self.start_connection(options)
                    else:
                        print("⚠️  Please create LiveClient first (option 1)")
                elif choice == '5':
                    self.simulate_audio_sending()
                elif choice == '6':
                    self.close_connection()
                elif choice == '7':
                    self.show_available_events()
                elif choice == '8':
                    self.run_complete_demo()
                elif choice == '9':
                    print("👋 Goodbye!")
                    if self.connection and self.is_connected:
                        self.close_connection()
                    break
                else:
                    print("❌ Invalid choice. Please enter 1-9.")
                    
            except KeyboardInterrupt:
                print("\n\n⚠️  Interrupted by user")
                if self.connection and self.is_connected:
                    self.close_connection()
                break
            except Exception as e:
                print(f"❌ Error: {e}")

def main():
    """
    Main function - entry point of the demo
    """
    print("🎤 DEEPGRAM LIVECLIENT USAGE DEMO")
    print("=" * 50)
    print("📚 This demo shows you how to use the LiveClient object")
    print("💡 Perfect for TypeScript beginners learning Python!")
    print()
    
    # Create demo instance
    demo = LiveClientDemo()
    
    # Ask user what they want to do
    print("🎯 Choose your demo mode:")
    print("1. 🎬 Complete Demo (automatic)")
    print("2. 🎮 Interactive Mode (step by step)")
    
    choice = input("\n👉 Enter your choice (1 or 2): ").strip()
    
    if choice == '1':
        demo.run_complete_demo()
    elif choice == '2':
        demo.interactive_mode()
    else:
        print("❌ Invalid choice. Running complete demo...")
        demo.run_complete_demo()
    
    print("\n✅ DEMO COMPLETE!")
    print("=" * 50)
    print("💡 Now you know how to use deepgram.listen.live.v('1')!")
    print("🚀 Try modifying this code to experiment with different features!")

if __name__ == "__main__":
    main()