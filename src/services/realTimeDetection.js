// Real-time detection service for live camera feeds
import AdvancedDetectionService from './advancedDetection'
import SupabaseService from './supabase'

class RealTimeDetectionService {
  constructor() {
    this.isActive = false
    this.detectionInterval = null
    this.currentStream = null
    this.canvasElement = null
    this.detectionWorker = null
    this.frameCount = 0
    this.lastDetectionTime = 0
    this.detectionQueue = []
    this.isProcessing = false
    this.alertCooldowns = new Map()
    this.cooldownPeriod = 5000 // 5 seconds between same type alerts
  }

  async initialize() {
    try {
      console.log('Initializing Real-time Detection Service...')
      
      // Initialize advanced detection service
      await AdvancedDetectionService.initialize()
      
      // Create canvas for frame processing
      this.canvasElement = document.createElement('canvas')
      this.canvasElement.width = 640
      this.canvasElement.height = 480
      
      console.log('Real-time Detection Service initialized')
      return true
    } catch (error) {
      console.error('Failed to initialize detection service:', error)
      throw error
    }
  }

  startDetection(videoElement) {
    if (this.isActive) {
      console.log('Detection already active')
      return
    }

    if (!videoElement || !videoElement.srcObject) {
      throw new Error('No video stream available for detection')
    }

    this.isActive = true
    this.currentStream = videoElement.srcObject
    
    console.log('Starting real-time detection...')
    
    // Start detection loop with recursive setTimeout
    const scheduleNextFrame = () => {
      this.detectionInterval = setTimeout(() => {
        if (this.isActive) {
          this.processFrame(videoElement)
          scheduleNextFrame()
        }
      }, 1000) // Process every second
    }
    scheduleNextFrame()
    
    console.log('Real-time detection started')
  }

  stopDetection() {
    if (!this.isActive) return

    this.isActive = false
    
    if (this.detectionInterval) {
      clearTimeout(this.detectionInterval)
      this.detectionInterval = null
    }
    
    this.currentStream = null
    this.frameCount = 0
    this.detectionQueue = []
    this.isProcessing = false
    
    console.log('Real-time detection stopped')
  }

  async processFrame(videoElement) {
    if (!this.isActive || this.isProcessing) return

    try {
      this.isProcessing = true
      this.frameCount++
      
      // Capture frame from video
      const frameData = this.captureFrame(videoElement)
      if (!frameData) return

      // Process with AI detection
      const detectionResults = await this.analyzeFrame(frameData, videoElement)
      
      // Handle detection results
      if (detectionResults && detectionResults.alerts.length > 0) {
        await this.handleDetectionResults(detectionResults)
      }
      
      this.lastDetectionTime = Date.now()
    } catch (error) {
      console.error('Frame processing error:', error)
    } finally {
      this.isProcessing = false
    }
  }

  captureFrame(videoElement) {
    try {
      const canvas = this.canvasElement
      const ctx = canvas.getContext('2d')
      
      // Set canvas size to match video
      canvas.width = videoElement.videoWidth || 640
      canvas.height = videoElement.videoHeight || 480
      
      // Draw current video frame to canvas
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height)
      
      // Get image data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      
      return {
        imageData,
        width: canvas.width,
        height: canvas.height,
        timestamp: Date.now()
      }
    } catch (error) {
      console.error('Frame capture failed:', error)
      return null
    }
  }

  async analyzeFrame(frameData, videoElement) {
    try {
      // Use advanced detection service to analyze the frame
      const results = await AdvancedDetectionService.processFrame(videoElement, 'live_camera')
      
      return results
    } catch (error) {
      console.error('Frame analysis failed:', error)
      return null
    }
  }

  async handleDetectionResults(results) {
    try {
      for (const alert of results.alerts) {
        // Check cooldown
        const alertKey = `${alert.type}_${alert.location || 'unknown'}`
        const lastAlertTime = this.alertCooldowns.get(alertKey) || 0
        const now = Date.now()
        
        if (now - lastAlertTime < this.cooldownPeriod) {
          console.log(`Alert ${alert.type} in cooldown, skipping`)
          continue
        }
        
        // Create alert in Supabase
        const alertData = {
          alert_id: `live_${now}_${this.frameCount}`,
          event_type: alert.type,
          confidence: alert.confidence,
          timestamp: new Date().toISOString(),
          frame_number: this.frameCount,
          person_count: alert.personCount || results.statistics.personCount || 1,
          description: alert.description,
          location: alert.location || 'Live Camera',
          severity: alert.severity || 'medium'
        }
        
        await SupabaseService.createAlert(alertData)
        
        // Update cooldown
        this.alertCooldowns.set(alertKey, now)
        
        // Log detection
        await SupabaseService.createSystemLog(
          'INFO',
          `Live detection: ${alert.type} - ${alert.description}`,
          'live_detection',
          {
            confidence: alert.confidence,
            frameNumber: this.frameCount,
            personCount: results.statistics.personCount
          }
        )
        
        console.log(`Live detection alert created: ${alert.type}`)
      }
    } catch (error) {
      console.error('Failed to handle detection results:', error)
    }
  }

  getStatus() {
    return {
      isActive: this.isActive,
      frameCount: this.frameCount,
      lastDetectionTime: this.lastDetectionTime,
      hasStream: !!this.currentStream,
      queueLength: this.detectionQueue.length,
      isProcessing: this.isProcessing
    }
  }

  // Cleanup
  dispose() {
    this.stopDetection()
    
    if (this.canvasElement) {
      this.canvasElement = null
    }
    
    this.alertCooldowns.clear()
    console.log('Real-time detection service disposed')
  }
}

export default new RealTimeDetectionService()