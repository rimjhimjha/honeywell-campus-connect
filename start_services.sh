#!/bin/bash

# SafeZoneAI Local Startup Script
echo "🛡️ Starting SafeZoneAI Services"
echo "================================"

# Create necessary directories
mkdir -p logs data models

# Set environment variables
export API_HOST=0.0.0.0
export API_PORT=8000
export DASHBOARD_PORT=8501
export VIDEO_SOURCE=0
export CONFIDENCE_THRESHOLD=0.6
export CROWD_THRESHOLD=10
export FRAME_SKIP=2
export DISPLAY_VIDEO=false

# Install dependencies
echo "📦 Installing Python dependencies..."
python3 -m pip install --user -r requirements.txt

# Start API server in background
echo "🚀 Starting API server..."
python3 -m backend.app &
API_PID=$!

# Wait a moment for API to start
sleep 3

# Start dashboard
echo "📊 Starting dashboard..."
streamlit run dashboard/streamlit_app.py --server.port=8501 --server.address=0.0.0.0 --server.headless=true &
DASHBOARD_PID=$!

echo "✅ Services started!"
echo "📍 Dashboard: http://localhost:8501"
echo "📍 API: http://localhost:8000"
echo "📍 API Docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop all services"

# Function to cleanup on exit
cleanup() {
    echo "🛑 Stopping services..."
    kill $API_PID 2>/dev/null
    kill $DASHBOARD_PID 2>/dev/null
    echo "✅ All services stopped"
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM

# Wait for services
wait