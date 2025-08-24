import { useState, useEffect, useCallback } from 'react'
import SupabaseService from '../services/supabase'

export const useSupabaseSystemHealth = () => {
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
      const health = await SupabaseService.getSystemHealth()
      setSystemStatus(health)
    } catch (error) {
      console.error('System health check failed:', error)
      setError('Failed to check system health')
      setSystemStatus(prev => ({ ...prev, status: 'degraded' }))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    // Initial health check
    checkSystemHealth()

    // Set up periodic health checks every 30 seconds
    const interval = setInterval(checkSystemHealth, 30000)

    return () => clearInterval(interval)
  }, [checkSystemHealth])

  return {
    systemStatus,
    isLoading,
    error,
    checkSystemHealth
  }
}