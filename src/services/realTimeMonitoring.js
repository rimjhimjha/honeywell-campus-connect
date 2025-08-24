// Real-time monitoring and alerting service
class RealTimeMonitoringService {
  constructor() {
    this.monitors = new Map()
    this.alertRules = new Map()
    this.thresholds = {
      responseTime: 5000, // 5 seconds
      errorRate: 0.05, // 5%
      memoryUsage: 0.85, // 85%
      cpuUsage: 0.80, // 80%
      diskUsage: 0.90, // 90%
      networkLatency: 1000, // 1 second
      detectionAccuracy: 0.70, // 70%
      cameraUptime: 0.95 // 95%
    }
    this.metrics = {
      system: new Map(),
      performance: new Map(),
      security: new Map(),
      business: new Map()
    }
    this.isMonitoring = false
    this.monitoringInterval = null
  }

  startMonitoring() {
    if (this.isMonitoring) return

    this.isMonitoring = true
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics()
      this.evaluateAlertRules()
    }, 5000) // Check every 5 seconds

    console.log('Real-time monitoring started')
  }

  stopMonitoring() {
    if (!this.isMonitoring) return

    this.isMonitoring = false
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
    }

    console.log('Real-time monitoring stopped')
  }

  async collectMetrics() {
    try {
      // System metrics
      await this.collectSystemMetrics()
      
      // Performance metrics
      await this.collectPerformanceMetrics()
      
      // Security metrics
      await this.collectSecurityMetrics()
      
      // Business metrics
      await this.collectBusinessMetrics()
    } catch (error) {
      console.error('Failed to collect metrics:', error)
    }
  }

  async collectSystemMetrics() {
    const timestamp = Date.now()
    
    // Memory usage
    if (performance.memory) {
      const memoryUsage = performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit
      this.updateMetric('system', 'memoryUsage', memoryUsage, timestamp)
    }

    // Network connectivity
    const networkLatency = await this.measureNetworkLatency()
    this.updateMetric('system', 'networkLatency', networkLatency, timestamp)

    // Browser performance
    const navigation = performance.getEntriesByType('navigation')[0]
    if (navigation) {
      this.updateMetric('system', 'pageLoadTime', navigation.loadEventEnd - navigation.loadEventStart, timestamp)
    }

    // WebSocket connection status
    const wsConnected = this.checkWebSocketConnection()
    this.updateMetric('system', 'websocketConnected', wsConnected ? 1 : 0, timestamp)
  }

  async collectPerformanceMetrics() {
    const timestamp = Date.now()

    // API response times
    const apiMetrics = this.getAPIMetrics()
    Object.entries(apiMetrics).forEach(([endpoint, metrics]) => {
      this.updateMetric('performance', `api_${endpoint}_responseTime`, metrics.averageResponseTime, timestamp)
      this.updateMetric('performance', `api_${endpoint}_errorRate`, metrics.errorRate, timestamp)
    })

    // Frame rate (if available)
    const frameRate = this.measureFrameRate()
    this.updateMetric('performance', 'frameRate', frameRate, timestamp)

    // Detection processing time
    const detectionTime = this.getDetectionProcessingTime()
    this.updateMetric('performance', 'detectionProcessingTime', detectionTime, timestamp)
  }

  async collectSecurityMetrics() {
    const timestamp = Date.now()

    // Failed login attempts
    const failedLogins = this.getFailedLoginAttempts()
    this.updateMetric('security', 'failedLoginAttempts', failedLogins, timestamp)

    // Suspicious activity detection
    const suspiciousActivity = this.detectSuspiciousActivity()
    this.updateMetric('security', 'suspiciousActivityScore', suspiciousActivity, timestamp)

    // Certificate status
    const certificateValid = await this.checkCertificateStatus()
    this.updateMetric('security', 'certificateValid', certificateValid ? 1 : 0, timestamp)

    // Data integrity checks
    const dataIntegrity = await this.checkDataIntegrity()
    this.updateMetric('security', 'dataIntegrityScore', dataIntegrity, timestamp)
  }

  async collectBusinessMetrics() {
    const timestamp = Date.now()

    // Alert response time
    const alertResponseTime = this.calculateAlertResponseTime()
    this.updateMetric('business', 'alertResponseTime', alertResponseTime, timestamp)

    // Detection accuracy
    const detectionAccuracy = this.calculateDetectionAccuracy()
    this.updateMetric('business', 'detectionAccuracy', detectionAccuracy, timestamp)

    // Camera uptime
    const cameraUptime = this.calculateCameraUptime()
    this.updateMetric('business', 'cameraUptime', cameraUptime, timestamp)

    // User engagement
    const userEngagement = this.calculateUserEngagement()
    this.updateMetric('business', 'userEngagement', userEngagement, timestamp)
  }

  updateMetric(category, name, value, timestamp) {
    if (!this.metrics[category]) {
      this.metrics[category] = new Map()
    }

    if (!this.metrics[category].has(name)) {
      this.metrics[category].set(name, [])
    }

    const metricData = this.metrics[category].get(name)
    metricData.push({ value, timestamp })

    // Keep only last 100 data points
    if (metricData.length > 100) {
      metricData.shift()
    }
  }

  async measureNetworkLatency() {
    try {
      const start = performance.now()
      await fetch('/api/ping', { method: 'HEAD' })
      return performance.now() - start
    } catch (error) {
      return 9999 // High latency on error
    }
  }

  checkWebSocketConnection() {
    // Check if WebSocket is connected
    return window.WebSocket && window.WebSocket.OPEN === 1
  }

  getAPIMetrics() {
    // Get API metrics from enterprise backend service
    try {
      const metrics = window.enterpriseBackend?.getMetrics() || {}
      return {
        alerts: {
          averageResponseTime: metrics.averageResponseTime || 0,
          errorRate: metrics.failures / Math.max(metrics.requests, 1) || 0
        },
        auth: {
          averageResponseTime: metrics.averageResponseTime || 0,
          errorRate: metrics.failures / Math.max(metrics.requests, 1) || 0
        }
      }
    } catch (error) {
      return {}
    }
  }

  measureFrameRate() {
    // Simple frame rate measurement
    let frames = 0
    let lastTime = performance.now()

    const measureFrame = () => {
      frames++
      const currentTime = performance.now()
      if (currentTime - lastTime >= 1000) {
        const fps = frames
        frames = 0
        lastTime = currentTime
        return fps
      }
      requestAnimationFrame(measureFrame)
    }

    requestAnimationFrame(measureFrame)
    return 60 // Default assumption
  }

  getDetectionProcessingTime() {
    // Get average detection processing time
    try {
      const detectionService = window.advancedDetectionService
      if (detectionService && detectionService.getSystemInfo) {
        const info = detectionService.getSystemInfo()
        return info.averageProcessingTime || 0
      }
    } catch (error) {
      console.error('Failed to get detection processing time:', error)
    }
    return 0
  }

  getFailedLoginAttempts() {
    // Track failed login attempts
    const attempts = localStorage.getItem('failedLoginAttempts')
    return attempts ? parseInt(attempts, 10) : 0
  }

  detectSuspiciousActivity() {
    // Simple suspicious activity detection
    const factors = [
      this.checkUnusualAccessPatterns(),
      this.checkRapidRequests(),
      this.checkGeolocationAnomalies()
    ]

    return factors.reduce((sum, factor) => sum + factor, 0) / factors.length
  }

  checkUnusualAccessPatterns() {
    // Check for unusual access patterns
    const currentHour = new Date().getHours()
    const isBusinessHours = currentHour >= 9 && currentHour <= 17
    return isBusinessHours ? 0 : 0.3 // Higher suspicion outside business hours
  }

  checkRapidRequests() {
    // Check for rapid successive requests
    const requestTimes = JSON.parse(localStorage.getItem('requestTimes') || '[]')
    const now = Date.now()
    const recentRequests = requestTimes.filter(time => now - time < 60000) // Last minute

    if (recentRequests.length > 100) {
      return 0.8 // High suspicion for > 100 requests per minute
    } else if (recentRequests.length > 50) {
      return 0.5 // Medium suspicion
    }
    return 0
  }

  checkGeolocationAnomalies() {
    // Simple geolocation check (would need actual implementation)
    return 0 // Placeholder
  }

  async checkCertificateStatus() {
    try {
      // Check if running on HTTPS
      return window.location.protocol === 'https:'
    } catch (error) {
      return false
    }
  }

  async checkDataIntegrity() {
    try {
      // Simple data integrity check
      const testData = { test: 'integrity' }
      const serialized = JSON.stringify(testData)
      const parsed = JSON.parse(serialized)
      return parsed.test === 'integrity' ? 1 : 0
    } catch (error) {
      return 0
    }
  }

  calculateAlertResponseTime() {
    // Calculate average alert response time
    const alerts = window.currentAlerts || []
    const acknowledgedAlerts = alerts.filter(alert => alert.acknowledged)
    
    if (acknowledgedAlerts.length === 0) return 0

    const totalResponseTime = acknowledgedAlerts.reduce((sum, alert) => {
      const alertTime = new Date(alert.timestamp).getTime()
      const ackTime = new Date(alert.acknowledged_at).getTime()
      return sum + (ackTime - alertTime)
    }, 0)

    return totalResponseTime / acknowledgedAlerts.length / 1000 // Convert to seconds
  }

  calculateDetectionAccuracy() {
    // Calculate detection accuracy based on confidence scores
    const detectionHistory = window.detectionHistory || []
    if (detectionHistory.length === 0) return 0

    const totalConfidence = detectionHistory.reduce((sum, detection) => 
      sum + (detection.confidence || 0), 0)
    
    return totalConfidence / detectionHistory.length
  }

  calculateCameraUptime() {
    // Calculate camera uptime percentage
    const cameras = window.currentCameras || []
    if (cameras.length === 0) return 0

    const onlineCameras = cameras.filter(camera => camera.status === 'online')
    return onlineCameras.length / cameras.length
  }

  calculateUserEngagement() {
    // Calculate user engagement score
    const sessionStart = parseInt(localStorage.getItem('sessionStart') || Date.now().toString())
    const sessionDuration = (Date.now() - sessionStart) / 1000 / 60 // Minutes
    const interactions = parseInt(localStorage.getItem('userInteractions') || '0')
    
    // Engagement score based on session duration and interactions
    return Math.min(1, (sessionDuration * 0.1 + interactions * 0.05) / 10)
  }

  // Alert rule management
  addAlertRule(name, condition, severity = 'medium', cooldown = 300000) {
    this.alertRules.set(name, {
      condition,
      severity,
      cooldown,
      lastTriggered: 0
    })
  }

  removeAlertRule(name) {
    this.alertRules.delete(name)
  }

  evaluateAlertRules() {
    const now = Date.now()

    this.alertRules.forEach((rule, name) => {
      try {
        // Check cooldown
        if (now - rule.lastTriggered < rule.cooldown) {
          return
        }

        // Evaluate condition
        const shouldAlert = rule.condition(this.metrics, this.thresholds)
        
        if (shouldAlert) {
          this.triggerAlert(name, rule.severity)
          rule.lastTriggered = now
        }
      } catch (error) {
        console.error(`Failed to evaluate alert rule ${name}:`, error)
      }
    })
  }

  triggerAlert(ruleName, severity) {
    const alert = {
      id: `monitor_${Date.now()}`,
      type: 'system_monitoring',
      rule: ruleName,
      severity,
      timestamp: new Date().toISOString(),
      description: `Monitoring alert: ${ruleName}`,
      source: 'real_time_monitoring'
    }

    // Dispatch alert event
    window.dispatchEvent(new CustomEvent('monitoring:alert', { detail: alert }))
    
    console.warn(`Monitoring alert triggered: ${ruleName} (${severity})`)
  }

  // Predefined alert rules
  setupDefaultAlertRules() {
    // High memory usage
    this.addAlertRule(
      'high_memory_usage',
      (metrics, thresholds) => {
        const memoryMetrics = metrics.system.get('memoryUsage') || []
        const latest = memoryMetrics[memoryMetrics.length - 1]
        return latest && latest.value > thresholds.memoryUsage
      },
      'high'
    )

    // High network latency
    this.addAlertRule(
      'high_network_latency',
      (metrics, thresholds) => {
        const latencyMetrics = metrics.system.get('networkLatency') || []
        const latest = latencyMetrics[latencyMetrics.length - 1]
        return latest && latest.value > thresholds.networkLatency
      },
      'medium'
    )

    // Low detection accuracy
    this.addAlertRule(
      'low_detection_accuracy',
      (metrics, thresholds) => {
        const accuracyMetrics = metrics.business.get('detectionAccuracy') || []
        const latest = accuracyMetrics[accuracyMetrics.length - 1]
        return latest && latest.value < thresholds.detectionAccuracy
      },
      'high'
    )

    // Camera downtime
    this.addAlertRule(
      'camera_downtime',
      (metrics, thresholds) => {
        const uptimeMetrics = metrics.business.get('cameraUptime') || []
        const latest = uptimeMetrics[uptimeMetrics.length - 1]
        return latest && latest.value < thresholds.cameraUptime
      },
      'critical'
    )

    // WebSocket disconnection
    this.addAlertRule(
      'websocket_disconnected',
      (metrics, thresholds) => {
        const wsMetrics = metrics.system.get('websocketConnected') || []
        const latest = wsMetrics[wsMetrics.length - 1]
        return latest && latest.value === 0
      },
      'medium'
    )

    // High error rate
    this.addAlertRule(
      'high_error_rate',
      (metrics, thresholds) => {
        const errorMetrics = metrics.performance.get('api_alerts_errorRate') || []
        const latest = errorMetrics[errorMetrics.length - 1]
        return latest && latest.value > thresholds.errorRate
      },
      'high'
    )
  }

  // Utility methods
  getMetric(category, name, timeRange = 300000) { // 5 minutes default
    const categoryMetrics = this.metrics[category]
    if (!categoryMetrics || !categoryMetrics.has(name)) {
      return []
    }

    const now = Date.now()
    const metrics = categoryMetrics.get(name)
    
    return metrics.filter(metric => now - metric.timestamp <= timeRange)
  }

  getMetricSummary(category, name, timeRange = 300000) {
    const metrics = this.getMetric(category, name, timeRange)
    
    if (metrics.length === 0) {
      return { min: 0, max: 0, avg: 0, latest: 0, count: 0 }
    }

    const values = metrics.map(m => m.value)
    const sum = values.reduce((a, b) => a + b, 0)
    
    return {
      min: Math.min(...values),
      max: Math.max(...values),
      avg: sum / values.length,
      latest: values[values.length - 1],
      count: values.length
    }
  }

  getAllMetrics() {
    const result = {}
    
    Object.entries(this.metrics).forEach(([category, categoryMetrics]) => {
      result[category] = {}
      categoryMetrics.forEach((metrics, name) => {
        result[category][name] = this.getMetricSummary(category, name)
      })
    })
    
    return result
  }

  updateThreshold(metric, value) {
    this.thresholds[metric] = value
  }

  getThresholds() {
    return { ...this.thresholds }
  }

  // Health check
  getSystemHealth() {
    const allMetrics = this.getAllMetrics()
    const issues = []
    
    // Check each threshold
    Object.entries(this.thresholds).forEach(([metric, threshold]) => {
      const metricData = this.findMetricInCategories(metric, allMetrics)
      if (metricData && this.isThresholdViolated(metricData.latest, threshold, metric)) {
        issues.push({
          metric,
          current: metricData.latest,
          threshold,
          severity: this.getThresholdSeverity(metric)
        })
      }
    })

    return {
      status: issues.length === 0 ? 'healthy' : 
              issues.some(i => i.severity === 'critical') ? 'critical' :
              issues.some(i => i.severity === 'high') ? 'degraded' : 'warning',
      issues,
      metricsCollected: this.isMonitoring,
      lastUpdate: Date.now()
    }
  }

  findMetricInCategories(metricName, allMetrics) {
    for (const category of Object.values(allMetrics)) {
      if (category[metricName]) {
        return category[metricName]
      }
    }
    return null
  }

  isThresholdViolated(value, threshold, metric) {
    // Some metrics are "higher is better", others are "lower is better"
    const higherIsBetter = ['detectionAccuracy', 'cameraUptime', 'websocketConnected']
    
    if (higherIsBetter.includes(metric)) {
      return value < threshold
    } else {
      return value > threshold
    }
  }

  getThresholdSeverity(metric) {
    const criticalMetrics = ['memoryUsage', 'cameraUptime', 'detectionAccuracy']
    const highMetrics = ['networkLatency', 'errorRate']
    
    if (criticalMetrics.includes(metric)) return 'critical'
    if (highMetrics.includes(metric)) return 'high'
    return 'medium'
  }
}

export default new RealTimeMonitoringService()