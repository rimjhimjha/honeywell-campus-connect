"""
SafeZoneAI Backend API

Enhanced FastAPI application with authentication, database persistence,
and production-ready features
"""

import logging
import json
from datetime import datetime, timedelta
from typing import List, Dict, Optional
from fastapi import FastAPI, HTTPException, BackgroundTasks, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer
from pydantic import BaseModel
import uvicorn

from .alerts import alert_manager
from .config import settings
from .database import db_manager
from .auth import auth_manager, get_current_user, require_role, UserCreate, UserLogin, Token

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/api.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# FastAPI app
app = FastAPI(
    title="SafeZoneAI API",
    description="Production-Ready Public Space Safety Monitoring System",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer()

# Pydantic models
class AlertRequest(BaseModel):
    """Alert request model"""
    event_type: str
    confidence: float
    timestamp: str
    frame_number: int
    person_count: int
    description: str
    location: str = "Public Space Camera 1"

class AlertResponse(BaseModel):
    """Alert response model"""
    success: bool
    alert_id: str
    sms_sent: bool
    email_sent: bool
    timestamp: str

class AlertSummary(BaseModel):
    """Alert summary for dashboard"""
    id: int
    alert_id: str
    event_type: str
    confidence: float
    timestamp: str
    location: str
    description: str
    person_count: int
    status: str
    acknowledged_by: Optional[str] = None
    acknowledged_at: Optional[str] = None

class AlertAcknowledge(BaseModel):
    """Alert acknowledgment model"""
    alert_id: str
    notes: Optional[str] = None

class SystemStatus(BaseModel):
    """System status model"""
    status: str
    version: str
    uptime: str
    alerts_count: int
    active_cameras: int
    last_detection: Optional[str]

# Startup event
@app.on_event("startup")
async def startup_event():
    """Initialize application on startup"""
    logger.info("SafeZoneAI API starting up...")
    
    # Create default admin user if none exists
    try:
        with db_manager.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) as count FROM users")
            user_count = cursor.fetchone()['count']
            
            if user_count == 0:
                default_admin = UserCreate(
                    username="admin",
                    email="admin@safezoneai.com",
                    password="admin123",  # Change in production
                    role="admin"
                )
                auth_manager.create_user(default_admin)
                logger.info("Default admin user created (username: admin, password: admin123)")
    except Exception as e:
        logger.error(f"Failed to create default user: {e}")
    
    db_manager.log_system_event("INFO", "SafeZoneAI API started", "app")

# Authentication endpoints
@app.post("/auth/register", response_model=dict)
async def register(user_data: UserCreate, current_user: dict = Depends(require_role("admin"))):
    """Register new user (admin only)"""
    if auth_manager.create_user(user_data):
        return {"message": "User created successfully"}
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User already exists or creation failed"
        )

@app.post("/auth/login", response_model=Token)
async def login(user_data: UserLogin):
    """User login"""
    user = auth_manager.authenticate_user(user_data.username, user_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    access_token = auth_manager.create_access_token(
        data={"sub": user['username'], "role": user['role']}
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": 1800  # 30 minutes
    }

@app.get("/auth/me")
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """Get current user information"""
    return {
        "username": current_user['username'],
        "email": current_user['email'],
        "role": current_user['role']
    }

# Main endpoints
@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "SafeZoneAI Backend API",
        "version": "2.0.0",
        "status": "running",
        "documentation": "/docs"
    }

@app.get("/health", response_model=SystemStatus)
async def health_check():
    """Enhanced health check endpoint"""
    try:
        # Get recent alerts count
        recent_alerts = db_manager.get_alerts(limit=1000, hours=24)
        
        # Get last detection time
        last_detection = None
        if recent_alerts:
            last_detection = recent_alerts[0]['timestamp']
        
        return SystemStatus(
            status="healthy",
            version="2.0.0",
            uptime="Running",  # Could calculate actual uptime
            alerts_count=len(recent_alerts),
            active_cameras=1,  # Could be dynamic
            last_detection=last_detection
        )
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return SystemStatus(
            status="degraded",
            version="2.0.0",
            uptime="Unknown",
            alerts_count=0,
            active_cameras=0,
            last_detection=None
        )

@app.post("/alert", response_model=AlertResponse)
async def receive_alert(alert: AlertRequest, background_tasks: BackgroundTasks):
    """
    Receive detection alert and trigger notifications
    """
    try:
        # Generate alert ID
        alert_id = f"alert_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{alert.frame_number}"
        
        # Store alert in database
        alert_data = {
            "alert_id": alert_id,
            "event_type": alert.event_type,
            "confidence": alert.confidence,
            "timestamp": alert.timestamp,
            "frame_number": alert.frame_number,
            "person_count": alert.person_count,
            "description": alert.description,
            "location": alert.location,
            "processed_at": datetime.now().isoformat()
        }
        
        success = db_manager.store_alert(alert_data)
        if not success:
            logger.error("Failed to store alert in database")
        
        # Send alerts in background
        background_tasks.add_task(
            send_notification,
            alert.event_type,
            alert.description,
            alert.confidence,
            alert.location
        )
        
        # Log system event
        db_manager.log_system_event(
            "INFO", 
            f"Alert received: {alert.event_type} - {alert.description}",
            "detector"
        )
        
        logger.info(f"Alert received and stored: {alert.event_type} - {alert.description}")
        
        return AlertResponse(
            success=True,
            alert_id=alert_id,
            sms_sent=True,  # Will be updated by background task
            email_sent=True,  # Will be updated by background task
            timestamp=datetime.now().isoformat()
        )
        
    except Exception as e:
        logger.error(f"Failed to process alert: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def send_notification(event_type: str, description: str, 
                          confidence: float, location: str):
    """Send notification in background"""
    try:
        result = await alert_manager.send_alert(
            event_type, description, confidence, location
        )
        logger.info(f"Notifications sent: {result}")
        
        # Log notification result
        db_manager.log_system_event(
            "INFO",
            f"Notifications sent for {event_type}: SMS={result.get('sms_sent')}, Email={result.get('email_sent')}",
            "alerts"
        )
    except Exception as e:
        logger.error(f"Failed to send notifications: {e}")
        db_manager.log_system_event("ERROR", f"Failed to send notifications: {e}", "alerts")

@app.get("/alerts", response_model=List[AlertSummary])
async def get_alerts(
    limit: int = 50, 
    hours: int = 24, 
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get recent alerts for dashboard"""
    try:
        alerts = db_manager.get_alerts(limit=limit, hours=hours, status=status)
        return [AlertSummary(**alert) for alert in alerts]
    except Exception as e:
        logger.error(f"Failed to retrieve alerts: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/alerts/{alert_id}/acknowledge")
async def acknowledge_alert(
    alert_id: str,
    acknowledge_data: AlertAcknowledge,
    current_user: dict = Depends(get_current_user)
):
    """Acknowledge an alert"""
    try:
        success = db_manager.acknowledge_alert(alert_id, current_user['username'])
        if success:
            db_manager.log_system_event(
                "INFO",
                f"Alert {alert_id} acknowledged by {current_user['username']}",
                "alerts"
            )
            return {"message": "Alert acknowledged successfully"}
        else:
            raise HTTPException(status_code=404, detail="Alert not found")
    except Exception as e:
        logger.error(f"Failed to acknowledge alert: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/alerts/stats")
async def get_alert_stats(
    hours: int = 24,
    current_user: dict = Depends(get_current_user)
):
    """Get alert statistics for dashboard"""
    try:
        stats = db_manager.get_alert_stats(hours=hours)
        return stats
    except Exception as e:
        logger.error(f"Failed to generate stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/alerts")
async def clear_alerts(current_user: dict = Depends(require_role("admin"))):
    """Clear all stored alerts (admin only)"""
    try:
        with db_manager.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) as count FROM alerts")
            count = cursor.fetchone()['count']
            
            cursor.execute("DELETE FROM alerts")
            conn.commit()
            
        db_manager.log_system_event(
            "WARNING",
            f"All alerts cleared by {current_user['username']} ({count} alerts)",
            "admin"
        )
        
        logger.info(f"Cleared {count} alerts by {current_user['username']}")
        return {"message": f"Cleared {count} alerts"}
    except Exception as e:
        logger.error(f"Failed to clear alerts: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/test-alert")
async def test_alert(
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    """Send a test alert for demonstration purposes"""
    test_event = AlertRequest(
        event_type="test",
        confidence=0.95,
        timestamp=datetime.now().isoformat(),
        frame_number=12345,
        person_count=1,
        description=f"Test alert triggered by {current_user['username']}",
        location="Test Camera"
    )
    
    return await receive_alert(test_event, background_tasks)

@app.get("/system/logs")
async def get_system_logs(
    limit: int = 100,
    level: Optional[str] = None,
    current_user: dict = Depends(require_role("admin"))
):
    """Get system logs (admin only)"""
    try:
        with db_manager.get_connection() as conn:
            cursor = conn.cursor()
            
            query = "SELECT * FROM system_logs"
            params = []
            
            if level:
                query += " WHERE level = ?"
                params.append(level)
            
            query += " ORDER BY timestamp DESC LIMIT ?"
            params.append(limit)
            
            cursor.execute(query, params)
            logs = [dict(row) for row in cursor.fetchall()]
            
        return logs
    except Exception as e:
        logger.error(f"Failed to get system logs: {e}")
        raise HTTPException(status_code=500, detail=str(e))

def main():
    """Run the FastAPI server"""
    import os
    os.makedirs("logs", exist_ok=True)
    
    uvicorn.run(
        "backend.app:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=False,  # Disable in production
        log_level="info"
    )

if __name__ == "__main__":
    main()