# 🚀 Quick Start Guide

Get your AI Note Taker running in 5 minutes!

## 1. Setup (One-time)

```bash
# Run the setup script
./setup.sh
```

## 2. Get API Keys

### Deepgram API Key (Free $200 credit)
1. Go to [console.deepgram.com](https://console.deepgram.com/)
2. Sign up → Create project → Copy API key

### Google Gemini API Key (Free tier available)
1. Go to [makersuite.google.com/app/apikey](https://makersuite.google.com/app/apikey)
2. Sign in → Create API key → Copy key

## 3. Configure Environment

Edit `.env` file:
```bash
DEEPGRAM_API_KEY=your_actual_deepgram_key_here
GEMINI_API_KEY=your_actual_gemini_key_here
```

## 4. Start the App

**Terminal 1 - Backend:**
```bash
cd backend
python main.py
```

**Terminal 2 - Frontend:**
```bash
npm start
```

## 5. Use the App

1. Open http://localhost:3000
2. Click "Start Recording"
3. Allow microphone access
4. Start speaking!
5. Click "AI Summary" for insights

## 🎯 Features to Try

- **Real-time transcription** - See words as you speak
- **AI summaries** - Get meeting insights
- **Action items** - Extract tasks automatically
- **Key points** - Identify important topics
- **Copy & paste** - Easy text export

## 🔧 Troubleshooting

**Microphone not working?**
- Check browser permissions
- Try Chrome/Safari
- Check System Preferences → Privacy → Microphone

**Connection errors?**
- Ensure backend is running on port 8000
- Check API keys in .env file
- Restart both frontend and backend

**Need help?** Check the full README.md for detailed instructions.

---

**Happy note-taking! 🎤→📝→🤖** 