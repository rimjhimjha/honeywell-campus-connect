"""
SafeZoneAI Detection Engine

Enhanced detection module with improved accuracy, performance optimization,
and production-ready features
"""

import cv2
import numpy as np
import time
import logging
import json
import requests
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
from ultralytics import YOLO
import threading
from datetime import datetime
from collections import deque
import os

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/detector.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

@dataclass
class DetectionEvent:
    """Enhanced data class for detection events"""
    event_type: str
    confidence: float
    timestamp: datetime
    frame_number: int
    person_count: int
    bounding_boxes: List[Tuple[int, int, int, int]]
    description: str
    severity: str = "medium"
    location: str = "Camera 1"

class SafetyDetector:
    """
    Enhanced SafeZoneAI Safety Detection Engine
    
    Features:
    - Improved detection algorithms
    - Performance optimization
    - Multi-threading support
    - Advanced analytics
    - Production-ready error handling
    """
    
    def __init__(self, 
                 model_path: str = "yolov8n.pt",
                 confidence_threshold: float = 0.6,
                 crowd_threshold: int = 10,
                 api_endpoint: str = "http://localhost:8000/alert",
                 alert_cooldown: int = 30,
                 frame_buffer_size: int = 30):
        """
        Initialize the Enhanced SafetyDetector
        
        Args:
            model_path: Path to YOLOv8 model file
            confidence_threshold: Minimum confidence for detections
            crowd_threshold: Number of people to trigger crowding alert
            api_endpoint: Backend API endpoint for alerts
            alert_cooldown: Cooldown period between alerts (seconds)
            frame_buffer_size: Size of frame buffer for analysis
        """
        self.model_path = model_path
        self.confidence_threshold = confidence_threshold
        self.crowd_threshold = crowd_threshold
        self.api_endpoint = api_endpoint
        self.alert_cooldown = alert_cooldown
        self.frame_buffer_size = frame_buffer_size
        
        # Initialize model
        try:
            self.model = YOLO(model_path)
            logger.info(f"Loaded YOLOv8 model: {model_path}")
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            raise
        
        # Detection state
        self.last_alert_time = {}
        self.frame_count = 0
        self.running = False
        self.performance_stats = {
            'fps': 0,
            'avg_processing_time': 0,
            'total_detections': 0,
            'alerts_sent': 0
        }
        
        # Enhanced tracking
        self.person_tracker = {}
        self.frame_buffer = deque(maxlen=frame_buffer_size)
        self.detection_history = deque(maxlen=100)
        
        # Thresholds for different events
        self.fall_threshold = 0.7  # Width/height ratio
        self.fight_proximity_threshold = 1.5  # Multiplier of average person size
        self.movement_threshold = 50  # Pixels for movement detection
        
        # Create logs directory
        os.makedirs("logs", exist_ok=True)
    
    def detect_unsafe_events(self, frame: np.ndarray) -> List[DetectionEvent]:
        """
        Enhanced detection of unsafe events in a single frame
        
        Args:
            frame: Input video frame
            
        Returns:
            List of detected events with enhanced analysis
        """
        events = []
        self.frame_count += 1
        start_time = time.time()
        
        try:
            # Run YOLO inference with optimizations
            results = self.model(frame, conf=self.confidence_threshold, verbose=False)
            
            if len(results) == 0:
                return events
            
            # Extract person detections with enhanced filtering
            person_detections = self._extract_person_detections(results)
            
            # Store frame in buffer for temporal analysis
            self.frame_buffer.append({
                'frame_number': self.frame_count,
                'timestamp': datetime.now(),
                'detections': person_detections
            })
            
            # Enhanced event detection
            events.extend(self._detect_overcrowding(person_detections))
            events.extend(self._detect_falls(person_detections))
            events.extend(self._detect_fights(person_detections))
            events.extend(self._detect_suspicious_behavior(person_detections))
            
            # Update performance stats
            processing_time = time.time() - start_time
            self._update_performance_stats(processing_time, len(person_detections))
            
            # Store detection history
            self.detection_history.append({
                'frame_number': self.frame_count,
                'timestamp': datetime.now(),
                'person_count': len(person_detections),
                'events': [e.event_type for e in events]
            })
            
        except Exception as e:
            logger.error(f"Detection error in frame {self.frame_count}: {e}")
        
        return events
    
    def _extract_person_detections(self, results) -> List[Dict]:
        """Extract and filter person detections"""
        person_detections = []
        
        for result in results:
            boxes = result.boxes
            if boxes is not None:
                for box in boxes:
                    class_id = int(box.cls[0])
                    if class_id == 0:  # Person class in COCO dataset
                        x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                        confidence = float(box.conf[0])
                        
                        # Enhanced filtering
                        width = x2 - x1
                        height = y2 - y1
                        area = width * height
                        
                        # Filter out very small or very large detections
                        if area > 500 and area < 50000 and width > 20 and height > 40:
                            person_detections.append({
                                'bbox': (int(x1), int(y1), int(x2), int(y2)),
                                'confidence': confidence,
                                'center': ((x1 + x2) / 2, (y1 + y2) / 2),
                                'area': area,
                                'aspect_ratio': width / height if height > 0 else 0
                            })
        
        return person_detections
    
    def _detect_overcrowding(self, detections: List[Dict]) -> List[DetectionEvent]:
        """Enhanced overcrowding detection"""
        events = []
        
        if len(detections) >= self.crowd_threshold:
            # Calculate crowd density and distribution
            centers = [det['center'] for det in detections]
            density_score = self._calculate_crowd_density(centers)
            
            severity = "high" if len(detections) > self.crowd_threshold * 1.5 else "medium"
            
            events.append(DetectionEvent(
                event_type="overcrowding",
                confidence=min(0.95, 0.7 + density_score * 0.25),
                timestamp=datetime.now(),
                frame_number=self.frame_count,
                person_count=len(detections),
                bounding_boxes=[det['bbox'] for det in detections],
                description=f"Overcrowding detected: {len(detections)} people (density: {density_score:.2f})",
                severity=severity
            ))
        
        return events
    
    def _detect_falls(self, detections: List[Dict]) -> List[DetectionEvent]:
        """Enhanced fall detection"""
        events = []
        
        for detection in detections:
            aspect_ratio = detection['aspect_ratio']
            
            # Enhanced fall detection with multiple criteria
            if aspect_ratio > self.fall_threshold:
                # Additional checks for fall validation
                bbox = detection['bbox']
                x1, y1, x2, y2 = bbox
                
                # Check if person is in lower part of frame (likely on ground)
                frame_height = 480  # Assume standard height, could be dynamic
                person_bottom = y2
                ground_threshold = frame_height * 0.7
                
                if person_bottom > ground_threshold:
                    confidence = min(0.9, detection['confidence'] + 0.1)
                    
                    events.append(DetectionEvent(
                        event_type="fall",
                        confidence=confidence,
                        timestamp=datetime.now(),
                        frame_number=self.frame_count,
                        person_count=1,
                        bounding_boxes=[bbox],
                        description=f"Person fall detected (aspect ratio: {aspect_ratio:.2f})",
                        severity="high"
                    ))
        
        return events
    
    def _detect_fights(self, detections: List[Dict]) -> List[DetectionEvent]:
        """Enhanced fight detection"""
        events = []
        
        for i, detection1 in enumerate(detections):
            for j, detection2 in enumerate(detections[i+1:], i+1):
                if self._check_interaction(detection1, detection2):
                    # Additional fight indicators
                    interaction_score = self._calculate_interaction_score(detection1, detection2)
                    
                    if interaction_score > 0.6:
                        confidence = min(0.85, (detection1['confidence'] + detection2['confidence']) / 2)
                        
                        events.append(DetectionEvent(
                            event_type="fight",
                            confidence=confidence,
                            timestamp=datetime.now(),
                            frame_number=self.frame_count,
                            person_count=2,
                            bounding_boxes=[detection1['bbox'], detection2['bbox']],
                            description=f"Potential fight detected (interaction score: {interaction_score:.2f})",
                            severity="high"
                        ))
                        break  # Only report one fight per frame
        
        return events
    
    def _detect_suspicious_behavior(self, detections: List[Dict]) -> List[DetectionEvent]:
        """Detect suspicious behavior patterns"""
        events = []
        
        # Loitering detection (person staying in same area for extended time)
        if len(self.frame_buffer) >= 20:  # At least 20 frames of history
            for detection in detections:
                if self._check_loitering(detection):
                    events.append(DetectionEvent(
                        event_type="loitering",
                        confidence=0.7,
                        timestamp=datetime.now(),
                        frame_number=self.frame_count,
                        person_count=1,
                        bounding_boxes=[detection['bbox']],
                        description="Suspicious loitering behavior detected",
                        severity="low"
                    ))
        
        return events
    
    def _calculate_crowd_density(self, centers: List[Tuple]) -> float:
        """Calculate crowd density score"""
        if len(centers) < 2:
            return 0.0
        
        # Calculate average distance between people
        total_distance = 0
        count = 0
        
        for i, center1 in enumerate(centers):
            for center2 in centers[i+1:]:
                distance = np.sqrt((center1[0] - center2[0])**2 + (center1[1] - center2[1])**2)
                total_distance += distance
                count += 1
        
        avg_distance = total_distance / count if count > 0 else float('inf')
        
        # Convert to density score (lower distance = higher density)
        density_score = max(0, 1 - (avg_distance / 200))  # Normalize to 0-1
        return density_score
    
    def _check_interaction(self, detection1: Dict, detection2: Dict) -> bool:
        """Enhanced interaction checking"""
        center1 = detection1['center']
        center2 = detection2['center']
        
        # Calculate distance
        distance = np.sqrt((center1[0] - center2[0])**2 + (center1[1] - center2[1])**2)
        
        # Dynamic threshold based on person sizes
        avg_area = (detection1['area'] + detection2['area']) / 2
        size_factor = np.sqrt(avg_area) / 50  # Normalize
        threshold = size_factor * self.fight_proximity_threshold * 30
        
        return distance < threshold
    
    def _calculate_interaction_score(self, detection1: Dict, detection2: Dict) -> float:
        """Calculate interaction intensity score"""
        # Distance factor
        center1 = detection1['center']
        center2 = detection2['center']
        distance = np.sqrt((center1[0] - center2[0])**2 + (center1[1] - center2[1])**2)
        distance_score = max(0, 1 - (distance / 100))
        
        # Size similarity factor (similar sized people more likely to fight)
        size_diff = abs(detection1['area'] - detection2['area']) / max(detection1['area'], detection2['area'])
        size_score = 1 - size_diff
        
        # Confidence factor
        conf_score = (detection1['confidence'] + detection2['confidence']) / 2
        
        # Combined score
        interaction_score = (distance_score * 0.5 + size_score * 0.2 + conf_score * 0.3)
        return interaction_score
    
    def _check_loitering(self, detection: Dict) -> bool:
        """Check if person is loitering in same area"""
        current_center = detection['center']
        
        # Check if person has been in similar position for multiple frames
        similar_positions = 0
        for frame_data in list(self.frame_buffer)[-10:]:  # Check last 10 frames
            for past_detection in frame_data['detections']:
                past_center = past_detection['center']
                distance = np.sqrt((current_center[0] - past_center[0])**2 + 
                                 (current_center[1] - past_center[1])**2)
                
                if distance < self.movement_threshold:
                    similar_positions += 1
                    break
        
        return similar_positions >= 8  # Person in same area for 8+ frames
    
    def _update_performance_stats(self, processing_time: float, detection_count: int):
        """Update performance statistics"""
        # Calculate FPS
        if processing_time > 0:
            current_fps = 1.0 / processing_time
            self.performance_stats['fps'] = (self.performance_stats['fps'] * 0.9 + current_fps * 0.1)
        
        # Update average processing time
        self.performance_stats['avg_processing_time'] = (
            self.performance_stats['avg_processing_time'] * 0.9 + processing_time * 0.1
        )
        
        # Update detection count
        self.performance_stats['total_detections'] += detection_count
    
    def send_alert(self, event: DetectionEvent) -> bool:
        """
        Enhanced alert sending with retry logic and better error handling
        """
        current_time = time.time()
        
        # Check cooldown period
        if (event.event_type in self.last_alert_time and 
            current_time - self.last_alert_time[event.event_type] < self.alert_cooldown):
            return False
        
        # Prepare payload
        payload = {
            "event_type": event.event_type,
            "confidence": event.confidence,
            "timestamp": event.timestamp.isoformat(),
            "frame_number": event.frame_number,
            "person_count": event.person_count,
            "description": event.description,
            "location": event.location
        }
        
        # Retry logic
        max_retries = 3
        for attempt in range(max_retries):
            try:
                response = requests.post(
                    self.api_endpoint,
                    json=payload,
                    timeout=10,
                    headers={'Content-Type': 'application/json'}
                )
                
                if response.status_code == 200:
                    self.last_alert_time[event.event_type] = current_time
                    self.performance_stats['alerts_sent'] += 1
                    logger.info(f"Alert sent successfully: {event.event_type} (attempt {attempt + 1})")
                    return True
                else:
                    logger.warning(f"Alert failed with status {response.status_code} (attempt {attempt + 1})")
                    
            except requests.exceptions.Timeout:
                logger.warning(f"Alert timeout (attempt {attempt + 1})")
            except requests.exceptions.ConnectionError:
                logger.warning(f"Alert connection error (attempt {attempt + 1})")
            except Exception as e:
                logger.error(f"Alert error (attempt {attempt + 1}): {e}")
            
            if attempt < max_retries - 1:
                time.sleep(1)  # Wait before retry
        
        logger.error(f"Failed to send alert after {max_retries} attempts: {event.event_type}")
        return False
    
    def process_video_stream(self, video_source=0, frame_skip=2, display=False):
        """
        Enhanced video stream processing with performance optimization
        """
        self.running = True
        
        try:
            # Initialize video capture with optimizations
            cap = cv2.VideoCapture(video_source)
            
            if not cap.isOpened():
                logger.error(f"Failed to open video source: {video_source}")
                return
            
            # Set capture properties for better performance
            cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
            cap.set(cv2.CAP_PROP_FPS, 30)
            
            logger.info(f"Starting enhanced video processing: {video_source}")
            frame_count = 0
            last_stats_time = time.time()
            
            while self.running:
                ret, frame = cap.read()
                
                if not ret:
                    logger.warning("Failed to read frame, attempting to reconnect...")
                    cap.release()
                    time.sleep(1)
                    cap = cv2.VideoCapture(video_source)
                    continue
                
                frame_count += 1
                
                # Skip frames for performance
                if frame_count % frame_skip != 0:
                    continue
                
                # Resize frame for better performance if needed
                height, width = frame.shape[:2]
                if width > 1280:
                    scale = 1280 / width
                    new_width = int(width * scale)
                    new_height = int(height * scale)
                    frame = cv2.resize(frame, (new_width, new_height))
                
                # Detect events
                events = self.detect_unsafe_events(frame)
                
                # Send alerts for detected events
                for event in events:
                    self.send_alert(event)
                
                # Display frame with detections if requested
                if display:
                    self._draw_detections(frame, events)
                    cv2.imshow('SafeZoneAI Detection', frame)
                    
                    if cv2.waitKey(1) & 0xFF == ord('q'):
                        break
                
                # Log performance stats every 30 seconds
                if time.time() - last_stats_time > 30:
                    self._log_performance_stats()
                    last_stats_time = time.time()
            
        except Exception as e:
            logger.error(f"Video processing error: {e}")
        finally:
            if 'cap' in locals():
                cap.release()
            if display:
                cv2.destroyAllWindows()
            logger.info("Enhanced video processing stopped")
    
    def _draw_detections(self, frame: np.ndarray, events: List[DetectionEvent]):
        """Draw detection results on frame"""
        for event in events:
            color = (0, 0, 255) if event.severity == "high" else (0, 255, 255)
            
            for bbox in event.bounding_boxes:
                x1, y1, x2, y2 = bbox
                cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
                
                # Draw label
                label = f"{event.event_type}: {event.confidence:.2f}"
                cv2.putText(frame, label, (x1, y1-10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)
        
        # Draw performance stats
        fps_text = f"FPS: {self.performance_stats['fps']:.1f}"
        cv2.putText(frame, fps_text, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
    
    def _log_performance_stats(self):
        """Log current performance statistics"""
        stats = self.performance_stats
        logger.info(f"Performance Stats - FPS: {stats['fps']:.1f}, "
                   f"Avg Processing: {stats['avg_processing_time']:.3f}s, "
                   f"Total Detections: {stats['total_detections']}, "
                   f"Alerts Sent: {stats['alerts_sent']}")
    
    def get_performance_stats(self) -> Dict:
        """Get current performance statistics"""
        return self.performance_stats.copy()
    
    def stop(self):
        """Stop the detection process"""
        self.running = False
        logger.info("Enhanced detection stopped")

def main():
    """Enhanced main function with better configuration"""
    import os
    from dotenv import load_dotenv
    
    load_dotenv()
    
    # Create logs directory
    os.makedirs("logs", exist_ok=True)
    
    # Configuration from environment
    confidence_threshold = float(os.getenv('CONFIDENCE_THRESHOLD', 0.6))
    crowd_threshold = int(os.getenv('CROWD_THRESHOLD', 10))
    video_source = os.getenv('VIDEO_SOURCE', 0)
    frame_skip = int(os.getenv('FRAME_SKIP', 2))
    display_video = os.getenv('DISPLAY_VIDEO', 'false').lower() == 'true'
    
    # Convert video_source to int if it's a digit
    if isinstance(video_source, str) and video_source.isdigit():
        video_source = int(video_source)
    
    logger.info(f"Starting SafeZoneAI Enhanced Detector")
    logger.info(f"Configuration: confidence={confidence_threshold}, "
               f"crowd_threshold={crowd_threshold}, video_source={video_source}")
    
    # Initialize enhanced detector
    detector = SafetyDetector(
        confidence_threshold=confidence_threshold,
        crowd_threshold=crowd_threshold,
        alert_cooldown=30
    )
    
    try:
        # Start enhanced detection
        detector.process_video_stream(video_source, frame_skip, display=display_video)
    except KeyboardInterrupt:
        logger.info("Detection interrupted by user")
    finally:
        detector.stop()
        
        # Log final stats
        final_stats = detector.get_performance_stats()
        logger.info(f"Final Performance Stats: {final_stats}")

if __name__ == "__main__":
    main()