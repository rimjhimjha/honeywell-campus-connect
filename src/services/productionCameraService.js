// Production-ready camera service with real device detection and connection
class ProductionCameraService {
  constructor() {
    this.connectedCameras = new Map()
    this.activeStreams = new Map()
    this.deviceCapabilities = new Map()
    this.connectionStatus = new Map()
    this.permissionStatus = 'unknown'
    this.isInitialized = false
    this.errorHandlers = new Set()
    this.statusCallbacks = new Set()
  }

  async initialize() {
    if (this.isInitialized) return true

    try {
      console.log('Initializing Production Camera Service...')
      
      // Check browser support
      if (!this.checkBrowserSupport()) {
        throw new Error('Browser does not support required camera APIs')
      }

      // Request initial permissions
      await this.requestCameraPermissions()
      
      // Discover available devices
      await this.discoverDevices()
      
      this.isInitialized = true
      console.log('Production Camera Service initialized successfully')
      return true
    } catch (error) {
      console.error('Failed to initialize camera service:', error)
      this.handleError('initialization', error)
      return false
    }
  }

  checkBrowserSupport() {
    const required = [
      'navigator.mediaDevices',
      'navigator.mediaDevices.getUserMedia',
      'navigator.mediaDevices.enumerateDevices'
    ]

    for (const api of required) {
      if (!this.getNestedProperty(window, api)) {
        console.error(`Missing required API: ${api}`)
        return false
      }
    }

    return true
  }

  getNestedProperty(obj, path) {
    return path.split('.').reduce((current, prop) => current && current[prop], obj)
  }

  async requestCameraPermissions() {
    try {
      console.log('Requesting camera permissions...')
      
      // Request permission by attempting to access camera
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: false 
      })
      
      // Immediately stop the stream - we just needed permission
      stream.getTracks().forEach(track => track.stop())
      
      this.permissionStatus = 'granted'
      console.log('Camera permissions granted')
      return true
    } catch (error) {
      this.permissionStatus = 'denied'
      console.error('Camera permission denied:', error)
      
      if (error.name === 'NotAllowedError') {
        throw new Error('Camera access denied by user. Please allow camera access and refresh the page.')
      } else if (error.name === 'NotFoundError') {
        throw new Error('No camera devices found on this system.')
      } else if (error.name === 'NotSupportedError') {
        throw new Error('Camera access is not supported in this browser.')
      } else {
        throw new Error(`Camera access failed: ${error.message}`)
      }
    }
  }

  async discoverDevices() {
    try {
      console.log('Discovering camera devices...')
      
      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = devices.filter(device => device.kind === 'videoinput')
      
      console.log(`Found ${videoDevices.length} video input devices`)
      
      // Clear existing devices
      this.connectedCameras.clear()
      this.deviceCapabilities.clear()
      
      // Process each device
      for (const device of videoDevices) {
        await this.processDevice(device)
      }
      
      return Array.from(this.connectedCameras.values())
    } catch (error) {
      console.error('Device discovery failed:', error)
      throw error
    }
  }

  async processDevice(device) {
    try {
      const deviceId = device.deviceId
      const label = device.label || `Camera ${this.connectedCameras.size + 1}`
      
      console.log(`Processing device: ${label} (${deviceId})`)
      
      // Get device capabilities
      const capabilities = await this.getDeviceCapabilities(deviceId)
      
      const cameraInfo = {
        id: deviceId,
        name: label,
        type: 'webcam',
        status: 'available',
        deviceId: deviceId,
        capabilities: capabilities,
        resolutions: this.extractResolutions(capabilities),
        frameRates: this.extractFrameRates(capabilities),
        features: this.extractFeatures(capabilities),
        connection: this.detectConnectionType(device),
        lastSeen: new Date().toISOString()
      }
      
      this.connectedCameras.set(deviceId, cameraInfo)
      this.deviceCapabilities.set(deviceId, capabilities)
      this.connectionStatus.set(deviceId, 'disconnected')
      
      console.log(`Device processed: ${label}`, cameraInfo)
    } catch (error) {
      console.error(`Failed to process device ${device.deviceId}:`, error)
    }
  }

  async getDeviceCapabilities(deviceId) {
    try {
      // Create a temporary stream to get capabilities
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId } }
      })
      
      const track = stream.getVideoTracks()[0]
      const capabilities = track.getCapabilities()
      const settings = track.getSettings()
      
      // Clean up
      stream.getTracks().forEach(track => track.stop())
      
      return {
        ...capabilities,
        currentSettings: settings
      }
    } catch (error) {
      console.warn(`Could not get capabilities for device ${deviceId}:`, error)
      return {}
    }
  }

  extractResolutions(capabilities) {
    const resolutions = []
    
    if (capabilities.width && capabilities.height) {
      const maxWidth = capabilities.width.max || 1920
      const maxHeight = capabilities.height.max || 1080
      
      // Standard resolutions that fit within device capabilities
      const standardResolutions = [
        { width: 3840, height: 2160, label: '4K UHD' },
        { width: 2560, height: 1440, label: '1440p' },
        { width: 1920, height: 1080, label: '1080p' },
        { width: 1280, height: 720, label: '720p' },
        { width: 854, height: 480, label: '480p' },
        { width: 640, height: 480, label: 'VGA' }
      ]
      
      for (const res of standardResolutions) {
        if (res.width <= maxWidth && res.height <= maxHeight) {
          resolutions.push(`${res.width}x${res.height}`)
        }
      }
    }
    
    return resolutions.length > 0 ? resolutions : ['1920x1080']
  }

  extractFrameRates(capabilities) {
    if (capabilities.frameRate) {
      const maxFps = capabilities.frameRate.max || 30
      const frameRates = []
      
      if (maxFps >= 60) frameRates.push(60)
      if (maxFps >= 30) frameRates.push(30)
      if (maxFps >= 24) frameRates.push(24)
      frameRates.push(15)
      
      return frameRates
    }
    
    return [30, 24, 15]
  }

  extractFeatures(capabilities) {
    const features = []
    
    if (capabilities.width?.max >= 1920) features.push('HD')
    if (capabilities.width?.max >= 3840) features.push('4K')
    if (capabilities.frameRate?.max >= 60) features.push('60fps')
    if (capabilities.facingMode?.includes('environment')) features.push('Rear Camera')
    if (capabilities.facingMode?.includes('user')) features.push('Front Camera')
    if (capabilities.torch) features.push('Flash')
    if (capabilities.zoom) features.push('Zoom')
    if (capabilities.focusMode) features.push('Auto Focus')
    if (capabilities.whiteBalanceMode) features.push('White Balance')
    
    return features.length > 0 ? features.join(', ') : 'Basic Video'
  }

  detectConnectionType(device) {
    // Detect connection type based on device label
    const label = device.label.toLowerCase()
    
    if (label.includes('usb')) return 'USB'
    if (label.includes('built-in') || label.includes('integrated')) return 'Built-in'
    if (label.includes('wireless') || label.includes('wifi')) return 'WiFi'
    if (label.includes('bluetooth')) return 'Bluetooth'
    
    return 'Unknown'
  }

  async connectToCamera(cameraId, options = {}) {
    try {
      console.log(`Connecting to camera: ${cameraId}`)
      
      if (!this.connectedCameras.has(cameraId)) {
        throw new Error(`Camera ${cameraId} not found`)
      }
      
      if (this.activeStreams.has(cameraId)) {
        console.log(`Camera ${cameraId} already connected`)
        return this.activeStreams.get(cameraId)
      }
      
      this.connectionStatus.set(cameraId, 'connecting')
      this.notifyStatusChange(cameraId, 'connecting')
      
      const camera = this.connectedCameras.get(cameraId)
      const capabilities = this.deviceCapabilities.get(cameraId)
      
      // Build constraints
      const constraints = this.buildConstraints(cameraId, options, capabilities)
      
      console.log('Using constraints:', constraints)
      
      // Get media stream
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      
      // Verify stream
      if (!stream || stream.getTracks().length === 0) {
        throw new Error('Failed to get valid media stream')
      }
      
      const videoTrack = stream.getVideoTracks()[0]
      if (!videoTrack) {
        throw new Error('No video track in stream')
      }
      
      // Get actual settings
      const actualSettings = videoTrack.getSettings()
      console.log('Actual stream settings:', actualSettings)
      
      // Create connection object
      const connection = {
        cameraId,
        stream,
        videoTrack,
        settings: {
          ...actualSettings,
          aspectRatio: actualSettings.width && actualSettings.height 
            ? (actualSettings.width / actualSettings.height).toFixed(16) 
            : '1.7777777777777777'
        },
        constraints: constraints.video,
        connectedAt: new Date().toISOString(),
        isActive: true
      }
      
      // Store connection
      this.activeStreams.set(cameraId, connection)
      this.connectionStatus.set(cameraId, 'connected')
      
      // Update camera status
      camera.status = 'online'
      camera.lastConnected = connection.connectedAt
      camera.currentSettings = actualSettings
      
      // Set up error handling
      videoTrack.addEventListener('ended', () => {
        console.log(`Camera ${cameraId} stream ended`)
        this.handleStreamEnd(cameraId)
      })
      
      this.notifyStatusChange(cameraId, 'connected')
      console.log(`Successfully connected to camera: ${cameraId}`)
      
      return connection
    } catch (error) {
      console.error(`Failed to connect to camera ${cameraId}:`, error)
      this.connectionStatus.set(cameraId, 'failed')
      this.notifyStatusChange(cameraId, 'failed')
      this.handleError('connection', error, cameraId)
      throw error
    }
  }

  buildConstraints(cameraId, options, capabilities) {
    const constraints = {
      video: {
        deviceId: { exact: cameraId }
      },
      audio: false
    }
    
    // Resolution
    if (options.resolution) {
      const [width, height] = options.resolution.split('x').map(Number)
      if (width && height) {
        constraints.video.width = { ideal: width }
        constraints.video.height = { ideal: height }
      }
    } else if (capabilities.width && capabilities.height) {
      // Use best available resolution
      constraints.video.width = { ideal: capabilities.width.max || 1920 }
      constraints.video.height = { ideal: capabilities.height.max || 1080 }
    }
    
    // Frame rate
    if (options.frameRate) {
      constraints.video.frameRate = { ideal: options.frameRate }
    } else if (capabilities.frameRate) {
      constraints.video.frameRate = { ideal: capabilities.frameRate.max || 30 }
    }
    
    // Facing mode
    if (options.facingMode && capabilities.facingMode) {
      constraints.video.facingMode = { ideal: options.facingMode }
    }
    
    return constraints
  }

  async disconnectCamera(cameraId) {
    try {
      console.log(`Disconnecting camera: ${cameraId}`)
      
      const connection = this.activeStreams.get(cameraId)
      if (!connection) {
        console.log(`Camera ${cameraId} not connected`)
        return
      }
      
      // Stop all tracks
      if (connection.stream) {
        connection.stream.getTracks().forEach(track => {
          track.stop()
          console.log(`Stopped track: ${track.kind}`)
        })
      }
      
      // Clean up
      this.activeStreams.delete(cameraId)
      this.connectionStatus.set(cameraId, 'disconnected')
      
      // Update camera status
      const camera = this.connectedCameras.get(cameraId)
      if (camera) {
        camera.status = 'available'
        camera.lastDisconnected = new Date().toISOString()
      }
      
      this.notifyStatusChange(cameraId, 'disconnected')
      console.log(`Successfully disconnected camera: ${cameraId}`)
    } catch (error) {
      console.error(`Failed to disconnect camera ${cameraId}:`, error)
      this.handleError('disconnection', error, cameraId)
    }
  }

  async disconnectAllCameras() {
    console.log('Disconnecting all cameras...')
    
    const promises = Array.from(this.activeStreams.keys()).map(cameraId => 
      this.disconnectCamera(cameraId)
    )
    
    await Promise.allSettled(promises)
    console.log('All cameras disconnected')
  }

  handleStreamEnd(cameraId) {
    console.log(`Stream ended for camera: ${cameraId}`)
    
    // Clean up connection
    this.activeStreams.delete(cameraId)
    this.connectionStatus.set(cameraId, 'disconnected')
    
    // Update camera status
    const camera = this.connectedCameras.get(cameraId)
    if (camera) {
      camera.status = 'available'
      camera.lastDisconnected = new Date().toISOString()
    }
    
    this.notifyStatusChange(cameraId, 'stream_ended')
  }

  // Stream management
  getActiveStream(cameraId) {
    const connection = this.activeStreams.get(cameraId)
    return connection ? connection.stream : null
  }

  getStreamSettings(cameraId) {
    const connection = this.activeStreams.get(cameraId)
    return connection ? connection.settings : null
  }

  async updateStreamSettings(cameraId, newSettings) {
    try {
      const connection = this.activeStreams.get(cameraId)
      if (!connection) {
        throw new Error(`Camera ${cameraId} not connected`)
      }
      
      const track = connection.videoTrack
      const capabilities = track.getCapabilities()
      
      // Apply constraints
      const constraints = {}
      
      if (newSettings.width && capabilities.width) {
        constraints.width = newSettings.width
      }
      if (newSettings.height && capabilities.height) {
        constraints.height = newSettings.height
      }
      if (newSettings.frameRate && capabilities.frameRate) {
        constraints.frameRate = newSettings.frameRate
      }
      
      await track.applyConstraints(constraints)
      
      // Update stored settings
      connection.settings = track.getSettings()
      
      console.log(`Updated settings for camera ${cameraId}:`, connection.settings)
      return connection.settings
    } catch (error) {
      console.error(`Failed to update settings for camera ${cameraId}:`, error)
      throw error
    }
  }

  // Device monitoring
  startDeviceMonitoring() {
    if (!navigator.mediaDevices.addEventListener) {
      console.warn('Device monitoring not supported')
      return
    }
    
    navigator.mediaDevices.addEventListener('devicechange', () => {
      console.log('Device change detected, rediscovering...')
      this.discoverDevices().catch(console.error)
    })
    
    console.log('Device monitoring started')
  }

  stopDeviceMonitoring() {
    if (navigator.mediaDevices.removeEventListener) {
      navigator.mediaDevices.removeEventListener('devicechange', this.handleDeviceChange)
    }
  }

  // Error handling
  handleError(type, error, cameraId = null) {
    const errorEvent = {
      type,
      error,
      cameraId,
      timestamp: new Date().toISOString(),
      message: error.message
    }
    
    console.error('Camera service error:', errorEvent)
    
    // Notify error handlers
    this.errorHandlers.forEach(handler => {
      try {
        handler(errorEvent)
      } catch (handlerError) {
        console.error('Error handler failed:', handlerError)
      }
    })
  }

  onError(handler) {
    this.errorHandlers.add(handler)
    return () => this.errorHandlers.delete(handler)
  }

  // Status notifications
  notifyStatusChange(cameraId, status) {
    const statusEvent = {
      cameraId,
      status,
      timestamp: new Date().toISOString()
    }
    
    this.statusCallbacks.forEach(callback => {
      try {
        callback(statusEvent)
      } catch (error) {
        console.error('Status callback failed:', error)
      }
    })
  }

  onStatusChange(callback) {
    this.statusCallbacks.add(callback)
    return () => this.statusCallbacks.delete(callback)
  }

  // Public API
  getAvailableCameras() {
    return Array.from(this.connectedCameras.values())
  }

  getConnectedCameras() {
    return Array.from(this.activeStreams.keys()).map(cameraId => 
      this.connectedCameras.get(cameraId)
    ).filter(Boolean)
  }

  getCameraInfo(cameraId) {
    return this.connectedCameras.get(cameraId)
  }

  getCameraStatus(cameraId) {
    return this.connectionStatus.get(cameraId) || 'unknown'
  }

  isConnected(cameraId) {
    return this.activeStreams.has(cameraId)
  }

  getPermissionStatus() {
    return this.permissionStatus
  }

  // Utility methods
  async testCameraAccess(cameraId) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: cameraId } }
      })
      
      stream.getTracks().forEach(track => track.stop())
      return true
    } catch (error) {
      return false
    }
  }

  async refreshDevices() {
    try {
      await this.discoverDevices()
      return this.getAvailableCameras()
    } catch (error) {
      this.handleError('refresh', error)
      throw error
    }
  }

  // Cleanup
  dispose() {
    console.log('Disposing camera service...')
    
    // Disconnect all cameras
    this.disconnectAllCameras()
    
    // Stop monitoring
    this.stopDeviceMonitoring()
    
    // Clear all data
    this.connectedCameras.clear()
    this.activeStreams.clear()
    this.deviceCapabilities.clear()
    this.connectionStatus.clear()
    this.errorHandlers.clear()
    this.statusCallbacks.clear()
    
    this.isInitialized = false
    console.log('Camera service disposed')
  }

  // Health check
  getHealthStatus() {
    return {
      initialized: this.isInitialized,
      permissionStatus: this.permissionStatus,
      availableCameras: this.connectedCameras.size,
      connectedCameras: this.activeStreams.size,
      browserSupport: this.checkBrowserSupport(),
      lastUpdate: new Date().toISOString()
    }
  }
}

export default new ProductionCameraService()