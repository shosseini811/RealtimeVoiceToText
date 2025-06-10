# 🤖 AI Note Taker

A modern macOS application that combines real-time speech transcription with AI-powered summaries. Built with React (TypeScript) frontend and Python (FastAPI) backend, powered by Deepgram for transcription and Google Gemini for AI insights.

## ✨ Features

- 🎤 **Real-time Transcription** - Live speech-to-text using Deepgram's advanced API
- 🤖 **AI-Powered Summaries** - Intelligent meeting summaries using Google Gemini Flash 2.5
- 📝 **Smart Insights** - Extract action items, key points, and decisions automatically
- 🎨 **Modern UI** - Beautiful, responsive design optimized for macOS
- 🔒 **Privacy-Focused** - No bots in meetings, audio processed securely
- ⚡ **Real-time Updates** - See transcription as you speak with WebSocket connection
- 📋 **Easy Export** - Copy transcriptions and summaries to clipboard

## 🛠 Tech Stack

**Frontend:**
- React 18 with TypeScript
- Modern CSS with glassmorphism design
- Lucide React icons
- WebSocket for real-time communication

**Backend:**
- Python FastAPI
- Deepgram SDK for speech recognition
- Google Generative AI (Gemini)
- WebSocket support
- Pydantic for data validation

## 📋 Prerequisites

Before you begin, ensure you have:

- **Python 3.8+** - [Download Python](https://www.python.org/downloads/)
- **Node.js 16+** - [Download Node.js](https://nodejs.org/)
- **Deepgram API Key** - [Get free API key](https://console.deepgram.com/)
- **Google Gemini API Key** - [Get API key](https://makersuite.google.com/app/apikey)

## 🚀 Quick Start

### 1. Clone and Setup

```bash
git clone <your-repo-url>
cd ai-note-taker
```

### 2. Backend Setup (Python)

```bash
# Install Python dependencies
pip install -r requirements.txt

# Create environment file
cp env.example .env

# Edit .env file with your API keys
# DEEPGRAM_API_KEY=your_deepgram_api_key_here
# GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Frontend Setup (React)

```bash
# Install Node.js dependencies
npm install
```

### 4. Get Your API Keys

**Deepgram API Key:**
1. Go to [Deepgram Console](https://console.deepgram.com/)
2. Sign up for a free account (includes $200 credit)
3. Create a new project
4. Copy your API key

**Google Gemini API Key:**
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Create a new API key
4. Copy your API key

### 5. Run the Application

**Terminal 1 - Start Python Backend:**
```bash
cd backend
python main.py
```
Backend runs on `http://localhost:8000`

**Terminal 2 - Start React Frontend:**
```bash
npm start
```
Frontend runs on `http://localhost:3000`

### 6. Use the App

1. Open `http://localhost:3000` in your browser
2. Click "Start Recording" and allow microphone access
3. Start speaking - see real-time transcription
4. Click "AI Summary" to get intelligent insights
5. Use quick actions for specific extractions
6. Copy results or clear to start over

## 🏗 Architecture

```
┌─────────────────┐    WebSocket    ┌─────────────────┐    API Calls    ┌─────────────────┐
│   React App     │ ◄──────────────► │  Python Backend │ ◄──────────────► │  Deepgram API   │
│   (Frontend)    │                 │   (FastAPI)     │                 │   (Speech AI)   │
│                 │                 │                 │                 └─────────────────┘
│                 │    HTTP/REST    │                 │    API Calls    ┌─────────────────┐
│                 │ ◄──────────────► │                 │ ◄──────────────► │  Gemini API     │
└─────────────────┘                 └─────────────────┘                 │   (AI Summary)  │
                                                                        └─────────────────┘
```

## 📁 Project Structure

```
ai-note-taker/
├── backend/
│   └── main.py              # Python FastAPI server
├── src/
│   ├── App.tsx              # Main React component
│   ├── App.css              # Styles for the app
│   ├── types.ts             # TypeScript type definitions
│   ├── index.tsx            # React app entry point
│   └── index.css            # Global styles
├── public/
│   └── index.html           # HTML template
├── package.json             # Node.js dependencies
├── requirements.txt         # Python dependencies
├── tsconfig.json           # TypeScript configuration
├── env.example             # Environment variables template
└── README.md               # This file
```

## 🔧 TypeScript Concepts Explained

Since you're new to TypeScript, here are the key concepts used in this project:

### 1. **Interfaces** - Data Structure Contracts
```typescript
interface TranscriptionMessage {
  type: string;           // Required field
  text?: string;          // Optional field (note the ?)
  is_final?: boolean;     // Optional boolean
}
```
**What this means**: Interfaces define the shape of objects. The `?` makes properties optional.

### 2. **State with Types** - Typed React State
```typescript
const [isRecording, setIsRecording] = useState<boolean>(false);
const [transcription, setTranscription] = useState<string>('');
```
**What this means**: We tell TypeScript exactly what type of data each state variable holds.

### 3. **Union Types** - Multiple Possible Types
```typescript
type ConnectionStatus = 'Disconnected' | 'Connected' | 'Connection Error';
```
**What this means**: A variable can be one of several specific string values.

### 4. **Generic Types** - Flexible Type Parameters
```typescript
const websocketRef = useRef<WebSocket | null>(null);
```
**What this means**: The ref can hold either a WebSocket object OR null.

### 5. **Function Types** - Typed Functions
```typescript
const connectWebSocket = (): Promise<void> => {
  // Returns a Promise that resolves to nothing (void)
};
```

## 🎯 API Endpoints

### WebSocket Endpoints
- `ws://localhost:8000/ws` - Real-time transcription

### REST Endpoints
- `GET /` - API information
- `GET /api/health` - Health check
- `POST /api/summarize` - Generate AI summary

### Example API Usage
```typescript
// Generate AI summary
const response = await fetch('http://localhost:8000/api/summarize', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: "Meeting transcript here...",
    summary_type: "meeting" // or "action_items" or "key_points"
  })
});
```

## 🔍 How It Works

### Real-time Transcription Flow
1. **Audio Capture**: React captures microphone audio using MediaRecorder
2. **WebSocket Streaming**: Audio sent to Python backend via WebSocket
3. **Deepgram Processing**: Backend forwards audio to Deepgram's real-time API
4. **Live Results**: Deepgram returns both interim and final transcriptions
5. **UI Updates**: React displays results in real-time

### AI Summary Generation
1. **Text Processing**: Complete transcript sent to backend
2. **Gemini Analysis**: Google's Gemini AI analyzes the content
3. **Structured Output**: AI returns formatted summaries, action items, etc.
4. **Display**: Frontend shows organized insights

## 🎨 UI Features

- **Glassmorphism Design** - Modern translucent panels with blur effects
- **Real-time Status** - Live connection status with animated indicators
- **Responsive Layout** - Works on desktop and mobile devices
- **Copy Functionality** - Easy clipboard integration
- **Loading States** - Visual feedback during AI processing
- **Error Handling** - Clear error messages and recovery options

## 🔧 Troubleshooting

### Common Issues

**1. "Cannot find module 'react'" Error**
```bash
npm install
```

**2. "API Key not found" Error**
- Ensure `.env` file exists in root directory
- Add your actual API keys to the file
- Restart the Python backend

**3. Microphone Permission Denied**
- Check browser microphone permissions
- On macOS: System Preferences → Security & Privacy → Privacy → Microphone
- Ensure browser has microphone access

**4. WebSocket Connection Failed**
- Ensure Python backend is running on port 8000
- Check firewall settings
- Try restarting both frontend and backend

**5. AI Summary Not Working**
- Verify Gemini API key is correct
- Check backend logs for errors
- Ensure you have API quota remaining

### Development Commands

```bash
# Backend development with auto-reload
cd backend && uvicorn main:app --reload

# Frontend development
npm start

# Install new Python package
pip install package_name && pip freeze > requirements.txt

# Install new Node package
npm install package_name
```

## 🚀 Deployment

### For macOS App Distribution

1. **Build React App**
```bash
npm run build
```

2. **Package Python Backend**
```bash
pip install pyinstaller
pyinstaller --onefile backend/main.py
```

3. **Create macOS App Bundle**
- Use tools like `py2app` or `electron` to create native macOS app
- Include both frontend build and backend executable

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Deepgram](https://deepgram.com/) for excellent speech-to-text API
- [Google AI](https://ai.google.dev/) for Gemini AI capabilities
- [FastAPI](https://fastapi.tiangolo.com/) for the modern Python web framework
- [React](https://reactjs.org/) for the powerful frontend library
- [Lucide](https://lucide.dev/) for beautiful icons

## 📞 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Look at browser console for error messages
3. Check Python backend logs
4. Create an issue in this repository

---

**Happy note-taking! 🎤→📝→🤖** 