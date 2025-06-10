import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, FileText, Trash2, Copy, Sparkles, CheckCircle } from 'lucide-react';
import './App.css';
import { TranscriptionMessage, AISummary, ConnectionStatus, SummaryType, DeepgramFeatures } from './types';

/**
 * Main App Component
 * This is the heart of our AI Note Taker application
 */
function App() {
  // State Management with TypeScript - Enhanced for new features
  // Each state variable has a specific type, which helps prevent bugs
  
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [transcription, setTranscription] = useState<string>('');
  const [interimText, setInterimText] = useState<string>('');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('Disconnected');
  const [error, setError] = useState<string>('');
  const [aiSummary, setAiSummary] = useState<AISummary | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState<boolean>(false);
  const [copySuccess, setCopySuccess] = useState<boolean>(false);

  // 🆕 NEW: Enhanced features state
  const [currentSpeaker, setCurrentSpeaker] = useState<number | undefined>(undefined);
  const [featuresStatus, setFeaturesStatus] = useState<DeepgramFeatures | undefined>(undefined);
  const [speakerCount, setSpeakerCount] = useState<number>(0);
  const [lastMessage, setLastMessage] = useState<TranscriptionMessage | null>(null);

  // Refs for persistent objects
  // These don't cause re-renders when they change, but persist between renders
  const websocketRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      stopRecording();
      if (websocketRef.current) {
        websocketRef.current.close();
      }
    };
  }, []);

  /**
   * Connect to WebSocket backend
   * Returns a Promise - this is an asynchronous operation
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
            // Parse JSON message with TypeScript type checking
            const data: TranscriptionMessage = JSON.parse(event.data);
            setLastMessage(data); // Store the latest message
            
            switch (data.type) {
              case 'transcription':
                if (data.text) {
                  // 🆕 NEW: Handle enhanced features
                  if (data.speaker !== undefined) {
                    setCurrentSpeaker(data.speaker);
                    setSpeakerCount(prev => Math.max(prev, (data.speaker ?? 0) + 1));
                  }
                  
                  if (data.features_used) {
                    setFeaturesStatus(data.features_used);
                    setConnectionStatus('Enhanced Features Active');
                  }
                  
                  if (data.is_final) {
                    // Final result - add to main transcription
                    setTranscription(data.full_transcript || '');
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
                setConnectionStatus('Disconnected');
                break;
              
              case 'error':
                setError(data.message || 'Unknown error occurred');
                setConnectionStatus('Connection Error');
                break;
            }
          } catch (err) {
            console.error('Error parsing message:', err);
          }
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          setError('Connection error occurred');
          setConnectionStatus('Connection Error');
          reject(error);
        };

        ws.onclose = () => {
          console.log('WebSocket disconnected');
          setConnectionStatus('Disconnected');
          websocketRef.current = null;
        };

      } catch (error) {
        console.error('Failed to create WebSocket:', error);
        setError('Failed to create connection');
        setConnectionStatus('Connection Error');
        reject(error);
      }
    });
  };

  /**
   * Start recording audio and transcription
   */
  const startRecording = async () => {
    try {
      setError('');
      
      // Connect to backend
      await connectWebSocket();
      
      // First, enumerate audio devices to find BlackHole
      const devices = await navigator.mediaDevices.enumerateDevices();
      console.log('Available audio devices:', devices.filter(device => device.kind === 'audioinput'));
      
      // Look for BlackHole device
      const blackHoleDevice = devices.find(device => 
        device.kind === 'audioinput' && 
        (device.label.includes('BlackHole') || device.label.includes('blackhole'))
      );
      
      console.log('BlackHole device found:', blackHoleDevice);
      
      // Request microphone access with specific device if found
      const constraints: MediaStreamConstraints = {
        audio: blackHoleDevice ? {
          deviceId: { exact: blackHoleDevice.deviceId },
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: false,  // Disable for system audio
          noiseSuppression: false,  // Disable for system audio
        } : {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        }
      };
      
      console.log('Using audio constraints:', constraints);
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('Audio stream obtained:', stream.getAudioTracks()[0].getSettings());
      
      audioStreamRef.current = stream;

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });
      
      mediaRecorderRef.current = mediaRecorder;

      // Handle audio data
      mediaRecorder.ondataavailable = (event) => {
        console.log('Audio data available, size:', event.data.size);
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
      setConnectionStatus('Connection Error');
    }
  };

  /**
   * Stop recording and cleanup
   */
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
      audioStreamRef.current = null;
    }
    
    if (websocketRef.current) {
      websocketRef.current.close();
      websocketRef.current = null;
    }
    
    setIsRecording(false);
    setConnectionStatus('Disconnected');
    setInterimText('');
  };

  /**
   * Generate AI summary using Gemini
   */
  const generateSummary = async (summaryType: SummaryType = 'meeting') => {
    if (!transcription.trim()) {
      setError('No transcription available to summarize');
      return;
    }

    setIsGeneratingSummary(true);
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
      setError('Failed to generate AI summary. Please try again.');
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  /**
   * Clear all content
   */
  const clearAll = () => {
    setTranscription('');
    setInterimText('');
    setAiSummary(null);
    setError('');
    setCopySuccess(false);
    
    // 🆕 NEW: Clear enhanced features state
    setCurrentSpeaker(undefined);
    setFeaturesStatus(undefined);
    setSpeakerCount(0);
    setLastMessage(null);
  };

  /**
   * Copy text to clipboard
   */
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Failed to copy text:', error);
      setError('Failed to copy to clipboard');
    }
  };

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <h1>🤖 AI Note Taker</h1>
          <p>Real-time transcription powered by Deepgram + AI summaries by Gemini</p>
        </div>
      </header>

      <main className="main">
        {/* Status Section */}
        <div className="status-section">
          <div className={`status-indicator ${connectionStatus.includes('Connected') ? 'connected' : 'disconnected'}`}>
            <div className="status-dot"></div>
            <span>{connectionStatus}</span>
          </div>
          
          {/* 🆕 NEW: Enhanced Features Status */}
          {featuresStatus && (
            <div className="features-status">
              <h4>🚀 Enhanced Features Active</h4>
              <div className="feature-badges">
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
              
              {currentSpeaker !== undefined && (
                <div className="speaker-info">
                  <span className="current-speaker">
                    👤 Current Speaker: {currentSpeaker} 
                    {speakerCount > 1 && ` (${speakerCount} speakers detected)`}
                  </span>
                </div>
              )}
            </div>
          )}
          
          {error && (
            <div className="error-message">
              ⚠️ {error}
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="controls">
          <button
            className={`btn btn-primary ${isRecording ? 'recording' : ''}`}
            onClick={isRecording ? stopRecording : startRecording}
            disabled={connectionStatus === 'Connection Error'}
          >
            {isRecording ? (
              <>
                <MicOff size={20} />
                Stop Recording
              </>
            ) : (
              <>
                <Mic size={20} />
                Start Recording
              </>
            )}
          </button>

          <button
            className="btn btn-secondary"
            onClick={() => generateSummary('meeting')}
            disabled={!transcription.trim() || isGeneratingSummary}
          >
            <Sparkles size={20} />
            {isGeneratingSummary ? 'Generating...' : 'AI Summary'}
          </button>

          <button
            className="btn btn-outline"
            onClick={clearAll}
            disabled={!transcription && !aiSummary}
          >
            <Trash2 size={20} />
            Clear All
          </button>
        </div>

        {/* Content Grid */}
        <div className="content-grid">
          {/* Transcription Panel */}
          <div className="panel">
            <div className="panel-header">
              <FileText size={20} />
              <h2>Live Transcription</h2>
              {transcription && (
                <button
                  className="copy-btn"
                  onClick={() => copyToClipboard(transcription)}
                  title="Copy transcription"
                >
                  {copySuccess ? <CheckCircle size={16} /> : <Copy size={16} />}
                </button>
              )}
            </div>
            
            <div className="transcription-box">
              {transcription && (
                <div className="final-text">{transcription}</div>
              )}
              
              {interimText && (
                <div className="interim-text">{interimText}</div>
              )}
              
              {!transcription && !interimText && (
                <div className="placeholder">
                  Click "Start Recording" and begin speaking...
                </div>
              )}
            </div>
          </div>

          {/* AI Summary Panel */}
          <div className="panel">
            <div className="panel-header">
              <Sparkles size={20} />
              <h2>AI Summary</h2>
              {aiSummary && !aiSummary.error && (
                <button
                  className="copy-btn"
                  onClick={() => copyToClipboard(JSON.stringify(aiSummary, null, 2))}
                  title="Copy summary"
                >
                  {copySuccess ? <CheckCircle size={16} /> : <Copy size={16} />}
                </button>
              )}
            </div>
            
            <div className="summary-box">
              {isGeneratingSummary && (
                <div className="loading">
                  <div className="spinner"></div>
                  <p>Generating AI summary...</p>
                </div>
              )}

              {aiSummary && !isGeneratingSummary && (
                <div className="summary-content">
                  {aiSummary.error ? (
                    <div className="error">
                      <p>❌ {aiSummary.error}</p>
                    </div>
                  ) : (
                    <>
                      {aiSummary.summary && (
                        <div className="summary-section">
                          <h3>📝 Summary</h3>
                          <p>{aiSummary.summary}</p>
                        </div>
                      )}

                      {aiSummary.key_points && aiSummary.key_points.length > 0 && (
                        <div className="summary-section">
                          <h3>🔑 Key Points</h3>
                          <ul>
                            {aiSummary.key_points.map((point, index) => (
                              <li key={index}>{point}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {aiSummary.action_items && aiSummary.action_items.length > 0 && (
                        <div className="summary-section">
                          <h3>✅ Action Items</h3>
                          <ul>
                            {aiSummary.action_items.map((item, index) => (
                              <li key={index}>
                                <strong>{item.task}</strong>
                                {item.responsible_party && (
                                  <span className="responsible"> - {item.responsible_party}</span>
                                )}
                                {item.deadline && (
                                  <span className="deadline"> (Due: {item.deadline})</span>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

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

              {!aiSummary && !isGeneratingSummary && (
                <div className="placeholder">
                  Record some audio and click "AI Summary" to get intelligent insights...
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="quick-actions">
          <h3>Quick AI Actions</h3>
          <div className="action-buttons">
            <button
              className="btn btn-small"
              onClick={() => generateSummary('action_items')}
              disabled={!transcription.trim() || isGeneratingSummary}
            >
              Extract Action Items
            </button>
            <button
              className="btn btn-small"
              onClick={() => generateSummary('key_points')}
              disabled={!transcription.trim() || isGeneratingSummary}
            >
              Get Key Points
            </button>
            {/* 🆕 NEW: Speaker Analysis button */}
            <button
              className="btn btn-small"
              onClick={() => generateSummary('speaker_analysis')}
              disabled={!transcription.trim() || isGeneratingSummary || speakerCount < 2}
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

export default App; 