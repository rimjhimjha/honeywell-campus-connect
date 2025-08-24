#!/usr/bin/env python3
"""
Local development runner for SafeZoneAI
Runs the system without Docker in WebContainer environment
"""

import os
import sys
import subprocess
import time
import threading
import signal
import requests
from pathlib import Path
import atexit

# Global process references for cleanup
processes = []

def cleanup_processes():
    """Clean up all spawned processes"""
    print("\n🧹 Cleaning up processes...")
    for process in processes:
        if process and process.poll() is None:
            try:
                process.terminate()
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()
            except Exception:
                pass

def install_dependencies():
    """Install Python dependencies"""
    print("📦 Installing Python dependencies...")
    try:
        subprocess.run([
            sys.executable, "-m", "pip", "install", "--user", "-r", "requirements.txt"
        ], check=True)
        print("✅ Dependencies installed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to install dependencies: {e}")
        return False

def create_directories():
    """Create necessary directories"""
    directories = ["logs", "data", "models"]
    for directory in directories:
        Path(directory).mkdir(exist_ok=True)
        print(f"📁 Created directory: {directory}")

def setup_environment():
    """Setup environment variables"""
    env_vars = {
        "API_HOST": "0.0.0.0",
        "API_PORT": "8000",
        "DASHBOARD_PORT": "8501",
        "VIDEO_SOURCE": "0",
        "CONFIDENCE_THRESHOLD": "0.6",
        "CROWD_THRESHOLD": "10",
        "FRAME_SKIP": "2",
        "DISPLAY_VIDEO": "false"
    }
    
    for key, value in env_vars.items():
        if key not in os.environ:
            os.environ[key] = value
    
    print("🔧 Environment variables configured")

def wait_for_api_health(max_attempts=30, delay=2):
    """Wait for the API server to be healthy"""
    print("⏳ Waiting for API server to be ready...")
    
    for attempt in range(max_attempts):
        try:
            response = requests.get("http://localhost:8000/health", timeout=5)
            if response.status_code == 200:
                print("✅ API server is healthy and ready!")
                return True
        except (requests.exceptions.RequestException, requests.exceptions.ConnectionError):
            pass
        
        print(f"   Attempt {attempt + 1}/{max_attempts} - API not ready yet...")
        time.sleep(delay)
    
    print("❌ API server failed to become healthy within timeout period")
    return False

def start_api_server():
    """Start the FastAPI backend server as a background process"""
    print("🚀 Starting API server on port 8000...")
    try:
        # Start API server as background process
        process = subprocess.Popen([
            sys.executable, "-m", "backend.app"
        ], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        
        processes.append(process)
        print("✅ API server process started")
        return process
        
    except Exception as e:
        print(f"❌ Failed to start API server: {e}")
        return None

def start_dashboard():
    """Start the Streamlit dashboard as a background process"""
    print("📊 Starting dashboard on port 8501...")
    try:
        # Start dashboard as background process
        process = subprocess.Popen([
            "streamlit", "run", "dashboard/streamlit_app.py",
            "--server.port=8501",
            "--server.address=0.0.0.0",
            "--server.headless=true",
            "--browser.gatherUsageStats=false"
        ], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        
        processes.append(process)
        print("✅ Dashboard process started")
        return process
        
    except Exception as e:
        print(f"❌ Failed to start dashboard: {e}")
        return None

def start_detector():
    """Start the detection engine as a background process"""
    print("🔍 Starting detection engine...")
    try:
        # Start detector as background process
        process = subprocess.Popen([
            sys.executable, "-m", "detection.detector"
        ], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        
        processes.append(process)
        print("✅ Detection engine process started")
        return process
        
    except Exception as e:
        print(f"❌ Failed to start detection engine: {e}")
        return None

def monitor_processes():
    """Monitor background processes and restart if needed"""
    while True:
        try:
            for i, process in enumerate(processes):
                if process and process.poll() is not None:
                    print(f"⚠️  Process {i} has stopped unexpectedly")
                    # Could implement restart logic here if needed
            time.sleep(5)
        except KeyboardInterrupt:
            break

def main():
    """Main function to run SafeZoneAI locally"""
    print("🛡️ SafeZoneAI Local Development Setup")
    print("=" * 50)
    
    # Register cleanup function
    atexit.register(cleanup_processes)
    
    # Setup signal handlers for graceful shutdown
    def signal_handler(signum, frame):
        print(f"\n🛑 Received signal {signum}, shutting down...")
        cleanup_processes()
        sys.exit(0)
    
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # Setup
    create_directories()
    setup_environment()
    
    # Install dependencies
    if not install_dependencies():
        print("❌ Cannot continue without dependencies")
        return
    
    print("\n🚀 Starting SafeZoneAI services...")
    print("📍 API will be available at: http://localhost:8000")
    print("📍 Dashboard will be available at: http://localhost:8501")
    print("📍 API Documentation: http://localhost:8000/docs")
    print("\n⚠️  Note: Detection requires a camera or video source")
    print("💡 Use Ctrl+C to stop all services")
    print("=" * 50)
    
    try:
        # Start API server
        api_process = start_api_server()
        if not api_process:
            print("❌ Cannot continue without API server")
            return
        
        # Wait for API to be healthy before starting other services
        if not wait_for_api_health():
            print("❌ Cannot start other services without a healthy API")
            cleanup_processes()
            return
        
        # Start dashboard after API is confirmed healthy
        dashboard_process = start_dashboard()
        time.sleep(2)  # Give dashboard time to start
        
        # Optionally start detector (commented out as it requires camera)
        # detector_process = start_detector()
        
        print("✅ All services started successfully!")
        print("\n🔗 Quick Links:")
        print("   • Dashboard: http://localhost:8501")
        print("   • API Health: http://localhost:8000/health")
        print("   • API Docs: http://localhost:8000/docs")
        print("\n📊 Process Status:")
        print(f"   • API Server: {'Running' if api_process and api_process.poll() is None else 'Stopped'}")
        print(f"   • Dashboard: {'Running' if dashboard_process and dashboard_process.poll() is None else 'Stopped'}")
        
        # Monitor processes and keep main thread alive
        monitor_processes()
            
    except KeyboardInterrupt:
        print("\n🛑 Shutting down SafeZoneAI...")
        cleanup_processes()
        print("✅ All services stopped")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        cleanup_processes()

if __name__ == "__main__":
    main()