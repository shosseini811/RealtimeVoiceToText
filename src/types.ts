// TypeScript Types and Interfaces
// These define the structure of data we use throughout our app

/**
 * Messages received from the WebSocket connection
 * This tells TypeScript what properties to expect in messages from our backend
 */
export interface TranscriptionMessage {
  type: string;                    // Type of message: 'transcription', 'error', etc.
  text?: string;                   // The transcribed text (optional with ?)
  is_final?: boolean;              // Whether this is final or interim result
  message?: string;                // Status or error messages
  full_transcript?: string;        // Complete transcript so far
}

/**
 * AI Summary response structure
 * This defines what we get back from Gemini AI
 */
export interface AISummary {
  summary?: string;                // Brief summary of the content
  key_points?: string[];           // Array of key discussion points
  action_items?: ActionItem[];     // List of action items
  decisions?: string[];            // Important decisions made
  next_steps?: string[];           // Next steps identified
  error?: string;                  // Error message if something went wrong
  type?: string;                   // Type of summary generated
  raw_response?: string;           // Raw AI response as fallback
}

/**
 * Action Item structure
 * Represents a task or action that needs to be done
 */
export interface ActionItem {
  task: string;                    // Description of the task
  responsible_party?: string;      // Who is responsible (if mentioned)
  deadline?: string;               // When it needs to be done (if mentioned)
}

/**
 * Connection status types
 * These are the possible states of our WebSocket connection
 */
export type ConnectionStatus = 
  | 'Disconnected'
  | 'Connecting'
  | 'Connected'
  | 'Connected to Deepgram'
  | 'Connection Error';

/**
 * Summary types we can request from AI
 */
export type SummaryType = 'meeting' | 'action_items' | 'key_points';

/**
 * App state interface
 * This defines all the state variables our main app component uses
 */
export interface AppState {
  isRecording: boolean;
  transcription: string;
  interimText: string;
  connectionStatus: ConnectionStatus;
  error: string;
  aiSummary: AISummary | null;
  isGeneratingSummary: boolean;
} 