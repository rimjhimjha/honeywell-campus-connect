// Camera discovery and connection service
class CameraDiscoveryService {
  constructor() {
    this.discoveredDevices = new Map()
    this.activeConnections = new Map()
    this.scanCallbacks = new Set()
  }

  // Device Camera Discovery
  async discoverDeviceCameras() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = devices.filter(device => device.kind === 'videoinput')
      
      const cameras = await Promise.all(
        videoDevices.map(async (device, index) => {
          const capabilities = await this.getDeviceCapabilities(device.deviceId)
          
          return {
            id: device.deviceId || `device_${index}`,
            name: device.label || `Camera ${index + 1}`,
            type: 'webcam',
            status: 'available',
            deviceId: device.deviceId,
            capabilities: this.formatCapabilities(capabilities),
            connection: 'USB/Built-in',
            resolutions: capabilities?.width ? this.getResolutionOptions(capabilities) : ['1920x1080'],
            frameRates: capabilities?.frameRate ? this.getFrameRateOptions(capabilities) : [30]
          }
        })
      )
      
      return cameras
    } catch (error) {
      console.error('Failed to discover device cameras:', error)
      return []
    }
  }

  async getDeviceCapabilities(deviceId) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId } }
      })
      
      const track = stream.getVideoTracks()[0]
      const capabilities = track.getCapabilities()
      
      // Clean up
      stream.getTracks().forEach(track => track.stop())
      
      return capabilities
    } catch (error) {
      console.error('Failed to get device capabilities:', error)
      return {}
    }
  }

  formatCapabilities(capabilities) {
    const features = []
    
    if (capabilities.width?.max >= 1920) features.push('HD')
    if (capabilities.width?.max >= 3840) features.push('4K')
    if (capabilities.frameRate?.max >= 60) features.push('60fps')
    if (capabilities.facingMode?.includes('environment')) features.push('Rear Camera')
    if (capabilities.torch) features.push('Flash')
    if (capabilities.zoom) features.push('Zoom')
    
    return features.length > 0 ? features.join(', ') : 'Basic Video'
  }

  getResolutionOptions(capabilities) {
    const resolutions = []
    const maxWidth = capabilities.width?.max || 1920
    
    if (maxWidth >= 3840) resolutions.push('3840x2160')
    if (maxWidth >= 1920) resolutions.push('1920x1080')
    if (maxWidth >= 1280) resolutions.push('1280x720')
    resolutions.push('640x480')
    
    return resolutions
  }

  getFrameRateOptions(capabilities) {
    const maxFps = capabilities.frameRate?.max || 30
    const frameRates = []
    
    if (maxFps >= 60) frameRates.push(60)
    if (maxFps >= 30) frameRates.push(30)
    if (maxFps >= 24) frameRates.push(24)
    frameRates.push(15)
    
    return frameRates
  }

  // WiFi Camera Discovery
  async discoverWiFiCameras() {
    // Simulate network scanning for IP cameras
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockCameras = [
          {
            id: 'wifi_cam_1',
            name: 'Living Room Camera',
            type: 'wifi',
            ip: '192.168.1.100',
            status: 'available',
            brand: 'Generic WiFi',
            capabilities: '1080p, Night Vision, Motion Detection',
            connection: 'WiFi 2.4GHz',
            signal: 85,
            encryption: 'WPA2'
          },
          {
            id: 'wifi_cam_2',
            name: 'Outdoor Security Cam',
            type: 'wifi',
            ip: '192.168.1.101',
            status: 'available',
            brand: 'SecureCam Pro',
            capabilities: '4K, Weatherproof, IR Night Vision',
            connection: 'WiFi 5GHz',
            signal: 92,
            encryption: 'WPA3'
          },
          {
            id: 'wifi_cam_3',
            name: 'Doorbell Camera',
            type: 'wifi',
            ip: '192.168.1.102',
            status: 'available',
            brand: 'SmartBell',
            capabilities: '1080p, Two-way Audio, PIR Sensor',
            connection: 'WiFi 2.4GHz',
            signal: 78,
            encryption: 'WPA2'
          }
        ]
        resolve(mockCameras)
      }, 2000)
    })
  }

  // Bluetooth Camera Discovery
  async discoverBluetoothCameras() {
    try {
      if (!navigator.bluetooth) {
        throw new Error('Bluetooth not supported in this browser')
      }
      
      const devices = []
      
      try {
        const device = await navigator.bluetooth.requestDevice({
          acceptAllDevices: true,
          optionalServices: ['battery_service', 'device_information']
        })
        
        devices.push({
          id: device.id,
          name: device.name || 'Bluetooth Camera',
          type: 'bluetooth',
          status: 'available',
          deviceId: device.id,
          capabilities: 'HD Video, Low Power, Wireless',
          connection: 'Bluetooth LE',
          batteryLevel: Math.floor(Math.random() * 100),
          paired: false
        })
      } catch (error) {
        console.log('User cancelled Bluetooth device selection')
      }
      
      // Add mock Bluetooth cameras for demo
      const mockDevices = [
        {
          id: 'bt_cam_1',
          name: 'Bluetooth Security Cam',
          type: 'bluetooth',
          status: 'available',
          capabilities: 'HD Video, Low Power, Motion Detection',
          connection: 'Bluetooth LE',
          batteryLevel: 85,
          paired: false
        },
        {
          id: 'bt_cam_2',
          name: 'Portable Action Cam',
          type: 'bluetooth',
          status: 'available',
          capabilities: '4K Video, Waterproof, Voice Control',
          connection: 'Bluetooth 5.0',
          batteryLevel: 62,
          paired: false
        }
      ]
      
      return [...devices, ...mockDevices]
    } catch (error) {
      console.error('Bluetooth discovery failed:', error)
      return []
    }
  }

  // Wired Camera Discovery
  async discoverWiredCameras() {
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockCameras = [
          {
            id: 'usb_cam_1',
            name: 'USB Security Camera',
            type: 'wired',
            status: 'available',
            interface: 'USB 3.0',
            capabilities: '1080p, Auto-focus, Low-light',
            connection: 'USB',
            vendor: 'TechCam',
            model: 'TC-1080P'
          },
          {
            id: 'eth_cam_1',
            name: 'Ethernet IP Camera',
            type: 'wired',
            ip: '192.168.1.50',
            status: 'available',
            capabilities: '4K, PoE, Pan/Tilt/Zoom',
            connection: 'Ethernet',
            vendor: 'NetVision',
            model: 'NV-4K-PTZ'
          },
          {
            id: 'usb_cam_2',
            name: 'USB Webcam Pro',
            type: 'wired',
            status: 'available',
            interface: 'USB 2.0',
            capabilities: '1080p, Auto-focus, Noise Reduction',
            connection: 'USB',
            vendor: 'WebCam Inc',
            model: 'WC-Pro-1080'
          }
        ]
        resolve(mockCameras)
      }, 1500)
    })
  }

  // RTSP Stream Discovery
  async discoverRTSPStreams() {
    // Common RTSP stream patterns and test URLs
    const commonStreams = [
      {
        id: 'rtsp_1',
        name: 'RTSP Stream 1',
        type: 'rtsp',
        url: 'rtsp://192.168.1.100:554/stream1',
        status: 'available',
        capabilities: 'H.264, 1080p, Real-time',
        connection: 'RTSP/TCP',
        codec: 'H.264',
        bitrate: '2 Mbps'
      },
      {
        id: 'rtsp_2',
        name: 'Security Camera Feed',
        type: 'rtsp',
        url: 'rtsp://192.168.1.101:554/live',
        status: 'available',
        capabilities: 'H.265, 4K, Low Latency',
        connection: 'RTSP/UDP',
        codec: 'H.265',
        bitrate: '8 Mbps'
      },
      {
        id: 'rtsp_3',
        name: 'NVR Channel 1',
        type: 'rtsp',
        url: 'rtsp://192.168.1.200:554/ch1',
        status: 'available',
        capabilities: 'H.264, 720p, Multi-stream',
        connection: 'RTSP/TCP',
        codec: 'H.264',
        bitrate: '1 Mbps'
      }
    ]
    
    return new Promise((resolve) => {
      setTimeout(() => resolve(commonStreams), 1000)
    })
  }

  // Connection Management
  async connectToCamera(camera, options = {}) {
    try {
      let connection = null
      
      switch (camera.type) {
        case 'webcam':
          connection = await this.connectWebcam(camera, options)
          break
        case 'wifi':
          connection = await this.connectWiFiCamera(camera, options)
          break
        case 'bluetooth':
          connection = await this.connectBluetoothCamera(camera, options)
          break
        case 'wired':
          connection = await this.connectWiredCamera(camera, options)
          break
        case 'rtsp':
          connection = await this.connectRTSPStream(camera, options)
          break
        default:
          throw new Error(`Unsupported camera type: ${camera.type}`)
      }
      
      this.activeConnections.set(camera.id, connection)
      return connection
    } catch (error) {
      console.error(`Failed to connect to ${camera.type} camera:`, error)
      throw error
    }
  }

  async connectWebcam(camera, options) {
    const constraints = {
      video: {
        deviceId: camera.deviceId ? { exact: camera.deviceId } : undefined,
        width: { ideal: options.width || 1920 },
        height: { ideal: options.height || 1080 },
        frameRate: { ideal: options.frameRate || 30 }
      },
      audio: options.audio || false
    }
    
    const stream = await navigator.mediaDevices.getUserMedia(constraints)
    
    return {
      type: 'webcam',
      stream,
      camera,
      disconnect: () => {
        stream.getTracks().forEach(track => track.stop())
        this.activeConnections.delete(camera.id)
      }
    }
  }

  async connectWiFiCamera(camera, options) {
    // Simulate WiFi camera connection
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          type: 'wifi',
          camera,
          streamUrl: `http://${camera.ip}/stream`,
          disconnect: () => {
            this.activeConnections.delete(camera.id)
          }
        })
      }, 2000)
    })
  }

  async connectBluetoothCamera(camera, options) {
    // Simulate Bluetooth camera connection
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          type: 'bluetooth',
          camera,
          connected: true,
          disconnect: () => {
            this.activeConnections.delete(camera.id)
          }
        })
      }, 3000)
    })
  }

  async connectWiredCamera(camera, options) {
    // Simulate wired camera connection
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          type: 'wired',
          camera,
          streamUrl: camera.ip ? `http://${camera.ip}/stream` : '/dev/video0',
          disconnect: () => {
            this.activeConnections.delete(camera.id)
          }
        })
      }, 1000)
    })
  }

  async connectRTSPStream(camera, options) {
    // Simulate RTSP stream connection
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          type: 'rtsp',
          camera,
          streamUrl: camera.url,
          disconnect: () => {
            this.activeConnections.delete(camera.id)
          }
        })
      }, 1500)
    })
  }

  // Utility Methods
  getActiveConnections() {
    return Array.from(this.activeConnections.values())
  }

  disconnectCamera(cameraId) {
    const connection = this.activeConnections.get(cameraId)
    if (connection && connection.disconnect) {
      connection.disconnect()
    }
  }

  disconnectAll() {
    this.activeConnections.forEach(connection => {
      if (connection.disconnect) {
        connection.disconnect()
      }
    })
    this.activeConnections.clear()
  }

  // Network utilities for IP camera discovery
  async scanNetworkRange(baseIP = '192.168.1', startRange = 1, endRange = 254) {
    const promises = []
    
    for (let i = startRange; i <= endRange; i++) {
      const ip = `${baseIP}.${i}`
      promises.push(this.pingIP(ip))
    }
    
    const results = await Promise.allSettled(promises)
    return results
      .filter(result => result.status === 'fulfilled' && result.value)
      .map(result => result.value)
  }

  async pingIP(ip) {
    try {
      const response = await fetch(`http://${ip}:80`, {
        method: 'HEAD',
        mode: 'no-cors',
        timeout: 1000
      })
      return ip
    } catch (error) {
      return null
    }
  }
}

export default new CameraDiscoveryService()