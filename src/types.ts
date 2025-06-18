// 📋 TYPESCRIPT TYPE DEFINITIONS
// 
// This file defines the structure of data used throughout our application.
// TypeScript interfaces and types help us:
// 1. Catch bugs at compile time (before running the code)
// 2. Get better IDE autocomplete and suggestions
// 3. Make code self-documenting by showing what data looks like
// 4. Ensure consistency across different parts of the app
// 
// WHAT IS AN INTERFACE?
// An interface is like a contract that defines what properties an object must have.
// It's like a blueprint or template for objects.
// 
// WHAT IS A TYPE?
// A type is similar to an interface but can also define unions (A | B) and other complex types.

/**
 * 🎙️ TRANSCRIPTION MESSAGE INTERFACE
 * 
 * This defines the structure of messages we receive from the WebSocket backend.
 * When Deepgram processes audio, it sends us messages with this structure.
 * 
 * ENHANCED FEATURES:
 * Now includes speaker identification, feature status, and enhanced formatting
 * 
 * EXAMPLE MESSAGE:
 * {
 *   type: "transcription",
 *   text: "Hello world",
 *   is_final: true,
 *   speaker: 0,
 *   has_diarization: true,
 *   word_count: 2,
 *   features_used: { diarization: true, punctuation: true, ... }
 * }
 */
export interface TranscriptionMessage {
  type: string;                    // Type of message: 'transcription', 'error', 'connection_status', etc.
  text?: string;                   // The transcribed text (with smart formatting!) - optional with ?
  is_final?: boolean;              // Whether this is final result or still being processed - optional
  message?: string;                // Status or error messages from backend - optional
  full_transcript?: string;        // Complete transcript accumulated so far - optional
  
  // 🆕 NEW ENHANCED FEATURES FROM DEEPGRAM
  speaker?: number;                // Speaker ID from diarization (e.g., 0, 1, 2) - which person is speaking
  has_diarization?: boolean;       // Whether speaker detection is working properly
  word_count?: number;             // Number of words in this transcription segment
  features_used?: DeepgramFeatures; // Which Deepgram AI features are currently active
}

/**
 * 🆕 DEEPGRAM FEATURES STATUS INTERFACE
 * 
 * Shows which advanced AI features are currently enabled in Deepgram.
 * This helps us know what capabilities are available and working.
 * 
 * FEATURES EXPLAINED:
 * - Diarization: Identifies different speakers (Speaker 1, Speaker 2, etc.)
 * - Redaction: Hides sensitive information like credit card numbers
 * - Paragraphs: Breaks text into logical paragraph chunks
 * - Punctuation: Adds periods, commas, capitalization automatically
 * - Smart Format: Formats numbers, dates, currencies properly
 */
export interface DeepgramFeatures {
  diarization: boolean;            // Speaker identification enabled (true/false)
  redaction: boolean;              // Sensitive info redaction enabled (true/false)
  paragraphs: boolean;             // Paragraph breaks enabled (true/false)
  punctuation: boolean;            // Auto-punctuation enabled (true/false)
  smart_format: boolean;           // Smart formatting enabled (true/false)
}

/**
 * 🤖 AI SUMMARY INTERFACE
 * 
 * This defines the structure of AI-generated summaries from Google Gemini.
 * When we send transcribed text to our backend, Gemini AI analyzes it
 * and returns a structured summary with this format.
 * 
 * ENHANCED WITH SPEAKER ANALYSIS:
 * Now includes per-speaker insights when diarization is enabled.
 * 
 * EXAMPLE SUMMARY:
 * {
 *   summary: "Team discussed project timeline and assigned tasks",
 *   key_points: ["Timeline moved to next month", "Need more resources"],
 *   action_items: [{ task: "Hire developer", responsible_party: "John", deadline: "Friday" }],
 *   speaker_summary: [{ speaker_id: 0, main_points: ["Discussed budget"], ... }]
 * }
 */
export interface AISummary {
  summary?: string;                // Brief overview of the content - optional
  key_points?: string[];           // Array of important discussion points - optional
  action_items?: ActionItem[];     // List of tasks and to-dos - optional
  decisions?: string[];            // Important decisions that were made - optional
  next_steps?: string[];           // Next steps or follow-up actions - optional
  error?: string;                  // Error message if AI processing failed - optional
  type?: string;                   // Type of summary that was generated - optional
  raw_response?: string;           // Raw AI response as fallback if parsing fails - optional
  
  // 🆕 NEW: ENHANCED ANALYSIS FEATURES
  speaker_summary?: SpeakerSummary[]; // Per-speaker analysis when diarization is enabled
  redacted_content?: boolean;      // Whether sensitive information was found and hidden
}

/**
 * 🆕 SPEAKER SUMMARY INTERFACE
 * 
 * When diarization (speaker identification) is enabled, we can provide
 * detailed analysis for each individual speaker in the conversation.
 * This is useful for meetings with multiple participants.
 * 
 * EXAMPLE:
 * {
 *   speaker_id: 0,
 *   main_points: ["Discussed budget constraints", "Proposed new timeline"],
 *   speaking_time_percentage: 45,
 *   action_items: [{ task: "Review budget", responsible_party: "Speaker 0" }]
 * }
 */
export interface SpeakerSummary {
  speaker_id: number;              // Speaker identifier (0, 1, 2, etc.) - matches diarization IDs
  main_points: string[];           // Key points this specific speaker made
  speaking_time_percentage?: number; // What % of conversation this speaker participated in - optional
  action_items?: ActionItem[];     // Action items assigned to or mentioned by this speaker - optional
}

/**
 * 📋 ACTION ITEM INTERFACE
 * 
 * Represents a task or to-do item extracted from the conversation.
 * AI analyzes the transcription and identifies actionable items.
 * 
 * ENHANCED WITH SPEAKER TRACKING:
 * Now tracks which speaker assigned or mentioned the task.
 * 
 * EXAMPLES:
 * { task: "Send report to client", responsible_party: "John", deadline: "Friday" }
 * { task: "Schedule follow-up meeting", speaker_assigned_by: 1 }
 */
export interface ActionItem {
  task: string;                    // Description of what needs to be done - required
  responsible_party?: string;      // Who is responsible for this task - optional
  deadline?: string;               // When it needs to be completed - optional
  speaker_assigned_by?: number;    // 🆕 Which speaker (by ID) assigned this task - optional
}

/**
 * 🔗 CONNECTION STATUS TYPE
 * 
 * This is a TypeScript union type - it can be one of several specific string values.
 * It tracks the status of our WebSocket connection to the backend.
 * 
 * UNION TYPE EXPLANATION:
 * Instead of allowing any string, we restrict it to only these specific values.
 * This prevents typos and makes the code more reliable.
 * 
 * STATUS MEANINGS:
 * - 'Disconnected': Not connected to backend
 * - 'Connecting': Attempting to connect
 * - 'Connected': Basic connection established
 * - 'Connected to Deepgram': Connected and Deepgram is ready
 * - 'Enhanced Features Active': All AI features are working
 * - 'Connection Error': Something went wrong
 */
export type ConnectionStatus = 
  | 'Disconnected'                 // No connection to backend
  | 'Connecting'                   // Attempting to establish connection
  | 'Connected'                    // Basic WebSocket connection established
  | 'Connected to Deepgram'        // Connected and Deepgram transcription ready
  | 'Enhanced Features Active'     // 🆕 NEW: All advanced features working properly
  | 'Connection Error';            // Connection failed or error occurred

/**
 * 📊 SUMMARY TYPE
 * 
 * Defines the different types of AI summaries we can request.
 * Each type focuses on different aspects of the transcribed content.
 * 
 * SUMMARY TYPES EXPLAINED:
 * - 'meeting': Comprehensive overview with all sections
 * - 'action_items': Focus only on tasks and to-dos
 * - 'key_points': Extract main takeaways and important points
 * - 'speaker_analysis': 🆕 Per-speaker breakdown and analysis
 */
export type SummaryType = 
  | 'meeting'                      // Comprehensive meeting summary (default)
  | 'action_items'                 // Focus on tasks and to-dos
  | 'key_points'                   // Main takeaways and important points
  | 'speaker_analysis';            // 🆕 NEW: Per-speaker analysis and breakdown

/**
 * 🏠 APP STATE INTERFACE
 * 
 * This defines the complete state structure of our React application.
 * It includes all the data that the app needs to track and display.
 * 
 * ENHANCED WITH NEW FEATURES:
 * Now includes speaker tracking and feature status monitoring.
 * 
 * STATE MANAGEMENT:
 * In React, "state" is data that can change over time and triggers re-renders
 * when updated. This interface ensures all state has the correct structure.
 */
export interface AppState {
  // CORE RECORDING STATE
  isRecording: boolean;            // Whether we're currently recording audio
  transcription: string;          // Final transcribed text to display
  interimText: string;            // Temporary text being processed (live feedback)
  connectionStatus: ConnectionStatus; // Current WebSocket connection status
  error: string;                   // Error message to show user (empty string = no error)
  
  // AI PROCESSING STATE
  aiSummary: AISummary | null;     // Generated summary (null = no summary yet)
  isGeneratingSummary: boolean;    // Whether AI is currently processing summary
  
  // 🆕 NEW: ENHANCED FEATURES STATE
  currentSpeaker?: number;         // Currently detected speaker ID - optional
  featuresStatus?: DeepgramFeatures; // Status of all Deepgram features - optional
  speakerCount?: number;           // Total number of different speakers detected - optional
}

// 💡 TYPESCRIPT TIPS FOR BEGINNERS:
// 
// 1. INTERFACES vs TYPES:
//    - Use 'interface' for object shapes: interface User { name: string; age: number; }
//    - Use 'type' for unions and complex types: type Status = 'loading' | 'success' | 'error'
// 
// 2. OPTIONAL PROPERTIES (?):
//    - name?: string means the property is optional (can be undefined)
//    - name: string means the property is required
// 
// 3. ARRAYS:
//    - string[] means an array of strings: ["hello", "world"]
//    - ActionItem[] means an array of ActionItem objects
// 
// 4. UNION TYPES (|):
//    - string | null means the value can be a string OR null
//    - 'red' | 'blue' | 'green' means only these three specific strings are allowed
// 
// 5. GENERICS (<T>):
//    - Not used in this file, but you might see Array<string> which is the same as string[]
// 
// 6. BENEFITS:
//    - Catches bugs before runtime
//    - Better IDE autocomplete
//    - Self-documenting code
//    - Refactoring safety 