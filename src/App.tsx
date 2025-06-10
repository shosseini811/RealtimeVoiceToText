import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, FileText, Trash2, Copy, Sparkles, CheckCircle } from 'lucide-react';
import './App.css';
import { TranscriptionMessage, AISummary, ConnectionStatus, SummaryType } from './types';

/**
 * Simple AI Note Taker Desktop App
 * Clean and minimal interface for transcription and AI summaries
 */
function App() {
  // Basic state management
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [transcription, setTranscription] = useState<string>('');
  const [interimText, setInterimText] = useState<string>('');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('Disconnected');
  const [error, setError] = useState<string>('');
  const [aiSummary, setAiSummary] = useState<AISummary | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState<boolean>(false);
  const [copySuccess, setCopySuccess] = useState<boolean>(false);

  // Refs for audio handling
  const websocketRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording();
      if (websocketRef.current) {
        websocketRef.current.close();
      }
    };
  }, []);

  // Simple WebSocket connection
  const connectWebSocket = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      try {
        setConnectionStatus('Connecting');
        const ws = new WebSocket('ws://localhost:8000/ws');
        websocketRef.current = ws;

        ws.onopen = () => {
          setConnectionStatus('Connected');
          setError('');
          resolve();
        };

        ws.onmessage = (event) => {
          try {
            const data: TranscriptionMessage = JSON.parse(event.data);
            
            if (data.type === 'transcription' && data.text) {
              if (data.is_final) {
                setTranscription(data.full_transcript || '');
                setInterimText('');
              } else {
                setInterimText(data.text);
              }
            } else if (data.type === 'error') {
              setError(data.message || 'Unknown error occurred');
              setConnectionStatus('Connection Error');
            }
          } catch (err) {
            console.error('Error parsing message:', err);
          }
        };

        ws.onerror = () => {
          setError('Connection error occurred');
          setConnectionStatus('Connection Error');
          reject();
        };

        ws.onclose = () => {
          setConnectionStatus('Disconnected');
          websocketRef.current = null;
        };

      } catch (error) {
        setError('Failed to create connection');
        setConnectionStatus('Connection Error');
        reject(error);
      }
    });
  };

  // Start recording
  const startRecording = async () => {
    try {
      setError('');
      await connectWebSocket();
      
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        }
      });
      
      audioStreamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });
      
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && websocketRef.current?.readyState === WebSocket.OPEN) {
          websocketRef.current.send(event.data);
        }
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      
    } catch (error) {
      console.error('Error starting recording:', error);
      setError('Failed to start recording. Please check microphone permissions.');
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }

    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
      audioStreamRef.current = null;
    }

    if (websocketRef.current) {
      websocketRef.current.close();
      websocketRef.current = null;
    }
  };

  // Generate AI Summary
  const generateSummary = async (summaryType: SummaryType = 'meeting') => {
    if (!transcription.trim()) return;

    try {
      setIsGeneratingSummary(true);
      setError('');

      const response = await fetch('http://localhost:8000/generate-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcription: transcription,
          summary_type: summaryType
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: AISummary = await response.json();
      setAiSummary(data);

    } catch (error) {
      console.error('Error generating summary:', error);
      setError('Failed to generate summary. Please check your connection.');
      setAiSummary({ error: 'Failed to generate summary. Please try again.' });
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  // Clear all data
  const clearAll = () => {
    setTranscription('');
    setInterimText('');
    setAiSummary(null);
    setError('');
  };

  // Copy to clipboard
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      setError('Failed to copy to clipboard');
    }
  };

  return (
    <div className="app">
      {/* Simple Header */}
      <header className="header">
        <h1>🎤 AI Note Taker</h1>
        <p>Simple transcription and AI summaries</p>
      </header>

      <main className="main">
        {/* Status */}
        <div className="status-section">
          <div className={`status-indicator ${connectionStatus.includes('Connected') ? 'connected' : 'disconnected'}`}>
            <div className="status-dot"></div>
            <span>{connectionStatus}</span>
          </div>
          
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
        </div>

        {/* Simple Controls */}
        <div className="controls">
          <button
            className={`btn btn-primary ${isRecording ? 'recording' : ''}`}
            onClick={isRecording ? stopRecording : startRecording}
            disabled={connectionStatus === 'Connection Error'}
          >
            {isRecording ? (
              <>
                <MicOff size={16} />
                Stop Recording
              </>
            ) : (
              <>
                <Mic size={16} />
                Start Recording
              </>
            )}
          </button>

          <button
            className="btn btn-secondary"
            onClick={() => generateSummary('meeting')}
            disabled={!transcription.trim() || isGeneratingSummary}
          >
            <Sparkles size={16} />
            {isGeneratingSummary ? 'Generating...' : 'AI Summary'}
          </button>

          <button
            className="btn btn-outline"
            onClick={clearAll}
            disabled={!transcription && !aiSummary}
          >
            <Trash2 size={16} />
            Clear All
          </button>
        </div>

        {/* Content */}
        <div className="content-grid">
          {/* Transcription */}
          <div className="panel">
            <div className="panel-header">
              <h2>
                <FileText size={16} />
                Transcription
              </h2>
              {transcription && (
                <button
                  className={`copy-btn ${copySuccess ? 'success' : ''}`}
                  onClick={() => copyToClipboard(transcription)}
                >
                  {copySuccess ? <CheckCircle size={12} /> : <Copy size={12} />}
                  {copySuccess ? 'Copied!' : 'Copy'}
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
                  <Mic size={32} />
                  <p>Click "Start Recording" to begin</p>
                </div>
              )}
            </div>
          </div>

          {/* AI Summary */}
          <div className="panel">
            <div className="panel-header">
              <h2>
                <Sparkles size={16} />
                AI Summary
              </h2>
              {aiSummary && !aiSummary.error && (
                <button
                  className={`copy-btn ${copySuccess ? 'success' : ''}`}
                  onClick={() => copyToClipboard(JSON.stringify(aiSummary, null, 2))}
                >
                  {copySuccess ? <CheckCircle size={12} /> : <Copy size={12} />}
                  {copySuccess ? 'Copied!' : 'Copy'}
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
                      <p>{aiSummary.error}</p>
                    </div>
                  ) : (
                    <>
                      {aiSummary.summary && (
                        <div className="summary-section">
                          <h3>Summary</h3>
                          <p>{aiSummary.summary}</p>
                        </div>
                      )}

                      {aiSummary.key_points && aiSummary.key_points.length > 0 && (
                        <div className="summary-section">
                          <h3>Key Points</h3>
                          <ul>
                            {aiSummary.key_points.map((point, index) => (
                              <li key={index}>{point}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {aiSummary.action_items && aiSummary.action_items.length > 0 && (
                        <div className="summary-section">
                          <h3>Action Items</h3>
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
                    </>
                  )}
                </div>
              )}

              {!aiSummary && !isGeneratingSummary && (
                <div className="placeholder">
                  <Sparkles size={32} />
                  <p>Record audio and click "AI Summary"</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="quick-actions">
          <h3>Quick Actions</h3>
          <div className="action-buttons">
            <button
              className="btn btn-small"
              onClick={() => generateSummary('action_items')}
              disabled={!transcription.trim() || isGeneratingSummary}
            >
              Action Items
            </button>
            <button
              className="btn btn-small"
              onClick={() => generateSummary('key_points')}
              disabled={!transcription.trim() || isGeneratingSummary}
            >
              Key Points
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App; 