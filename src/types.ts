// TypeScript Types and Interfaces - Enhanced for new Deepgram features
// These define the structure of data we use throughout our app

/**
 * Enhanced TranscriptionMessage with new Deepgram features
 * Now includes speaker info, redaction status, and enhanced formatting
 */
export interface TranscriptionMessage {
  type: string;                    // Type of message: 'transcription', 'error', etc.
  text?: string;                   // The transcribed text (with smart formatting!)
  is_final?: boolean;              // Whether this is final or interim result
  message?: string;                // Status or error messages
  full_transcript?: string;        // Complete transcript so far
  
  // 🆕 NEW ENHANCED FEATURES
  speaker?: number;                // Speaker ID from diarization (e.g., 0, 1, 2)
  has_diarization?: boolean;       // Whether speaker detection is working
  word_count?: number;             // Number of words in this segment
  features_used?: DeepgramFeatures; // Which Deepgram features are active
}

/**
 * 🆕 NEW: Deepgram Features Status
 * Shows which advanced features are currently enabled
 */
export interface DeepgramFeatures {
  diarization: boolean;            // Speaker identification enabled
  redaction: boolean;              // Sensitive info redaction enabled  
  paragraphs: boolean;             // Paragraph breaks enabled
  punctuation: boolean;            // Auto-punctuation enabled
  smart_format: boolean;           // Smart formatting enabled
}

/**
 * Enhanced AI Summary response structure
 * Updated to work better with formatted and speaker-identified text
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
  
  // 🆕 NEW: Enhanced analysis features
  speaker_summary?: SpeakerSummary[]; // Per-speaker analysis
  redacted_content?: boolean;      // Whether sensitive info was found/redacted
}

/**
 * 🆕 NEW: Per-speaker summary information
 * When diarization is enabled, we can provide speaker-specific insights
 */
export interface SpeakerSummary {
  speaker_id: number;              // Speaker identifier (0, 1, 2, etc.)
  main_points: string[];           // Key points this speaker made
  speaking_time_percentage?: number; // How much of the conversation this speaker had
  action_items?: ActionItem[];     // Action items assigned to this speaker
}

/**
 * Action Item structure - Enhanced
 */
export interface ActionItem {
  task: string;                    // Description of the task
  responsible_party?: string;      // Who is responsible (if mentioned)
  deadline?: string;               // When it needs to be done (if mentioned)
  speaker_assigned_by?: number;    // 🆕 Which speaker assigned this task
}

/**
 * Connection status types - Enhanced
 */
export type ConnectionStatus = 
  | 'Disconnected'
  | 'Connecting'
  | 'Connected'
  | 'Connected to Deepgram'
  | 'Enhanced Features Active'     // 🆕 NEW: When all features are working
  | 'Connection Error';

/**
 * Summary types we can request from AI
 */
export type SummaryType = 'meeting' | 'action_items' | 'key_points' | 'speaker_analysis'; // 🆕 NEW type

/**
 * Enhanced App state interface
 */
export interface AppState {
  isRecording: boolean;
  transcription: string;
  interimText: string;
  connectionStatus: ConnectionStatus;
  error: string;
  aiSummary: AISummary | null;
  isGeneratingSummary: boolean;
  
  // 🆕 NEW: Enhanced features state
  currentSpeaker?: number;         // Currently detected speaker
  featuresStatus?: DeepgramFeatures; // Status of Deepgram features
  speakerCount?: number;           // Total number of detected speakers
}

/**
 * 🆕 NEW: Electron API interface for TypeScript
 * These are the desktop functions available in the renderer process
 */
export interface ElectronAPI {
  // Notifications
  showNotification: (title: string, body: string) => Promise<void>;
  
  // File operations
  exportTranscription: (content: string, filePath: string) => Promise<{ success: boolean; error?: string }>;
  
  // Menu events
  onMenuStartRecording: (callback: () => void) => () => void;
  onMenuStopRecording: (callback: () => void) => () => void;
  onMenuExportTranscription: (callback: (filePath: string) => void) => () => void;
}

/**
 * Global window interface extension for Electron
 */
declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
} 