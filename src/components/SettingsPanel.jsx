import React, { useState, useEffect } from 'react'
import { Settings, Camera, Bell, Shield, Users, Database, Wifi, AlertTriangle, Save, RefreshCw } from 'lucide-react'
import SupabaseService from '../services/supabase'

const SettingsPanel = () => {
  const [activeSection, setActiveSection] = useState('detection')
  const [settings, setSettings] = useState({
    detection: {
      confidenceThreshold: 0.6,
      crowdThreshold: 10,
      frameSkip: 2,
      enableFightDetection: true,
      enableFallDetection: true,
      enableCrowdDetection: true,
      enableLoiteringDetection: true,
    },
    alerts: {
      enableSMS: true,
      enableEmail: true,
      enablePushNotifications: true,
      alertCooldown: 30,
      smsNumbers: '+1234567890, +0987654321',
      emailAddresses: 'admin@example.com, security@example.com',
    },
    cameras: {
      resolution: '1920x1080',
      frameRate: 30,
      nightVision: true,
      motionDetection: true,
      recordingEnabled: false,
      storageLocation: '/recordings',
    },
    system: {
      autoBackup: true,
      backupInterval: 24,
      logLevel: 'INFO',
      maxLogSize: 100,
      enableAnalytics: true,
      dataRetention: 30,
    }
  })
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      // In a real implementation, you would load settings from Supabase
      // For now, we'll use the default settings
      console.log('Settings loaded')
    } catch (error) {
      console.error('Failed to load settings:', error)
    }
  }

  const sections = [
    { id: 'detection', label: 'Detection', icon: Shield },
    { id: 'alerts', label: 'Alerts', icon: Bell },
    { id: 'cameras', label: 'Cameras', icon: Camera },
    { id: 'system', label: 'System', icon: Settings },
  ]

  const handleSettingChange = (section, key, value) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    setSaveMessage('')
    
    try {
      // Save settings to Supabase
      await SupabaseService.createSystemLog(
        'INFO',
        'System settings updated',
        'settings',
        { settings }
      )
      
      setSaveMessage('Settings saved successfully!')
      setTimeout(() => setSaveMessage(''), 3000)
    } catch (error) {
      console.error('Failed to save settings:', error)
      setSaveMessage('Failed to save settings. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = async () => {
    if (confirm('Are you sure you want to reset all settings to default values?')) {
      try {
        // Reset to default values
        setSettings({
          detection: {
            confidenceThreshold: 0.6,
            crowdThreshold: 10,
            frameSkip: 2,
            enableFightDetection: true,
            enableFallDetection: true,
            enableCrowdDetection: true,
            enableLoiteringDetection: true,
          },
          alerts: {
            enableSMS: true,
            enableEmail: true,
            enablePushNotifications: true,
            alertCooldown: 30,
            smsNumbers: '+1234567890, +0987654321',
            emailAddresses: 'admin@example.com, security@example.com',
          },
          cameras: {
            resolution: '1920x1080',
            frameRate: 30,
            nightVision: true,
            motionDetection: true,
            recordingEnabled: false,
            storageLocation: '/recordings',
          },
          system: {
            autoBackup: true,
            backupInterval: 24,
            logLevel: 'INFO',
            maxLogSize: 100,
            enableAnalytics: true,
            dataRetention: 30,
          }
        })
        
        await SupabaseService.createSystemLog(
          'WARNING',
          'System settings reset to defaults',
          'settings'
        )
        
        setSaveMessage('Settings reset to defaults!')
        setTimeout(() => setSaveMessage(''), 3000)
      } catch (error) {
        console.error('Failed to reset settings:', error)
        setSaveMessage('Failed to reset settings.')
      }
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">System Settings</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Configure NigraniAI system parameters</p>
        </div>
        <div className="flex items-center space-x-4">
          {saveMessage && (
            <span className={`text-sm font-medium ${
              saveMessage.includes('success') ? 'text-success-600' : 'text-danger-600'
            }`}>
              {saveMessage}
            </span>
          )}
          <button onClick={handleReset} className="btn-secondary">
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset to Defaults
          </button>
          <button 
            onClick={handleSave} 
            disabled={isSaving}
            className="btn-primary disabled:opacity-50"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Settings Navigation */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Configuration</h2>
            </div>
            <div className="p-4 space-y-2">
              {sections.map((section) => {
                const Icon = section.icon
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                      activeSection === section.id
                        ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 border-r-2 border-primary-600'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="font-medium">{section.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Settings Content */}
        <div className="lg:col-span-3">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg">
            {/* Detection Settings */}
            {activeSection === 'detection' && (
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Detection Configuration</h3>
                
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Confidence Threshold
                      </label>
                      <input
                        type="range"
                        min="0.1"
                        max="1.0"
                        step="0.1"
                        value={settings.detection.confidenceThreshold}
                        onChange={(e) => handleSettingChange('detection', 'confidenceThreshold', parseFloat(e.target.value))}
                        className="w-full"
                      />
                      <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 mt-1">
                        <span>Low (0.1)</span>
                        <span className="font-medium">{settings.detection.confidenceThreshold}</span>
                        <span>High (1.0)</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Crowd Threshold
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={settings.detection.crowdThreshold}
                        onChange={(e) => handleSettingChange('detection', 'crowdThreshold', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Number of people to trigger overcrowding alert</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Frame Skip Rate
                    </label>
                    <select
                      value={settings.detection.frameSkip}
                      onChange={(e) => handleSettingChange('detection', 'frameSkip', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value={1}>Process every frame (High CPU)</option>
                      <option value={2}>Process every 2nd frame (Balanced)</option>
                      <option value={3}>Process every 3rd frame (Low CPU)</option>
                      <option value={5}>Process every 5th frame (Very Low CPU)</option>
                    </select>
                  </div>

                  <div>
                    <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Detection Types</h4>
                    <div className="space-y-3">
                      {[
                        { key: 'enableFightDetection', label: 'Fight Detection', description: 'Detect physical altercations' },
                        { key: 'enableFallDetection', label: 'Fall Detection', description: 'Detect when people fall down' },
                        { key: 'enableCrowdDetection', label: 'Crowd Detection', description: 'Monitor for overcrowding' },
                        { key: 'enableLoiteringDetection', label: 'Loitering Detection', description: 'Detect suspicious loitering behavior' },
                      ].map((item) => (
                        <div key={item.key} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                          <div>
                            <h5 className="font-medium text-gray-900 dark:text-white">{item.label}</h5>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{item.description}</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={settings.detection[item.key]}
                              onChange={(e) => handleSettingChange('detection', item.key, e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Alert Settings */}
            {activeSection === 'alerts' && (
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Alert Configuration</h3>
                
                <div className="space-y-6">
                  <div>
                    <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Notification Methods</h4>
                    <div className="space-y-3">
                      {[
                        { key: 'enableSMS', label: 'SMS Alerts', description: 'Send alerts via SMS using Twilio' },
                        { key: 'enableEmail', label: 'Email Alerts', description: 'Send alerts via email using SendGrid' },
                        { key: 'enablePushNotifications', label: 'Push Notifications', description: 'Browser push notifications' },
                      ].map((item) => (
                        <div key={item.key} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                          <div>
                            <h5 className="font-medium text-gray-900 dark:text-white">{item.label}</h5>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{item.description}</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={settings.alerts[item.key]}
                              onChange={(e) => handleSettingChange('alerts', item.key, e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Alert Cooldown (seconds)
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="300"
                      value={settings.alerts.alertCooldown}
                      onChange={(e) => handleSettingChange('alerts', 'alertCooldown', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Minimum time between alerts of the same type</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      SMS Phone Numbers
                    </label>
                    <textarea
                      value={settings.alerts.smsNumbers}
                      onChange={(e) => handleSettingChange('alerts', 'smsNumbers', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      rows={3}
                      placeholder="Enter phone numbers separated by commas"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Email Addresses
                    </label>
                    <textarea
                      value={settings.alerts.emailAddresses}
                      onChange={(e) => handleSettingChange('alerts', 'emailAddresses', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      rows={3}
                      placeholder="Enter email addresses separated by commas"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Camera Settings */}
            {activeSection === 'cameras' && (
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Camera Configuration</h3>
                
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Resolution
                      </label>
                      <select
                        value={settings.cameras.resolution}
                        onChange={(e) => handleSettingChange('cameras', 'resolution', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="640x480">640x480 (VGA)</option>
                        <option value="1280x720">1280x720 (HD)</option>
                        <option value="1920x1080">1920x1080 (Full HD)</option>
                        <option value="3840x2160">3840x2160 (4K)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Frame Rate (FPS)
                      </label>
                      <select
                        value={settings.cameras.frameRate}
                        onChange={(e) => handleSettingChange('cameras', 'frameRate', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value={15}>15 FPS</option>
                        <option value={24}>24 FPS</option>
                        <option value={30}>30 FPS</option>
                        <option value={60}>60 FPS</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Camera Features</h4>
                    <div className="space-y-3">
                      {[
                        { key: 'nightVision', label: 'Night Vision', description: 'Enable infrared night vision mode' },
                        { key: 'motionDetection', label: 'Motion Detection', description: 'Basic motion detection for recording triggers' },
                        { key: 'recordingEnabled', label: 'Continuous Recording', description: 'Record all video footage (requires storage)' },
                      ].map((item) => (
                        <div key={item.key} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                          <div>
                            <h5 className="font-medium text-gray-900 dark:text-white">{item.label}</h5>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{item.description}</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={settings.cameras[item.key]}
                              onChange={(e) => handleSettingChange('cameras', item.key, e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Storage Location
                    </label>
                    <input
                      type="text"
                      value={settings.cameras.storageLocation}
                      onChange={(e) => handleSettingChange('cameras', 'storageLocation', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="/path/to/recordings"
                    />
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Directory path for storing recorded videos</p>
                  </div>
                </div>
              </div>
            )}

            {/* System Settings */}
            {activeSection === 'system' && (
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">System Configuration</h3>
                
                <div className="space-y-6">
                  <div>
                    <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Backup & Maintenance</h4>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                        <div>
                          <h5 className="font-medium text-gray-900 dark:text-white">Automatic Backup</h5>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Automatically backup system data and settings</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.system.autoBackup}
                            onChange={(e) => handleSettingChange('system', 'autoBackup', e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                        </label>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Backup Interval (hours)
                        </label>
                        <select
                          value={settings.system.backupInterval}
                          onChange={(e) => handleSettingChange('system', 'backupInterval', parseInt(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                          <option value={6}>Every 6 hours</option>
                          <option value={12}>Every 12 hours</option>
                          <option value={24}>Daily</option>
                          <option value={168}>Weekly</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Logging & Monitoring</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Log Level
                        </label>
                        <select
                          value={settings.system.logLevel}
                          onChange={(e) => handleSettingChange('system', 'logLevel', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                          <option value="DEBUG">DEBUG (Verbose)</option>
                          <option value="INFO">INFO (Standard)</option>
                          <option value="WARNING">WARNING (Important only)</option>
                          <option value="ERROR">ERROR (Errors only)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Maximum Log File Size (MB)
                        </label>
                        <input
                          type="number"
                          min="10"
                          max="1000"
                          value={settings.system.maxLogSize}
                          onChange={(e) => handleSettingChange('system', 'maxLogSize', parseInt(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Data Management</h4>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                        <div>
                          <h5 className="font-medium text-gray-900 dark:text-white">Analytics Collection</h5>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Collect anonymous usage analytics for system improvement</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.system.enableAnalytics}
                            onChange={(e) => handleSettingChange('system', 'enableAnalytics', e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                        </label>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Data Retention Period (days)
                        </label>
                        <select
                          value={settings.system.dataRetention}
                          onChange={(e) => handleSettingChange('system', 'dataRetention', parseInt(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                          <option value={7}>7 days</option>
                          <option value={30}>30 days</option>
                          <option value={90}>90 days</option>
                          <option value={365}>1 year</option>
                          <option value={-1}>Never delete</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingsPanel