#!/usr/bin/env python3
"""
Ultra-simple backend server for SafeZoneAI
Works in WebContainer environment without complex dependencies
"""

import json
import time
from datetime import datetime, timedelta
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import threading

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

# Simple token storage (in production, use proper JWT)
TOKENS = {}

def generate_token(username):
    """Generate a simple token"""
    token = f"token_{username}_{int(time.time())}"
    TOKENS[token] = {
        "username": username,
        "expires": time.time() + 1800  # 30 minutes
    }
    return token

def verify_token(token):
    """Verify a token"""
    if token in TOKENS:
        token_data = TOKENS[token]
        if token_data["expires"] > time.time():
            return token_data["username"]
        else:
            del TOKENS[token]
    return None

class SafeZoneHandler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        """Handle CORS preflight requests"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()

    def send_json_response(self, data, status=200):
        """Send JSON response with CORS headers"""
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def get_auth_token(self):
        """Extract auth token from Authorization header"""
        auth_header = self.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            return auth_header[7:]
        return None

    def get_current_user(self):
        """Get current user from token"""
        token = self.get_auth_token()
        if token:
            username = verify_token(token)
            if username:
                return USERS_DB.get(username)
        return None

    def do_GET(self):
        """Handle GET requests"""
        parsed_path = urlparse(self.path)
        path = parsed_path.path
        
        if path == '/':
            self.send_json_response({
                "message": "SafeZoneAI Simple API",
                "version": "1.0.0",
                "status": "running"
            })
        
        elif path == '/health':
            self.send_json_response({
                "status": "healthy",
                "version": "1.0.0",
                "uptime": "Running",
                "alerts_count": len(ALERTS),
                "active_cameras": 1,
                "last_detection": datetime.now().isoformat() if ALERTS else None
            })
        
        elif path == '/auth/me':
            user = self.get_current_user()
            if user:
                self.send_json_response({
                    "username": user["username"],
                    "email": user["email"],
                    "role": user["role"]
                })
            else:
                self.send_json_response({"error": "Unauthorized"}, 401)
        
        elif path == '/alerts':
            user = self.get_current_user()
            if user:
                self.send_json_response(ALERTS)
            else:
                self.send_json_response({"error": "Unauthorized"}, 401)
        
        elif path == '/alerts/stats':
            user = self.get_current_user()
            if user:
                total_alerts = len(ALERTS)
                by_type = {}
                for alert in ALERTS:
                    event_type = alert["event_type"]
                    by_type[event_type] = by_type.get(event_type, 0) + 1
                
                avg_confidence = sum(alert["confidence"] for alert in ALERTS) / total_alerts if total_alerts > 0 else 0
                
                self.send_json_response({
                    "total_alerts": total_alerts,
                    "by_type": by_type,
                    "by_hour": {},
                    "avg_confidence": avg_confidence
                })
            else:
                self.send_json_response({"error": "Unauthorized"}, 401)
        
        else:
            self.send_json_response({"error": "Not found"}, 404)

    def do_POST(self):
        """Handle POST requests"""
        parsed_path = urlparse(self.path)
        path = parsed_path.path
        
        # Read request body
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length).decode('utf-8')
        
        try:
            data = json.loads(post_data) if post_data else {}
        except json.JSONDecodeError:
            self.send_json_response({"error": "Invalid JSON"}, 400)
            return
        
        if path == '/auth/login':
            username = data.get('username')
            password = data.get('password')
            
            user = USERS_DB.get(username)
            if user and user["password"] == password:
                token = generate_token(username)
                self.send_json_response({
                    "access_token": token,
                    "token_type": "bearer",
                    "expires_in": 1800
                })
            else:
                self.send_json_response({"error": "Invalid credentials"}, 401)
        
        elif path == '/alert':
            alert_data = {
                "id": len(ALERTS) + 1,
                "alert_id": f"alert_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{data.get('frame_number', 0)}",
                "event_type": data.get('event_type', 'unknown'),
                "type": data.get('event_type', 'unknown'),
                "confidence": data.get('confidence', 0.8),
                "timestamp": data.get('timestamp', datetime.now().isoformat()),
                "frame_number": data.get('frame_number', 0),
                "person_count": data.get('person_count', 1),
                "personCount": data.get('person_count', 1),
                "description": data.get('description', 'Alert detected'),
                "location": data.get('location', 'Camera 1'),
                "severity": "high" if data.get('event_type') in ["fight", "fall"] else "medium",
                "acknowledged": False,
                "acknowledged_at": None,
                "acknowledged_by": None
            }
            
            ALERTS.insert(0, alert_data)
            print(f"Alert received: {data.get('event_type')} - {data.get('description')}")
            
            self.send_json_response({
                "success": True,
                "alert_id": alert_data["alert_id"],
                "sms_sent": True,
                "email_sent": True,
                "timestamp": datetime.now().isoformat()
            })
        
        elif path == '/test-alert':
            user = self.get_current_user()
            if user:
                test_alert = {
                    "id": len(ALERTS) + 1,
                    "alert_id": f"alert_{datetime.now().strftime('%Y%m%d_%H%M%S')}_test",
                    "event_type": "test",
                    "type": "test",
                    "confidence": 0.95,
                    "timestamp": datetime.now().isoformat(),
                    "frame_number": 12345,
                    "person_count": 1,
                    "personCount": 1,
                    "description": f"Test alert triggered by {user['username']}",
                    "location": "Test Camera",
                    "severity": "medium",
                    "acknowledged": False,
                    "acknowledged_at": None,
                    "acknowledged_by": None
                }
                
                ALERTS.insert(0, test_alert)
                print(f"Test alert created by {user['username']}")
                
                self.send_json_response({
                    "success": True,
                    "alert_id": test_alert["alert_id"],
                    "sms_sent": True,
                    "email_sent": True,
                    "timestamp": datetime.now().isoformat()
                })
            else:
                self.send_json_response({"error": "Unauthorized"}, 401)
        
        elif path.startswith('/alerts/') and path.endswith('/acknowledge'):
            user = self.get_current_user()
            if user:
                alert_id = path.split('/')[-2]
                for alert in ALERTS:
                    if alert["alert_id"] == alert_id:
                        alert["acknowledged"] = True
                        alert["acknowledged_at"] = datetime.now().isoformat()
                        alert["acknowledged_by"] = user["username"]
                        print(f"Alert {alert_id} acknowledged by {user['username']}")
                        self.send_json_response({"message": "Alert acknowledged successfully"})
                        return
                
                self.send_json_response({"error": "Alert not found"}, 404)
            else:
                self.send_json_response({"error": "Unauthorized"}, 401)
        
        else:
            self.send_json_response({"error": "Not found"}, 404)

    def do_DELETE(self):
        """Handle DELETE requests"""
        parsed_path = urlparse(self.path)
        path = parsed_path.path
        
        if path == '/alerts':
            user = self.get_current_user()
            if user:
                count = len(ALERTS)
                ALERTS.clear()
                print(f"All alerts cleared by {user['username']} ({count} alerts)")
                self.send_json_response({"message": f"Cleared {count} alerts"})
            else:
                self.send_json_response({"error": "Unauthorized"}, 401)
        else:
            self.send_json_response({"error": "Not found"}, 404)

    def log_message(self, format, *args):
        """Override to reduce log noise"""
        pass

def run_server():
    """Run the HTTP server"""
    server_address = ('', 8000)
    httpd = HTTPServer(server_address, SafeZoneHandler)
    
    print("🛡️ SafeZoneAI Simple Backend Server")
    print("=" * 40)
    print("✅ Server starting on http://localhost:8000")
    print("📍 Health check: http://localhost:8000/health")
    print("📍 API docs: Available endpoints:")
    print("   • POST /auth/login")
    print("   • GET /auth/me")
    print("   • GET /health")
    print("   • GET /alerts")
    print("   • POST /alert")
    print("   • POST /test-alert")
    print("💡 Use Ctrl+C to stop")
    print("=" * 40)
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Server stopped")
        httpd.server_close()

if __name__ == "__main__":
    run_server()