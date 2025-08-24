import { useState, useEffect, useCallback } from 'react'
import SupabaseService from '../services/supabase'

export const useSupabaseAlerts = () => {
  const [alerts, setAlerts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  // Load alerts from Supabase
  const loadAlerts = useCallback(async (params = {}) => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await SupabaseService.getAlerts(params)
      setAlerts(data)
    } catch (error) {
      console.error('Error loading alerts:', error)
      setError('Failed to load alerts')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Subscribe to real-time updates
  useEffect(() => {
    loadAlerts()

    // Subscribe to real-time changes
    const subscription = SupabaseService.subscribeToAlerts((payload) => {
      console.log('Real-time alert update:', payload)
      
      if (payload.eventType === 'INSERT') {
        setAlerts(prev => [payload.new, ...prev])
        
        // Show browser notification
        if (Notification.permission === 'granted') {
          new Notification(`NigraniAI Alert: ${payload.new.event_type}`, {
            body: payload.new.description,
            icon: '/shield.svg',
            tag: payload.new.id
          })
        }
      } else if (payload.eventType === 'UPDATE') {
        setAlerts(prev => 
          prev.map(alert => 
            alert.id === payload.new.id ? payload.new : alert
          )
        )
      } else if (payload.eventType === 'DELETE') {
        setAlerts(prev => 
          prev.filter(alert => alert.id !== payload.old.id)
        )
      }
    })

    // Request notification permission
    if (Notification.permission === 'default') {
      Notification.requestPermission()
    }

    return () => {
      subscription.unsubscribe()
    }
  }, [loadAlerts])

  const acknowledgeAlert = useCallback(async (alertId, username) => {
    try {
      await SupabaseService.acknowledgeAlert(alertId, username)
      
      // Update local state
      setAlerts(prev => 
        prev.map(alert => 
          alert.alert_id === alertId 
            ? { 
                ...alert, 
                acknowledged: true, 
                acknowledged_by: username,
                acknowledged_at: new Date().toISOString()
              }
            : alert
        )
      )

      // Log the acknowledgment
      await SupabaseService.createSystemLog(
        'INFO',
        `Alert ${alertId} acknowledged by ${username}`,
        'alerts'
      )
    } catch (error) {
      console.error('Error acknowledging alert:', error)
      throw error
    }
  }, [])

  const clearAllAlerts = useCallback(async () => {
    try {
      await SupabaseService.deleteAllAlerts()
      setAlerts([])
      
      // Log the action
      await SupabaseService.createSystemLog(
        'WARNING',
        'All alerts cleared',
        'alerts'
      )
    } catch (error) {
      console.error('Error clearing alerts:', error)
      throw error
    }
  }, [])

  const sendTestAlert = useCallback(async (username) => {
    try {
      const alertData = {
        alert_id: `test_${Date.now()}`,
        event_type: 'test',
        confidence: 0.95,
        timestamp: new Date().toISOString(),
        frame_number: Math.floor(Math.random() * 10000),
        person_count: 1,
        description: `Test alert triggered by ${username}`,
        location: 'Test Camera',
        severity: 'medium'
      }

      await SupabaseService.createAlert(alertData)
      
      // Log the test alert
      await SupabaseService.createSystemLog(
        'INFO',
        `Test alert sent by ${username}`,
        'alerts'
      )
    } catch (error) {
      console.error('Error sending test alert:', error)
      throw error
    }
  }, [])

  return {
    alerts,
    isLoading,
    error,
    loadAlerts,
    acknowledgeAlert,
    clearAllAlerts,
    sendTestAlert
  }
}