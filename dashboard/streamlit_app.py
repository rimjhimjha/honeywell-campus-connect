"""
SafeZoneAI Dashboard

Enhanced Streamlit application with authentication, real-time monitoring,
and production-ready features
"""

import streamlit as st
import requests
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from datetime import datetime, timedelta
import time
import json
import cv2
import numpy as np
from PIL import Image
import os

# Page configuration
st.set_page_config(
    page_title="SafeZoneAI Dashboard",
    page_icon="🛡️",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Constants
API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000")
REFRESH_INTERVAL = 5  # seconds

# Session state initialization
if 'authenticated' not in st.session_state:
    st.session_state.authenticated = False
if 'token' not in st.session_state:
    st.session_state.token = None
if 'user_info' not in st.session_state:
    st.session_state.user_info = None

def load_css():
    """Load custom CSS for better styling"""
    st.markdown("""
    <style>
    .main-header {
        background: linear-gradient(90deg, #1e3c72 0%, #2a5298 100%);
        padding: 2rem;
        border-radius: 10px;
        color: white;
        margin-bottom: 2rem;
        text-align: center;
    }
    .metric-card {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        padding: 1.5rem;
        border-radius: 10px;
        color: white;
        text-align: center;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .alert-card {
        background-color: #fff;
        padding: 1.5rem;
        border-radius: 10px;
        border-left: 5px solid #ff4b4b;
        margin-bottom: 1rem;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        transition: transform 0.2s;
    }
    .alert-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    .status-healthy {
        color: #00c851;
        font-weight: bold;
        font-size: 1.2em;
    }
    .status-warning {
        color: #ffbb33;
        font-weight: bold;
        font-size: 1.2em;
    }
    .status-critical {
        color: #ff4444;
        font-weight: bold;
        font-size: 1.2em;
    }
    .login-container {
        max-width: 400px;
        margin: 0 auto;
        padding: 2rem;
        background: white;
        border-radius: 10px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .sidebar-info {
        background-color: #f0f2f6;
        padding: 1rem;
        border-radius: 5px;
        margin: 1rem 0;
    }
    </style>
    """, unsafe_allow_html=True)

def authenticate_user(username: str, password: str) -> bool:
    """Authenticate user with API"""
    try:
        response = requests.post(
            f"{API_BASE_URL}/auth/login",
            json={"username": username, "password": password},
            timeout=10
        )
        if response.status_code == 200:
            data = response.json()
            st.session_state.token = data['access_token']
            st.session_state.authenticated = True
            
            # Get user info
            headers = {"Authorization": f"Bearer {st.session_state.token}"}
            user_response = requests.get(f"{API_BASE_URL}/auth/me", headers=headers)
            if user_response.status_code == 200:
                st.session_state.user_info = user_response.json()
            
            return True
        else:
            return False
    except Exception as e:
        st.error(f"Authentication failed: {e}")
        return False

def get_auth_headers():
    """Get authentication headers"""
    if st.session_state.token:
        return {"Authorization": f"Bearer {st.session_state.token}"}
    return {}

def login_page():
    """Display login page"""
    st.markdown('<div class="main-header"><h1>🛡️ SafeZoneAI Dashboard</h1><p>Secure Login Required</p></div>', 
                unsafe_allow_html=True)
    
    with st.container():
        col1, col2, col3 = st.columns([1, 2, 1])
        with col2:
            st.markdown('<div class="login-container">', unsafe_allow_html=True)
            
            st.subheader("Login")
            username = st.text_input("Username", placeholder="Enter your username")
            password = st.text_input("Password", type="password", placeholder="Enter your password")
            
            col_a, col_b = st.columns(2)
            with col_a:
                if st.button("Login", type="primary", use_container_width=True):
                    if username and password:
                        if authenticate_user(username, password):
                            st.success("Login successful!")
                            st.rerun()
                        else:
                            st.error("Invalid credentials")
                    else:
                        st.error("Please enter both username and password")
            
            with col_b:
                if st.button("Demo Login", use_container_width=True):
                    if authenticate_user("admin", "admin123"):
                        st.success("Demo login successful!")
                        st.rerun()
                    else:
                        st.error("Demo login failed")
            
            st.markdown('</div>', unsafe_allow_html=True)
            
            st.info("**Demo Credentials:** Username: `admin`, Password: `admin123`")

@st.cache_data(ttl=REFRESH_INTERVAL)
def fetch_alerts(limit=50, hours=24):
    """Fetch recent alerts from API"""
    try:
        response = requests.get(
            f"{API_BASE_URL}/alerts",
            params={"limit": limit, "hours": hours},
            headers=get_auth_headers(),
            timeout=5
        )
        if response.status_code == 200:
            return response.json()
        else:
            return []
    except Exception as e:
        st.error(f"Failed to fetch alerts: {e}")
        return []

@st.cache_data(ttl=REFRESH_INTERVAL)
def fetch_stats(hours=24):
    """Fetch alert statistics from API"""
    try:
        response = requests.get(
            f"{API_BASE_URL}/alerts/stats",
            params={"hours": hours},
            headers=get_auth_headers(),
            timeout=5
        )
        if response.status_code == 200:
            return response.json()
        else:
            return {}
    except Exception as e:
        st.error(f"Failed to fetch statistics: {e}")
        return {}

@st.cache_data(ttl=REFRESH_INTERVAL)
def fetch_health():
    """Fetch system health status"""
    try:
        response = requests.get(f"{API_BASE_URL}/health", timeout=5)
        if response.status_code == 200:
            return response.json()
        else:
            return {"status": "error"}
    except Exception as e:
        return {"status": "offline", "error": str(e)}

def send_test_alert():
    """Send a test alert"""
    try:
        response = requests.post(
            f"{API_BASE_URL}/test-alert",
            headers=get_auth_headers(),
            timeout=10
        )
        if response.status_code == 200:
            st.success("Test alert sent successfully!")
            st.cache_data.clear()
        else:
            st.error(f"Failed to send test alert: {response.status_code}")
    except Exception as e:
        st.error(f"Error sending test alert: {e}")

def acknowledge_alert(alert_id: str):
    """Acknowledge an alert"""
    try:
        response = requests.post(
            f"{API_BASE_URL}/alerts/{alert_id}/acknowledge",
            json={"alert_id": alert_id},
            headers=get_auth_headers(),
            timeout=5
        )
        if response.status_code == 200:
            st.success("Alert acknowledged!")
            st.cache_data.clear()
        else:
            st.error("Failed to acknowledge alert")
    except Exception as e:
        st.error(f"Error acknowledging alert: {e}")

def display_system_status():
    """Display enhanced system health and status"""
    health = fetch_health()
    
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        if health.get("status") == "healthy":
            st.markdown('<p class="status-healthy">🟢 System Online</p>', 
                       unsafe_allow_html=True)
        elif health.get("status") == "offline":
            st.markdown('<p class="status-critical">🔴 System Offline</p>', 
                       unsafe_allow_html=True)
        else:
            st.markdown('<p class="status-warning">🟡 System Warning</p>', 
                       unsafe_allow_html=True)
    
    with col2:
        alerts_count = health.get("alerts_count", 0)
        st.metric("Total Alerts", alerts_count, delta=None)
    
    with col3:
        active_cameras = health.get("active_cameras", 0)
        st.metric("Active Cameras", active_cameras)
    
    with col4:
        if health.get("last_detection"):
            try:
                last_detection = datetime.fromisoformat(health["last_detection"].replace('Z', ''))
                time_diff = datetime.now() - last_detection
                if time_diff.total_seconds() < 60:
                    st.metric("Last Detection", "Just now")
                elif time_diff.total_seconds() < 3600:
                    st.metric("Last Detection", f"{int(time_diff.total_seconds()//60)}m ago")
                else:
                    st.metric("Last Detection", f"{int(time_diff.total_seconds()//3600)}h ago")
            except:
                st.metric("Last Detection", "Unknown")
        else:
            st.metric("Last Detection", "No recent activity")

def display_alert_metrics(stats):
    """Display enhanced alert metrics and KPIs"""
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        total_alerts = stats.get("total_alerts", 0)
        st.markdown(f"""
        <div class="metric-card">
            <h3>🚨 Total Alerts</h3>
            <h2>{total_alerts}</h2>
            <p>Last 24 hours</p>
        </div>
        """, unsafe_allow_html=True)
    
    with col2:
        avg_confidence = stats.get("avg_confidence", 0)
        st.markdown(f"""
        <div class="metric-card">
            <h3>🎯 Avg Confidence</h3>
            <h2>{avg_confidence:.1%}</h2>
            <p>Detection accuracy</p>
        </div>
        """, unsafe_allow_html=True)
    
    with col3:
        by_type = stats.get("by_type", {})
        critical_alerts = by_type.get("fight", 0) + by_type.get("fall", 0)
        st.markdown(f"""
        <div class="metric-card">
            <h3>⚠️ Critical Alerts</h3>
            <h2>{critical_alerts}</h2>
            <p>Fights & Falls</p>
        </div>
        """, unsafe_allow_html=True)
    
    with col4:
        crowd_alerts = by_type.get("overcrowding", 0)
        st.markdown(f"""
        <div class="metric-card">
            <h3>👥 Crowd Alerts</h3>
            <h2>{crowd_alerts}</h2>
            <p>Overcrowding events</p>
        </div>
        """, unsafe_allow_html=True)

def display_alert_charts(stats, alerts):
    """Display enhanced alert visualization charts"""
    col1, col2 = st.columns(2)
    
    with col1:
        st.subheader("📊 Alerts by Type")
        by_type = stats.get("by_type", {})
        if by_type:
            # Create enhanced pie chart
            fig = px.pie(
                values=list(by_type.values()),
                names=list(by_type.keys()),
                title="Distribution of Alert Types",
                color_discrete_sequence=px.colors.qualitative.Set3
            )
            fig.update_traces(textposition='inside', textinfo='percent+label')
            fig.update_layout(showlegend=True, height=400)
            st.plotly_chart(fig, use_container_width=True)
        else:
            st.info("No alerts to display")
    
    with col2:
        st.subheader("📈 Alerts Timeline")
        if alerts:
            # Create enhanced timeline chart
            df = pd.DataFrame(alerts)
            df['timestamp'] = pd.to_datetime(df['timestamp'])
            df['hour'] = df['timestamp'].dt.floor('H')
            
            hourly_counts = df.groupby(['hour', 'event_type']).size().reset_index(name='count')
            
            if not hourly_counts.empty:
                fig = px.bar(
                    hourly_counts,
                    x='hour',
                    y='count',
                    color='event_type',
                    title="Alerts Over Time",
                    color_discrete_sequence=px.colors.qualitative.Pastel
                )
                fig.update_layout(
                    xaxis_title="Time",
                    yaxis_title="Number of Alerts",
                    height=400
                )
                st.plotly_chart(fig, use_container_width=True)
            else:
                st.info("No timeline data available")
        else:
            st.info("No alerts to display in timeline")

def display_recent_alerts(alerts):
    """Display enhanced recent alerts list"""
    st.subheader("🚨 Recent Alerts")
    
    if not alerts:
        st.info("No recent alerts")
        return
    
    for alert in alerts[:10]:  # Show last 10 alerts
        # Determine alert severity and styling
        event_type = alert['event_type']
        if event_type in ['fight', 'fall']:
            border_color = "#ff4444"
            icon = "🚨"
            priority = "HIGH"
        elif event_type == 'overcrowding':
            border_color = "#ffbb33"
            icon = "👥"
            priority = "MEDIUM"
        else:
            border_color = "#00c851"
            icon = "ℹ️"
            priority = "LOW"
        
        # Format timestamp
        try:
            timestamp = datetime.fromisoformat(alert['timestamp'].replace('Z', ''))
            time_str = timestamp.strftime("%H:%M:%S")
            date_str = timestamp.strftime("%Y-%m-%d")
        except:
            time_str = "Unknown"
            date_str = "Unknown"
        
        # Create enhanced alert card
        with st.container():
            col1, col2 = st.columns([4, 1])
            
            with col1:
                st.markdown(f"""
                <div class="alert-card" style="border-left-color: {border_color};">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                        <h4 style="margin: 0; color: #333;">{icon} {event_type.title()}</h4>
                        <span style="background: {border_color}; color: white; padding: 0.2rem 0.5rem; border-radius: 3px; font-size: 0.8rem;">{priority}</span>
                    </div>
                    <p style="margin: 0.5rem 0; color: #666; font-size: 1.1rem;">{alert['description']}</p>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 0.5rem; margin-top: 1rem;">
                        <small style="color: #999;">📍 {alert['location']}</small>
                        <small style="color: #999;">🕒 {time_str} ({date_str})</small>
                        <small style="color: #999;">👥 {alert['person_count']} people</small>
                        <small style="color: #999;">🎯 {alert['confidence']:.0%} confidence</small>
                    </div>
                    {f'<div style="margin-top: 0.5rem;"><small style="color: #28a745;">✅ Acknowledged by {alert["acknowledged_by"]}</small></div>' if alert.get('acknowledged_by') else ''}
                </div>
                """, unsafe_allow_html=True)
            
            with col2:
                if not alert.get('acknowledged_by'):
                    if st.button("Acknowledge", key=f"ack_{alert['alert_id']}", type="secondary"):
                        acknowledge_alert(alert['alert_id'])

def main():
    """Main dashboard application"""
    load_css()
    
    # Check authentication
    if not st.session_state.authenticated:
        login_page()
        return
    
    # Header
    user_info = st.session_state.user_info or {}
    st.markdown(f"""
    <div class="main-header">
        <h1>🛡️ SafeZoneAI Dashboard</h1>
        <p>Public Space Safety Monitoring System</p>
        <small>Welcome, {user_info.get('username', 'User')} ({user_info.get('role', 'user').title()})</small>
    </div>
    """, unsafe_allow_html=True)
    
    # Sidebar
    with st.sidebar:
        st.header("🎛️ Controls")
        
        # User info
        st.markdown(f"""
        <div class="sidebar-info">
            <strong>👤 User:</strong> {user_info.get('username', 'Unknown')}<br>
            <strong>📧 Email:</strong> {user_info.get('email', 'Unknown')}<br>
            <strong>🔑 Role:</strong> {user_info.get('role', 'user').title()}
        </div>
        """, unsafe_allow_html=True)
        
        # Auto-refresh toggle
        auto_refresh = st.checkbox("🔄 Auto Refresh", value=True)
        
        # Time range selector
        time_range = st.selectbox(
            "⏰ Time Range",
            ["Last 1 Hour", "Last 6 Hours", "Last 24 Hours", "Last 7 Days"],
            index=2
        )
        
        # Convert time range to hours
        hours_map = {
            "Last 1 Hour": 1,
            "Last 6 Hours": 6,
            "Last 24 Hours": 24,
            "Last 7 Days": 168
        }
        hours = hours_map[time_range]
        
        st.divider()
        
        # Test controls
        st.header("🧪 Testing")
        if st.button("📤 Send Test Alert", type="primary", use_container_width=True):
            send_test_alert()
        
        if user_info.get('role') == 'admin':
            if st.button("🗑️ Clear All Alerts", type="secondary", use_container_width=True):
                try:
                    response = requests.delete(
                        f"{API_BASE_URL}/alerts",
                        headers=get_auth_headers()
                    )
                    if response.status_code == 200:
                        st.success("All alerts cleared!")
                        st.cache_data.clear()
                    else:
                        st.error("Failed to clear alerts")
                except Exception as e:
                    st.error(f"Error: {e}")
        
        st.divider()
        
        # System info
        st.header("ℹ️ System Info")
        st.markdown(f"""
        **API Endpoint:** `{API_BASE_URL}`  
        **Refresh Rate:** {REFRESH_INTERVAL}s  
        **Time Range:** {time_range}  
        **Version:** 2.0.0
        """)
        
        # Logout button
        if st.button("🚪 Logout", use_container_width=True):
            st.session_state.authenticated = False
            st.session_state.token = None
            st.session_state.user_info = None
            st.rerun()
    
    # Main content
    with st.container():
        # System status
        display_system_status()
        
        st.divider()
        
        # Fetch data
        alerts = fetch_alerts(hours=hours)
        stats = fetch_stats(hours=hours)
        
        # Metrics
        display_alert_metrics(stats)
        
        st.divider()
        
        # Charts
        display_alert_charts(stats, alerts)
        
        st.divider()
        
        # Recent alerts
        display_recent_alerts(alerts)
    
    # Auto-refresh
    if auto_refresh:
        time.sleep(REFRESH_INTERVAL)
        st.rerun()

if __name__ == "__main__":
    main()