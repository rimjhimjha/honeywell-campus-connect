# 🛡️ NigraniAI - Production-Ready Public Space Safety Monitor

[![React](https://img.shields.io/badge/React-18.2.0-blue.svg)](https://reactjs.org)
[![Python](https://img.shields.io/badge/Python-3.8%2B-blue.svg)](https://python.org)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Production Ready](https://img.shields.io/badge/production-ready-green.svg)](https://github.com)

**NigraniAI** is a production-ready, AI-powered safety monitoring system designed to enhance security in public spaces. Using advanced YOLOv8 detection, real-time alerting, and comprehensive monitoring capabilities, it provides 24/7 automated safety surveillance with real camera integration.

## ✨ New Features

### 🌙 Dark/Light Mode
- **Automatic theme detection** based on system preferences
- **Manual theme toggle** with smooth transitions
- **Persistent theme settings** saved to localStorage
- **Apple-inspired design** with beautiful animations

### 🎨 Enhanced UI
- **Modern Apple-style design** with attention to detail
- **Smooth transitions** and micro-interactions
- **Consistent color system** across light and dark modes
- **Improved accessibility** with proper contrast ratios

## 🚀 Quick Start (WebContainer Compatible)

### Prerequisites

- **Node.js 16+** and **npm**
- **Python 3.8+** (built-in, no additional packages needed)

### 1. Start Backend Server

```bash
# Start the simple backend server (no dependencies required)
python start_backend.py
```

This will:
- Start a lightweight HTTP server on port 8000
- Provide authentication and basic alert management
- Work in any Python environment (including WebContainer)

### 2. Start Frontend (in a new terminal)

```bash
# Install frontend dependencies
npm install

# Start the development server
npm run dev
```

The application will be available at:
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8000
- **Health Check:** http://localhost:8000/health

### 3. Login

Use the demo credentials:
- **Admin:** username: `admin`, password: `admin123`
- **Operator:** username: `operator`, password: `operator123`

## 🎯 Key Features

### 🔍 Real-Time AI Detection
- **YOLOv8-powered detection** of fights, falls, overcrowding, and suspicious behavior
- **Live camera integration** with webcam, IP cameras, and RTSP streams
- **High accuracy detection** with configurable confidence thresholds
- **Performance optimized** for 30+ FPS processing

### 📹 Camera Management
- **Multi-camera support** with real-time switching
- **Webcam integration** using browser MediaDevices API
- **IP camera support** with RTSP/HTTP streams
- **Live video feeds** with detection overlays
- **Camera health monitoring** and status tracking

### 🚨 Production Alert System
- **Real-time notifications** via WebSocket connections
- **Multi-channel alerts** (SMS via Twilio, Email via SendGrid)
- **Browser notifications** for immediate attention
- **Smart cooldown** to prevent alert spam
- **Alert acknowledgment** and tracking system

### 📊 Advanced Dashboard
- **Real-time monitoring** with live metrics
- **Interactive analytics** with charts and trends
- **User authentication** with role-based access
- **System health monitoring** and diagnostics
- **Mobile responsive** design for all devices
- **Dark/Light mode** with automatic detection

### 🏗️ Production Architecture
- **React frontend** with modern hooks and state management
- **Simple HTTP backend** compatible with any Python environment
- **Real-time communication** between frontend and backend
- **In-memory storage** for development (easily upgradeable to database)
- **Scalable microservices** design

## 🌙 Theme System

### Automatic Theme Detection
```javascript
// Theme automatically detects system preference
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
```

### Manual Theme Toggle
```javascript
// Users can manually switch themes
const { isDark, toggleTheme } = useTheme()
```

### Persistent Settings
```javascript
// Theme preference is saved to localStorage
localStorage.setItem('nigraniai-theme', isDark ? 'dark' : 'light')
```

## 📖 Development Setup Options

### Option 1: Simple Setup (Recommended for WebContainer)

```bash
# Terminal 1: Start backend
python start_backend.py

# Terminal 2: Start frontend
npm run dev
```

### Option 2: Advanced Setup (Local Development)

```bash
# Install all dependencies
pip install -r requirements.txt

# Start full backend with all features
python run_local.py

# In another terminal, start frontend
npm run dev
```

### Option 3: Docker Setup

```bash
# Build and run with Docker
docker-compose up -d

# Scale services
docker-compose up --scale api=3 --scale detector=2
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file:

```env
# Frontend Configuration
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000/ws

# Backend Configuration
API_HOST=0.0.0.0
API_PORT=8000

# Twilio Configuration (for SMS alerts)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# SendGrid Configuration (for email alerts)
SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_FROM_EMAIL=alerts@nigraniai.com

# Alert Recipients
ALERT_PHONE_NUMBERS=+1234567890,+0987654321
ALERT_EMAIL_ADDRESSES=admin@example.com,security@example.com

# Detection Configuration
CROWD_THRESHOLD=10
CONFIDENCE_THRESHOLD=0.6
ALERT_COOLDOWN_SECONDS=30

# Camera Configuration
VIDEO_SOURCE=0  # Use 0 for webcam, RTSP URL for IP cameras
FRAME_SKIP=2   # Process every Nth frame for performance
DISPLAY_VIDEO=false
```

## 🎨 Design System

### Color Palette
- **Primary:** Blue shades for main actions and branding
- **Success:** Green for positive states and confirmations
- **Warning:** Yellow/Orange for cautions and warnings
- **Danger:** Red for errors and critical alerts
- **Neutral:** Gray scales for text and backgrounds

### Typography
- **Font Family:** Inter (system fallback)
- **Font Weights:** 400 (normal), 500 (medium), 600 (semibold), 700 (bold)
- **Line Heights:** 1.2 for headings, 1.5 for body text

### Spacing System
- **Base Unit:** 4px (0.25rem)
- **Scale:** 4px, 8px, 12px, 16px, 20px, 24px, 32px, 40px, 48px, 64px

## 🧪 Testing

### Frontend Testing
```bash
# Run unit tests
npm test

# Run integration tests
npm run test:integration

# Run end-to-end tests
npm run test:e2e
```

### Backend Testing
```bash
# Run Python tests
pytest tests/ -v

# Run with coverage
pytest tests/ --cov=backend --cov-report=html
```

### Manual Testing
```bash
# Test backend health
curl http://localhost:8000/health

# Test login
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

## 🚀 Deployment Options

### Development
```bash
# Simple development setup
python start_backend.py  # Backend
npm run dev             # Frontend
```

### Production
```bash
npm run build  # Build optimized frontend
npm run preview  # Preview production build

# Deploy to cloud platforms
# - Vercel (frontend)
# - Railway/Heroku (backend)
# - AWS/GCP/Azure (full stack)
```

### Docker Deployment
```bash
# Build and run with Docker
docker-compose up -d

# Scale services
docker-compose up --scale api=3 --scale detector=2
```

## 📊 API Documentation

### Key Endpoints

```bash
# Authentication
POST /auth/login
GET /auth/me

# System Health
GET /health

# Alerts
GET /alerts
POST /alert
POST /alerts/{alert_id}/acknowledge
DELETE /alerts

# Statistics
GET /alerts/stats

# Testing
POST /test-alert
```

### Example API Usage

```bash
# Login
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Get alerts (with token)
curl -X GET http://localhost:8000/alerts \
  -H "Authorization: Bearer YOUR_TOKEN"

# Send test alert
curl -X POST http://localhost:8000/test-alert \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 🔒 Security Features

### Authentication & Authorization
- **Simple token-based auth** for development
- **Role-based permissions** for different user types
- **Session management** with token expiration
- **CORS support** for cross-origin requests

### Data Protection
- **HTTPS enforcement** in production
- **CORS configuration** for secure cross-origin requests
- **Input validation** and sanitization
- **Rate limiting** to prevent abuse

## 📱 Mobile & Responsive Design

### Cross-Platform Support
- **Responsive design** works on all screen sizes
- **Touch-friendly interface** for mobile devices
- **Progressive Web App** capabilities
- **Offline functionality** for critical features

