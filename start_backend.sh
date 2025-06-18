#!/bin/bash

# 🐍 BACKEND STARTUP SCRIPT
# 
# This shell script starts the Python backend server for our Voice to Text application.
# It handles virtual environment activation and server startup in the correct directory.
#
# WHAT THIS SCRIPT DOES:
# 1. Navigates to the backend directory
# 2. Activates the Python virtual environment 
# 3. Starts the FastAPI server with uvicorn
# 4. Displays helpful information about endpoints
#
# USAGE:
# Run this script from the project root directory:
# ./start_backend.sh
#
# REQUIREMENTS:
# - Python virtual environment must be set up in backend/venv/
# - All Python dependencies must be installed (pip install -r requirements.txt)
# - Backend directory must contain main.py file

# 📁 NAVIGATE TO BACKEND DIRECTORY
# Change to the backend directory where our Python code lives
# This ensures all relative paths in the Python code work correctly
cd backend

# 🔧 ACTIVATE VIRTUAL ENVIRONMENT
# Virtual environments isolate Python dependencies for this project
# This prevents conflicts with other Python projects on your system
#
# VIRTUAL ENVIRONMENT EXPLANATION:
# - venv/ folder contains a separate Python installation for this project
# - Libraries installed here don't affect your system Python
# - Keeps different projects' dependencies separate
# - source command loads the environment variables and Python path
source venv/bin/activate

# 📢 DISPLAY STARTUP INFORMATION
# Print helpful information about what's starting and where to access it
echo "🚀 Starting AI Note Taker Backend..."
echo "📡 WebSocket endpoint: ws://localhost:8000/ws"
echo "🌐 HTTP API: http://localhost:8000"
echo "📚 API Documentation: http://localhost:8000/docs"
echo "🏥 Health Check: http://localhost:8000/api/health"
echo ""

# 🚀 START THE SERVER
# uvicorn is a fast ASGI server for Python web applications
# It runs our FastAPI application defined in main.py
#
# UVICORN PARAMETERS EXPLAINED:
# - main:app = run the 'app' object from main.py file
# - --host 0.0.0.0 = accept connections from any IP address (not just localhost)
# - --port 8000 = run on port 8000
# - No --reload flag = don't restart automatically on code changes (more stable)
#
# WHY NO --RELOAD:
# The --reload flag can sometimes cause issues with WebSocket connections
# For development, you can manually restart the server when you make changes
uvicorn main:app --host 0.0.0.0 --port 8000

# 💡 TROUBLESHOOTING TIPS:
#
# 1. "Permission denied" error:
#    Make the script executable: chmod +x start_backend.sh
#
# 2. "venv/bin/activate: No such file or directory":
#    Create virtual environment first: python -m venv venv
#    Then install dependencies: pip install -r requirements.txt
#
# 3. "uvicorn: command not found":
#    Install uvicorn: pip install uvicorn
#    Or install all dependencies: pip install -r requirements.txt
#
# 4. "Port 8000 already in use":
#    Kill existing process: lsof -ti:8000 | xargs kill -9
#    Or use a different port: uvicorn main:app --port 8001
#
# 5. Server starts but React can't connect:
#    Check if backend is running: curl http://localhost:8000/api/health
#    Verify WebSocket endpoint: ws://localhost:8000/ws
#    Check firewall settings if on different machines 