import { useState, useEffect, useCallback } from 'react'
import ApiService from '../services/api'
import WebSocketService from '../services/websocket'

export const useRealTimeAlerts = () => {
  const [alerts, setAlerts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  // Load initial alerts
  const loadAlerts = useCallback(async (params = {}) => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await ApiService.getAlerts(params)
      setAlerts(response || [])
    } catch (error) {
      setError('Failed to load alerts')
      console.error('Error loading alerts:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Handle real-time alert updates
  useEffect(() => {
    const handleNewAlert = (alert) => {
      setAlerts(prev => [alert, ...prev])
      
      // Show browser notification if permission granted
      if (Notification.permission === 'granted') {
        new Notification(`SafeZoneAI Alert: ${alert.type}`, {
          body: alert.description,
          icon: '/shield.svg',
          tag: alert.id
        })
      }
    }

    const handleAlertUpdate = (updatedAlert) => {
      setAlerts(prev => 
        prev.map(alert => 
          alert.id === updatedAlert.id ? updatedAlert : alert
        )
      )
    }

    const handleAlertDelete = (alertId) => {
      setAlerts(prev => prev.filter(alert => alert.id !== alertId))
    }

    // Subscribe to WebSocket events
    WebSocketService.on('new_alert', handleNewAlert)
    WebSocketService.on('alert_updated', handleAlertUpdate)
    WebSocketService.on('alert_deleted', handleAlertDelete)

    // Load initial data
    loadAlerts()

    // Request notification permission
    if (Notification.permission === 'default') {
      Notification.requestPermission()
    }

    return () => {
      WebSocketService.off('new_alert', handleNewAlert)
      WebSocketService.off('alert_updated', handleAlertUpdate)
      WebSocketService.off('alert_deleted', handleAlertDelete)
    }
  }, [loadAlerts])

  const acknowledgeAlert = useCallback(async (alertId) => {
    try {
      await ApiService.acknowledgeAlert(alertId)
      setAlerts(prev => 
        prev.map(alert => 
          alert.id === alertId 
            ? { ...alert, acknowledged: true, acknowledged_at: new Date().toISOString() }
            : alert
        )
      )
    } catch (error) {
      console.error('Error acknowledging alert:', error)
      throw error
    }
  }, [])

  const clearAllAlerts = useCallback(async () => {
    try {
      await ApiService.clearAllAlerts()
      setAlerts([])
    } catch (error) {
      console.error('Error clearing alerts:', error)
      throw error
    }
  }, [])

  const sendTestAlert = useCallback(async () => {
    try {
      await ApiService.sendTestAlert()
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