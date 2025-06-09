# Real-time Voice to Text App

A modern macOS application that converts speech to text in real-time using Deepgram's powerful API. Built with React (TypeScript) frontend and Python (FastAPI) backend.

## Features

- 🎤 **Real-time transcription** - See your words appear as you speak
- 🔄 **Live updates** - Interim results show partial transcriptions
- 📋 **Copy to clipboard** - Easy text copying functionality
- 🎨 **Modern UI** - Beautiful, responsive design optimized for macOS
- 🔒 **Secure** - API key stored in environment variables
- ⚡ **Fast** - WebSocket connection for minimal latency

## Prerequisites

Before you begin, ensure you have the following installed:

- **Python 3.8+** - [Download Python](https://www.python.org/downloads/)
- **Node.js 16+** - [Download Node.js](https://nodejs.org/)
- **npm or yarn** - Comes with Node.js
- **Deepgram API Key** - [Get your free API key](https://console.deepgram.com/)

## Quick Start

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd RealtimeVoiceToText
```

### 2. Set Up the Backend (Python)

```bash
# Install Python dependencies
pip install -r requirements.txt

# Create environment file
cp env.example .env

# Edit .env file and add your Deepgram API key
# DEEPGRAM_API_KEY=your_actual_api_key_here
```

### 3. Set Up the Frontend (React)

```bash
# Install Node.js dependencies
npm install
```

### 4. Get Your Deepgram API Key

1. Go to [Deepgram Console](https://console.deepgram.com/)
2. Sign up for a free account
3. Create a new project
4. Copy your API key
5. Add it to your `.env` file

### 5. Run the Application

**Terminal 1 - Start the Python Backend:**
```bash
cd backend
python main.py
```
The backend will start on `http://localhost:8000`

**Terminal 2 - Start the React Frontend:**
```bash
npm start
```
The frontend will start on `http://localhost:3000`

### 6. Use the App

1. Open your browser to `http://localhost:3000`
2. Click "Start Recording"
3. Allow microphone access when prompted
4. Start speaking - your words will appear in real-time!
5. Click "Stop Recording" when finished
6. Use "Copy" to copy text or "Clear" to start over

## How It Works

### Architecture Overview

```
┌─────────────────┐    WebSocket    ┌─────────────────┐    WebSocket    ┌─────────────────┐
│   React App     │ ◄──────────────► │  Python Backend │ ◄──────────────► │  Deepgram API   │
│   (Frontend)    │                 │   (FastAPI)     │                 │   (Speech AI)   │
└─────────────────┘                 └─────────────────┘                 └─────────────────┘
```

### Data Flow

1. **Audio Capture**: React app captures microphone audio using `MediaRecorder`
2. **WebSocket Streaming**: Audio data is sent to Python backend via WebSocket
3. **Deepgram Processing**: Backend forwards audio to Deepgram's real-time API
4. **Text Results**: Deepgram returns transcribed text (both interim and final)
5. **UI Updates**: React app displays transcription results in real-time

### Key Technologies

**Frontend (React + TypeScript):**
- `MediaRecorder API` - Captures microphone audio
- `WebSocket` - Real-time communication with backend
- `React Hooks` - State management (useState, useEffect, useRef)
- `TypeScript` - Type safety and better development experience

**Backend (Python + FastAPI):**
- `FastAPI` - Modern web framework for APIs
- `WebSocket` - Real-time bidirectional communication
- `Deepgram SDK` - Official Python SDK for Deepgram API
- `asyncio` - Asynchronous programming for handling concurrent connections

## Understanding TypeScript Concepts

Since you're new to TypeScript, here are the key concepts used in this project:

### 1. **Interfaces** - Defining Data Structures
```typescript
interface TranscriptionMessage {
  type: string;           // Required field
  text?: string;          // Optional field (note the ?)
  is_final?: boolean;     // Optional boolean
  message?: string;       // Optional message
}
```
**What this means**: An interface is like a contract that defines what properties an object should have. The `?` makes properties optional.

### 2. **State with Types** - Typed React State
```typescript
const [isRecording, setIsRecording] = useState<boolean>(false);
const [transcription, setTranscription] = useState<string>('');
```
**What this means**: We're telling TypeScript exactly what type of data each state variable will hold. `boolean` for true/false, `string` for text.

### 3. **Refs with Types** - Typed References
```typescript
const websocketRef = useRef<WebSocket | null>(null);
const mediaRecorderRef = useRef<MediaRecorder | null>(null);
```
**What this means**: Refs store references to objects. The `| null` means it can be either a WebSocket object OR null (empty).

### 4. **Function Types** - Typed Functions
```typescript
const connectWebSocket = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    // function body
  });
};
```
**What this means**: This function returns a Promise that doesn't return any value (void) when it completes.

## Project Structure

```
RealtimeVoiceToText/
├── backend/
│   └── main.py              # Python FastAPI server
├── src/
│   ├── App.tsx              # Main React component
│   ├── App.css              # Styles for the app
│   ├── index.tsx            # React app entry point
│   └── index.css            # Global styles
├── public/
│   └── index.html           # HTML template
├── package.json             # Node.js dependencies
├── requirements.txt         # Python dependencies
├── tsconfig.json           # TypeScript configuration
└── README.md               # This file
```

## Troubleshooting

### Common Issues

**1. "Cannot find module 'react'" Error**
```bash
# Make sure you've installed dependencies
npm install
```

**2. "DEEPGRAM_API_KEY not found" Error**
- Make sure you created a `.env` file in the root directory
- Add your actual Deepgram API key to the file
- Restart the Python backend

**3. Microphone Permission Denied**
- Check your browser's microphone permissions
- On macOS: System Preferences → Security & Privacy → Privacy → Microphone
- Make sure your browser has microphone access

**4. WebSocket Connection Failed**
- Make sure the Python backend is running on port 8000
- Check if any firewall is blocking the connection
- Try restarting both frontend and backend

**5. No Audio Being Captured**
- Check if your microphone is working in other apps
- Try using a different browser (Chrome works best)
- Check browser console for error messages

### Development Tips

**For Python Backend:**
```bash
# Run with auto-reload for development
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**For React Frontend:**
```bash
# Run in development mode with hot reload
npm start
```

## API Endpoints

### Backend Endpoints

- `GET /` - Basic API information
- `GET /health` - Health check endpoint
- `WebSocket /ws` - Real-time audio streaming endpoint

### WebSocket Message Types

**From Frontend to Backend:**
- Binary audio data (WebM format)

**From Backend to Frontend:**
```json
{
  "type": "transcription",
  "text": "Hello world",
  "is_final": true
}
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Deepgram](https://deepgram.com/) for providing the excellent speech-to-text API
- [FastAPI](https://fastapi.tiangolo.com/) for the modern Python web framework
- [React](https://reactjs.org/) for the powerful frontend library

## Support

If you encounter any issues or have questions:

1. Check the troubleshooting section above
2. Look at the browser console for error messages
3. Check the Python backend logs
4. Create an issue in this repository

---

**Happy transcribing! 🎤→📝**