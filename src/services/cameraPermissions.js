// Camera permissions and error handling service
class CameraPermissionsService {
  constructor() {
    this.permissionStatus = 'unknown'
    this.lastError = null
    this.permissionCallbacks = new Set()
  }

  async checkPermissions() {
    try {
      // Check if permissions API is available
      if (navigator.permissions && navigator.permissions.query) {
        const permission = await navigator.permissions.query({ name: 'camera' })
        this.permissionStatus = permission.state
        
        // Listen for permission changes
        permission.addEventListener('change', () => {
          this.permissionStatus = permission.state
          this.notifyPermissionChange()
        })
        
        return permission.state
      } else {
        // Fallback: try to access camera to check permissions
        return await this.testCameraAccess()
      }
    } catch (error) {
      console.error('Permission check failed:', error)
      this.permissionStatus = 'denied'
      return 'denied'
    }
  }

  async testCameraAccess() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: false 
      })
      
      // Clean up immediately
      stream.getTracks().forEach(track => track.stop())
      
      this.permissionStatus = 'granted'
      return 'granted'
    } catch (error) {
      this.lastError = error
      
      if (error.name === 'NotAllowedError') {
        this.permissionStatus = 'denied'
        return 'denied'
      } else if (error.name === 'NotFoundError') {
        this.permissionStatus = 'no-devices'
        return 'no-devices'
      } else {
        this.permissionStatus = 'error'
        return 'error'
      }
    }
  }

  async requestPermissions() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: false 
      })
      
      // Clean up
      stream.getTracks().forEach(track => track.stop())
      
      this.permissionStatus = 'granted'
      this.notifyPermissionChange()
      
      return { success: true, status: 'granted' }
    } catch (error) {
      this.lastError = error
      
      let status = 'denied'
      let message = 'Camera access denied'
      
      switch (error.name) {
        case 'NotAllowedError':
          status = 'denied'
          message = 'Camera access denied by user. Please allow camera access in your browser settings.'
          break
        case 'NotFoundError':
          status = 'no-devices'
          message = 'No camera devices found on this system.'
          break
        case 'NotSupportedError':
          status = 'not-supported'
          message = 'Camera access is not supported in this browser.'
          break
        case 'NotReadableError':
          status = 'hardware-error'
          message = 'Camera is already in use by another application.'
          break
        case 'OverconstrainedError':
          status = 'constraints-error'
          message = 'Camera does not support the requested constraints.'
          break
        case 'SecurityError':
          status = 'security-error'
          message = 'Camera access blocked due to security restrictions.'
          break
        default:
          status = 'error'
          message = `Camera access failed: ${error.message}`
      }
      
      this.permissionStatus = status
      this.notifyPermissionChange()
      
      return { success: false, status, message, error }
    }
  }

  getPermissionStatus() {
    return this.permissionStatus
  }

  getLastError() {
    return this.lastError
  }

  onPermissionChange(callback) {
    this.permissionCallbacks.add(callback)
    return () => this.permissionCallbacks.delete(callback)
  }

  notifyPermissionChange() {
    this.permissionCallbacks.forEach(callback => {
      try {
        callback(this.permissionStatus)
      } catch (error) {
        console.error('Permission callback error:', error)
      }
    })
  }

  getPermissionInstructions() {
    const userAgent = navigator.userAgent.toLowerCase()
    
    if (userAgent.includes('chrome')) {
      return {
        browser: 'Chrome',
        steps: [
          'Click the camera icon in the address bar',
          'Select "Always allow" for camera access',
          'Refresh the page'
        ]
      }
    } else if (userAgent.includes('firefox')) {
      return {
        browser: 'Firefox',
        steps: [
          'Click the shield icon in the address bar',
          'Click "Allow" for camera permissions',
          'Refresh the page'
        ]
      }
    } else if (userAgent.includes('safari')) {
      return {
        browser: 'Safari',
        steps: [
          'Go to Safari > Preferences > Websites',
          'Select Camera from the left sidebar',
          'Set this website to "Allow"',
          'Refresh the page'
        ]
      }
    } else if (userAgent.includes('edge')) {
      return {
        browser: 'Edge',
        steps: [
          'Click the camera icon in the address bar',
          'Select "Allow" for camera access',
          'Refresh the page'
        ]
      }
    } else {
      return {
        browser: 'Your browser',
        steps: [
          'Look for a camera icon in the address bar',
          'Allow camera access when prompted',
          'Refresh the page if needed'
        ]
      }
    }
  }

  async diagnoseIssues() {
    const diagnosis = {
      browserSupport: this.checkBrowserSupport(),
      httpsRequired: this.checkHTTPS(),
      permissionStatus: this.permissionStatus,
      lastError: this.lastError,
      recommendations: []
    }

    // Add recommendations based on diagnosis
    if (!diagnosis.browserSupport) {
      diagnosis.recommendations.push('Update your browser to a version that supports camera access')
    }

    if (!diagnosis.httpsRequired) {
      diagnosis.recommendations.push('Camera access requires HTTPS. Please use a secure connection.')
    }

    if (diagnosis.permissionStatus === 'denied') {
      diagnosis.recommendations.push('Camera access was denied. Please allow camera access in your browser settings.')
    }

    if (diagnosis.permissionStatus === 'no-devices') {
      diagnosis.recommendations.push('No camera devices were found. Please check that a camera is connected.')
    }

    return diagnosis
  }

  checkBrowserSupport() {
    return !!(
      navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia &&
      navigator.mediaDevices.enumerateDevices
    )
  }

  checkHTTPS() {
    return location.protocol === 'https:' || location.hostname === 'localhost'
  }

  getErrorMessage(error) {
    const errorMessages = {
      'NotAllowedError': 'Camera access denied. Please allow camera access and refresh the page.',
      'NotFoundError': 'No camera found. Please connect a camera and try again.',
      'NotSupportedError': 'Camera access not supported in this browser.',
      'NotReadableError': 'Camera is busy or unavailable. Please close other applications using the camera.',
      'OverconstrainedError': 'Camera settings not supported. Try different resolution or frame rate.',
      'SecurityError': 'Camera access blocked for security reasons.',
      'AbortError': 'Camera access was interrupted.',
      'TypeError': 'Invalid camera configuration.'
    }

    return errorMessages[error.name] || `Camera error: ${error.message}`
  }
}

export default new CameraPermissionsService()