import React, { useState, useEffect, useRef } from 'react';
import './App.css';

// Define the structure of messages we receive from the backend
// This is called a "type" in TypeScript - it helps us know what data to expect
interface TranscriptionMessage {
  type: string;           // Type of message (transcription, error, etc.)
  text?: string;          // The transcribed text (optional with ?)
  is_final?: boolean;     // Whether this is the final result or partial
  message?: string;       // Status messages
}

function App() {
  // State variables - these store data that can change over time
  // Think of them as containers that hold information about our app's current state
  
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [transcription, setTranscription] = useState<string>('');
  const [interimText, setInterimText] = useState<string>('');
  const [connectionStatus, setConnectionStatus] = useState<string>('Disconnected');
  const [error, setError] = useState<string>('');
  
  // Refs - these are like variables that persist between renders but don't cause re-renders
  // We use them to store references to objects we need to access later
  const websocketRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);

  // This function runs when the component first loads
  // useEffect is a React "hook" that lets us perform side effects
  useEffect(() => {
    // Cleanup function - runs when component unmounts (closes)
    return () => {
      stopRecording();
      if (websocketRef.current) {
        websocketRef.current.close();
      }
    };
  }, []); // Empty array means this only runs once when component mounts

  const connectWebSocket = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      try {
        // Create WebSocket connection to our Python backend
        const ws = new WebSocket('ws://localhost:8000/ws');
        websocketRef.current = ws;

        // Event handler for when connection opens
        ws.onopen = () => {
          console.log('WebSocket connected');
          setConnectionStatus('Connected');
          setError('');
          resolve();
        };

        // Event handler for receiving messages from backend
        ws.onmessage = (event) => {
          try {
            // Parse the JSON message from our Python backend
            const data: TranscriptionMessage = JSON.parse(event.data);
            
            // Handle different types of messages
            switch (data.type) {
              case 'transcription':
                if (data.text) {
                  if (data.is_final) {
                    // Final result - add to main transcription and clear interim
                    setTranscription(prev => prev + ' ' + data.text);
                    setInterimText('');
                  } else {
                    // Interim result - show as temporary text
                    setInterimText(data.text);
                  }
                }
                break;
              
              case 'connection_opened':
                setConnectionStatus('Connected to Deepgram');
                break;
              
              case 'connection_closed':
                setConnectionStatus('Disconnected from Deepgram');
                break;
              
              case 'error':
                setError(data.message || 'Unknown error occurred');
                break;
            }
          } catch (err) {
            console.error('Error parsing message:', err);
          }
        };

        // Event handler for connection errors
        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          setError('Connection error occurred');
          setConnectionStatus('Connection Error');
          reject(error);
        };

        // Event handler for when connection closes
        ws.onclose = () => {
          console.log('WebSocket disconnected');
          setConnectionStatus('Disconnected');
          websocketRef.current = null;
        };

      } catch (error) {
        console.error('Failed to create WebSocket:', error);
        setError('Failed to create connection');
        reject(error);
      }
    });
  };

  const startRecording = async () => {
    try {
      setError('');
      
      // First, connect to our backend
      await connectWebSocket();
      
      // Request access to user's microphone
      // This will show a permission dialog in the browser
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,        // Deepgram works well with 16kHz
          channelCount: 1,          // Mono audio
          echoCancellation: true,   // Reduce echo
          noiseSuppression: true,   // Reduce background noise
        } 
      });
      
      audioStreamRef.current = stream;

      // Create MediaRecorder to capture audio data
      // MediaRecorder converts microphone input into data we can send
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus', // Use WebM format with Opus codec
      });
      
      mediaRecorderRef.current = mediaRecorder;

      // Event handler for when audio data is available
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && websocketRef.current?.readyState === WebSocket.OPEN) {
          // Send audio data to our Python backend
          websocketRef.current.send(event.data);
        }
      };

      // Start recording and send data every 100ms for real-time processing
      mediaRecorder.start(100);
      setIsRecording(true);
      
    } catch (error) {
      console.error('Error starting recording:', error);
      setError('Failed to start recording. Please check microphone permissions.');
    }
  };

  const stopRecording = () => {
    // Stop the media recorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    // Stop all audio tracks (turns off microphone)
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
      audioStreamRef.current = null;
    }
    
    // Close WebSocket connection
    if (websocketRef.current) {
      websocketRef.current.close();
      websocketRef.current = null;
    }
    
    setIsRecording(false);
    setConnectionStatus('Disconnected');
    setInterimText('');
  };

  const clearTranscription = () => {
    setTranscription('');
    setInterimText('');
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(transcription);
      // You could add a toast notification here
      console.log('Text copied to clipboard');
    } catch (error) {
      console.error('Failed to copy text:', error);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>🎤 Real-time Voice to Text</h1>
        <p>Powered by Deepgram API</p>
      </header>

      <main className="main-content">
        {/* Status Section */}
        <div className="status-section">
          <div className={`status-indicator ${connectionStatus.includes('Connected') ? 'connected' : 'disconnected'}`}>
            <span className="status-dot"></span>
            {connectionStatus}
          </div>
          
          {error && (
            <div className="error-message">
              ⚠️ {error}
            </div>
          )}
        </div>

        {/* Control Buttons */}
        <div className="controls">
          <button
            className={`record-button ${isRecording ? 'recording' : ''}`}
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isRecording && connectionStatus === 'Connection Error'}
          >
            {isRecording ? (
              <>
                <span className="recording-icon">⏹️</span>
                Stop Recording
              </>
            ) : (
              <>
                <span className="record-icon">🎤</span>
                Start Recording
              </>
            )}
          </button>

          <button
            className="clear-button"
            onClick={clearTranscription}
            disabled={!transcription && !interimText}
          >
            🗑️ Clear
          </button>

          <button
            className="copy-button"
            onClick={copyToClipboard}
            disabled={!transcription}
          >
            📋 Copy
          </button>
        </div>

        {/* Transcription Display */}
        <div className="transcription-section">
          <h2>Transcription:</h2>
          <div className="transcription-box">
            {/* Final transcription text */}
            <span className="final-text">{transcription}</span>
            
            {/* Interim (partial) text - shown in different style */}
            {interimText && (
              <span className="interim-text"> {interimText}</span>
            )}
            
            {/* Show placeholder when no text */}
            {!transcription && !interimText && (
              <span className="placeholder-text">
                Your speech will appear here in real-time...
              </span>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="instructions">
          <h3>How to use:</h3>
          <ol>
            <li>Click "Start Recording" to begin voice transcription</li>
            <li>Speak clearly into your microphone</li>
            <li>Watch your words appear in real-time</li>
            <li>Click "Stop Recording" when finished</li>
            <li>Use "Copy" to copy text to clipboard or "Clear" to start over</li>
          </ol>
        </div>
      </main>
    </div>
  );
}

export default App; 