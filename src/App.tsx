// 📦 IMPORTS - Bringing in code from other files and libraries

// React core - the main library for building user interfaces
import React, { useState, useEffect, useRef } from 'react';

// Lucide React - beautiful icons for our buttons
import { Mic, MicOff } from 'lucide-react';

// Our custom CSS styles for making the app look good
import './App.css';

// TypeScript type definitions - these help prevent bugs by defining data shapes
import { TranscriptionMessage, AISummary, ConnectionStatus, SummaryType } from './types';

/**
 * Simple Voice to Text App
 * Just a text box with start/stop buttons - much simpler!
 */
function App() {
  // 🎤 RECORDING STATE: true/false for recording status
  const [isRecording, setIsRecording] = useState<boolean>(false);
  
  // 📝 TRANSCRIPTION TEXT: holds the transcribed text
  const [transcription, setTranscription] = useState<string>('');
  
  // ⏱️ INTERIM TEXT: temporary text being processed
  const [interimText, setInterimText] = useState<string>('');
  
  // 🔗 CONNECTION STATUS: tracks connection to backend
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('Disconnected');
  
  // ⚠️ ERROR MESSAGES: for showing errors to user
  const [error, setError] = useState<string>('');
  
  // 🤖 AI SUMMARY: holds the generated summary
  const [aiSummary, setAiSummary] = useState<AISummary | null>(null);
  
  // ⏳ LOADING STATE: shows when generating summary
  const [isGeneratingSummary, setIsGeneratingSummary] = useState<boolean>(false);

  // 🔗 REFS FOR PERSISTENT OBJECTS
  const websocketRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);

  // 🧹 CLEANUP when component unmounts
  useEffect(() => {
    return () => {
      stopRecording();
      if (websocketRef.current) {
        websocketRef.current.close();
      }
    };
  }, []);

  /**
   * 🌐 WEBSOCKET CONNECTION FUNCTION
   */
  const connectWebSocket = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      try {
        setConnectionStatus('Connecting');
        const ws = new WebSocket('ws://localhost:8000/ws');
        websocketRef.current = ws;

        ws.onopen = () => {
          console.log('WebSocket connected');
          setConnectionStatus('Connected');
          setError('');
          resolve();
        };

        ws.onmessage = (event) => {
          try {
            const data: TranscriptionMessage = JSON.parse(event.data);
            
            switch (data.type) {
              case 'transcription':
                if (data.text) {
                  if (data.is_final) {
                    setTranscription(data.full_transcript || '');
                    setInterimText('');
                  } else {
                    setInterimText(data.text);
                  }
                }
                break;
              
              case 'connection_status':
                if (data.message) {
                  setConnectionStatus(data.message as ConnectionStatus);
                }
                break;
              
              case 'error':
                setError(data.message || 'Unknown error occurred');
                break;
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        ws.onclose = () => {
          console.log('WebSocket disconnected');
          setConnectionStatus('Disconnected');
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          setConnectionStatus('Connection Error');
          setError('Connection failed. Make sure the backend is running.');
          reject(error);
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
   */
  const startRecording = async () => {
    try {
      setError('');
      
      // Connect to WebSocket first
      await connectWebSocket();
      
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        } 
      });
      
      audioStreamRef.current = stream;
      
      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      
      // Handle audio data
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && websocketRef.current?.readyState === WebSocket.OPEN) {
          websocketRef.current.send(event.data);
        }
      };
      
      // Start recording
      mediaRecorder.start(100); // Send data every 100ms
      setIsRecording(true);
      
    } catch (error) {
      console.error('Error starting recording:', error);
      setError('Failed to start recording. Please check microphone permissions.');
    }
  };

  /**
   * 🛑 STOP RECORDING FUNCTION
   * Now automatically generates summary when stopping!
   */
  const stopRecording = () => {
    try {
      // Stop recording
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      
      // Stop audio stream
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(track => track.stop());
        audioStreamRef.current = null;
      }
      
      // Close WebSocket
      if (websocketRef.current) {
        websocketRef.current.close();
        websocketRef.current = null;
      }
      
      setIsRecording(false);
      
      // 🤖 AUTO-GENERATE SUMMARY when stopping!
      // Wait a moment for final transcription, then generate summary
      setTimeout(() => {
        if (transcription.trim()) {
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
   */
  const generateSummary = async (summaryType: SummaryType = 'meeting') => {
    if (!transcription.trim()) {
      setError('No transcription available to summarize');
      return;
    }

    setIsGeneratingSummary(true);
    setAiSummary(null);
    setError('');

    try {
      const response = await fetch('http://localhost:8000/api/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: transcription,
          summary_type: summaryType
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const summary: AISummary = await response.json();
      setAiSummary(summary);

    } catch (error) {
      console.error('Error generating summary:', error);
      setError('Failed to generate AI summary. Please check if the backend is running.');
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  /**
   * 🧹 CLEAR FUNCTION - Reset everything
   */
  const clearAll = () => {
    setTranscription('');
    setInterimText('');
    setAiSummary(null);
    setError('');
  };

  /**
   * 🎨 SIMPLE UI RENDER
   */
  return (
    <div className="simple-app">
      
      {/* Simple Header */}
      <div className="simple-header">
        <h1>🎤 Voice to Text</h1>
      </div>

      {/* Main Content */}
      <div className="simple-main">
        
        {/* Text Display Box */}
        <div className="simple-textbox">
          {/* Show transcription text */}
          {transcription && (
            <div className="transcription-text">{transcription}</div>
          )}
          
          {/* Show interim text (what's being spoken right now) */}
          {interimText && (
            <div className="interim-text">{interimText}</div>
          )}
          
          {/* Show placeholder when empty */}
          {!transcription && !interimText && (
            <div className="placeholder-text">
              Click "Start" to begin recording...
            </div>
          )}
        </div>

        {/* Control Buttons */}
        <div className="simple-controls">
          <button
            className={`simple-btn ${isRecording ? 'stop-btn' : 'start-btn'}`}
            onClick={isRecording ? stopRecording : startRecording}
            disabled={connectionStatus === 'Connection Error'}
          >
            {isRecording ? (
              <>
                <MicOff size={20} />
                Stop & Summarize
              </>
            ) : (
              <>
                <Mic size={20} />
                Start Recording
              </>
            )}
          </button>
          
          {/* Clear button */}
          <button
            className="simple-btn clear-btn"
            onClick={clearAll}
            disabled={!transcription && !aiSummary}
          >
            Clear
          </button>
        </div>

        {/* Summary Section */}
        {(aiSummary || isGeneratingSummary) && (
          <div className="simple-summary">
            <h3>📝 Summary</h3>
            
            {isGeneratingSummary && (
              <div className="loading-text">Generating summary...</div>
            )}
            
            {aiSummary && !isGeneratingSummary && (
              <div className="summary-content">
                {aiSummary.error ? (
                  <div className="error-text">❌ {aiSummary.error}</div>
                ) : (
                  <>
                    {aiSummary.summary && (
                      <div className="summary-section">
                        <strong>Summary:</strong>
                        <p>{aiSummary.summary}</p>
                      </div>
                    )}
                    
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

        {/* Error Display */}
        {error && (
          <div className="simple-error">
            ⚠️ {error}
          </div>
        )}
        
        {/* Status */}
        <div className="simple-status">
          Status: {connectionStatus}
        </div>
      </div>
    </div>
  );
}

export default App; 