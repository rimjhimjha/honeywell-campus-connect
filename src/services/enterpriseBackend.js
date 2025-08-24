// Enterprise-grade backend service with advanced features
class EnterpriseBackendService {
  constructor() {
    this.baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
    this.wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws'
    this.token = localStorage.getItem('auth_token')
    this.requestQueue = []
    this.retryConfig = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 10000
    }
    this.circuitBreaker = {
      failureThreshold: 5,
      resetTimeout: 60000,
      state: 'closed', // closed, open, half-open
      failures: 0,
      lastFailure: null
    }
    this.cache = new Map()
    this.cacheConfig = {
      defaultTTL: 300000, // 5 minutes
      maxSize: 1000
    }
    this.metrics = {
      requests: 0,
      failures: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageResponseTime: 0
    }
    this.websocket = null
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 10
  }

  // Enhanced request method with circuit breaker, retry, and caching
  async request(endpoint, options = {}) {
    const startTime = performance.now()
    const cacheKey = this.getCacheKey(endpoint, options)
    
    // Check cache first for GET requests
    if (options.method !== 'POST' && options.method !== 'PUT' && options.method !== 'DELETE') {
      const cached = this.getFromCache(cacheKey)
      if (cached) {
        this.metrics.cacheHits++
        return cached
      }
      this.metrics.cacheMisses++
    }

    // Check circuit breaker
    if (this.circuitBreaker.state === 'open') {
      if (Date.now() - this.circuitBreaker.lastFailure < this.circuitBreaker.resetTimeout) {
        throw new Error('Circuit breaker is open - service temporarily unavailable')
      } else {
        this.circuitBreaker.state = 'half-open'
      }
    }

    try {
      const response = await this.executeRequest(endpoint, options)
      
      // Circuit breaker success
      if (this.circuitBreaker.state === 'half-open') {
        this.circuitBreaker.state = 'closed'
        this.circuitBreaker.failures = 0
      }

      // Cache successful GET responses
      if (response && (options.method !== 'POST' && options.method !== 'PUT' && options.method !== 'DELETE')) {
        this.setCache(cacheKey, response)
      }

      // Update metrics
      const responseTime = performance.now() - startTime
      this.updateMetrics(true, responseTime)

      return response
    } catch (error) {
      this.handleRequestFailure(error)
      throw error
    }
  }

  async executeRequest(endpoint, options) {
    const url = `${this.baseUrl}${endpoint}`
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { 'Authorization': `Bearer ${this.token}` }),
        ...options.headers
      },
      ...options
    }

    let lastError
    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        const response = await fetch(url, config)
        
        if (response.status === 401) {
          this.handleUnauthorized()
          throw new Error('Authentication required')
        }

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const data = await response.json()
        return data
      } catch (error) {
        lastError = error
        
        if (attempt < this.retryConfig.maxRetries && this.shouldRetry(error)) {
          const delay = Math.min(
            this.retryConfig.baseDelay * Math.pow(2, attempt),
            this.retryConfig.maxDelay
          )
          await this.sleep(delay)
          continue
        }
        break
      }
    }
    
    throw lastError
  }

  shouldRetry(error) {
    // Retry on network errors and 5xx status codes
    return error.message.includes('Failed to fetch') ||
           error.message.includes('500') ||
           error.message.includes('502') ||
           error.message.includes('503') ||
           error.message.includes('504')
  }

  handleRequestFailure(error) {
    this.circuitBreaker.failures++
    this.circuitBreaker.lastFailure = Date.now()
    
    if (this.circuitBreaker.failures >= this.circuitBreaker.failureThreshold) {
      this.circuitBreaker.state = 'open'
    }
    
    this.updateMetrics(false, 0)
  }

  handleUnauthorized() {
    this.token = null
    localStorage.removeItem('auth_token')
    // Trigger re-authentication
    window.dispatchEvent(new CustomEvent('auth:required'))
  }

  // Caching methods
  getCacheKey(endpoint, options) {
    return `${endpoint}_${JSON.stringify(options.params || {})}`
  }

  getFromCache(key) {
    const cached = this.cache.get(key)
    if (!cached) return null
    
    if (Date.now() > cached.expires) {
      this.cache.delete(key)
      return null
    }
    
    return cached.data
  }

  setCache(key, data, ttl = this.cacheConfig.defaultTTL) {
    // Implement LRU eviction if cache is full
    if (this.cache.size >= this.cacheConfig.maxSize) {
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
    }
    
    this.cache.set(key, {
      data,
      expires: Date.now() + ttl
    })
  }

  clearCache() {
    this.cache.clear()
  }

  // WebSocket connection with auto-reconnect
  connectWebSocket() {
    if (this.websocket?.readyState === WebSocket.OPEN) {
      return Promise.resolve()
    }

    return new Promise((resolve, reject) => {
      try {
        const wsUrl = `${this.wsUrl}?token=${this.token}`
        this.websocket = new WebSocket(wsUrl)
        
        this.websocket.onopen = () => {
          console.log('WebSocket connected')
          this.reconnectAttempts = 0
          resolve()
        }
        
        this.websocket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            this.handleWebSocketMessage(data)
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error)
          }
        }
        
        this.websocket.onclose = () => {
          console.log('WebSocket disconnected')
          this.scheduleReconnect()
        }
        
        this.websocket.onerror = (error) => {
          console.error('WebSocket error:', error)
          reject(error)
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max WebSocket reconnection attempts reached')
      return
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000)
    this.reconnectAttempts++
    
    setTimeout(() => {
      console.log(`Attempting WebSocket reconnection (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
      this.connectWebSocket().catch(console.error)
    }, delay)
  }

  handleWebSocketMessage(data) {
    // Emit custom events for different message types
    switch (data.type) {
      case 'alert':
        window.dispatchEvent(new CustomEvent('realtime:alert', { detail: data.payload }))
        break
      case 'camera_status':
        window.dispatchEvent(new CustomEvent('realtime:camera', { detail: data.payload }))
        break
      case 'system_update':
        window.dispatchEvent(new CustomEvent('realtime:system', { detail: data.payload }))
        break
      default:
        window.dispatchEvent(new CustomEvent('realtime:message', { detail: data }))
    }
  }

  // Enhanced API methods
  async login(username, password) {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    })
    
    if (response.access_token) {
      this.token = response.access_token
      localStorage.setItem('auth_token', this.token)
      
      // Connect WebSocket after successful login
      this.connectWebSocket().catch(console.error)
    }
    
    return response
  }

  async logout() {
    try {
      await this.request('/auth/logout', { method: 'POST' })
    } catch (error) {
      console.error('Logout request failed:', error)
    } finally {
      this.token = null
      localStorage.removeItem('auth_token')
      if (this.websocket) {
        this.websocket.close()
        this.websocket = null
      }
    }
  }

  // Advanced alert management
  async getAlerts(params = {}) {
    return this.request('/alerts', { params })
  }

  async createAlert(alertData) {
    return this.request('/alerts', {
      method: 'POST',
      body: JSON.stringify(alertData)
    })
  }

  async acknowledgeAlert(alertId, notes = '') {
    return this.request(`/alerts/${alertId}/acknowledge`, {
      method: 'POST',
      body: JSON.stringify({ notes })
    })
  }

  async getAlertAnalytics(timeRange = '24h') {
    return this.request(`/analytics/alerts?range=${timeRange}`)
  }

  // Camera management
  async getCameras() {
    return this.request('/cameras')
  }

  async addCamera(cameraData) {
    this.clearCache() // Clear cache when adding new camera
    return this.request('/cameras', {
      method: 'POST',
      body: JSON.stringify(cameraData)
    })
  }

  async updateCamera(cameraId, updates) {
    this.clearCache()
    return this.request(`/cameras/${cameraId}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    })
  }

  async deleteCamera(cameraId) {
    this.clearCache()
    return this.request(`/cameras/${cameraId}`, {
      method: 'DELETE'
    })
  }

  async getCameraStream(cameraId) {
    return this.request(`/cameras/${cameraId}/stream`)
  }

  async getCameraAnalytics(cameraId, timeRange = '24h') {
    return this.request(`/cameras/${cameraId}/analytics?range=${timeRange}`)
  }

  // System monitoring
  async getSystemHealth() {
    return this.request('/system/health')
  }

  async getSystemMetrics() {
    return this.request('/system/metrics')
  }

  async getSystemLogs(level = null, limit = 100) {
    const params = { limit }
    if (level) params.level = level
    return this.request('/system/logs', { params })
  }

  // User management
  async getUsers() {
    return this.request('/users')
  }

  async createUser(userData) {
    return this.request('/users', {
      method: 'POST',
      body: JSON.stringify(userData)
    })
  }

  async updateUser(userId, updates) {
    return this.request(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    })
  }

  async deleteUser(userId) {
    return this.request(`/users/${userId}`, {
      method: 'DELETE'
    })
  }

  // Configuration management
  async getConfiguration() {
    return this.request('/config')
  }

  async updateConfiguration(config) {
    return this.request('/config', {
      method: 'PUT',
      body: JSON.stringify(config)
    })
  }

  // Reporting
  async generateReport(reportConfig) {
    return this.request('/reports/generate', {
      method: 'POST',
      body: JSON.stringify(reportConfig)
    })
  }

  async getReports() {
    return this.request('/reports')
  }

  async downloadReport(reportId) {
    return this.request(`/reports/${reportId}/download`)
  }

  // Backup and restore
  async createBackup() {
    return this.request('/backup/create', { method: 'POST' })
  }

  async getBackups() {
    return this.request('/backup/list')
  }

  async restoreBackup(backupId) {
    return this.request(`/backup/restore/${backupId}`, { method: 'POST' })
  }

  // Utility methods
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  updateMetrics(success, responseTime) {
    this.metrics.requests++
    if (!success) {
      this.metrics.failures++
    }
    
    // Update average response time
    this.metrics.averageResponseTime = 
      (this.metrics.averageResponseTime * (this.metrics.requests - 1) + responseTime) / this.metrics.requests
  }

  getMetrics() {
    return {
      ...this.metrics,
      successRate: this.metrics.requests > 0 ? 
        ((this.metrics.requests - this.metrics.failures) / this.metrics.requests) * 100 : 0,
      cacheHitRate: (this.metrics.cacheHits + this.metrics.cacheMisses) > 0 ?
        (this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses)) * 100 : 0,
      circuitBreakerState: this.circuitBreaker.state,
      websocketConnected: this.websocket?.readyState === WebSocket.OPEN
    }
  }

  // Health check
  async healthCheck() {
    try {
      const health = await this.getSystemHealth()
      return {
        status: 'healthy',
        backend: health,
        metrics: this.getMetrics()
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        metrics: this.getMetrics()
      }
    }
  }
}

export default new EnterpriseBackendService()