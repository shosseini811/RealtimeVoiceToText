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

  // 🔗 REFS FOR PERSISTENT OBJECTS
  // useRef creates references to objects that persist across re-renders
  // These don't trigger re-renders when changed (unlike useState)
  
  // WebSocket connection - maintains real-time connection to backend
  const websocketRef = useRef<WebSocket | null>(null);
  
  // MediaRecorder - handles recording audio from microphone
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  
  // Audio stream - the actual microphone audio stream
  const audioStreamRef = useRef<MediaStream | null>(null);

  // 🧹 CLEANUP EFFECT
  // useEffect with empty dependency array [] runs once when component mounts
  // The return function runs when component unmounts (cleanup)
  useEffect(() => {
    return () => {
      // Clean up resources when component is destroyed
      stopRecording();
      if (websocketRef.current) {
        websocketRef.current.close();
      }
    };
  }, []); // Empty array means this effect runs only once

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
    return new Promise((resolve, reject) => {
      try {
        // Update UI to show we're trying to connect
        setConnectionStatus('Connecting');
        
        // Create new WebSocket connection to backend
        const ws = new WebSocket('ws://localhost:8000/ws');
        websocketRef.current = ws;

        // 🎉 CONNECTION OPENED - Backend is ready to receive audio
        ws.onopen = () => {
          console.log('WebSocket connected');
          setConnectionStatus('Connected');
          setError(''); // Clear any previous errors
          resolve(); // Promise succeeds - connection established
        };

        // 📨 MESSAGE RECEIVED - Backend sent us transcription data
        ws.onmessage = (event) => {
          try {
            // Parse JSON message from backend
            const data: TranscriptionMessage = JSON.parse(event.data);
            
            // Handle different types of messages
            switch (data.type) {
              case 'transcription':
                // This is transcribed text from Deepgram
                if (data.text) {
                  if (data.is_final) {
                    // Final text - update main transcription
                    setTranscription(data.full_transcript || '');
                    setInterimText(''); // Clear interim text
                  } else {
                    // Interim text - show what's being processed
                    setInterimText(data.text);
                  }
                }
                break;
              
              case 'connection_status':
                // Backend is telling us about connection status
                if (data.message) {
                  setConnectionStatus(data.message as ConnectionStatus);
                }
                break;
              
              case 'error':
                // Something went wrong on the backend
                setError(data.message || 'Unknown error occurred');
                break;
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        // 🔌 CONNECTION CLOSED - Backend disconnected
        ws.onclose = () => {
          console.log('WebSocket disconnected');
          setConnectionStatus('Disconnected');
        };

        // ❌ CONNECTION ERROR - Something went wrong
        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          setConnectionStatus('Connection Error');
          setError('Connection failed. Make sure the backend is running.');
          reject(error); // Promise fails - connection failed
        };

      } catch (error) {
        console.error('Failed to create WebSocket connection:', error);
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
    try {
      setError(''); // Clear any previous errors
      
      // STEP 1: Connect to WebSocket backend first
      await connectWebSocket();
      
      // STEP 2: Request microphone access from browser
      // This will show a permission dialog to the user
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,        // 16kHz sample rate (good for speech)
          channelCount: 1,          // Mono audio (single channel)
          echoCancellation: true,   // Remove echo
          noiseSuppression: true    // Reduce background noise
        } 
      });
      
      // Store the audio stream for later cleanup
      audioStreamRef.current = stream;
      
      // STEP 3: Create MediaRecorder to capture and encode audio
      // WebM with Opus codec provides good compression for real-time streaming
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      
      // STEP 4: Set up audio data handler
      // This function runs every time MediaRecorder has audio data ready
      mediaRecorder.ondataavailable = (event) => {
        // Only send if we have data and WebSocket is connected
        if (event.data.size > 0 && websocketRef.current?.readyState === WebSocket.OPEN) {
          // Send raw audio data to backend for transcription
          websocketRef.current.send(event.data);
        }
      };
      
      // STEP 5: Start recording
      // 100ms intervals = send audio data every 100 milliseconds for real-time processing
      mediaRecorder.start(100);
      setIsRecording(true); // Update UI state
      
    } catch (error) {
      console.error('Error starting recording:', error);
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
    try {
      // STEP 1: Stop the MediaRecorder if it's active
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      
      // STEP 2: Stop the audio stream and release microphone
      if (audioStreamRef.current) {
        // Stop all audio tracks (releases microphone access)
        audioStreamRef.current.getTracks().forEach(track => track.stop());
        audioStreamRef.current = null;
      }
      
      // STEP 3: Close WebSocket connection
      if (websocketRef.current) {
        websocketRef.current.close();
        websocketRef.current = null;
      }
      
      // STEP 4: Update UI state
      setIsRecording(false);
      
      // STEP 5: 🤖 AUTO-GENERATE SUMMARY
      // Wait 1 second for any final transcription to arrive, then generate summary
      setTimeout(() => {
        if (transcription.trim()) { // Only if we have transcribed text
          generateSummary();
        }
      }, 1000);
      
    } catch (error) {
      console.error('Error stopping recording:', error);
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
    // Validate we have content to summarize
    if (!transcription.trim()) {
      setError('No transcription available to summarize');
      return;
    }

    // Update UI to show loading state
    setIsGeneratingSummary(true);
    setAiSummary(null); // Clear previous summary
    setError(''); // Clear any errors

    try {
      // Send HTTP POST request to backend
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

      // Check if request was successful
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Parse the JSON response from backend
      const summary: AISummary = await response.json();
      setAiSummary(summary); // Update UI with summary

    } catch (error) {
      console.error('Error generating summary:', error);
      setError('Failed to generate AI summary. Please check if the backend is running.');
    } finally {
      // Always turn off loading state, whether success or failure
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
    setTranscription('');     // Clear transcribed text
    setInterimText('');       // Clear interim text
    setAiSummary(null);       // Clear AI summary
    setError('');             // Clear error messages
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
            onClick={isRecording ? stopRecording : startRecording}
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
            onClick={clearAll}
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