"""
Simple FastAPI server for SafeZoneAI development
Minimal implementation to get authentication working
"""

from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer
from pydantic import BaseModel
from datetime import datetime, timedelta
import jwt
import uvicorn
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# FastAPI app
app = FastAPI(
    title="SafeZoneAI Simple API",
    description="Minimal API for development",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer()

# JWT Configuration
SECRET_KEY = "safezone-dev-secret-key"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Mock users database
USERS_DB = {
    "admin": {
        "username": "admin",
        "email": "admin@safezoneai.com",
        "password": "admin123",
        "role": "admin"
    },
    "operator": {
        "username": "operator",
        "email": "operator@safezoneai.com", 
        "password": "operator123",
        "role": "operator"
    }
}

# Mock alerts storage
ALERTS = []

# Pydantic models
class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    expires_in: int

class AlertRequest(BaseModel):
    event_type: str
    confidence: float
    timestamp: str
    frame_number: int
    person_count: int
    description: str
    location: str = "Camera 1"

class SystemStatus(BaseModel):
    status: str
    version: str
    uptime: str
    alerts_count: int
    active_cameras: int
    last_detection: str = None

# Helper functions
def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return username
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

def get_current_user(credentials = Depends(security)):
    username = verify_token(credentials.credentials)
    user = USERS_DB.get(username)
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user

# Routes
@app.get("/")
async def root():
    return {
        "message": "SafeZoneAI Simple API",
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/health", response_model=SystemStatus)
async def health_check():
    return SystemStatus(
        status="healthy",
        version="1.0.0",
        uptime="Running",
        alerts_count=len(ALERTS),
        active_cameras=1,
        last_detection=datetime.now().isoformat() if ALERTS else None
    )

@app.post("/auth/login", response_model=Token)
async def login(user_data: UserLogin):
    user = USERS_DB.get(user_data.username)
    if not user or user["password"] != user_data.password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    access_token = create_access_token(
        data={"sub": user["username"], "role": user["role"]}
    )
    
    logger.info(f"User {user_data.username} logged in successfully")
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )

@app.get("/auth/me")
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    return {
        "username": current_user["username"],
        "email": current_user["email"],
        "role": current_user["role"]
    }

@app.get("/alerts")
async def get_alerts(current_user: dict = Depends(get_current_user)):
    return ALERTS

@app.post("/alert")
async def receive_alert(alert: AlertRequest):
    alert_data = {
        "id": len(ALERTS) + 1,
        "alert_id": f"alert_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{alert.frame_number}",
        "event_type": alert.event_type,
        "type": alert.event_type,  # Alias for compatibility
        "confidence": alert.confidence,
        "timestamp": alert.timestamp,
        "frame_number": alert.frame_number,
        "person_count": alert.person_count,
        "personCount": alert.person_count,  # Alias for compatibility
        "description": alert.description,
        "location": alert.location,
        "severity": "high" if alert.event_type in ["fight", "fall"] else "medium",
        "acknowledged": False,
        "acknowledged_at": None,
        "acknowledged_by": None
    }
    
    ALERTS.insert(0, alert_data)  # Add to beginning for newest first
    logger.info(f"Alert received: {alert.event_type} - {alert.description}")
    
    return {
        "success": True,
        "alert_id": alert_data["alert_id"],
        "sms_sent": True,
        "email_sent": True,
        "timestamp": datetime.now().isoformat()
    }

@app.post("/alerts/{alert_id}/acknowledge")
async def acknowledge_alert(alert_id: str, current_user: dict = Depends(get_current_user)):
    for alert in ALERTS:
        if alert["alert_id"] == alert_id:
            alert["acknowledged"] = True
            alert["acknowledged_at"] = datetime.now().isoformat()
            alert["acknowledged_by"] = current_user["username"]
            logger.info(f"Alert {alert_id} acknowledged by {current_user['username']}")
            return {"message": "Alert acknowledged successfully"}
    
    raise HTTPException(status_code=404, detail="Alert not found")

@app.delete("/alerts")
async def clear_alerts(current_user: dict = Depends(get_current_user)):
    count = len(ALERTS)
    ALERTS.clear()
    logger.info(f"All alerts cleared by {current_user['username']} ({count} alerts)")
    return {"message": f"Cleared {count} alerts"}

@app.post("/test-alert")
async def test_alert(current_user: dict = Depends(get_current_user)):
    test_alert_data = AlertRequest(
        event_type="test",
        confidence=0.95,
        timestamp=datetime.now().isoformat(),
        frame_number=12345,
        person_count=1,
        description=f"Test alert triggered by {current_user['username']}",
        location="Test Camera"
    )
    
    return await receive_alert(test_alert_data)

@app.get("/alerts/stats")
async def get_alert_stats(current_user: dict = Depends(get_current_user)):
    total_alerts = len(ALERTS)
    by_type = {}
    for alert in ALERTS:
        event_type = alert["event_type"]
        by_type[event_type] = by_type.get(event_type, 0) + 1
    
    avg_confidence = sum(alert["confidence"] for alert in ALERTS) / total_alerts if total_alerts > 0 else 0
    
    return {
        "total_alerts": total_alerts,
        "by_type": by_type,
        "by_hour": {},  # Simplified for now
        "avg_confidence": avg_confidence
    }

def main():
    """Run the FastAPI server"""
    logger.info("Starting SafeZoneAI Simple API Server...")
    uvicorn.run(
        "backend.simple_server:app",
        host="0.0.0.0",
        port=8000,
        reload=False,
        log_level="info"
    )

if __name__ == "__main__":
    main()