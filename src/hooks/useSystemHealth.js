import { useState, useEffect, useCallback } from 'react'
import ApiService from '../services/api'
import WebSocketService from '../services/websocket'

export const useSystemHealth = () => {
  const [systemStatus, setSystemStatus] = useState({
    status: 'unknown',
    version: '2.0.0',
    uptime: 'Unknown',
    alerts_count: 0,
    active_cameras: 0,
    last_detection: null
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const checkSystemHealth = useCallback(async () => {
    try {
      setError(null)
      const health = await ApiService.getSystemHealth()
      setSystemStatus(health)
    } catch (error) {
      setError('Failed to check system health')
      setSystemStatus(prev => ({ ...prev, status: 'offline' }))
      console.error('System health check failed:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    // Initial health check
    checkSystemHealth()

    // Set up periodic health checks with recursive setTimeout
    let timeoutId
    const scheduleNextCheck = () => {
      timeoutId = setTimeout(() => {
        checkSystemHealth()
        scheduleNextCheck()
      }, 30000) // Every 30 seconds
    }
    scheduleNextCheck()

    // Listen for real-time system updates
    const handleSystemUpdate = (update) => {
      setSystemStatus(prev => ({ ...prev, ...update }))
    }

    WebSocketService.on('system_update', handleSystemUpdate)

    return () => {
      if (timeoutId) clearTimeout(timeoutId)
      WebSocketService.off('system_update', handleSystemUpdate)
    }
  }, [checkSystemHealth])

  return {
    systemStatus,
    isLoading,
    error,
    checkSystemHealth
  }
}