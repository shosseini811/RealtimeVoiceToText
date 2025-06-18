#!/bin/bash

# Navigate to backend directory
cd backend

# Activate virtual environment
source venv/bin/activate

# Start the server
echo "🚀 Starting AI Note Taker Backend..."
echo "📡 WebSocket: ws://localhost:8000/ws"
echo "🌐 API: http://localhost:8000"
echo "🏥 Health: http://localhost:8000/api/health"
echo ""

# Run the server (without reload to avoid issues)
uvicorn main:app --host 0.0.0.0 --port 8000 