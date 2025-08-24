"""
Integration tests for SafeZoneAI system

Tests the complete workflow from detection to alert delivery
"""

import pytest
import requests
import time
import json
from datetime import datetime
import asyncio

# Test configuration
API_BASE_URL = "http://localhost:8000"
TEST_TIMEOUT = 30

class TestSafeZoneIntegration:
    """Integration tests for the complete SafeZoneAI system"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token for tests"""
        try:
            response = requests.post(
                f"{API_BASE_URL}/auth/login",
                json={"username": "admin", "password": "admin123"},
                timeout=10
            )
            if response.status_code == 200:
                return response.json()["access_token"]
            else:
                pytest.skip("Cannot authenticate - API may not be running")
        except requests.exceptions.ConnectionError:
            pytest.skip("API server not available for integration tests")
    
    def get_auth_headers(self, token):
        """Get authentication headers"""
        return {"Authorization": f"Bearer {token}"}
    
    def test_api_health_check(self):
        """Test API health endpoint"""
        try:
            response = requests.get(f"{API_BASE_URL}/health", timeout=5)
            assert response.status_code == 200
            
            data = response.json()
            assert "status" in data
            assert data["status"] in ["healthy", "degraded"]
            assert "version" in data
            assert "alerts_count" in data
        except requests.exceptions.ConnectionError:
            pytest.skip("API server not available")
    
    def test_authentication_flow(self):
        """Test complete authentication flow"""
        # Test login with correct credentials
        response = requests.post(
            f"{API_BASE_URL}/auth/login",
            json={"username": "admin", "password": "admin123"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "access_token" in data
        assert "token_type" in data
        assert data["token_type"] == "bearer"
        
        # Test accessing protected endpoint
        headers = {"Authorization": f"Bearer {data['access_token']}"}
        response = requests.get(f"{API_BASE_URL}/auth/me", headers=headers)
        assert response.status_code == 200
        
        user_data = response.json()
        assert user_data["username"] == "admin"
        assert user_data["role"] == "admin"
    
    def test_alert_workflow(self, auth_token):
        """Test complete alert workflow"""
        headers = self.get_auth_headers(auth_token)
        
        # Clear existing alerts
        requests.delete(f"{API_BASE_URL}/alerts", headers=headers)
        
        # Send test alert
        alert_data = {
            "event_type": "test_integration",
            "confidence": 0.95,
            "timestamp": datetime.now().isoformat(),
            "frame_number": 12345,
            "person_count": 2,
            "description": "Integration test alert",
            "location": "Test Camera"
        }
        
        response = requests.post(
            f"{API_BASE_URL}/alert",
            json=alert_data,
            timeout=TEST_TIMEOUT
        )
        assert response.status_code == 200
        
        alert_response = response.json()
        assert alert_response["success"] is True
        assert "alert_id" in alert_response
        
        # Wait for alert to be processed
        time.sleep(2)
        
        # Verify alert was stored
        response = requests.get(f"{API_BASE_URL}/alerts", headers=headers)
        assert response.status_code == 200
        
        alerts = response.json()
        assert len(alerts) > 0
        
        # Find our test alert
        test_alert = None
        for alert in alerts:
            if alert["event_type"] == "test_integration":
                test_alert = alert
                break
        
        assert test_alert is not None
        assert test_alert["confidence"] == 0.95
        assert test_alert["person_count"] == 2
        assert test_alert["description"] == "Integration test alert"
    
    def test_alert_acknowledgment(self, auth_token):
        """Test alert acknowledgment workflow"""
        headers = self.get_auth_headers(auth_token)
        
        # Send test alert
        alert_data = {
            "event_type": "test_ack",
            "confidence": 0.8,
            "timestamp": datetime.now().isoformat(),
            "frame_number": 54321,
            "person_count": 1,
            "description": "Test acknowledgment alert",
            "location": "Test Camera"
        }
        
        response = requests.post(f"{API_BASE_URL}/alert", json=alert_data)
        assert response.status_code == 200
        alert_id = response.json()["alert_id"]
        
        # Wait for processing
        time.sleep(1)
        
        # Acknowledge the alert
        response = requests.post(
            f"{API_BASE_URL}/alerts/{alert_id}/acknowledge",
            json={"alert_id": alert_id, "notes": "Test acknowledgment"},
            headers=headers
        )
        assert response.status_code == 200
        
        # Verify acknowledgment
        response = requests.get(f"{API_BASE_URL}/alerts", headers=headers)
        alerts = response.json()
        
        ack_alert = None
        for alert in alerts:
            if alert["alert_id"] == alert_id:
                ack_alert = alert
                break
        
        assert ack_alert is not None
        assert ack_alert["status"] == "acknowledged"
        assert ack_alert["acknowledged_by"] == "admin"
    
    def test_statistics_generation(self, auth_token):
        """Test statistics generation"""
        headers = self.get_auth_headers(auth_token)
        
        # Clear existing alerts
        requests.delete(f"{API_BASE_URL}/alerts", headers=headers)
        
        # Send multiple test alerts
        alert_types = ["fight", "fall", "overcrowding", "test"]
        for i, event_type in enumerate(alert_types):
            alert_data = {
                "event_type": event_type,
                "confidence": 0.7 + (i * 0.1),
                "timestamp": datetime.now().isoformat(),
                "frame_number": 1000 + i,
                "person_count": i + 1,
                "description": f"Test {event_type} alert",
                "location": "Test Camera"
            }
            
            response = requests.post(f"{API_BASE_URL}/alert", json=alert_data)
            assert response.status_code == 200
        
        # Wait for processing
        time.sleep(2)
        
        # Get statistics
        response = requests.get(f"{API_BASE_URL}/alerts/stats", headers=headers)
        assert response.status_code == 200
        
        stats = response.json()
        assert "total_alerts" in stats
        assert "by_type" in stats
        assert "avg_confidence" in stats
        
        assert stats["total_alerts"] == len(alert_types)
        assert len(stats["by_type"]) == len(alert_types)
        
        for event_type in alert_types:
            assert event_type in stats["by_type"]
            assert stats["by_type"][event_type] == 1
    
    def test_system_logs(self, auth_token):
        """Test system logging functionality"""
        headers = self.get_auth_headers(auth_token)
        
        # Send test alert to generate logs
        alert_data = {
            "event_type": "test_logging",
            "confidence": 0.9,
            "timestamp": datetime.now().isoformat(),
            "frame_number": 99999,
            "person_count": 1,
            "description": "Test logging alert",
            "location": "Test Camera"
        }
        
        response = requests.post(f"{API_BASE_URL}/alert", json=alert_data)
        assert response.status_code == 200
        
        # Wait for processing
        time.sleep(2)
        
        # Get system logs
        response = requests.get(f"{API_BASE_URL}/system/logs", headers=headers)
        assert response.status_code == 200
        
        logs = response.json()
        assert isinstance(logs, list)
        assert len(logs) > 0
        
        # Check log structure
        log_entry = logs[0]
        assert "level" in log_entry
        assert "message" in log_entry
        assert "timestamp" in log_entry
    
    def test_error_handling(self, auth_token):
        """Test error handling and edge cases"""
        headers = self.get_auth_headers(auth_token)
        
        # Test invalid alert data
        invalid_alert = {
            "event_type": "",  # Empty event type
            "confidence": 1.5,  # Invalid confidence
            "timestamp": "invalid-timestamp",
            "frame_number": -1,
            "person_count": -5,
            "description": "",
            "location": ""
        }
        
        response = requests.post(f"{API_BASE_URL}/alert", json=invalid_alert)
        # Should handle gracefully (might return 422 for validation error)
        assert response.status_code in [200, 422, 400]
        
        # Test unauthorized access
        response = requests.get(f"{API_BASE_URL}/alerts")
        assert response.status_code == 401
        
        # Test non-existent alert acknowledgment
        response = requests.post(
            f"{API_BASE_URL}/alerts/non-existent-id/acknowledge",
            json={"alert_id": "non-existent-id"},
            headers=headers
        )
        assert response.status_code == 404
    
    def test_performance_under_load(self, auth_token):
        """Test system performance under moderate load"""
        headers = self.get_auth_headers(auth_token)
        
        # Clear existing alerts
        requests.delete(f"{API_BASE_URL}/alerts", headers=headers)
        
        # Send multiple alerts rapidly
        start_time = time.time()
        alert_count = 20
        
        for i in range(alert_count):
            alert_data = {
                "event_type": "load_test",
                "confidence": 0.8,
                "timestamp": datetime.now().isoformat(),
                "frame_number": i,
                "person_count": 1,
                "description": f"Load test alert {i}",
                "location": "Test Camera"
            }
            
            response = requests.post(f"{API_BASE_URL}/alert", json=alert_data, timeout=5)
            assert response.status_code == 200
        
        end_time = time.time()
        processing_time = end_time - start_time
        
        # Should process alerts reasonably quickly
        assert processing_time < 30  # 30 seconds for 20 alerts
        
        # Wait for all alerts to be processed
        time.sleep(3)
        
        # Verify all alerts were stored
        response = requests.get(f"{API_BASE_URL}/alerts", headers=headers)
        alerts = response.json()
        
        load_test_alerts = [a for a in alerts if a["event_type"] == "load_test"]
        assert len(load_test_alerts) == alert_count

if __name__ == "__main__":
    pytest.main([__file__, "-v"])