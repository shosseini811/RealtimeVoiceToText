#!/bin/bash

# AI Note Taker Setup Script
echo "🤖 Setting up AI Note Taker..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp env.example .env
    echo "✅ .env file created!"
    echo ""
    echo "⚠️  IMPORTANT: Please edit the .env file and add your API keys:"
    echo "   - DEEPGRAM_API_KEY=your_deepgram_api_key_here"
    echo "   - GEMINI_API_KEY=your_gemini_api_key_here"
    echo ""
    echo "🔗 Get your API keys:"
    echo "   - Deepgram: https://console.deepgram.com/"
    echo "   - Gemini: https://makersuite.google.com/app/apikey"
    echo ""
else
    echo "✅ .env file already exists"
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing Node.js dependencies..."
    npm install
    echo "✅ Node.js dependencies installed!"
else
    echo "✅ Node.js dependencies already installed"
fi

# Check Python dependencies
echo "🐍 Checking Python dependencies..."
pip install -r requirements.txt > /dev/null 2>&1
echo "✅ Python dependencies ready!"

echo ""
echo "🎉 Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Edit .env file with your API keys"
echo "2. Start the backend: cd backend && python main.py"
echo "3. Start the frontend: npm start"
echo "4. Open http://localhost:3000 in your browser"
echo ""
echo "🚀 Happy note-taking!" 