#!/usr/bin/env python3
"""
Simple startup script for SafeZoneAI development
Starts only the essential backend API server
"""

import os
import sys
import subprocess
import time
import signal
import requests
from pathlib import Path

def install_dependencies():
    """Install minimal Python dependencies"""
    print("📦 Installing Python dependencies...")
    try:
        # Install only essential packages
        essential_packages = [
            "fastapi==0.103.1",
            "uvicorn[standard]==0.23.2", 
            "python-jose[cryptography]==3.3.0",
            "python-multipart==0.0.6",
            "requests==2.31.0"
        ]
        
        for package in essential_packages:
            subprocess.run([
                sys.executable, "-m", "pip", "install", "--user", package
            ], check=True, capture_output=True)
        
        print("✅ Essential dependencies installed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to install dependencies: {e}")
        return False

def create_directories():
    """Create necessary directories"""
    directories = ["logs", "data"]
    for directory in directories:
        Path(directory).mkdir(exist_ok=True)
        print(f"📁 Created directory: {directory}")

def wait_for_api_health(max_attempts=15, delay=2):
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

def main():
    """Main function to run SafeZoneAI simple setup"""
    print("🛡️ SafeZoneAI Simple Development Setup")
    print("=" * 50)
    
    # Setup
    create_directories()
    
    # Install dependencies
    if not install_dependencies():
        print("❌ Cannot continue without dependencies")
        return
    
    print("\n🚀 Starting SafeZoneAI API server...")
    print("📍 API will be available at: http://localhost:8000")
    print("📍 API Documentation: http://localhost:8000/docs")
    print("📍 Frontend should be started separately with: npm run dev")
    print("\n💡 Use Ctrl+C to stop the server")
    print("=" * 50)
    
    try:
        # Start the simple API server directly
        from backend.simple_server import main as run_server
        run_server()
        
    except KeyboardInterrupt:
        print("\n🛑 Shutting down SafeZoneAI...")
        print("✅ Server stopped")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")

if __name__ == "__main__":
    main()