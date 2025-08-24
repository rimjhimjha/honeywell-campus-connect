// API service for real backend communication
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

class ApiService {
  constructor() {
    this.token = localStorage.getItem('auth_token')
  }

  setAuthToken(token) {
    this.token = token
    if (token) {
      localStorage.setItem('auth_token', token)
    } else {
      localStorage.removeItem('auth_token')
    }
  }

  getAuthHeaders() {
    return {
      'Content-Type': 'application/json',
      ...(this.token && { 'Authorization': `Bearer ${this.token}` })
    }
  }

  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`
    const config = {
      headers: this.getAuthHeaders(),
      ...options
    }

    try {
      console.log(`Making API request to: ${url}`)
      const response = await fetch(url, config)
      
      if (response.status === 401) {
        console.log('Unauthorized - clearing token')
        this.setAuthToken(null)
        throw new Error('Authentication required')
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log(`API response from ${endpoint}:`, data)
      return data
    } catch (error) {
      console.error('API request failed:', error)
      
      // Provide more helpful error information for development
      if (error.message === 'Failed to fetch') {
        console.error('Network error - check if backend is running and accessible')
        console.error(`Attempting to connect to: ${url}`)
        console.error('Make sure to run: python start_simple.py')
      }
      throw error
    }
  }

  // Authentication
  async login(username, password) {
    console.log(`Attempting login for user: ${username}`)
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    })
    
    if (response?.access_token) {
      console.log('Login successful, setting token')
      this.setAuthToken(response.access_token)
    }
    
    return response
  }

  async getCurrentUser() {
    return this.request('/auth/me')
  }

  // System Status
  async getSystemHealth() {
    return this.request('/health')
  }

  // Alerts
  async getAlerts(params = {}) {
    const queryString = new URLSearchParams(params).toString()
    return this.request(`/alerts?${queryString}`)
  }

  async acknowledgeAlert(alertId) {
    return this.request(`/alerts/${alertId}/acknowledge`, {
      method: 'POST',
      body: JSON.stringify({ alert_id: alertId })
    })
  }

  async clearAllAlerts() {
    return this.request('/alerts', {
      method: 'DELETE'
    })
  }

  async getAlertStats(hours = 24) {
    return this.request(`/alerts/stats?hours=${hours}`)
  }

  // Test functionality
  async sendTestAlert() {
    return this.request('/test-alert', {
      method: 'POST'
    })
  }

  // Settings (mock for now)
  async getSettings() {
    return {
      detection: {
        confidenceThreshold: 0.6,
        crowdThreshold: 10
      },
      alerts: {
        enableSMS: true,
        enableEmail: true
      }
    }
  }

  async updateSettings(settings) {
    console.log('Settings updated:', settings)
    return { success: true }
  }

  // Camera management (mock for now)
  async getCameras() {
    return [
      {
        id: 1,
        name: 'Main Entrance',
        location: 'Building A',
        status: 'online',
        type: 'webcam',
        resolution: '1920x1080',
        fps: 30
      },
      {
        id: 2,
        name: 'Playground Area',
        location: 'Outdoor Zone',
        status: 'online',
        type: 'ip',
        resolution: '1280x720',
        fps: 24
      }
    ]
  }

  getCameraStream(cameraId) {
    return `${API_BASE_URL}/cameras/${cameraId}/stream`
  }

  async updateCameraSettings(cameraId, settings) {
    console.log(`Camera ${cameraId} settings updated:`, settings)
    return { success: true }
  }
}

export default new ApiService()