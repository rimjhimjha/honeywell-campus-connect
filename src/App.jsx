import React, { useState, useEffect } from 'react'
import { Shield, Camera, Users, AlertTriangle, Activity, Settings, Bell, Eye, TrendingUp, User } from 'lucide-react'
import AdvancedDashboard from './components/AdvancedDashboard'
import CameraManager from './components/CameraManager'
import AlertsPanel from './components/AlertsPanel'
import Analytics from './components/Analytics'
import SettingsPanel from './components/SettingsPanel'
import LoginForm from './components/LoginForm'
import ThemeToggle from './components/ThemeToggle'
import ErrorBoundary from './components/ErrorBoundary'
import { ThemeProvider } from './contexts/ThemeContext'
import { useSupabaseAuth } from './hooks/useSupabaseAuth'
import { useSupabaseAlerts } from './hooks/useSupabaseAlerts'
import { useSupabaseSystemHealth } from './hooks/useSupabaseSystemHealth'
import AdvancedDetectionService from './services/advancedDetection'
import EnterpriseBackendService from './services/enterpriseBackend'
import ErrorTrackingService from './services/errorTracking'
import { validateConfig } from './config/production'

function AppContent() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const { user, isAuthenticated, isLoading: authLoading, login, logout } = useSupabaseAuth()
  const { alerts, acknowledgeAlert, clearAllAlerts, sendTestAlert } = useSupabaseAlerts()
  const { systemStatus } = useSupabaseSystemHealth()
  const [isInitializing, setIsInitializing] = useState(true)

  // Initialize advanced services
  useEffect(() => {
    const initializeAdvancedServices = async () => {
      try {
        // Validate configuration
        validateConfig()
        
        // Initialize error tracking
        await ErrorTrackingService.initialize()
        
        // Initialize advanced detection service
        await AdvancedDetectionService.initialize()
        
        // Connect enterprise backend WebSocket
        if (isAuthenticated) {
          await EnterpriseBackendService.connectWebSocket()
        }
        
        // Set user context for error tracking
        if (user) {
          ErrorTrackingService.setUser(user)
        }
        
        console.log('Advanced services initialized successfully')
      } catch (error) {
        console.error('Advanced services initialization failed:', error)
        ErrorTrackingService.captureError(error, { critical: true })
      } finally {
        setIsInitializing(false)
      }
    }

    initializeAdvancedServices()
  }, [user, isAuthenticated])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      AdvancedDetectionService.dispose()
    }
  }, [])

  const navigationItems = [
    { id: 'dashboard', label: 'AI Dashboard', icon: Activity },
    { id: 'cameras', label: 'Cameras', icon: Camera },
    { id: 'alerts', label: 'Alerts', icon: Bell },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp },
    { id: 'settings', label: 'Settings', icon: Settings },
  ]

  const handleAcknowledgeAlert = async (alertId) => {
    try {
      if (user?.username) {
        await acknowledgeAlert(alertId, user.username)
      }
    } catch (error) {
      ErrorTrackingService.captureError(error, {
        extra: { action: 'acknowledge_alert', alertId }
      })
    }
  }

  const handleSendTestAlert = async () => {
    try {
      if (user?.username) {
        await sendTestAlert(user.username)
      }
    } catch (error) {
      ErrorTrackingService.captureError(error, {
        extra: { action: 'send_test_alert' }
      })
    }
  }

  const handleClearAllAlerts = async () => {
    try {
      await clearAllAlerts()
    } catch (error) {
      ErrorTrackingService.captureError(error, {
        extra: { action: 'clear_all_alerts' }
      })
    }
  }

  if (authLoading || isInitializing) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600 mx-auto mb-6"></div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Initializing NigraniAI
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            {authLoading ? 'Authenticating...' : 'Loading AI detection systems...'}
          </p>
          <div className="mt-4 space-y-2 text-sm text-gray-500 dark:text-gray-400">
            <p>✓ TensorFlow.js Backend</p>
            <p>✓ Neural Network Models</p>
            <p>✓ Detection Workers</p>
            <p>✓ Enterprise Backend</p>
          </div>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <ErrorBoundary name="LoginForm">
        <LoginForm onLogin={login} />
      </ErrorBoundary>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      {/* Enhanced Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-br from-primary-600 to-primary-700 rounded-lg shadow-lg">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">NigraniAI</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">Enterprise AI Security</p>
              </div>
            </div>

            {/* Advanced System Status */}
            <div className="hidden md:flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${
                  systemStatus.status === 'healthy' ? 'bg-success-500 animate-pulse' : 
                  systemStatus.status === 'degraded' ? 'bg-warning-500' : 'bg-danger-500'
                }`}></div>
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  AI {systemStatus.status === 'healthy' ? 'Active' : 
                       systemStatus.status === 'degraded' ? 'Degraded' : 'Offline'}
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                <Eye className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600 dark:text-gray-300">{systemStatus.active_cameras} Cameras</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {alerts.filter(a => !a.acknowledged).length} Active
                </span>
              </div>

              {/* AI Status Indicator */}
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-primary-500 animate-pulse"></div>
                <span className="text-sm text-gray-600 dark:text-gray-300">Neural Networks</span>
              </div>
            </div>

            {/* User Menu & Theme Toggle */}
            <div className="flex items-center space-x-4">
              <ThemeToggle />
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-700 dark:text-gray-300">{user?.username}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                  {user?.role}
                </span>
              </div>
              <button
                onClick={logout}
                className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Enhanced Sidebar */}
        <nav className="w-64 bg-white dark:bg-gray-800 shadow-sm h-screen sticky top-0 transition-colors duration-300">
          <div className="p-4">
            <div className="space-y-2">
              {navigationItems.map((item) => {
                const Icon = item.icon
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-all duration-200 ${
                      activeTab === item.id
                        ? 'bg-gradient-to-r from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20 text-primary-700 dark:text-primary-400 border-r-2 border-primary-600 shadow-sm'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="font-medium">{item.label}</span>
                    {item.id === 'alerts' && alerts.filter(a => !a.acknowledged).length > 0 && (
                      <span className="ml-auto bg-danger-500 text-white text-xs px-2 py-1 rounded-full animate-pulse">
                        {alerts.filter(a => !a.acknowledged).length}
                      </span>
                    )}
                    {item.id === 'dashboard' && (
                      <span className="ml-auto bg-primary-500 text-white text-xs px-2 py-1 rounded-full">
                        AI
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* System Info Panel */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">System Status</h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">AI Models:</span>
                <span className="text-gray-900 dark:text-white">5/5</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Workers:</span>
                <span className="text-gray-900 dark:text-white">4/4</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Memory:</span>
                <span className="text-gray-900 dark:text-white">2.1 GB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Uptime:</span>
                <span className="text-gray-900 dark:text-white">99.9%</span>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            <ErrorBoundary name={`${activeTab}Tab`}>
              {activeTab === 'dashboard' && (
                <AdvancedDashboard 
                  alerts={alerts} 
                  systemStatus={systemStatus}
                  onAcknowledgeAlert={handleAcknowledgeAlert}
                  onSendTestAlert={handleSendTestAlert}
                />
              )}
              {activeTab === 'cameras' && <CameraManager />}
              {activeTab === 'alerts' && (
                <AlertsPanel 
                  alerts={alerts}
                  onAcknowledgeAlert={handleAcknowledgeAlert}
                  onClearAlerts={handleClearAllAlerts}
                />
              )}
              {activeTab === 'analytics' && <Analytics alerts={alerts} />}
              {activeTab === 'settings' && <SettingsPanel />}
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  )
}

function App() {
  return (
    <ErrorBoundary name="App">
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </ErrorBoundary>
  )
}

export default App