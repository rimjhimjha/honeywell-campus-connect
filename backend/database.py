"""
Database management for SafeZoneAI

Handles persistent storage of alerts, users, and system configuration
"""

import sqlite3
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Optional
from contextlib import contextmanager
import json

logger = logging.getLogger(__name__)

class DatabaseManager:
    """
    Manages SQLite database operations for SafeZoneAI
    """
    
    def __init__(self, db_path: str = "safezone.db"):
        """Initialize database manager"""
        self.db_path = db_path
        self.init_database()
    
    def init_database(self):
        """Initialize database tables"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                
                # Alerts table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS alerts (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        alert_id TEXT UNIQUE NOT NULL,
                        event_type TEXT NOT NULL,
                        confidence REAL NOT NULL,
                        timestamp TEXT NOT NULL,
                        frame_number INTEGER,
                        person_count INTEGER,
                        description TEXT,
                        location TEXT,
                        processed_at TEXT,
                        status TEXT DEFAULT 'active',
                        acknowledged_by TEXT,
                        acknowledged_at TEXT,
                        created_at TEXT DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                
                # System logs table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS system_logs (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        level TEXT NOT NULL,
                        message TEXT NOT NULL,
                        module TEXT,
                        timestamp TEXT DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                
                # Configuration table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS configuration (
                        key TEXT PRIMARY KEY,
                        value TEXT NOT NULL,
                        description TEXT,
                        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                
                # Users table for authentication
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS users (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        username TEXT UNIQUE NOT NULL,
                        email TEXT UNIQUE NOT NULL,
                        password_hash TEXT NOT NULL,
                        role TEXT DEFAULT 'operator',
                        is_active BOOLEAN DEFAULT 1,
                        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                        last_login TEXT
                    )
                """)
                
                # Create indexes for better performance
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_alerts_timestamp ON alerts(timestamp)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_alerts_event_type ON alerts(event_type)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status)")
                
                conn.commit()
                logger.info("Database initialized successfully")
                
        except Exception as e:
            logger.error(f"Failed to initialize database: {e}")
            raise
    
    @contextmanager
    def get_connection(self):
        """Get database connection with context manager"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row  # Enable dict-like access
        try:
            yield conn
        finally:
            conn.close()
    
    def store_alert(self, alert_data: Dict) -> bool:
        """Store alert in database"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO alerts (
                        alert_id, event_type, confidence, timestamp,
                        frame_number, person_count, description, location, processed_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    alert_data['alert_id'],
                    alert_data['event_type'],
                    alert_data['confidence'],
                    alert_data['timestamp'],
                    alert_data['frame_number'],
                    alert_data['person_count'],
                    alert_data['description'],
                    alert_data['location'],
                    alert_data['processed_at']
                ))
                conn.commit()
                return True
        except Exception as e:
            logger.error(f"Failed to store alert: {e}")
            return False
    
    def get_alerts(self, limit: int = 50, hours: int = 24, status: str = None) -> List[Dict]:
        """Get alerts from database"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                
                query = """
                    SELECT * FROM alerts 
                    WHERE timestamp >= datetime('now', '-{} hours')
                """.format(hours)
                
                params = []
                if status:
                    query += " AND status = ?"
                    params.append(status)
                
                query += " ORDER BY timestamp DESC LIMIT ?"
                params.append(limit)
                
                cursor.execute(query, params)
                rows = cursor.fetchall()
                
                return [dict(row) for row in rows]
        except Exception as e:
            logger.error(f"Failed to get alerts: {e}")
            return []
    
    def acknowledge_alert(self, alert_id: str, acknowledged_by: str) -> bool:
        """Acknowledge an alert"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    UPDATE alerts 
                    SET status = 'acknowledged', 
                        acknowledged_by = ?, 
                        acknowledged_at = ?
                    WHERE alert_id = ?
                """, (acknowledged_by, datetime.now().isoformat(), alert_id))
                conn.commit()
                return cursor.rowcount > 0
        except Exception as e:
            logger.error(f"Failed to acknowledge alert: {e}")
            return False
    
    def get_alert_stats(self, hours: int = 24) -> Dict:
        """Get alert statistics"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                
                # Total alerts
                cursor.execute("""
                    SELECT COUNT(*) as total 
                    FROM alerts 
                    WHERE timestamp >= datetime('now', '-{} hours')
                """.format(hours))
                total = cursor.fetchone()['total']
                
                # By type
                cursor.execute("""
                    SELECT event_type, COUNT(*) as count 
                    FROM alerts 
                    WHERE timestamp >= datetime('now', '-{} hours')
                    GROUP BY event_type
                """.format(hours))
                by_type = {row['event_type']: row['count'] for row in cursor.fetchall()}
                
                # By hour
                cursor.execute("""
                    SELECT strftime('%H:00', timestamp) as hour, COUNT(*) as count
                    FROM alerts 
                    WHERE timestamp >= datetime('now', '-{} hours')
                    GROUP BY strftime('%H:00', timestamp)
                    ORDER BY hour
                """.format(hours))
                by_hour = {row['hour']: row['count'] for row in cursor.fetchall()}
                
                # Average confidence
                cursor.execute("""
                    SELECT AVG(confidence) as avg_confidence 
                    FROM alerts 
                    WHERE timestamp >= datetime('now', '-{} hours')
                """.format(hours))
                avg_confidence = cursor.fetchone()['avg_confidence'] or 0.0
                
                return {
                    "total_alerts": total,
                    "by_type": by_type,
                    "by_hour": by_hour,
                    "avg_confidence": avg_confidence
                }
        except Exception as e:
            logger.error(f"Failed to get alert stats: {e}")
            return {}
    
    def log_system_event(self, level: str, message: str, module: str = None):
        """Log system event to database"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO system_logs (level, message, module)
                    VALUES (?, ?, ?)
                """, (level, message, module))
                conn.commit()
        except Exception as e:
            logger.error(f"Failed to log system event: {e}")

# Global database instance
db_manager = DatabaseManager()