import React from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import ErrorTrackingService from '../services/errorTracking'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error,
      errorInfo
    })

    // Log error to tracking service
    ErrorTrackingService.captureError(error, {
      critical: true,
      extra: {
        componentStack: errorInfo.componentStack,
        errorBoundary: this.props.name || 'Unknown'
      }
    })
  }

  handleReload = () => {
    window.location.reload()
  }

  handleGoHome = () => {
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center">
            <div className="mb-6">
              <AlertTriangle className="h-16 w-16 text-danger-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Something went wrong
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                We're sorry, but something unexpected happened. The error has been logged and we'll look into it.
              </p>
            </div>

            {/* Error details in development */}
            {import.meta.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mb-6 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg text-left">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Error Details:</h3>
                <pre className="text-xs text-gray-700 dark:text-gray-300 overflow-auto">
                  {this.state.error.toString()}
                </pre>
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={this.handleReload}
                className="w-full btn-primary flex items-center justify-center space-x-2"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Reload Page</span>
              </button>
              
              <button
                onClick={this.handleGoHome}
                className="w-full btn-secondary flex items-center justify-center space-x-2"
              >
                <Home className="h-4 w-4" />
                <span>Go to Dashboard</span>
              </button>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 mt-6">
              Error ID: {Date.now().toString(36)}
            </p>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary