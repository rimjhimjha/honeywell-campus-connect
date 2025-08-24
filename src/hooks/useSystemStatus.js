import { useState, useEffect } from 'react'

export const useSystemStatus = () => {
  const [systemStatus, setSystemStatus] = useState({
    status: 'online',
    activeCameras: 5,
    lastUpdate: new Date(),
    uptime: '99.8%',
    version: '2.0.0'
  })

  useEffect(() => {
    // System status updates with recursive setTimeout
    let timeoutId
    const scheduleNextUpdate = () => {
      timeoutId = setTimeout(() => {
        setSystemStatus(prev => ({
          ...prev,
          lastUpdate: new Date(),
          // Occasionally simulate offline status
          status: Math.random() > 0.95 ? 'offline' : 'online'
        }))
        scheduleNextUpdate()
      }, 30000) // Update every 30 seconds
    }
    scheduleNextUpdate()

    return () => {
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [])

  const updateStatus = (newStatus) => {
    setSystemStatus(prev => ({ ...prev, ...newStatus }))
  }

  return {
    systemStatus,
    updateStatus
  }
}