// Error tracking and monitoring service
class ErrorTrackingService {
  constructor() {
    this.isProduction = import.meta.env.NODE_ENV === 'production'
    this.sentryDsn = import.meta.env.VITE_SENTRY_DSN
    this.initialized = false
  }

  async initialize() {
    if (this.initialized || !this.isProduction || !this.sentryDsn) {
      return
    }

    try {
      // Initialize Sentry if available
      if (window.Sentry) {
        window.Sentry.init({
          dsn: this.sentryDsn,
          environment: 'production',
          tracesSampleRate: 0.1,
        })
        this.initialized = true
        console.log('Error tracking initialized')
      }
    } catch (error) {
      console.warn('Failed to initialize error tracking:', error)
    }
  }

  captureError(error, context = {}) {
    // Ensure error is a proper Error object
    let standardError = error
    if (!(error instanceof Error)) {
      // Convert non-standard error objects to proper Error instances
      if (typeof error === 'object' && error !== null) {
        standardError = new Error(error.message || JSON.stringify(error))
        // Preserve original error data in the context
        context.originalError = error
      } else {
        standardError = new Error(error.message || String(error))
      }
    }

    // Log to console in development
    if (!this.isProduction) {
      console.error('Error captured:', standardError, context)
      return
    }

    // Send to error tracking service
    if (this.initialized && window.Sentry) {
      try {
        window.Sentry.captureException(standardError, {
          tags: context.tags,
          extra: context.extra,
          user: context.user
        })
      } catch (sentryError) {
        console.error('Failed to send error to Sentry:', sentryError)
      }
    }

    // Also log critical errors to Supabase
    if (context.critical) {
      this.logToSupabase(standardError, context)
    }
  }

  async logToSupabase(error, context) {
    try {
      const { default: SupabaseService } = await import('./supabase')
      await SupabaseService.createSystemLog(
        'ERROR',
        `Frontend Error: ${error.message}`,
        'frontend',
        {
          stack: error.stack,
          context,
          userAgent: navigator.userAgent,
          url: window.location.href
        }
      )
    } catch (logError) {
      console.error('Failed to log error to Supabase:', logError)
    }
  }

  captureMessage(message, level = 'info', context = {}) {
    if (!this.isProduction) {
      console.log(`[${level}] ${message}`, context)
      return
    }

    if (this.initialized && window.Sentry) {
      window.Sentry.captureMessage(message, level)
    }
  }

  setUser(user) {
    if (this.initialized && window.Sentry) {
      window.Sentry.setUser({
        id: user.id,
        username: user.username,
        email: user.email
      })
    }
  }
}

export default new ErrorTrackingService()