import React, { useState } from 'react'
import { Shield, User, Lock, Eye, EyeOff, AlertCircle, Wifi, WifiOff } from 'lucide-react'
import ThemeToggle from './ThemeToggle'
import { useTheme } from '../contexts/ThemeContext'

const LoginForm = ({ onLogin }) => {
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [connectionStatus, setConnectionStatus] = useState('checking')
  const { isDark } = useTheme()

  // Check backend connection on mount
  React.useEffect(() => {
    const checkConnection = async () => {
      try {
        const response = await fetch('http://localhost:8000/health')
        if (response.ok) {
          setConnectionStatus('connected')
        } else {
          setConnectionStatus('error')
        }
      } catch (error) {
        setConnectionStatus('disconnected')
      }
    }
    
    checkConnection()
    
    let timeoutId
    const scheduleNextCheck = () => {
      timeoutId = setTimeout(() => {
        checkConnection()
        scheduleNextCheck()
      }, 10000)
    }
    scheduleNextCheck()
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const result = await onLogin(credentials.username, credentials.password)
      
      if (!result.success) {
        setError(result.error || 'Login failed')
      }
    } catch (err) {
      setError('Login failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDemoLogin = async (username, password) => {
    setIsLoading(true)
    setError('')
    
    try {
      const result = await onLogin(username, password)
      
      if (!result.success) {
        setError(result.error || 'Demo login failed')
      }
    } catch (err) {
      setError('Demo login failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const getConnectionStatusDisplay = () => {
    switch (connectionStatus) {
      case 'connected':
        return (
          <div className="flex items-center space-x-2 text-success-600">
            <Wifi className="h-4 w-4" />
            <span className="text-sm">Backend Connected</span>
          </div>
        )
      case 'disconnected':
        return (
          <div className="flex items-center space-x-2 text-danger-600">
            <WifiOff className="h-4 w-4" />
            <span className="text-sm">Backend Disconnected</span>
          </div>
        )
      case 'error':
        return (
          <div className="flex items-center space-x-2 text-warning-600">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">Backend Error</span>
          </div>
        )
      default:
        return (
          <div className="flex items-center space-x-2 text-gray-500">
            <div className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm">Checking Connection...</span>
          </div>
        )
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4 transition-colors duration-300">
      <div className="max-w-md w-full">
        {/* Theme Toggle - Top Right */}
        <div className="flex justify-end mb-4">
          <ThemeToggle />
        </div>

        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-full mb-4 shadow-lg">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">NigraniAI</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Production Safety Monitor</p>
          
          {/* Connection Status */}
          <div className="mt-4">
            {getConnectionStatusDisplay()}
          </div>
        </div>

        {/* Login Form */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 transition-colors duration-300">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white text-center">Welcome Back</h2>
            <p className="text-gray-600 dark:text-gray-400 text-center mt-2">Sign in to access the dashboard</p>
          </div>

          {/* Backend Connection Warning */}
          {connectionStatus === 'disconnected' && (
            <div className="mb-4 p-4 bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-5 w-5 text-warning-600 dark:text-warning-400 mt-0.5" />
                <div>
                  <p className="text-warning-700 dark:text-warning-300 text-sm font-medium">Backend Not Running</p>
                  <p className="text-warning-600 dark:text-warning-400 text-sm mt-1">
                    Please start the backend server by running: <code className="bg-warning-100 dark:bg-warning-800 px-1 rounded">python start_backend.py</code>
                  </p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 p-4 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-danger-600 dark:text-danger-400" />
                <p className="text-danger-600 dark:text-danger-400 text-sm">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={credentials.username}
                  onChange={(e) => setCredentials(prev => ({ ...prev, username: e.target.value }))}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  placeholder="Enter your username"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={credentials.password}
                  onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || connectionStatus === 'disconnected'}
              className="w-full btn-primary py-3 text-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Signing in...</span>
                </div>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Demo Accounts */}
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-4">Demo Accounts</p>
            <div className="space-y-2">
              <button
                onClick={() => handleDemoLogin('admin', 'admin123')}
                disabled={isLoading || connectionStatus === 'disconnected'}
                className="w-full btn-secondary py-2 text-sm disabled:opacity-50"
              >
                Login as Admin (admin / admin123)
              </button>
              <button
                onClick={() => handleDemoLogin('operator', 'operator123')}
                disabled={isLoading || connectionStatus === 'disconnected'}
                className="w-full btn-secondary py-2 text-sm disabled:opacity-50"
              >
                Login as Operator (operator / operator123)
              </button>
            </div>
          </div>

          {/* Setup Instructions */}
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Quick Setup</h3>
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-primary-600 rounded-full mt-2"></div>
                <span>Run <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">python start_backend.py</code> to start backend</span>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-primary-600 rounded-full mt-2"></div>
                <span>Use demo credentials above to login</span>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-primary-600 rounded-full mt-2"></div>
                <span>Access full dashboard features</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500 dark:text-gray-400">
          <p>NigraniAI v2.0.0 - Production Safety Monitoring System</p>
          <p className="mt-1">Simple development setup for testing</p>
        </div>
      </div>
    </div>
  )
}

export default LoginForm