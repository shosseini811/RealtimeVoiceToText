// 📦 IMPORTS - Bringing in code from other files and libraries

// React core - the main library for building user interfaces
// useState: Hook for managing component state (data that can change)
// useEffect: Hook for side effects (cleanup, API calls, etc.)
// useRef: Hook for accessing DOM elements or storing mutable values
import React, { useState, useEffect, useRef } from 'react';

// Lucide React - beautiful icons for our buttons
// Mic: Microphone icon for recording state
// MicOff: Microphone off icon for stopped state
import { Mic, MicOff } from 'lucide-react';

// Our custom CSS styles for making the app look good
import './App.css';

// TypeScript type definitions - these help prevent bugs by defining data shapes
// These interfaces define the structure of data we expect to receive/send
import { TranscriptionMessage, AISummary, ConnectionStatus, SummaryType } from './types';

/**
 * 🎤 MAIN APP COMPONENT
 * 
 * This is the main React component that handles:
 * - Recording audio from the user's microphone
 * - Sending audio data to the backend via WebSocket
 * - Receiving real-time transcription from Deepgram
 * - Generating AI summaries using Google Gemini
 * - Managing all the UI state and user interactions
 * 
 * FLOW:
 * 1. User clicks "Start Recording"
 * 2. App requests microphone permission
 * 3. App connects to WebSocket backend
 * 4. Audio is streamed to backend → Deepgram → transcription appears
 * 5. User clicks "Stop & Summarize"
 * 6. App automatically generates AI summary
 */
function App() {
  console.log('🚀 App component rendering/re-rendering');

  // 🔄 STATE MANAGEMENT
  // React hooks for managing component state - these variables can change and trigger re-renders
  
  // 🎤 RECORDING STATE: tracks whether we're currently recording audio
  // boolean = true/false value
  const [isRecording, setIsRecording] = useState<boolean>(false);
  
  // 📝 TRANSCRIPTION TEXT: holds the final transcribed text from Deepgram
  // string = text value that gets displayed in the main text box
  const [transcription, setTranscription] = useState<string>('');
  
  // ⏱️ INTERIM TEXT: temporary text being processed (live feedback)
  // This shows what's being transcribed in real-time before it's finalized
  const [interimText, setInterimText] = useState<string>('');
  
  // 🔗 CONNECTION STATUS: tracks connection to backend WebSocket
  // ConnectionStatus is a custom type defined in types.ts
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('Disconnected');
  
  // ⚠️ ERROR MESSAGES: for showing errors to user when things go wrong
  const [error, setError] = useState<string>('');
  
  // 🤖 AI SUMMARY: holds the generated summary from Google Gemini
  // AISummary | null means it can be a summary object OR null (empty)
  const [aiSummary, setAiSummary] = useState<AISummary | null>(null);
  
  // ⏳ LOADING STATE: shows spinner/loading text when generating summary
  const [isGeneratingSummary, setIsGeneratingSummary] = useState<boolean>(false);

  // 📊 LOG CURRENT STATE VALUES
  console.log('📊 Current State Values:', {
    isRecording,
    transcriptionLength: transcription.length,
    interimTextLength: interimText.length,
    connectionStatus,
    hasError: !!error,
    errorMessage: error,
    hasAiSummary: !!aiSummary,
    isGeneratingSummary
  });

  // 🔗 REFS FOR PERSISTENT OBJECTS
  // useRef creates references to objects that persist across re-renders
  // These don't trigger re-renders when changed (unlike useState)
  // 
  // WHY USE useRef INSTEAD OF useState?
  // - useState: For data that affects what the user sees (UI state)
  // - useRef: For "utility objects" that work behind the scenes
  // 
  // Think of useRef like a "storage box" that:
  // ✅ Keeps the same object between component re-renders
  // ✅ Doesn't cause re-renders when the object changes
  // ✅ Perfect for APIs, connections, and DOM references
  
  // 🌐 WEBSOCKET CONNECTION REF
  // WebSocket is a built-in browser API (no import needed) for real-time communication
  // 
  // WHAT IT DOES:
  // - Creates a persistent connection to the Python backend server
  // - Allows sending audio data TO the server instantly
  // - Allows receiving transcription data FROM the server instantly
  // - Like a phone line that stays open during the entire recording session
  // 
  // LIFECYCLE:
  // 1. null (initially - no connection)
  // 2. WebSocket object (when connected to ws://localhost:8000/ws)
  // 3. null again (when connection is closed)
  const websocketRef = useRef<WebSocket | null>(null);
  
  // 🎙️ MEDIARECORDER REF
  // MediaRecorder is a built-in browser API (no import needed) for recording audio/video
  // 
  // WHAT IT DOES:
  // - Takes audio from your microphone (MediaStream)
  // - Converts it into compressed audio data (WebM format with Opus codec)
  // - Splits recording into small chunks (every 100ms)
  // - Triggers events when each chunk is ready to send
  // 
  // SIMPLE ANALOGY:
  // - Your microphone = Raw sound waves
  // - MediaRecorder = Digital tape recorder that processes and packages the sound
  // - Audio chunks = Small pieces of recorded audio sent continuously
  // 
  // LIFECYCLE:
  // 1. null (initially - no recorder)
  // 2. MediaRecorder object (when recording starts)
  // 3. null again (when recording stops and cleanup happens)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  
  // 🔊 AUDIO STREAM REF
  // MediaStream is a built-in browser API (no import needed) representing live audio/video
  // 
  // WHAT IT IS:
  // - The actual "live feed" from your microphone
  // - Contains audio tracks (channels of sound data)
  // - Like a "pipe" that continuously flows with audio data
  // - This is what MediaRecorder reads from to create recordings
  // 
  // SIMPLE ANALOGY:
  // - Think of water flowing through a pipe
  // - MediaStream = The pipe with audio "flowing" through it
  // - Your microphone = The source of the "audio water"
  // - MediaRecorder = A device that "collects" audio from this pipe
  // 
  // HOW WE GET IT:
  // navigator.mediaDevices.getUserMedia({ audio: true })
  // ↑ This asks the browser: "Give me access to the user's microphone"
  // ↑ Returns a MediaStream object with live audio data
  // 
  // WHY STORE IN REF:
  // - We need to stop/cleanup the stream when recording ends
  // - Stopping releases the microphone (turns off the red recording indicator)
  // - If we don't cleanup, the microphone stays "on" even after stopping
  // 
  // LIFECYCLE:
  // 1. null (initially - no microphone access)
  // 2. MediaStream object (when getUserMedia() succeeds)
  // 3. null again (when we stop all tracks and cleanup)
  const audioStreamRef = useRef<MediaStream | null>(null);

  // 🔍 LOG REF STATUS
  console.log('🔗 Refs Status:', {
    hasWebSocket: !!websocketRef.current,
    websocketReadyState: websocketRef.current?.readyState,
    websocketReadyStateText: websocketRef.current ? 
      ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'][websocketRef.current.readyState] : 'null',
    hasMediaRecorder: !!mediaRecorderRef.current,
    mediaRecorderState: mediaRecorderRef.current?.state,
    hasAudioStream: !!audioStreamRef.current,
    audioStreamActive: audioStreamRef.current?.active,
    audioTrackCount: audioStreamRef.current?.getTracks().length || 0
  });

  // 🧹 CLEANUP EFFECT
  // useEffect with empty dependency array [] runs once when component mounts
  // The return function runs when component unmounts (cleanup)
  useEffect(() => {
    console.log('🏗️ App component mounted - setting up cleanup effect');
    
    return () => {
      console.log('🧹 App component unmounting - running cleanup');
      stopRecording();
      if (websocketRef.current) {
        console.log('🔌 Closing WebSocket during cleanup');
        websocketRef.current.close();
      }
    };
  }, []); // Empty array means this effect runs only once

  // 🔍 STATE CHANGE EFFECT - Log when important state changes
  useEffect(() => {
    console.log('🔄 State Change Detected:', {
      isRecording,
      connectionStatus,
      transcriptionLength: transcription.length,
      hasError: !!error
    });
  }, [isRecording, connectionStatus, transcription, error]);

  /**
   * 🌐 WEBSOCKET CONNECTION FUNCTION
   * 
   * Establishes real-time connection to Python backend
   * WebSocket allows bidirectional communication (unlike HTTP requests)
   * 
   * PROCESS:
   * 1. Create WebSocket connection to ws://localhost:8000/ws
   * 2. Set up event handlers for open, message, close, error
   * 3. Handle incoming transcription messages from Deepgram
   * 4. Update UI state based on messages received
   * 
   * @returns Promise that resolves when connection is established
   */
  const connectWebSocket = (): Promise<void> => {
    console.log('🌐 ==================== WEBSOCKET CONNECTION START ====================');
    console.log('🌐 connectWebSocket called');
    console.log('📊 WebSocket Info: What is WebSocket?');
    console.log('   • WebSocket = Persistent, bidirectional connection (like a phone call)');
    console.log('   • HTTP = One-time request/response (like sending a letter)');
    console.log('   • WebSocket stays open for real-time communication');
    console.log('   • Perfect for live audio streaming and instant transcription');
    
    return new Promise((resolve, reject) => {
      try {
        console.log('🔄 Setting connection status to Connecting');
        console.log('📊 UI State Update: connectionStatus = "Connecting"');
        // Update UI to show we're trying to connect
        setConnectionStatus('Connecting');
        
        console.log('🔗 Creating WebSocket connection to ws://localhost:8000/ws');
        console.log('📊 WebSocket URL Breakdown:');
        console.log('   • Protocol: ws:// (WebSocket, not http://)');
        console.log('   • Host: localhost (same computer)');
        console.log('   • Port: 8000 (where Python backend is running)');
        console.log('   • Path: /ws (WebSocket endpoint on backend)');
        
        // Create new WebSocket connection to backend
        const ws = new WebSocket('ws://localhost:8000/ws');
        console.log('✅ WebSocket object created');
        console.log('📊 Initial WebSocket state:', {
          readyState: ws.readyState,
          readyStateText: ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'][ws.readyState],
          url: ws.url,
          protocol: ws.protocol,
          extensions: ws.extensions
        });
        
        websocketRef.current = ws;
        console.log('📦 WebSocket stored in ref for later use');

        // 🎉 CONNECTION OPENED - Backend is ready to receive audio
        ws.onopen = () => {
          console.log('🎉 ==================== WEBSOCKET OPENED ====================');
          console.log('✅ WebSocket connected successfully!');
          console.log('📊 Connection Details:');
          console.log('   • Client (this app) ↔️ Server (Python backend) connection established');
          console.log('   • Can now send audio data TO server');
          console.log('   • Can now receive transcription FROM server');
          console.log('   • Connection is persistent (stays open until closed)');
          console.log('📊 WebSocket State After Opening:', {
            readyState: ws.readyState,
            readyStateText: ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'][ws.readyState],
            bufferedAmount: ws.bufferedAmount
          });
          
          console.log('🔄 Updating UI: connectionStatus = "Connected"');
          setConnectionStatus('Connected');
          setError(''); // Clear any previous errors
          console.log('🔄 Clearing previous errors and resolving promise');
          console.log('✅ Promise resolved - connection ready for use!');
          resolve(); // Promise succeeds - connection established
        };

        // 📨 MESSAGE RECEIVED - Backend sent us transcription data
        ws.onmessage = (event) => {
          console.log('📨 ==================== WEBSOCKET MESSAGE RECEIVED ====================');
          console.log('📨 WebSocket message received from server!');
          console.log('📊 Raw Message Details:', {
            dataType: typeof event.data,
            dataSize: event.data.length,
            timestamp: new Date().toISOString(),
            rawData: event.data
          });
          console.log('📊 Message Flow: Server → Client (this app)');
          console.log('   • Server processed audio and generated transcription');
          console.log('   • Server sent result back through WebSocket');
          console.log('   • This event handler receives and processes the message');
          
          try {
            console.log('🔄 Parsing JSON message from backend...');
            // Parse JSON message from backend
            const data: TranscriptionMessage = JSON.parse(event.data);
            console.log('✅ JSON parsing successful!');
            console.log('📊 Parsed message data:', data);
            console.log('📊 Message Structure Analysis:', {
              messageType: data.type,
              hasText: !!data.text,
              isFinal: data.is_final,
              hasFullTranscript: !!data.full_transcript,
              hasMessage: !!data.message
            });
            
            // Handle different types of messages
            console.log('🔄 Processing message based on type...');
            switch (data.type) {
              case 'transcription':
                console.log('📝 ==================== TRANSCRIPTION MESSAGE ====================');
                console.log('📝 Processing transcription message from Deepgram!');
                console.log('📊 Transcription Details:', {
                  text: data.text,
                  is_final: data.is_final,
                  full_transcript_length: data.full_transcript?.length || 0,
                  textPreview: data.text ? data.text.substring(0, 50) + '...' : 'No text'
                });
                console.log('📊 Transcription Flow:');
                console.log('   • Your voice → Microphone → MediaRecorder → WebSocket → Server');
                console.log('   • Server → Deepgram AI → Transcription → WebSocket → This app');
                
                // This is transcribed text from Deepgram
                if (data.text) {
                  if (data.is_final) {
                    // Final text - update main transcription
                    console.log('✅ ==================== FINAL TRANSCRIPTION ====================');
                    console.log('✅ Final transcription received - this is the confirmed text!');
                    console.log('📊 Final Text Details:', {
                      finalText: data.text,
                      fullTranscriptLength: data.full_transcript?.length || 0,
                      fullTranscriptPreview: data.full_transcript ? data.full_transcript.substring(0, 100) + '...' : 'No full transcript'
                    });
                    console.log('🔄 Updating main transcription state...');
                    setTranscription(data.full_transcript || '');
                    setInterimText(''); // Clear interim text
                    console.log('🔄 Cleared interim text (no longer needed)');
                    console.log('✅ UI updated with final transcription!');
                  } else {
                    // Interim text - show what's being processed
                    console.log('⏱️ ==================== INTERIM TRANSCRIPTION ====================');
                    console.log('⏱️ Interim transcription - live preview while speaking!');
                    console.log('📊 Interim Details:', {
                      interimText: data.text,
                      textLength: data.text.length,
                      isTemporary: true
                    });
                    console.log('📊 Interim vs Final:');
                    console.log('   • Interim = Live preview (may change as you continue speaking)');
                    console.log('   • Final = Confirmed text (won\'t change anymore)');
                    console.log('🔄 Updating interim text state...');
                    setInterimText(data.text);
                    console.log('✅ UI updated with interim transcription!');
                  }
                } else {
                  console.log('⚠️ Transcription message received but no text content');
                }
                break;
              
              case 'connection_status':
                console.log('🔗 ==================== CONNECTION STATUS MESSAGE ====================');
                console.log('🔗 Connection status update from server:', data.message);
                console.log('📊 Status Details:', {
                  newStatus: data.message,
                  timestamp: new Date().toISOString()
                });
                console.log('📊 Status Flow: Server monitoring → Status change → WebSocket → UI update');
                // Backend is telling us about connection status
                if (data.message) {
                  console.log('🔄 Updating connection status in UI...');
                  setConnectionStatus(data.message as ConnectionStatus);
                  console.log('✅ Connection status updated!');
                }
                break;
              
              case 'error':
                console.log('❌ ==================== ERROR MESSAGE ====================');
                console.log('❌ Error message received from backend:', data.message);
                console.log('📊 Error Details:', {
                  errorMessage: data.message,
                  timestamp: new Date().toISOString(),
                  source: 'WebSocket Server'
                });
                console.log('📊 Error Flow: Server error → WebSocket → Client error handling → UI error display');
                // Something went wrong on the backend
                console.log('🔄 Setting error state for UI display...');
                setError(data.message || 'Unknown error occurred');
                console.log('✅ Error state updated - user will see error message');
                break;
                
              default:
                console.log('⚠️ ==================== UNKNOWN MESSAGE TYPE ====================');
                console.log('⚠️ Received message with unknown type:', data.type);
                console.log('📊 Unknown Message Details:', data);
                break;
            }
            console.log('✅ Message processing complete!');
          } catch (error) {
            console.error('❌ ==================== MESSAGE PARSING ERROR ====================');
            console.error('❌ Error parsing WebSocket message:', error);
            console.log('📊 Parsing Error Details:', {
              errorType: error instanceof Error ? error.name : 'Unknown',
              errorMessage: error instanceof Error ? error.message : String(error),
              rawMessageData: event.data,
              dataType: typeof event.data,
              dataLength: event.data.length
            });
            console.log('📄 Raw message data that failed to parse:', event.data);
            console.log('💡 Possible causes:');
            console.log('   • Server sent invalid JSON');
            console.log('   • Message format changed');
            console.log('   • Network corruption');
          }
        };

        // 🔌 CONNECTION CLOSED - Backend disconnected
        ws.onclose = (event) => {
          console.log('🔌 ==================== WEBSOCKET CLOSED ====================');
          console.log('🔌 WebSocket connection closed!');
          console.log('📊 Close Event Details:', {
            code: event.code,
            reason: event.reason,
            wasClean: event.wasClean,
            timestamp: new Date().toISOString()
          });
          console.log('📊 Close Code Meaning:');
          const closeReasons: { [key: number]: string } = {
            1000: 'Normal closure',
            1001: 'Going away',
            1002: 'Protocol error',
            1003: 'Unsupported data',
            1006: 'Abnormal closure',
            1011: 'Server error',
            1015: 'TLS handshake failure'
          };
          console.log(`   • Code ${event.code}: ${closeReasons[event.code] || 'Unknown reason'}`);
          console.log('📊 Connection Lifecycle: CONNECTING → OPEN → CLOSING → CLOSED ✅');
          console.log('🔄 Updating UI connection status to Disconnected...');
          setConnectionStatus('Disconnected');
          console.log('✅ UI updated - user will see disconnected status');
        };

        // ❌ CONNECTION ERROR - Something went wrong
        ws.onerror = (error) => {
          console.error('❌ ==================== WEBSOCKET ERROR ====================');
          console.error('❌ WebSocket connection error occurred!');
          console.error('📊 Error Event:', error);
          console.log('📊 Common WebSocket Error Causes:');
          console.log('   • Backend server not running (most common)');
          console.log('   • Wrong URL or port number');
          console.log('   • Network connectivity issues');
          console.log('   • Firewall blocking connection');
          console.log('   • Server overloaded or crashed');
          console.log('🔄 Setting connection status to error state...');
          setConnectionStatus('Connection Error');
          console.log('🔄 Setting user-friendly error message...');
          setError('Connection failed. Make sure the backend is running.');
          console.log('🔄 Rejecting promise due to WebSocket error');
          console.log('❌ Connection attempt failed - promise will be rejected');
          reject(error); // Promise fails - connection failed
        };

      } catch (error) {
        console.error('❌ Failed to create WebSocket connection:', error);
        setConnectionStatus('Connection Error');
        setError('Failed to connect to backend');
        reject(error);
      }
    });
  };

  /**
   * 🎙️ START RECORDING FUNCTION
   * 
   * Initiates the voice recording process
   * 
   * PROCESS:
   * 1. Connect to WebSocket backend
   * 2. Request microphone permission from browser
   * 3. Create MediaRecorder to capture audio
   * 4. Set up audio streaming to backend
   * 5. Start recording with optimal settings
   * 
   * AUDIO SETTINGS:
   * - sampleRate: 16000 Hz (CD quality, good for speech recognition)
   * - channelCount: 1 (mono - single channel is sufficient for speech)
   * - echoCancellation: true (removes echo feedback)
   * - noiseSuppression: true (reduces background noise)
   */
  const startRecording = async () => {
    console.log('🎙️ startRecording called');
    console.log('📊 Pre-recording state:', {
      isRecording,
      connectionStatus,
      hasWebSocket: !!websocketRef.current,
      hasMediaRecorder: !!mediaRecorderRef.current,
      hasAudioStream: !!audioStreamRef.current
    });

    try {
      console.log('🔄 Clearing previous errors');
      setError(''); // Clear any previous errors
      
      // STEP 1: Connect to WebSocket backend first
      console.log('🌐 Step 1: Connecting to WebSocket backend');
      await connectWebSocket();
      console.log('✅ WebSocket connection established');
      
      // STEP 2: Request microphone access from browser
      // This will show a permission dialog to the user
      console.log('🎤 Step 2: Requesting microphone access with settings:', {
        sampleRate: 16000,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true
      });
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,        // 16kHz sample rate (good for speech)
          channelCount: 1,          // Mono audio (single channel)
          echoCancellation: true,   // Remove echo
          noiseSuppression: true    // Reduce background noise
        } 
      });
      
      console.log('✅ Microphone access granted:', {
        streamId: stream.id,
        streamActive: stream.active,
        trackCount: stream.getTracks().length,
        audioTracks: stream.getAudioTracks().map(track => ({
          id: track.id,
          label: track.label,
          enabled: track.enabled,
          readyState: track.readyState
        }))
      });
      
      // Store the audio stream for later cleanup
      audioStreamRef.current = stream;
      
      // STEP 3: Create MediaRecorder to capture and encode audio
      // WebM with Opus codec provides good compression for real-time streaming
      console.log('🎬 Step 3: Creating MediaRecorder with mimeType: audio/webm;codecs=opus');
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      console.log('📊 MediaRecorder created:', {
        state: mediaRecorder.state,
        mimeType: mediaRecorder.mimeType,
        audioBitsPerSecond: mediaRecorder.audioBitsPerSecond
      });
      
      mediaRecorderRef.current = mediaRecorder;
      
              // STEP 4: Set up audio data handler
        // This function runs every time MediaRecorder has audio data ready
        console.log('📡 Step 4: Setting up audio data handler');
        mediaRecorder.ondataavailable = (event) => {
          console.log('📡 ==================== AUDIO DATA AVAILABLE ====================');
          console.log('📡 MediaRecorder has audio data ready to send!');
          console.log('📊 Audio Data Details:', {
            dataSize: event.data.size,
            dataType: event.data.type,
            dataSizeKB: (event.data.size / 1024).toFixed(2) + ' KB',
            timestamp: new Date().toISOString(),
            websocketState: websocketRef.current?.readyState,
            websocketStateText: websocketRef.current ? 
              ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'][websocketRef.current.readyState] : 'null',
            websocketOpen: websocketRef.current?.readyState === WebSocket.OPEN
          });
          console.log('📊 Audio Data Flow:');
          console.log('   • Microphone captures sound waves');
          console.log('   • MediaRecorder converts to digital audio (WebM/Opus)');
          console.log('   • Audio split into 100ms chunks for real-time streaming');
          console.log('   • Each chunk triggers this ondataavailable event');
          console.log('   • We send chunk through WebSocket to server for transcription');
          
          // Only send if we have data and WebSocket is connected
          if (event.data.size > 0 && websocketRef.current?.readyState === WebSocket.OPEN) {
            console.log('✅ Conditions met for sending audio data:');
            console.log('   ✅ Data size > 0 (' + event.data.size + ' bytes)');
            console.log('   ✅ WebSocket is OPEN and ready');
            console.log('📤 ==================== SENDING AUDIO TO SERVER ====================');
            console.log('📤 Sending audio chunk to backend via WebSocket...');
            
            // Send raw audio data to backend for transcription
            websocketRef.current.send(event.data);
            
            console.log('✅ Audio data sent successfully!');
            console.log('📊 What happens next:');
            console.log('   • Server receives audio chunk');
            console.log('   • Server forwards to Deepgram for transcription');
            console.log('   • Deepgram processes audio and returns text');
            console.log('   • Server sends transcription back via WebSocket');
            console.log('   • We receive transcription in onmessage handler');
          } else {
            console.log('❌ ==================== NOT SENDING AUDIO ====================');
            console.log('❌ Cannot send audio data - conditions not met:');
            if (event.data.size === 0) {
              console.log('   ❌ No audio data available (size = 0)');
              console.log('   💡 This can happen if microphone is muted or no sound detected');
            } else {
              console.log('   ✅ Audio data available (' + event.data.size + ' bytes)');
            }
            
            if (websocketRef.current?.readyState !== WebSocket.OPEN) {
              console.log('   ❌ WebSocket not open (state: ' + 
                (websocketRef.current ? 
                  ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'][websocketRef.current.readyState] : 'null') + ')');
              console.log('   💡 WebSocket must be OPEN to send data');
            } else {
              console.log('   ✅ WebSocket is OPEN and ready');
            }
            
            console.log('⚠️ Audio chunk will be discarded (not sent to server)');
          }
        };
      
      // STEP 5: Start recording
      // 100ms intervals = send audio data every 100 milliseconds for real-time processing
      console.log('🎬 Step 5: Starting MediaRecorder with 100ms intervals');
      mediaRecorder.start(100);
      
      console.log('🔄 Setting isRecording to true');
      setIsRecording(true); // Update UI state
      
      console.log('✅ Recording started successfully');
      
    } catch (error) {
      console.error('❌ Error starting recording:', error);
      console.log('📊 Error details:', {
        errorName: error instanceof Error ? error.name : 'Unknown',
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined
      });
      setError('Failed to start recording. Please check microphone permissions.');
    }
  };

  /**
   * 🛑 STOP RECORDING FUNCTION
   * 
   * Stops the recording and automatically generates AI summary
   * 
   * PROCESS:
   * 1. Stop MediaRecorder
   * 2. Stop and cleanup audio stream
   * 3. Close WebSocket connection
   * 4. Wait briefly for final transcription
   * 5. Automatically generate AI summary
   * 
   * AUTO-SUMMARY FEATURE:
   * After stopping, the app automatically generates a summary
   * This provides immediate value without requiring extra clicks
   */
  const stopRecording = () => {
    console.log('🛑 stopRecording called');
    
    try {
      // 🔍 DEBUG: Log initial stopRecording state
      console.log('🛑 stopRecording called', {
        isRecording,
        mediaRecorderState: mediaRecorderRef.current?.state,
        hasAudioStream: !!audioStreamRef.current,
        hasWebSocket: !!websocketRef.current,
        transcriptionLength: transcription.length,
      });
      
      // STEP 1: Stop the MediaRecorder if it's active
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        console.log('🎬 Stopping MediaRecorder (current state:', mediaRecorderRef.current.state + ')');
        mediaRecorderRef.current.stop();
        console.log('✅ MediaRecorder stopped');
      } else {
        console.log('⚠️ MediaRecorder not active or not available:', {
          hasMediaRecorder: !!mediaRecorderRef.current,
          state: mediaRecorderRef.current?.state
        });
      }
      
      // STEP 2: Stop the audio stream and release microphone
      if (audioStreamRef.current) {
        console.log('🔊 Stopping audio stream tracks');
        const tracks = audioStreamRef.current.getTracks();
        console.log('📊 Audio tracks to stop:', tracks.length);
        
        // Stop all audio tracks (releases microphone access)
        tracks.forEach((track, index) => {
          console.log(`🛑 Stopping track ${index}:`, {
            id: track.id,
            label: track.label,
            readyState: track.readyState
          });
          track.stop();
        });
        
        audioStreamRef.current = null;
        console.log('✅ Audio stream tracks stopped and reference cleared');
      } else {
        console.log('⚠️ No audio stream to stop');
      }
      
      // STEP 3: Close WebSocket connection
      if (websocketRef.current) {
        console.log('🔌 ==================== CLOSING WEBSOCKET ====================');
        console.log('🔌 Closing WebSocket connection...');
        console.log('📊 WebSocket State Before Closing:', {
          readyState: websocketRef.current.readyState,
          readyStateText: ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'][websocketRef.current.readyState],
          url: websocketRef.current.url,
          bufferedAmount: websocketRef.current.bufferedAmount
        });
        console.log('📊 Why Close WebSocket?');
        console.log('   • Recording stopped - no more audio to send');
        console.log('   • Prevents unnecessary network connection');
        console.log('   • Cleans up resources properly');
        console.log('   • Server can free up connection slot');
        
        console.log('🔄 Calling websocket.close()...');
        websocketRef.current.close();
        console.log('🔄 Clearing WebSocket reference...');
        websocketRef.current = null;
        console.log('✅ WebSocket closed and reference cleared');
        console.log('📊 Connection Lifecycle Complete: CONNECTING → OPEN → CLOSING → CLOSED ✅');
      } else {
        console.log('⚠️ ==================== NO WEBSOCKET TO CLOSE ====================');
        console.log('⚠️ No WebSocket connection to close');
        console.log('💡 This can happen if:');
        console.log('   • Connection was never established');
        console.log('   • Connection already closed due to error');
        console.log('   • Multiple stop recording calls');
      }
      
      // STEP 4: Update UI state
      console.log('🔄 Setting isRecording to false');
      setIsRecording(false);
      console.log('✅ isRecording state updated to false');
      
      // STEP 5: 🤖 AUTO-GENERATE SUMMARY
      // Wait 1 second for any final transcription to arrive, then generate summary
      console.log('⏰ Setting timeout for auto-summary generation (1 second)');
      setTimeout(() => {
        console.log('⏰ Timeout reached for auto-summary');
        console.log('📊 Current transcription length:', transcription.length);
        console.log('📄 Transcription preview:', transcription.substring(0, 100) + '...');
        
        if (transcription.trim()) { // Only if we have transcribed text
          console.log('🤖 Transcription available - generating summary automatically');
          generateSummary();
        } else {
          console.log('⚠️ No transcription available - skipping auto-summary');
        }
      }, 1000);
      
    } catch (error) {
      console.error('❌ Error stopping recording:', error);
      console.log('📊 Stop recording error details:', {
        errorName: error instanceof Error ? error.name : 'Unknown',
        errorMessage: error instanceof Error ? error.message : String(error)
      });
      setError('Error stopping recording');
    }
  };

  /**
   * 🤖 GENERATE AI SUMMARY FUNCTION
   * 
   * Sends transcribed text to backend for AI analysis using Google Gemini
   * 
   * PROCESS:
   * 1. Validate we have text to summarize
   * 2. Send POST request to backend /api/summarize endpoint
   * 3. Backend forwards to Google Gemini AI
   * 4. Receive structured summary with key points, action items, etc.
   * 5. Display results in UI
   * 
   * SUMMARY TYPES:
   * - 'meeting': Comprehensive meeting summary (default)
   * - 'action_items': Focus on tasks and to-dos
   * - 'key_points': Main takeaways and important points
   * - 'speaker_analysis': Per-speaker breakdown (if diarization enabled)
   * 
   * @param summaryType - Type of summary to generate
   */
  const generateSummary = async (summaryType: SummaryType = 'meeting') => {
    console.log('🤖 generateSummary called with type:', summaryType);
    
    // Validate we have content to summarize
    if (!transcription.trim()) {
      console.log('❌ No transcription available to summarize');
      setError('No transcription available to summarize');
      return;
    }

    console.log('📊 Transcription validation passed:', {
      transcriptionLength: transcription.length,
      transcriptionPreview: transcription.substring(0, 200) + '...'
    });

    // Update UI to show loading state
    console.log('🔄 Setting loading states');
    setIsGeneratingSummary(true);
    setAiSummary(null); // Clear previous summary
    setError(''); // Clear any errors
    
    // 🔍 DEBUG: Preparing to generate summary
    console.log('generateSummary called', {
      summaryType,
      transcriptionLength: transcription.length,
    });

    try {
      // Send HTTP POST request to backend
      console.log('📤 Sending POST request to /api/summarize');
      console.log('📊 Request payload:', {
        textLength: transcription.length,
        summaryType: summaryType,
        endpoint: 'http://localhost:8000/api/summarize'
      });
      
      const response = await fetch('http://localhost:8000/api/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json', // Tell server we're sending JSON
        },
        body: JSON.stringify({
          text: transcription,        // The transcribed text to analyze
          summary_type: summaryType   // What kind of summary we want
        }),
      });

      console.log('📨 Response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });

      // Check if request was successful
      if (!response.ok) {
        console.log('❌ Response not OK:', response.status);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Parse the JSON response from backend
      console.log('📊 Parsing JSON response');
      const summary: AISummary = await response.json();
      console.log('✅ Summary received and parsed:', {
        hasSummary: !!summary.summary,
        hasKeyPoints: !!(summary.key_points && summary.key_points.length > 0),
        hasActionItems: !!(summary.action_items && summary.action_items.length > 0),
        hasError: !!summary.error,
        summaryPreview: summary.summary?.substring(0, 100) + '...'
      });
      
      console.log('🔄 Setting AI summary state');
      setAiSummary(summary); // Update UI with summary

    } catch (error) {
      console.error('❌ Error generating summary:', error);
      console.log('📊 Summary generation error details:', {
        errorName: error instanceof Error ? error.name : 'Unknown',
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined
      });
      setError('Failed to generate AI summary. Please check if the backend is running.');
    } finally {
      // Always turn off loading state, whether success or failure
      console.log('🔄 Setting isGeneratingSummary to false');
      setIsGeneratingSummary(false);
    }
  };

  /**
   * 🧹 CLEAR FUNCTION
   * 
   * Resets the application to initial state
   * Useful for starting a new recording session
   */
  const clearAll = () => {
    console.log('🧹 clearAll called - resetting application state');
    console.log('📊 State before clearing:', {
      transcriptionLength: transcription.length,
      interimTextLength: interimText.length,
      hasAiSummary: !!aiSummary,
      hasError: !!error
    });
    
    setTranscription('');     // Clear transcribed text
    setInterimText('');       // Clear interim text
    setAiSummary(null);       // Clear AI summary
    setError('');             // Clear error messages
    
    console.log('✅ All state cleared');
  };

  /**
   * 🎨 RENDER FUNCTION
   * 
   * This is the JSX that defines what the user sees
   * JSX is HTML-like syntax that React converts to DOM elements
   * 
   * STRUCTURE:
   * - Header with app title
   * - Main content area with:
   *   - Text display box (transcription + interim text)
   *   - Control buttons (Start/Stop, Clear)
   *   - Summary section (when available)
   *   - Error display (when needed)
   *   - Status indicator
   */
  
  console.log('🎨 Rendering UI with current state:', {
    isRecording,
    connectionStatus,
    transcriptionLength: transcription.length,
    interimTextLength: interimText.length,
    hasError: !!error,
    hasAiSummary: !!aiSummary,
    isGeneratingSummary,
    showSummarySection: !!(aiSummary || isGeneratingSummary),
    clearButtonDisabled: !transcription && !aiSummary,
    recordButtonDisabled: connectionStatus === 'Connection Error'
  });

  return (
    <div className="simple-app">
      
      {/* 🏠 SIMPLE HEADER */}
      <div className="simple-header">
        <h1>🎤 Voice to Text</h1>
      </div>

      {/* 📱 MAIN CONTENT CONTAINER */}
      <div className="simple-main">
        
        {/* 📝 TEXT DISPLAY BOX */}
        {/* This shows the transcribed text and real-time interim text */}
        <div className="simple-textbox">
          
          {/* Final transcribed text - this is the "official" transcription */}
          {transcription && (
            <div className="transcription-text">{transcription}</div>
          )}
          
          {/* Interim text - shows what's being transcribed right now */}
          {/* This gives immediate feedback while speaking */}
          {interimText && (
            <div className="interim-text">{interimText}</div>
          )}
          
          {/* Placeholder text when nothing is transcribed yet */}
          {!transcription && !interimText && (
            <div className="placeholder-text">
              Click "Start" to begin recording...
            </div>
          )}
        </div>

        {/* 🎛️ CONTROL BUTTONS */}
        <div className="simple-controls">
          
          {/* MAIN RECORD/STOP BUTTON */}
          {/* This button changes based on recording state */}
          <button
            className={`simple-btn ${isRecording ? 'stop-btn' : 'start-btn'}`}
            onClick={() => {
              console.log('🖱️ Record/Stop button clicked:', {
                currentState: isRecording ? 'recording' : 'stopped',
                action: isRecording ? 'stopRecording' : 'startRecording'
              });
              return isRecording ? stopRecording() : startRecording();
            }}
            disabled={connectionStatus === 'Connection Error'} // Disable if connection failed
          >
            {isRecording ? (
              // STOP STATE: Show stop icon and "Stop & Summarize" text
              <>
                <MicOff size={20} />
                Stop & Summarize
              </>
            ) : (
              // START STATE: Show microphone icon and "Start Recording" text
              <>
                <Mic size={20} />
                Start Recording
              </>
            )}
          </button>
          
          {/* CLEAR BUTTON */}
          {/* Only enabled when there's content to clear */}
          <button
            className="simple-btn clear-btn"
            onClick={() => {
              console.log('🖱️ Clear button clicked');
              clearAll();
            }}
            disabled={!transcription && !aiSummary} // Disable if nothing to clear
          >
            Clear
          </button>
        </div>

        {/* 🤖 AI SUMMARY SECTION */}
        {/* Only show this section when generating summary or have results */}
        {(aiSummary || isGeneratingSummary) && (
          <div className="simple-summary">
            <h3>📝 Summary</h3>
            
            {/* LOADING STATE */}
            {isGeneratingSummary && (
              <div className="loading-text">Generating summary...</div>
            )}
            
            {/* SUMMARY RESULTS */}
            {aiSummary && !isGeneratingSummary && (
              <div className="summary-content">
                
                {/* ERROR HANDLING */}
                {aiSummary.error ? (
                  <div className="error-text">❌ {aiSummary.error}</div>
                ) : (
                  <>
                    {/* MAIN SUMMARY */}
                    {aiSummary.summary && (
                      <div className="summary-section">
                        <strong>Summary:</strong>
                        <p>{aiSummary.summary}</p>
                      </div>
                    )}
                    
                    {/* KEY POINTS */}
                    {aiSummary.key_points && aiSummary.key_points.length > 0 && (
                      <div className="summary-section">
                        <strong>Key Points:</strong>
                        <ul>
                          {aiSummary.key_points.map((point, index) => (
                            <li key={index}>{point}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {/* ACTION ITEMS */}
                    {aiSummary.action_items && aiSummary.action_items.length > 0 && (
                      <div className="summary-section">
                        <strong>Action Items:</strong>
                        <ul>
                          {aiSummary.action_items.map((item, index) => (
                            <li key={index}>
                              {item.task}
                              {item.responsible_party && ` - ${item.responsible_party}`}
                              {item.deadline && ` (Due: ${item.deadline})`}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* ⚠️ ERROR DISPLAY */}
        {/* Shows error messages when things go wrong */}
        {error && (
          <div className="simple-error">
            ⚠️ {error}
          </div>
        )}
        
        {/* 📊 CONNECTION STATUS */}
        {/* Shows current connection status for debugging */}
        <div className="simple-status">
          Status: {connectionStatus}
        </div>
      </div>
    </div>
  );
}

// Export the App component so it can be imported in other files
export default App; 