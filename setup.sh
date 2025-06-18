#!/bin/bash

# ==========================================
# AI Note Taker – Project Setup Script
# ------------------------------------------
# This script prepares your local development
# environment so you can start coding right away.
# It performs the following high-level steps:
#   1. Ensures a `.env` file exists so you can
#      supply your own API keys.
#   2. Installs the Node.js dependencies that the
#      React front-end needs.
#   3. Installs the Python dependencies for the
#      backend service.
#   4. Prints easy next-step instructions.
#
# Feel free to re-run this script at any time – it
# safely skips work that has already been done.
# ==========================================
echo "🤖 Setting up AI Note Taker..."

# --------------------------------------------------
# STEP 1 – Ensure the environment file (.env) exists
# --------------------------------------------------
# The `.env` file stores **private** credentials such
# as API keys.  We copy the template file `env.example`
# if an actual `.env` file is not present so that the
# project has all required environment variables.
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

# --------------------------------------------------
# STEP 2 – Install JavaScript/TypeScript dependencies
# --------------------------------------------------
# The presence of the `node_modules` folder indicates
# that `npm install` has already been executed.  If
# the folder is missing we run `npm install` to fetch
# all packages listed in `package.json`.
# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing Node.js dependencies..."
    npm install
    echo "✅ Node.js dependencies installed!"
else
    echo "✅ Node.js dependencies already installed"
fi

# --------------------------------------------------
# STEP 3 – Install Python dependencies
# --------------------------------------------------
# We invoke `pip install -r requirements.txt` to make
# sure the backend can run.  The output is redirected
# to `/dev/null` to keep the script output concise –
# remove the redirection if you need verbose logs.
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