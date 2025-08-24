import React, { useState, useEffect, useRef } from 'react'
import { 
  Camera, Settings, Play, Pause, Maximize, AlertTriangle, 
  Wifi, WifiOff, Users, Eye, Plus, RefreshCw, CheckCircle,
  XCircle, Monitor, Usb, Smartphone, Video, VideoOff
} from 'lucide-react'
import ProductionCameraService from '../services/productionCameraService'
import SupabaseService from '../services/supabase'
import RealTimeDetectionService from '../services/realTimeDetection'

const ProductionCameraManager = () => {
  const [cameras, setCameras] = useState([])
  const [selectedCamera, setSelectedCamera] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [connectionStatus, setConnectionStatus] = useState({})
  const [permissionStatus, setPermissionStatus] = useState('unknown')
  const [isDetectionActive, setIsDetectionActive] = useState(false)
  const [streamSettings, setStreamSettings] = useState({})
  const [showPermissionDialog, setShowPermissionDialog] = useState(false)
  const [detectionStatus, setDetectionStatus] = useState(null)
  
  const videoRef = useRef(null)
  const canvasRef = useRef(null)

  useEffect(() => {
    initializeCameraService()
    
    return () => {
      ProductionCameraService.dispose()
      RealTimeDetectionService.dispose()
    }
  }, [])

  // Update detection status periodically
  useEffect(() => {
    if (isDetectionActive) {
      let timeoutId
      const scheduleNextUpdate = () => {
        timeoutId = setTimeout(() => {
          if (isDetectionActive) {
            const status = RealTimeDetectionService.getStatus()
            setDetectionStatus(status)
            scheduleNextUpdate()
          }
        }, 1000)
      }
      scheduleNextUpdate()
      
      return () => {
        if (timeoutId) clearTimeout(timeoutId)
      }
    }
  }, [isDetectionActive])
  const initializeCameraService = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      console.log('Initializing camera service...')
      
      // Initialize the camera service
      const initialized = await ProductionCameraService.initialize()
      
      if (!initialized) {
        throw new Error('Failed to initialize camera service')
      }
      
      // Initialize detection service
      await RealTimeDetectionService.initialize()
      
      // Set up event listeners
      ProductionCameraService.onError(handleCameraError)
      ProductionCameraService.onStatusChange(handleStatusChange)
      
      // Start device monitoring
      ProductionCameraService.startDeviceMonitoring()
      
      // Load available cameras
      await loadCameras()
      
      // Update permission status
      setPermissionStatus(ProductionCameraService.getPermissionStatus())
      
      console.log('Camera service initialized successfully')
    } catch (error) {
      console.error('Camera service initialization failed:', error)
      setError(error.message)
      
      if (error.message.includes('denied') || error.message.includes('NotAllowedError')) {
        setShowPermissionDialog(true)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const loadCameras = async () => {
    try {
      const availableCameras = ProductionCameraService.getAvailableCameras()
      console.log('Available cameras:', availableCameras)
      
      setCameras(availableCameras)
      
      // Auto-select first camera if none selected
      if (availableCameras.length > 0 && !selectedCamera) {
        setSelectedCamera(availableCameras[0])
      }
      
      // Update connection status for all cameras
      const status = {}
      availableCameras.forEach(camera => {
        status[camera.id] = ProductionCameraService.getCameraStatus(camera.id)
      })
      setConnectionStatus(status)
      
    } catch (error) {
      console.error('Failed to load cameras:', error)
      setError('Failed to load cameras: ' + error.message)
    }
  }

  const handleCameraError = (errorEvent) => {
    console.error('Camera error:', errorEvent)
    setError(`Camera error: ${errorEvent.message}`)
    
    // Update connection status
    if (errorEvent.cameraId) {
      setConnectionStatus(prev => ({
        ...prev,
        [errorEvent.cameraId]: 'failed'
      }))
    }
  }

  const handleStatusChange = (statusEvent) => {
    console.log('Camera status change:', statusEvent)
    
    setConnectionStatus(prev => ({
      ...prev,
      [statusEvent.cameraId]: statusEvent.status
    }))
    
    // Update camera in list
    setCameras(prev => prev.map(camera => 
      camera.id === statusEvent.cameraId 
        ? { ...camera, status: statusEvent.status === 'connected' ? 'online' : 'available' }
        : camera
    ))
  }

  const connectToCamera = async (camera) => {
    try {
      setError(null)
      console.log('Connecting to camera:', camera.name)
      
      // Disconnect current camera if any
      if (selectedCamera && ProductionCameraService.isConnected(selectedCamera.id)) {
        await ProductionCameraService.disconnectCamera(selectedCamera.id)
      }
      
      // Connect to new camera
      const connection = await ProductionCameraService.connectToCamera(camera.id, {
        resolution: '1920x1080',
        frameRate: 30
      })
      
      console.log('Connection established:', connection)
      
      // Set up video element with the stream
      if (videoRef.current && connection.stream) {
        console.log('Setting video stream...')
        
        // Wait for video element to be ready
        await new Promise((resolve, reject) => {
          const video = videoRef.current
          
          // Clear any existing stream
          video.srcObject = null
          
          // Set up one-time event handlers
          const onLoadedMetadata = () => {
            console.log('Video metadata loaded')
            video.removeEventListener('loadedmetadata', onLoadedMetadata)
            video.removeEventListener('error', onError)
            resolve()
          }
          
          const onError = (e) => {
            console.error('Video loading error:', e)
            video.removeEventListener('loadedmetadata', onLoadedMetadata)
            video.removeEventListener('error', onError)
            reject(new Error('Video loading failed'))
          }
          
          video.addEventListener('loadedmetadata', onLoadedMetadata)
          video.addEventListener('error', onError)
          
          // Set the stream
          video.srcObject = connection.stream
          
          // Start playing
          video.play().catch(playError => {
            console.error('Video play failed:', playError)
            reject(playError)
          })
        })
      } else {
        console.error('Video ref or stream not available:', {
          videoRef: !!videoRef.current,
          stream: !!connection.stream
        })
        setError('Failed to set up video display')
      }
      
      // Update stream settings
      setStreamSettings(connection.settings)
      
      // Save to Supabase with real camera data
      try {
        await SupabaseService.addCamera({
          name: camera.name,
          location: 'Production Environment',
          type: camera.type,
          status: 'online',
          resolution: `${connection.settings.width}x${connection.settings.height}`,
          fps: connection.settings.frameRate || 30,
          stream_url: null // Local camera doesn't have URL
        })
      } catch (dbError) {
        console.warn('Failed to save camera to database:', dbError)
      }
      
      setSelectedCamera(camera)
      console.log('Successfully connected to camera:', camera.name)
      
    } catch (error) {
      console.error('Failed to connect to camera:', error)
      setError(`Failed to connect to ${camera.name}: ${error.message}`)
    }
  }

  const disconnectCamera = async (cameraId) => {
    try {
      // Stop detection first
      if (isDetectionActive) {
        stopDetection()
      }
      
      await ProductionCameraService.disconnectCamera(cameraId)
      
      if (videoRef.current) {
        videoRef.current.srcObject = null
      }
      
      setStreamSettings({})
      console.log('Camera disconnected successfully')
    } catch (error) {
      console.error('Failed to disconnect camera:', error)
      setError('Failed to disconnect camera: ' + error.message)
    }
  }

  const refreshCameras = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      await ProductionCameraService.refreshDevices()
      await loadCameras()
      
      console.log('Cameras refreshed successfully')
    } catch (error) {
      console.error('Failed to refresh cameras:', error)
      setError('Failed to refresh cameras: ' + error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const requestPermissions = async () => {
    try {
      setShowPermissionDialog(false)
      await initializeCameraService()
    } catch (error) {
      console.error('Permission request failed:', error)
    }
  }

  const startDetection = async () => {
    if (!selectedCamera || !ProductionCameraService.isConnected(selectedCamera.id)) {
      setError('Please connect to a camera first')
      return
    }
    
    if (!videoRef.current || !videoRef.current.srcObject) {
      setError('No video stream available for detection')
      return
    }
    
    try {
      await RealTimeDetectionService.startDetection(videoRef.current)
      setIsDetectionActive(true)
      
      // Log detection start
      await SupabaseService.createSystemLog(
        'INFO',
        `Live detection started on camera: ${selectedCamera.name}`,
        'live_detection'
      )
      
      console.log('Live detection started successfully')
    } catch (error) {
      console.error('Failed to start detection:', error)
      setError('Failed to start detection: ' + error.message)
    }
  }

  const stopDetection = async () => {
    try {
      RealTimeDetectionService.stopDetection()
      setIsDetectionActive(false)
      setDetectionStatus(null)
      
      // Log detection stop
      if (selectedCamera) {
        await SupabaseService.createSystemLog(
          'INFO',
          `Live detection stopped on camera: ${selectedCamera.name}`,
          'live_detection'
        )
      }
      
      console.log('Live detection stopped')
    } catch (error) {
      console.error('Failed to stop detection:', error)
    }
  }

  const getConnectionIcon = (status) => {
    switch (status) {
      case 'connected': return <CheckCircle className="h-4 w-4 text-success-600" />
      case 'connecting': return <RefreshCw className="h-4 w-4 text-primary-600 animate-spin" />
      case 'failed': return <XCircle className="h-4 w-4 text-danger-600" />
      case 'disconnected': return <Camera className="h-4 w-4 text-gray-400" />
      default: return <Camera className="h-4 w-4 text-gray-400" />
    }
  }

  const getConnectionTypeIcon = (connection) => {
    switch (connection?.toLowerCase()) {
      case 'usb': return <Usb className="h-4 w-4" />
      case 'built-in': return <Monitor className="h-4 w-4" />
      case 'wifi': return <Wifi className="h-4 w-4" />
      case 'bluetooth': return <Smartphone className="h-4 w-4" />
      default: return <Camera className="h-4 w-4" />
    }
  }

  if (showPermissionDialog) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="mb-6">
            <Camera className="h-16 w-16 text-primary-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Camera Access Required
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              NigraniAI needs access to your camera to provide real-time monitoring and detection capabilities.
            </p>
          </div>
          
          <div className="space-y-4">
            <button
              onClick={requestPermissions}
              className="w-full btn-primary py-3"
            >
              Grant Camera Access
            </button>
            
            <div className="text-sm text-gray-500 dark:text-gray-400">
              <p className="mb-2">If you've already denied access:</p>
              <ol className="text-left space-y-1">
                <li>1. Click the camera icon in your browser's address bar</li>
                <li>2. Select "Allow" for camera access</li>
                <li>3. Refresh this page</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 text-primary-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Initializing camera system...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Production Camera Manager</h2>
          <p className="text-gray-600 dark:text-gray-400">Real device camera detection and streaming</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            permissionStatus === 'granted' 
              ? 'bg-success-100 text-success-700' 
              : 'bg-danger-100 text-danger-700'
          }`}>
            Camera {permissionStatus}
          </div>
          <button
            onClick={refreshCameras}
            disabled={isLoading}
            className="btn-secondary flex items-center space-x-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={isDetectionActive ? stopDetection : startDetection}
            disabled={!selectedCamera || !ProductionCameraService.isConnected(selectedCamera?.id)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 ${
              isDetectionActive 
                ? 'bg-danger-600 hover:bg-danger-700 text-white' 
                : 'bg-success-600 hover:bg-success-700 text-white'
            }`}
          >
            <Eye className="h-4 w-4 inline mr-2" />
            {isDetectionActive ? 'Stop Detection' : 'Start Detection'}
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <AlertTriangle className="h-5 w-5 text-danger-600 dark:text-danger-400 mt-0.5" />
            <div>
              <p className="text-danger-700 dark:text-danger-300 font-medium">Camera Error</p>
              <p className="text-danger-600 dark:text-danger-400 text-sm mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Detection Status */}
      {isDetectionActive && detectionStatus && (
        <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Eye className="h-5 w-5 text-primary-600 dark:text-primary-400" />
              <span className="font-medium text-primary-700 dark:text-primary-300">Live AI Detection Active</span>
            </div>
            <div className="flex items-center space-x-4 text-sm text-primary-600 dark:text-primary-400">
              <span>Frames: {detectionStatus.frameCount}</span>
              <span>Processing: {detectionStatus.isProcessing ? 'Yes' : 'No'}</span>
              <span>Queue: {detectionStatus.queueLength}</span>
            </div>
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Camera List */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Available Cameras</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {cameras.length} device{cameras.length !== 1 ? 's' : ''} found
              </p>
            </div>
            <div className="p-4 space-y-2">
              {cameras.length === 0 ? (
                <div className="text-center py-8">
                  <Camera className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">No cameras detected</p>
                  <button
                    onClick={refreshCameras}
                    className="mt-2 text-sm text-primary-600 hover:text-primary-700"
                  >
                    Refresh to scan again
                  </button>
                </div>
              ) : (
                cameras.map((camera) => (
                  <div
                    key={camera.id}
                    className={`p-3 rounded-lg border-2 transition-all cursor-pointer ${
                      selectedCamera?.id === camera.id
                        ? 'border-primary-200 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                    onClick={() => setSelectedCamera(camera)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {getConnectionTypeIcon(camera.connection)}
                        <span className="font-medium text-gray-900 dark:text-white">
                          {camera.name}
                        </span>
                      </div>
                      {getConnectionIcon(connectionStatus[camera.id])}
                    </div>
                    
                    <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                      <div>Connection: {camera.connection}</div>
                      <div>Features: {camera.features}</div>
                      <div>Resolutions: {camera.resolutions.length}</div>
                    </div>
                    
                    <div className="mt-2 flex space-x-2">
                      {ProductionCameraService.isConnected(camera.id) ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            disconnectCamera(camera.id)
                          }}
                          className="text-xs bg-danger-600 text-white px-2 py-1 rounded"
                        >
                          Disconnect
                        </button>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            connectToCamera(camera)
                          }}
                          disabled={connectionStatus[camera.id] === 'connecting'}
                          className="text-xs bg-primary-600 text-white px-2 py-1 rounded disabled:opacity-50"
                        >
                          {connectionStatus[camera.id] === 'connecting' ? 'Connecting...' : 'Connect'}
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Stream Info */}
          {selectedCamera && ProductionCameraService.isConnected(selectedCamera.id) && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg mt-6">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Stream Info</h3>
              </div>
              <div className="p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Resolution:</span>
                  <span className="text-gray-900 dark:text-white">
                    {streamSettings.width}x{streamSettings.height}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Frame Rate:</span>
                  <span className="text-gray-900 dark:text-white">{streamSettings.frameRate} fps</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Aspect Ratio:</span>
                  <span className="text-gray-900 dark:text-white">{streamSettings.aspectRatio}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Device ID:</span>
                  <span className="text-gray-900 dark:text-white text-xs">
                    {streamSettings.deviceId?.substring(0, 8)}...
                  </span>
                </div>
                {isDetectionActive && detectionStatus && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Frames Processed:</span>
                      <span className="text-gray-900 dark:text-white">{detectionStatus.frameCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Detection Status:</span>
                      <span className={`font-medium ${detectionStatus.isProcessing ? 'text-primary-600' : 'text-success-600'}`}>
                        {detectionStatus.isProcessing ? 'Processing' : 'Ready'}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Video Feed */}
        <div className="lg:col-span-3">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {selectedCamera?.name || 'No Camera Selected'}
                  </h3>
                  {selectedCamera && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {selectedCamera.connection} • {selectedCamera.features}
                    </p>
                  )}
                </div>
                <div className="flex items-center space-x-4">
                  {selectedCamera && (
                    <>
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${
                          ProductionCameraService.isConnected(selectedCamera.id) 
                            ? 'bg-success-500 animate-pulse' 
                            : 'bg-gray-400'
                        }`}></div>
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                          {ProductionCameraService.isConnected(selectedCamera.id) ? 'Connected' : 'Disconnected'}
                        </span>
                      </div>
                      
                      {isDetectionActive && (
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 rounded-full bg-primary-500 animate-pulse"></div>
                          <span className="text-sm text-gray-600 dark:text-gray-300">AI Active</span>
                        </div>
                      )}
                      
                      <button className="btn-secondary">
                        <Settings className="h-4 w-4 mr-2" />
                        Settings
                      </button>
                      <button className="btn-secondary">
                        <Maximize className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Video Container */}
            <div className="relative bg-gray-900 aspect-video">
              {selectedCamera && ProductionCameraService.isConnected(selectedCamera.id) ? (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                    style={{ backgroundColor: '#000' }}
                  />
                  
                  <canvas
                    ref={canvasRef}
                    className="hidden"
                  />
                  
                  {/* Live Indicator */}
                  <div className="absolute top-4 left-4 flex items-center space-x-2 bg-danger-600 text-white px-3 py-1 rounded-full">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium">LIVE</span>
                  </div>

                  {/* AI Status */}
                  {isDetectionActive && (
                    <div className="absolute top-4 right-4 flex items-center space-x-2 bg-primary-600 text-white px-3 py-1 rounded-full">
                      <Eye className="w-3 h-3" />
                      <span className="text-sm font-medium">AI DETECTION</span>
                    </div>
                  )}

                  {/* Timestamp */}
                  <div className="absolute bottom-4 left-4 bg-black/50 text-white px-3 py-1 rounded">
                    <span className="text-sm font-mono">
                      {new Date().toLocaleTimeString()}
                    </span>
                  </div>

                  {/* Stream Quality */}
                  <div className="absolute bottom-4 right-4 bg-black/50 text-white px-3 py-1 rounded">
                    <div className="flex items-center space-x-2">
                      <Video className="h-4 w-4" />
                      <span className="text-sm">
                        {streamSettings.width}x{streamSettings.height} @ {streamSettings.frameRate}fps
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    {selectedCamera ? (
                      <>
                        <VideoOff className="h-16 w-16 text-gray-500 mx-auto mb-4" />
                        <p className="text-gray-400 text-lg">Camera Disconnected</p>
                        <p className="text-gray-500 text-sm mb-4">Click connect to start streaming</p>
                        <button
                          onClick={() => connectToCamera(selectedCamera)}
                          className="btn-primary"
                        >
                          Connect Camera
                        </button>
                      </>
                    ) : (
                      <>
                        <Camera className="h-16 w-16 text-gray-500 mx-auto mb-4" />
                        <p className="text-gray-400 text-lg">No Camera Selected</p>
                        <p className="text-gray-500 text-sm">Select a camera from the list to begin</p>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-b-xl">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-4 text-sm">
                  <div className="text-gray-600 dark:text-gray-300">
                    Permission: <span className={`font-medium ${
                      permissionStatus === 'granted' ? 'text-success-600' : 'text-danger-600'
                    }`}>
                      {permissionStatus}
                    </span>
                  </div>
                  <div className="text-gray-600 dark:text-gray-300">
                    Cameras: <span className="font-medium">{cameras.length}</span>
                  </div>
                  <div className="text-gray-600 dark:text-gray-300">
                    Connected: <span className="font-medium">
                      {ProductionCameraService.getConnectedCameras().length}
                    </span>
                  </div>
                  {isDetectionActive && (
                    <div className="text-gray-600 dark:text-gray-300">
                      AI Detection: <span className="font-medium text-primary-600">Active</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <button className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
                    Record
                  </button>
                  <button className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
                    Snapshot
                  </button>
                  <button className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
                    Fullscreen
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProductionCameraManager