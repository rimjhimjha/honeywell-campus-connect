// Production configuration and environment validation
export const config = {
  // Supabase
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  
  // AI Services
  geminiApiKey: import.meta.env.VITE_GEMINI_API_KEY,
  
  // App Settings
  appName: import.meta.env.VITE_APP_NAME || 'NigraniAI',
  appVersion: import.meta.env.VITE_APP_VERSION || '2.0.0',
  nodeEnv: import.meta.env.NODE_ENV || 'development',
  
  // Feature Flags
  enableCameraDetection: import.meta.env.VITE_ENABLE_CAMERA_DETECTION !== 'false',
  enableRealTimeAlerts: import.meta.env.VITE_ENABLE_REAL_TIME_ALERTS !== 'false',
  enableAIReports: import.meta.env.VITE_ENABLE_AI_REPORTS !== 'false',
  enableAnalytics: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
  
  // Performance
  detectionInterval: parseInt(import.meta.env.VITE_DETECTION_INTERVAL) || 1000,
  maxAlertsDisplay: parseInt(import.meta.env.VITE_MAX_ALERTS_DISPLAY) || 100,
  cacheDuration: parseInt(import.meta.env.VITE_CACHE_DURATION) || 300000,
  
  // Security
  sentryDsn: import.meta.env.VITE_SENTRY_DSN,
}

// Validate required environment variables
export const validateConfig = () => {
  const errors = []
  
  if (!config.supabaseUrl) {
    errors.push('VITE_SUPABASE_URL is required')
  }
  
  if (!config.supabaseAnonKey) {
    errors.push('VITE_SUPABASE_ANON_KEY is required')
  }
  
  if (config.enableAIReports && !config.geminiApiKey) {
    console.warn('VITE_GEMINI_API_KEY not set - AI reports will use mock data')
  }
  
  if (errors.length > 0) {
    throw new Error(`Configuration errors:\n${errors.join('\n')}`)
  }
  
  return true
}

// Initialize configuration validation
if (config.nodeEnv === 'production') {
  validateConfig()
}

export default config