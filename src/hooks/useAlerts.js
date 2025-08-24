import { useState, useCallback } from 'react'

export const useAlerts = () => {
  const [alerts, setAlerts] = useState([])

  const addAlert = useCallback((alert) => {
    setAlerts(prev => [alert, ...prev])
  }, [])

  const acknowledgeAlert = useCallback((alertId) => {
    setAlerts(prev => 
      prev.map(alert => 
        alert.id === alertId 
          ? { ...alert, acknowledged: true, acknowledgedAt: new Date() }
          : alert
      )
    )
  }, [])

  const clearAlerts = useCallback(() => {
    setAlerts([])
  }, [])

  return {
    alerts,
    addAlert,
    acknowledgeAlert,
    clearAlerts
  }
}