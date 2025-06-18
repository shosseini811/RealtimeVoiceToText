// 📦 IMPORTS - Bringing in code from other files and libraries

// React core - the main library for building user interfaces
import React, { useState, useEffect, useRef } from 'react';

// Lucide React - beautiful icons for our buttons and UI
// Each icon is imported as a component we can use like <Mic />
import { Mic, MicOff, FileText, Trash2, Copy, Sparkles, CheckCircle } from 'lucide-react';

// Our custom CSS styles for making the app look good
import './App.css';

// TypeScript type definitions - these help prevent bugs by defining data shapes
import { TranscriptionMessage, AISummary, ConnectionStatus, SummaryType, DeepgramFeatures } from './types';

/**
 * Main App Component
 * This is the heart of our AI Note Taker application
 */
function App() {
  // State Management with TypeScript - Enhanced for new features
  // Each state variable has a specific type, which helps prevent bugs
  
  // 🎤 RECORDING STATE: useState<boolean> creates a true/false state variable
  // - isRecording: current value (starts as false = not recording)
  // - setIsRecording: function to update the value (e.g., setIsRecording(true))
  const [isRecording, setIsRecording] = useState<boolean>(false);
  
  // 📝 TRANSCRIPTION TEXT: useState<string> creates a text state variable
  // - transcription: holds the final transcribed text (starts as empty string '')
  // - setTranscription: function to update the text (e.g., setTranscription("Hello world"))
  // This is the main text that users see in the transcription panel
  const [transcription, setTranscription] = useState<string>('');
  
  // ⏱️ INTERIM TEXT: useState<string> for temporary/live text
  // - interimText: holds text that's being processed but not final yet
  // - setInterimText: updates the temporary text as speech is being recognized
  const [interimText, setInterimText] = useState<string>('');
  
  // 🔗 CONNECTION STATUS: useState with custom type 'ConnectionStatus'
  // - connectionStatus: current connection state ('Connected', 'Disconnected', etc.)
  // - setConnectionStatus: updates connection status for user feedback
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('Disconnected');
  
  // ⚠️ ERROR MESSAGES: useState<string> for error handling
  // - error: holds any error message to show user (starts empty)
  // - setError: function to set/clear error messages
  const [error, setError] = useState<string>('');
  
  // 🤖 AI SUMMARY: useState with union type (AISummary OR null)
  // - aiSummary: holds the AI-generated summary object, or null if none exists
  // - setAiSummary: function to store the summary when AI processing is complete
  const [aiSummary, setAiSummary] = useState<AISummary | null>(null);
  
  // ⏳ LOADING STATE: useState<boolean> for showing loading indicators
  // - isGeneratingSummary: true when AI is working, false when done
  // - setIsGeneratingSummary: controls loading spinner visibility
  const [isGeneratingSummary, setIsGeneratingSummary] = useState<boolean>(false);
  
  // ✅ SUCCESS FEEDBACK: useState<boolean> for user feedback
  // - copySuccess: true briefly after successful copy, then back to false
  // - setCopySuccess: shows checkmark icon when copy operation succeeds
  const [copySuccess, setCopySuccess] = useState<boolean>(false);

  // 🆕 NEW: Enhanced features state - Advanced useState examples
  
  // 👤 CURRENT SPEAKER: useState with union type (number OR undefined)
  // - currentSpeaker: which speaker is talking (0, 1, 2...) or undefined if unknown
  // - setCurrentSpeaker: updates when speaker detection identifies who's speaking
  const [currentSpeaker, setCurrentSpeaker] = useState<number | undefined>(undefined);
  
  // 🚀 FEATURES STATUS: useState with custom type OR undefined
  // - featuresStatus: object containing info about active Deepgram features
  // - setFeaturesStatus: updates when we receive feature information from backend
  const [featuresStatus, setFeaturesStatus] = useState<DeepgramFeatures | undefined>(undefined);
  
  // 🔢 SPEAKER COUNT: useState<number> for counting speakers
  // - speakerCount: total number of different speakers detected (starts at 0)
  // - setSpeakerCount: increments as new speakers are identified
  const [speakerCount, setSpeakerCount] = useState<number>(0);
  
  // 💬 LAST MESSAGE: useState with complex type (object OR null)
  // - lastMessage: stores the most recent message from the backend
  // - setLastMessage: updates with each new transcription message received
  const [lastMessage, setLastMessage] = useState<TranscriptionMessage | null>(null);

  // 🔗 REFS FOR PERSISTENT OBJECTS - useRef Hook Explained
  // useRef is different from useState! Key differences:
  // ❌ useState: Changes trigger re-renders, value resets on each render
  // ✅ useRef: Changes DON'T trigger re-renders, value persists between renders
  
  // 🌐 WEBSOCKET REF: useRef<WebSocket | null> creates a persistent reference
  // - websocketRef.current: holds the actual WebSocket connection (or null)
  // - Why useRef? WebSocket needs to stay alive between renders without causing re-renders
  // - Usage: websocketRef.current = new WebSocket('ws://...') to store connection
  // - Check: if (websocketRef.current?.readyState === WebSocket.OPEN) to use it
  const websocketRef = useRef<WebSocket | null>(null);
  
  // 🎙️ MEDIA RECORDER REF: useRef<MediaRecorder | null> for audio recording
  // - mediaRecorderRef.current: holds the MediaRecorder instance (or null)
  // - Why useRef? MediaRecorder must persist across renders to keep recording
  // - Usage: mediaRecorderRef.current = new MediaRecorder(stream) to store recorder
  // - Control: mediaRecorderRef.current.start() and .stop() to control recording
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  
  // 🔊 AUDIO STREAM REF: useRef<MediaStream | null> for microphone stream
  // - audioStreamRef.current: holds the audio stream from user's microphone (or null)
  // - Why useRef? Stream needs to persist to avoid losing microphone access
  // - Usage: audioStreamRef.current = stream from getUserMedia()
  // - Cleanup: audioStreamRef.current.getTracks().forEach(track => track.stop())
  const audioStreamRef = useRef<MediaStream | null>(null);

  // 🧹 CLEANUP EFFECT - useEffect Hook for Component Lifecycle
  // useEffect with empty dependency array [] runs ONCE when component mounts
  // The return function runs when component UNMOUNTS (user leaves the page)
  // This prevents memory leaks and ensures proper cleanup
  useEffect(() => {
    // This return function is called "cleanup function"
    // It runs when the component is about to be destroyed
    return () => {
      // Stop any active recording to free up microphone
      stopRecording();
      
      // Close WebSocket connection to prevent hanging connections
      // The ?. is "optional chaining" - only calls .close() if websocketRef.current exists
      if (websocketRef.current) {
        websocketRef.current.close();
      }
    };
  }, []); // Empty array [] means "run once on mount, cleanup on unmount"

  /**
   * 🌐 WEBSOCKET CONNECTION FUNCTION
   * This function creates a real-time connection to our Python backend
   * Returns a Promise - this means it's asynchronous (takes time to complete)
   */
  const connectWebSocket = (): Promise<void> => {
    // Promise is like saying "I'll do this task, and when I'm done, I'll tell you if it worked or failed"
    // resolve() = "Success! Connection worked!"
    // reject() = "Failed! Something went wrong!"
    return new Promise((resolve, reject) => {
      try {
        // Update UI to show we're trying to connect
        setConnectionStatus('Connecting');
        
        // Create new WebSocket connection to our Python backend
        // 'ws://localhost:8000/ws' is the address of our backend server
        const ws = new WebSocket('ws://localhost:8000/ws');
        
        // Store the WebSocket in our ref so it persists between renders
        websocketRef.current = ws;

        // 🎉 CONNECTION OPENED - This runs when connection succeeds
        ws.onopen = () => {
          console.log('WebSocket connected');
          setConnectionStatus('Connected');
          setError(''); // Clear any previous errors
          resolve(); // Tell the Promise "Success!"
        };

        // 📨 MESSAGE RECEIVED - This runs every time we get data from backend
        ws.onmessage = (event) => {
          try {
            // Convert JSON string back to JavaScript object
            // TypeScript checks that it matches TranscriptionMessage type
            const data: TranscriptionMessage = JSON.parse(event.data);
            setLastMessage(data); // Store for debugging/reference
            
            // Handle different types of messages from backend
            switch (data.type) {
              case 'transcription':
                // This is speech-to-text data!
                if (data.text) {
                  // 👤 SPEAKER DETECTION - Check if we know who's speaking
                  if (data.speaker !== undefined) {
                    setCurrentSpeaker(data.speaker); // Update current speaker (0, 1, 2...)
                    // Math.max ensures speakerCount only goes up, never down
                    // ?? 0 means "if data.speaker is null/undefined, use 0"
                    setSpeakerCount(prev => Math.max(prev, (data.speaker ?? 0) + 1));
                  }
                  
                  // 🚀 ENHANCED FEATURES - Check if advanced features are active
                  if (data.features_used) {
                    setFeaturesStatus(data.features_used);
                    setConnectionStatus('Enhanced Features Active');
                  }
                  
                  // 📝 TEXT HANDLING - Decide where to put the transcribed text
                  if (data.is_final) {
                    // Final result - this text is confirmed and won't change
                    setTranscription(data.full_transcript || '');
                    setInterimText(''); // Clear temporary text
                  } else {
                    // Interim result - this text might still change as person keeps talking
                    setInterimText(data.text);
                  }
                }
                break;
              
              // 🔗 CONNECTION STATUS UPDATES from backend
              case 'connection_opened':
                setConnectionStatus('Connected to Deepgram');
                break;
              
              case 'connection_closed':
                setConnectionStatus('Disconnected');
                break;
              
              // ⚠️ ERROR HANDLING - Backend is telling us something went wrong
              case 'error':
                setError(data.message || 'Unknown error occurred');
                setConnectionStatus('Connection Error');
                break;
            }
          } catch (err) {
            // If we can't parse the JSON message, log the error
            console.error('Error parsing message:', err);
          }
        };

        // ❌ CONNECTION ERROR - This runs if connection fails
        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          setError('Connection error occurred');
          setConnectionStatus('Connection Error');
          reject(error); // Tell the Promise "Failed!"
        };

        // 👋 CONNECTION CLOSED - This runs when connection ends
        ws.onclose = () => {
          console.log('WebSocket disconnected');
          setConnectionStatus('Disconnected');
          websocketRef.current = null; // Clear the ref
        };

      } catch (error) {
        // If creating WebSocket fails immediately
        console.error('Failed to create WebSocket:', error);
        setError('Failed to create connection');
        setConnectionStatus('Connection Error');
        reject(error); // Tell the Promise "Failed!"
      }
    });
  };

  /**
   * 🎙️ START RECORDING FUNCTION
   * This function starts the audio recording process and connects to our backend
   * It's an async function because it involves waiting for user permission and network connections
   */
  const startRecording = async () => {
    try {
      // Clear any previous error messages before starting
      setError('');
      
      // 🌐 STEP 1: Connect to WebSocket (our backend server)
      // This creates a real-time connection for sending audio data
      await connectWebSocket();
      
      // 🎤 STEP 2: Request microphone access from user's browser
      // navigator.mediaDevices.getUserMedia() asks for permission to use microphone
      // { audio: true } means we want audio access (not video)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Store the audio stream in our ref so it persists between renders
      audioStreamRef.current = stream;
      
      // 📊 STEP 3: Create MediaRecorder to capture audio data
      // MediaRecorder converts the microphone stream into data chunks we can send
      const mediaRecorder = new MediaRecorder(stream, {
        // mimeType specifies the audio format - webm is widely supported
        mimeType: 'audio/webm;codecs=opus'
      });
      
      // Store the MediaRecorder in our ref
      mediaRecorderRef.current = mediaRecorder;
      
      // 🎵 STEP 4: Set up event handlers for MediaRecorder
      
      // ondataavailable fires when audio data is ready to send
      mediaRecorder.ondataavailable = (event) => {
        // event.data contains the audio chunk (a Blob of audio data)
        if (event.data.size > 0 && websocketRef.current?.readyState === WebSocket.OPEN) {
          // Convert the audio Blob to ArrayBuffer then to bytes for sending
          event.data.arrayBuffer().then(buffer => {
            // Send the raw audio bytes to our backend through WebSocket
            websocketRef.current?.send(buffer);
          });
        }
      };
      
      // onerror fires if something goes wrong with recording
      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        setError('Recording error occurred');
        stopRecording(); // Stop recording if there's an error
      };
      
      // 🚀 STEP 5: Start recording!
      // timeslice: 100 means send audio data every 100 milliseconds (10 times per second)
      // This creates a smooth real-time experience
      mediaRecorder.start(100);
      
      // Update our UI state to show we're recording
      setIsRecording(true);
      
    } catch (error) {
      // Handle any errors that occurred during setup
      console.error('Error starting recording:', error);
      
      // Show user-friendly error messages based on what went wrong
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          setError('Microphone access denied. Please allow microphone access and try again.');
        } else if (error.name === 'NotFoundError') {
          setError('No microphone found. Please connect a microphone and try again.');
        } else {
          setError(`Failed to start recording: ${error.message}`);
        }
      } else {
        setError('Failed to start recording. Please try again.');
      }
    }
  };

  /**
   * 🛑 STOP RECORDING FUNCTION
   * This function stops the recording and cleans up all resources
   */
  const stopRecording = () => {
    // Update UI state first
    setIsRecording(false);
    
    // 🎤 STOP MEDIA RECORDER
    // Check if MediaRecorder exists and is currently recording
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop(); // Stop capturing audio
    }
    
    // 🔊 STOP AUDIO STREAM (release microphone)
    // This is important - it turns off the microphone and stops the red recording indicator
    if (audioStreamRef.current) {
      // getTracks() returns all audio/video tracks, forEach stops each one
      audioStreamRef.current.getTracks().forEach(track => track.stop());
      audioStreamRef.current = null; // Clear the reference
    }
    
    // 🌐 CLOSE WEBSOCKET CONNECTION
    // Clean up the network connection to our backend
    if (websocketRef.current?.readyState === WebSocket.OPEN) {
      websocketRef.current.close();
    }
    
    // Clear connection status
    setConnectionStatus('Disconnected');
  };

  /**
   * 🤖 GENERATE AI SUMMARY FUNCTION
   * This function sends the transcribed text to our backend for AI processing
   * summaryType parameter lets us request different types of summaries
   */
  const generateSummary = async (summaryType: SummaryType = 'meeting') => {
    // Check if we have any text to summarize
    if (!transcription.trim()) {
      setError('No transcription available to summarize');
      return;
    }
    
    try {
      // Show loading state to user
      setIsGeneratingSummary(true);
      setError(''); // Clear any previous errors
      
      // 📡 SEND REQUEST TO BACKEND
      // fetch() is like making a phone call to our Python backend
      const response = await fetch('http://localhost:8000/api/summarize', {
        method: 'POST', // POST means we're sending data (not just requesting)
        headers: {
          'Content-Type': 'application/json', // Tell backend we're sending JSON data
        },
        // Convert our data to JSON string for sending
        body: JSON.stringify({
          text: transcription,      // The transcribed text to summarize
          summary_type: summaryType // What kind of summary we want
        }),
      });
      
      // Check if the request was successful
      if (!response.ok) {
        // response.ok is false for error status codes (404, 500, etc.)
        throw new Error(`Server error: ${response.status}`);
      }
      
      // Convert the response back from JSON to JavaScript object
      const summaryData = await response.json();
      
      // Store the AI summary in our state for display
      setAiSummary(summaryData);
      
    } catch (error) {
      // Handle any errors that occurred
      console.error('Error generating summary:', error);
      if (error instanceof Error) {
        setError(`Failed to generate summary: ${error.message}`);
      } else {
        setError('Failed to generate summary. Please try again.');
      }
    } finally {
      // Hide loading state (this runs whether success or error)
      setIsGeneratingSummary(false);
    }
  };

  /**
   * 🧹 CLEAR ALL FUNCTION
   * This function resets the app to its initial state
   */
  const clearAll = () => {
    // Reset all text content
    setTranscription('');     // Clear final transcription
    setInterimText('');       // Clear temporary text
    setAiSummary(null);       // Clear AI summary
    setError('');             // Clear error messages
    
    // Reset enhanced features state
    setCurrentSpeaker(undefined);  // Clear current speaker
    setFeaturesStatus(undefined);  // Clear features status
    setSpeakerCount(0);            // Reset speaker count
    setLastMessage(null);          // Clear last message
    
    // Note: We don't stop recording here - user might want to clear and continue
  };

  /**
   * 📋 COPY TO CLIPBOARD FUNCTION
   * This function copies text to the user's clipboard and shows feedback
   */
  const copyToClipboard = async (text: string) => {
    try {
      // Use the modern Clipboard API to copy text
      await navigator.clipboard.writeText(text);
      
      // Show success feedback
      setCopySuccess(true);
      
      // Hide success feedback after 2 seconds
      setTimeout(() => setCopySuccess(false), 2000);
      
    } catch (error) {
      // Handle copy failure
      console.error('Failed to copy text:', error);
      setError('Failed to copy to clipboard');
    }
  };

  /**
   * 🎨 RENDER FUNCTION - JSX Return Statement
   * This is what gets displayed on the screen
   * JSX looks like HTML but it's actually JavaScript that creates React elements
   */
  return (
    // Main app container div - this wraps everything
    // className is like HTML class attribute, but for React
    <div className="app">
      
      {/* 🏠 HEADER SECTION - Top banner with title and description */}
      <header className="header">
        <div className="header-content">
          {/* Main title - h1 is the biggest heading */}
          <h1>🎤 AI Note Taker</h1>
          {/* Subtitle paragraph */}
          <p>Real-time transcription with AI-powered summaries and enhanced features</p>
        </div>
      </header>

      {/* 📋 MAIN CONTENT AREA - Everything below the header */}
      <main className="main">
        
        {/* 📊 STATUS SECTION - Shows connection status and features */}
        <div className="status-section">
          
          {/* 🔗 CONNECTION STATUS INDICATOR */}
          {/* Template literal with conditional CSS class based on connection status */}
          {/* The backticks `` allow us to insert JavaScript expressions with ${} */}
          <div className={`status-indicator ${connectionStatus.includes('Connected') ? 'connected' : 'disconnected'}`}>
            {/* Animated dot that pulses */}
            <div className="status-dot"></div>
            {/* Status text from our state variable */}
            <span>{connectionStatus}</span>
          </div>
          
          {/* 🚀 ENHANCED FEATURES STATUS - Only shows if features are active */}
          {/* && is conditional rendering: only show if featuresStatus exists */}
          {/* In JSX, {condition && <component>} means "if condition is true, show component" */}
          {featuresStatus && (
            <div className="features-status">
              <h4>🚀 Enhanced Features Active</h4>
              <div className="feature-badges">
                {/* Each feature shows a badge only if it's enabled */}
                {/* These are all conditional renders based on feature status */}
                {featuresStatus.diarization && (
                  <span className="feature-badge">🎤 Speaker ID</span>
                )}
                {featuresStatus.redaction && (
                  <span className="feature-badge">🔒 Privacy Protection</span>
                )}
                {featuresStatus.paragraphs && (
                  <span className="feature-badge">📝 Smart Paragraphs</span>
                )}
                {featuresStatus.punctuation && (
                  <span className="feature-badge">✏️ Auto Punctuation</span>
                )}
                {featuresStatus.smart_format && (
                  <span className="feature-badge">🤖 Smart Format</span>
                )}
              </div>
              
              {/* 👤 SPEAKER INFORMATION - Only show if we have a current speaker */}
              {/* !== undefined checks if currentSpeaker has a value (could be 0, which is falsy but valid) */}
              {currentSpeaker !== undefined && (
                <div className="speaker-info">
                  <span className="current-speaker">
                    👤 Current Speaker: {currentSpeaker} 
                    {/* Show speaker count only if more than 1 speaker detected */}
                    {speakerCount > 1 && ` (${speakerCount} speakers detected)`}
                  </span>
                </div>
              )}
            </div>
          )}
          
          {/* ⚠️ ERROR DISPLAY - Only shows if there's an error */}
          {/* Simple conditional rendering: if error exists, show error message */}
          {error && (
            <div className="error-message">
              ⚠️ {error}
            </div>
          )}
        </div>

        {/* 🎛️ CONTROL BUTTONS - Main action buttons */}
        <div className="controls">
          
          {/* 🎙️ RECORD/STOP BUTTON - Changes based on recording state */}
          <button
            // Dynamic CSS class: adds 'recording' class when recording is active
            className={`btn btn-primary ${isRecording ? 'recording' : ''}`}
            // onClick event handler: calls different functions based on recording state
            onClick={isRecording ? stopRecording : startRecording}
            // disabled attribute: button can't be clicked when connection has error
            disabled={connectionStatus === 'Connection Error'}
          >
            {/* CONDITIONAL RENDERING: show different content based on isRecording */}
            {/* JSX Fragment <> allows multiple elements without extra wrapper div */}
            {isRecording ? (
              <>
                {/* MicOff icon component from Lucide React, size prop sets icon size */}
                <MicOff size={20} />
                Stop Recording
              </>
            ) : (
              <>
                {/* Mic icon component */}
                <Mic size={20} />
                Start Recording
              </>
            )}
          </button>

          {/* 🤖 AI SUMMARY BUTTON - Generates AI summary */}
          <button
            className="btn btn-secondary"
            // Arrow function that calls generateSummary with 'meeting' parameter
            onClick={() => generateSummary('meeting')}
            // Button disabled if: no transcription OR currently generating summary
            // .trim() removes whitespace, !transcription.trim() means "if no meaningful text"
            disabled={!transcription.trim() || isGeneratingSummary}
          >
            {/* Sparkles icon for AI/magic theme */}
            <Sparkles size={20} />
            {/* Show different text when generating vs ready */}
            {isGeneratingSummary ? 'Generating...' : 'AI Summary'}
          </button>

          {/* 🗑️ CLEAR BUTTON - Resets everything */}
          <button
            className="btn btn-outline"
            onClick={clearAll}
            // Disabled if no transcription AND no AI summary (nothing to clear)
            disabled={!transcription && !aiSummary}
          >
            {/* Trash icon */}
            <Trash2 size={20} />
            Clear All
          </button>
        </div>

        {/* 📋 CONTENT GRID - Two main panels side by side */}
        {/* CSS Grid layout: creates two equal columns */}
        <div className="content-grid">
          
          {/* 📝 TRANSCRIPTION PANEL - Shows live speech-to-text */}
          <div className="panel">
            
            {/* Panel header with title and copy button */}
            <div className="panel-header">
              {/* FileText icon */}
              <FileText size={20} />
              <h2>Live Transcription</h2>
              
              {/* Copy button - only shows if we have transcription text */}
              {/* Conditional rendering: only show if transcription exists */}
              {transcription && (
                <button
                  className="copy-btn"
                  // Arrow function that calls copyToClipboard with transcription text
                  onClick={() => copyToClipboard(transcription)}
                  // title attribute shows tooltip on hover
                  title="Copy transcription"
                >
                  {/* Show checkmark when copy succeeds, copy icon otherwise */}
                  {copySuccess ? <CheckCircle size={16} /> : <Copy size={16} />}
                </button>
              )}
            </div>
            
            {/* Main transcription display area */}
            <div className="transcription-box">
              
              {/* FINAL TRANSCRIBED TEXT - confirmed and won't change */}
              {/* Only shows if transcription exists */}
              {transcription && (
                <div className="final-text">{transcription}</div>
              )}
              
              {/* INTERIM TEXT - temporary text that might still change */}
              {/* Shows what's being transcribed right now, but not finalized */}
              {interimText && (
                <div className="interim-text">{interimText}</div>
              )}
              
              {/* PLACEHOLDER - shows when no text available */}
              {/* Only shows if BOTH transcription AND interimText are empty */}
              {!transcription && !interimText && (
                <div className="placeholder">
                  Click "Start Recording" and begin speaking...
                </div>
              )}
            </div>
          </div>

          {/* 🤖 AI SUMMARY PANEL - Shows AI-generated insights */}
          <div className="panel">
            
            {/* Panel header */}
            <div className="panel-header">
              {/* Sparkles icon for AI theme */}
              <Sparkles size={20} />
              <h2>AI Summary</h2>
              
              {/* Copy button - only shows if we have a summary without errors */}
              {/* Complex condition: summary exists AND no error in summary */}
              {aiSummary && !aiSummary.error && (
                <button
                  className="copy-btn"
                  // JSON.stringify converts object to formatted string for copying
                  // null, 2 parameters make it pretty-printed with 2-space indentation
                  onClick={() => copyToClipboard(JSON.stringify(aiSummary, null, 2))}
                  title="Copy summary"
                >
                  {copySuccess ? <CheckCircle size={16} /> : <Copy size={16} />}
                </button>
              )}
            </div>
            
            {/* Main summary display area */}
            <div className="summary-box">
              
              {/* LOADING SPINNER - shows while AI is working */}
              {/* Only shows when isGeneratingSummary is true */}
              {isGeneratingSummary && (
                <div className="loading">
                  {/* CSS animated spinner */}
                  <div className="spinner"></div>
                  <p>Generating AI summary...</p>
                </div>
              )}

              {/* SUMMARY CONTENT - shows when AI is done and we have results */}
              {/* Shows if: we have summary AND not currently generating */}
              {aiSummary && !isGeneratingSummary && (
                <div className="summary-content">
                  
                  {/* ERROR HANDLING - show error if AI processing failed */}
                  {/* Ternary operator: condition ? valueIfTrue : valueIfFalse */}
                  {aiSummary.error ? (
                    <div className="error">
                      <p>❌ {aiSummary.error}</p>
                    </div>
                  ) : (
                    // React Fragment to group multiple elements without extra div
                    <>
                      {/* MAIN SUMMARY SECTION */}
                      {/* Only show if summary text exists */}
                      {aiSummary.summary && (
                        <div className="summary-section">
                          <h3>📝 Summary</h3>
                          <p>{aiSummary.summary}</p>
                        </div>
                      )}

                      {/* KEY POINTS SECTION - only show if we have key points */}
                      {/* Complex condition: key_points exists AND has at least 1 item */}
                      {aiSummary.key_points && aiSummary.key_points.length > 0 && (
                        <div className="summary-section">
                          <h3>🔑 Key Points</h3>
                          <ul>
                            {/* .map() EXPLANATION for beginners:
                                - .map() goes through each item in an array
                                - For each item, it runs a function and returns JSX
                                - point = current item, index = position in array (0, 1, 2...)
                                - key={index} is required by React to track list items
                            */}
                            {aiSummary.key_points.map((point, index) => (
                              <li key={index}>{point}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* ACTION ITEMS SECTION - only show if we have action items */}
                      {aiSummary.action_items && aiSummary.action_items.length > 0 && (
                        <div className="summary-section">
                          <h3>✅ Action Items</h3>
                          <ul>
                            {/* More complex mapping for action items with optional fields */}
                            {aiSummary.action_items.map((item, index) => (
                              <li key={index}>
                                {/* <strong> makes text bold */}
                                <strong>{item.task}</strong>
                                
                                {/* CONDITIONAL RENDERING: only show if responsible_party exists */}
                                {/* && operator: if left side is true, show right side */}
                                {item.responsible_party && (
                                  <span className="responsible"> - {item.responsible_party}</span>
                                )}
                                
                                {/* CONDITIONAL RENDERING: only show if deadline exists */}
                                {item.deadline && (
                                  <span className="deadline"> (Due: {item.deadline})</span>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* DECISIONS SECTION */}
                      {aiSummary.decisions && aiSummary.decisions.length > 0 && (
                        <div className="summary-section">
                          <h3>🎯 Decisions</h3>
                          <ul>
                            {aiSummary.decisions.map((decision, index) => (
                              <li key={index}>{decision}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* NEXT STEPS SECTION */}
                      {aiSummary.next_steps && aiSummary.next_steps.length > 0 && (
                        <div className="summary-section">
                          <h3>🚀 Next Steps</h3>
                          <ul>
                            {aiSummary.next_steps.map((step, index) => (
                              <li key={index}>{step}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* PLACEHOLDER - shows when no summary and not generating */}
              {/* Only shows if: no summary AND not generating */}
              {!aiSummary && !isGeneratingSummary && (
                <div className="placeholder">
                  Record some audio and click "AI Summary" to get intelligent insights...
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ⚡ QUICK ACTIONS - Specialized AI processing buttons */}
        <div className="quick-actions">
          <h3>Quick AI Actions</h3>
          <div className="action-buttons">
            
            {/* EXTRACT ACTION ITEMS - focuses on tasks and to-dos */}
            <button
              className="btn btn-small"
              // Arrow function that calls generateSummary with specific type
              onClick={() => generateSummary('action_items')}
              // Same disable logic as main AI Summary button
              disabled={!transcription.trim() || isGeneratingSummary}
            >
              Extract Action Items
            </button>
            
            {/* GET KEY POINTS - focuses on main takeaways */}
            <button
              className="btn btn-small"
              onClick={() => generateSummary('key_points')}
              disabled={!transcription.trim() || isGeneratingSummary}
            >
              Get Key Points
            </button>
            
            {/* SPEAKER ANALYSIS - analyzes what each speaker said */}
            <button
              className="btn btn-small"
              onClick={() => generateSummary('speaker_analysis')}
              // Additional disable condition: needs at least 2 speakers
              disabled={!transcription.trim() || isGeneratingSummary || speakerCount < 2}
              // title attribute shows tooltip explaining why button might be disabled
              title={speakerCount < 2 ? "Speaker analysis requires multiple speakers" : "Analyze by speaker"}
            >
              👥 Speaker Analysis
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

// 📤 EXPORT STATEMENT
// This makes the App component available for import in other files
// 'export default' means this is the main thing this file exports
// Other files can import it with: import App from './App'
export default App; 