"""
Tests for SafeZoneAI Detection Module
"""

import pytest
import numpy as np
import cv2
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime

# Import the detector module
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from detection.detector import SafetyDetector, DetectionEvent

class TestSafetyDetector:
    """Test cases for SafetyDetector class"""
    
    @pytest.fixture
    def detector(self):
        """Create a SafetyDetector instance for testing"""
        with patch('detection.detector.YOLO') as mock_yolo:
            mock_model = Mock()
            mock_yolo.return_value = mock_model
            
            detector = SafetyDetector(
                model_path="test_model.pt",
                confidence_threshold=0.6,
                crowd_threshold=5,
                api_endpoint="http://test.com/alert"
            )
            detector.model = mock_model
            return detector
    
    @pytest.fixture
    def sample_frame(self):
        """Create a sample video frame for testing"""
        return np.zeros((480, 640, 3), dtype=np.uint8)
    
    def test_detector_initialization(self):
        """Test detector initialization"""
        with patch('detection.detector.YOLO') as mock_yolo:
            detector = SafetyDetector()
            assert detector.confidence_threshold == 0.6
            assert detector.crowd_threshold == 10
            assert detector.running == False
            mock_yolo.assert_called_once()
    
    def test_proximity_check(self, detector):
        """Test proximity checking for fight detection"""
        # Close bounding boxes (should detect proximity)
        bbox1 = (100, 100, 150, 200)
        bbox2 = (120, 110, 170, 210)
        assert detector._check_proximity(bbox1, bbox2) == True
        
        # Far bounding boxes (should not detect proximity)
        bbox3 = (100, 100, 150, 200)
        bbox4 = (300, 300, 350, 400)
        assert detector._check_proximity(bbox3, bbox4) == False
    
    def test_detect_overcrowding(self, detector, sample_frame):
        """Test overcrowding detection"""
        # Mock YOLO results with many person detections
        mock_result = Mock()
        mock_boxes = Mock()
        
        # Create mock boxes for multiple people
        mock_box_data = []
        for i in range(6):  # More than crowd_threshold (5)
            mock_box = Mock()
            mock_box.cls = [0]  # Person class
            mock_box.xyxy = [np.array([i*50, i*50, i*50+40, i*50+100])]
            mock_box.conf = [0.8]
            mock_box_data.append(mock_box)
        
        mock_boxes.__iter__ = lambda self: iter(mock_box_data)
        mock_result.boxes = mock_boxes
        detector.model.return_value = [mock_result]
        
        events = detector.detect_unsafe_events(sample_frame)
        
        # Should detect overcrowding
        overcrowding_events = [e for e in events if e.event_type == "overcrowding"]
        assert len(overcrowding_events) > 0
        assert overcrowding_events[0].person_count == 6
    
    def test_detect_fall(self, detector, sample_frame):
        """Test fall detection based on bounding box aspect ratio"""
        # Mock YOLO results with a wide bounding box (fallen person)
        mock_result = Mock()
        mock_boxes = Mock()
        
        mock_box = Mock()
        mock_box.cls = [0]  # Person class
        # Wide bounding box (width > height * fall_threshold)
        mock_box.xyxy = [np.array([100, 150, 200, 170])]  # Wide box
        mock_box.conf = [0.8]
        
        mock_boxes.__iter__ = lambda self: iter([mock_box])
        mock_result.boxes = mock_boxes
        detector.model.return_value = [mock_result]
        
        events = detector.detect_unsafe_events(sample_frame)
        
        # Should detect fall
        fall_events = [e for e in events if e.event_type == "fall"]
        assert len(fall_events) > 0
    
    def test_detect_fight(self, detector, sample_frame):
        """Test fight detection based on proximity"""
        # Mock YOLO results with two close people
        mock_result = Mock()
        mock_boxes = Mock()
        
        # Two people in close proximity
        mock_box1 = Mock()
        mock_box1.cls = [0]
        mock_box1.xyxy = [np.array([100, 100, 150, 200])]
        mock_box1.conf = [0.8]
        
        mock_box2 = Mock()
        mock_box2.cls = [0]
        mock_box2.xyxy = [np.array([120, 110, 170, 210])]  # Close to first person
        mock_box2.conf = [0.7]
        
        mock_boxes.__iter__ = lambda self: iter([mock_box1, mock_box2])
        mock_result.boxes = mock_boxes
        detector.model.return_value = [mock_result]
        
        events = detector.detect_unsafe_events(sample_frame)
        
        # Should detect potential fight
        fight_events = [e for e in events if e.event_type == "fight"]
        assert len(fight_events) > 0
        assert fight_events[0].person_count == 2
    
    @patch('requests.post')
    def test_send_alert_success(self, mock_post, detector):
        """Test successful alert sending"""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_post.return_value = mock_response
        
        event = DetectionEvent(
            event_type="test",
            confidence=0.8,
            timestamp=datetime.now(),
            frame_number=123,
            person_count=1,
            bounding_boxes=[(100, 100, 150, 200)],
            description="Test event"
        )
        
        result = detector.send_alert(event)
        assert result == True
        mock_post.assert_called_once()
    
    @patch('requests.post')
    def test_send_alert_cooldown(self, mock_post, detector):
        """Test alert cooldown functionality"""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_post.return_value = mock_response
        
        event = DetectionEvent(
            event_type="test",
            confidence=0.8,
            timestamp=datetime.now(),
            frame_number=123,
            person_count=1,
            bounding_boxes=[(100, 100, 150, 200)],
            description="Test event"
        )
        
        # First alert should succeed
        result1 = detector.send_alert(event)
        assert result1 == True
        
        # Second alert immediately should be blocked by cooldown
        result2 = detector.send_alert(event)
        assert result2 == False
        
        # Should only call API once due to cooldown
        assert mock_post.call_count == 1
    
    @patch('requests.post')
    def test_send_alert_failure(self, mock_post, detector):
        """Test alert sending failure"""
        mock_response = Mock()
        mock_response.status_code = 500
        mock_post.return_value = mock_response
        
        event = DetectionEvent(
            event_type="test",
            confidence=0.8,
            timestamp=datetime.now(),
            frame_number=123,
            person_count=1,
            bounding_boxes=[(100, 100, 150, 200)],
            description="Test event"
        )
        
        result = detector.send_alert(event)
        assert result == False
    
    def test_detection_event_creation(self):
        """Test DetectionEvent data class"""
        timestamp = datetime.now()
        event = DetectionEvent(
            event_type="overcrowding",
            confidence=0.9,
            timestamp=timestamp,
            frame_number=456,
            person_count=12,
            bounding_boxes=[(0, 0, 50, 100), (60, 0, 110, 100)],
            description="Too many people detected"
        )
        
        assert event.event_type == "overcrowding"
        assert event.confidence == 0.9
        assert event.timestamp == timestamp
        assert event.frame_number == 456
        assert event.person_count == 12
        assert len(event.bounding_boxes) == 2
        assert event.description == "Too many people detected"

class TestDetectionIntegration:
    """Integration tests for detection system"""
    
    @patch('cv2.VideoCapture')
    @patch('detection.detector.YOLO')
    def test_video_processing_loop(self, mock_yolo, mock_cap):
        """Test video processing integration"""
        # Mock video capture
        mock_cap_instance = Mock()
        mock_cap_instance.isOpened.return_value = True
        mock_cap_instance.read.side_effect = [
            (True, np.zeros((480, 640, 3), dtype=np.uint8)),
            (True, np.zeros((480, 640, 3), dtype=np.uint8)),
            (False, None)  # End of video
        ]
        mock_cap.return_value = mock_cap_instance
        
        # Mock YOLO model
        mock_model = Mock()
        mock_model.return_value = []  # No detections
        mock_yolo.return_value = mock_model
        
        detector = SafetyDetector()
        
        # Process a few frames
        detector.process_video_stream("test_video.mp4", frame_skip=1)
        
        # Verify video capture was used
        mock_cap.assert_called_once_with("test_video.mp4")
        mock_cap_instance.read.assert_called()

if __name__ == "__main__":
    pytest.main([__file__])