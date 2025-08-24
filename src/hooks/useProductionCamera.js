import { useState, useEffect, useCallback } from 'react'
import ProductionCameraService from '../services/productionCameraService'

export const useProductionCamera = () => {
  const [cameras, setCameras] = useState([])
  const [connectedCameras, setConnectedCameras] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [permissionStatus, setPermissionStatus] = useState('unknown')

  // Initialize camera service
  useEffect(() => {
    let mounted = true

    const initialize = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const initialized = await ProductionCameraService.initialize()
        
        if (!mounted) return

        if (initialized) {
          const availableCameras = ProductionCameraService.getAvailableCameras()
          setCameras(availableCameras)
          setPermissionStatus(ProductionCameraService.getPermissionStatus())
        } else {
          setError('Failed to initialize camera service')
        }
      } catch (err) {
        if (mounted) {
          setError(err.message)
        }
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    initialize()

    return () => {
      mounted = false
    }
  }, [])

  // Set up event listeners
  useEffect(() => {
    const handleError = (errorEvent) => {
      setError(errorEvent.message)
    }

    const handleStatusChange = (statusEvent) => {
      // Update connected cameras list
      const connected = ProductionCameraService.getConnectedCameras()
      setConnectedCameras(connected)
      
      // Update cameras list with new status
      setCameras(prev => prev.map(camera => 
        camera.id === statusEvent.cameraId 
          ? { ...camera, status: statusEvent.status === 'connected' ? 'online' : 'available' }
          : camera
      ))
    }

    const unsubscribeError = ProductionCameraService.onError(handleError)
    const unsubscribeStatus = ProductionCameraService.onStatusChange(handleStatusChange)

    return () => {
      unsubscribeError()
      unsubscribeStatus()
    }
  }, [])

  const connectCamera = useCallback(async (cameraId, options = {}) => {
    try {
      setError(null)
      const connection = await ProductionCameraService.connectToCamera(cameraId, options)
      
      // Update connected cameras
      const connected = ProductionCameraService.getConnectedCameras()
      setConnectedCameras(connected)
      
      return connection
    } catch (err) {
      setError(err.message)
      throw err
    }
  }, [])

  const disconnectCamera = useCallback(async (cameraId) => {
    try {
      setError(null)
      await ProductionCameraService.disconnectCamera(cameraId)
      
      // Update connected cameras
      const connected = ProductionCameraService.getConnectedCameras()
      setConnectedCameras(connected)
    } catch (err) {
      setError(err.message)
      throw err
    }
  }, [])

  const refreshCameras = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const refreshedCameras = await ProductionCameraService.refreshDevices()
      setCameras(refreshedCameras)
      
      const connected = ProductionCameraService.getConnectedCameras()
      setConnectedCameras(connected)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const getStream = useCallback((cameraId) => {
    return ProductionCameraService.getActiveStream(cameraId)
  }, [])

  const getCameraStatus = useCallback((cameraId) => {
    return ProductionCameraService.getCameraStatus(cameraId)
  }, [])

  const isConnected = useCallback((cameraId) => {
    return ProductionCameraService.isConnected(cameraId)
  }, [])

  const testCameraAccess = useCallback(async (cameraId) => {
    try {
      return await ProductionCameraService.testCameraAccess(cameraId)
    } catch (err) {
      return false
    }
  }, [])

  const getHealthStatus = useCallback(() => {
    return ProductionCameraService.getHealthStatus()
  }, [])

  return {
    // State
    cameras,
    connectedCameras,
    isLoading,
    error,
    permissionStatus,
    
    // Actions
    connectCamera,
    disconnectCamera,
    refreshCameras,
    getStream,
    getCameraStatus,
    isConnected,
    testCameraAccess,
    getHealthStatus,
    
    // Utilities
    clearError: () => setError(null)
  }
}