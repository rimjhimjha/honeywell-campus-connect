import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Database service class
class SupabaseService {
  // Authentication
  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    return { data, error }
  }

  async signUp(email, password, userData) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData
      }
    })
    return { data, error }
  }

  async signOut() {
    const { error } = await supabase.auth.signOut()
    return { error }
  }

  async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return null

    // Get user profile from users table
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('email', user.email)
      .single()

    return profile ? { ...user, ...profile } : user
  }

  // Alerts
  async getAlerts(params = {}) {
    let query = supabase
      .from('alerts')
      .select('*')
      .order('created_at', { ascending: false })

    if (params.limit) {
      query = query.limit(params.limit)
    }

    if (params.hours) {
      const cutoffTime = new Date()
      cutoffTime.setHours(cutoffTime.getHours() - params.hours)
      query = query.gte('timestamp', cutoffTime.toISOString())
    }

    if (params.status) {
      if (params.status === 'active') {
        query = query.eq('acknowledged', false)
      } else if (params.status === 'acknowledged') {
        query = query.eq('acknowledged', true)
      }
    }

    if (params.event_type) {
      query = query.eq('event_type', params.event_type)
    }

    const { data, error } = await query
    if (error) throw error
    return data || []
  }

  async createAlert(alertData) {
    const { data, error } = await supabase
      .from('alerts')
      .insert([{
        alert_id: alertData.alert_id,
        event_type: alertData.event_type,
        confidence: alertData.confidence,
        timestamp: alertData.timestamp,
        frame_number: alertData.frame_number || 0,
        person_count: alertData.person_count || 1,
        description: alertData.description,
        location: alertData.location || 'Unknown Location',
        severity: alertData.severity || 'medium'
      }])
      .select()
      .single()

    if (error) throw error
    return data
  }

  async acknowledgeAlert(alertId, acknowledgedBy) {
    const { data, error } = await supabase
      .from('alerts')
      .update({
        acknowledged: true,
        acknowledged_by: acknowledgedBy,
        acknowledged_at: new Date().toISOString()
      })
      .eq('alert_id', alertId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async deleteAllAlerts() {
    const { error } = await supabase
      .from('alerts')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all

    if (error) throw error
    return true
  }

  async getAlertStats(hours = 24) {
    const cutoffTime = new Date()
    cutoffTime.setHours(cutoffTime.getHours() - hours)

    // Get total alerts
    const { count: totalAlerts } = await supabase
      .from('alerts')
      .select('*', { count: 'exact', head: true })
      .gte('timestamp', cutoffTime.toISOString())

    // Get alerts by type
    const { data: alertsByType } = await supabase
      .from('alerts')
      .select('event_type')
      .gte('timestamp', cutoffTime.toISOString())

    const byType = alertsByType?.reduce((acc, alert) => {
      acc[alert.event_type] = (acc[alert.event_type] || 0) + 1
      return acc
    }, {}) || {}

    // Get average confidence
    const { data: confidenceData } = await supabase
      .from('alerts')
      .select('confidence')
      .gte('timestamp', cutoffTime.toISOString())

    const avgConfidence = confidenceData?.length > 0
      ? confidenceData.reduce((sum, alert) => sum + alert.confidence, 0) / confidenceData.length
      : 0

    // Get alerts by hour
    const { data: hourlyData } = await supabase
      .from('alerts')
      .select('timestamp')
      .gte('timestamp', cutoffTime.toISOString())

    const byHour = hourlyData?.reduce((acc, alert) => {
      const hour = new Date(alert.timestamp).getHours()
      const hourKey = `${hour.toString().padStart(2, '0')}:00`
      acc[hourKey] = (acc[hourKey] || 0) + 1
      return acc
    }, {}) || {}

    return {
      total_alerts: totalAlerts || 0,
      by_type: byType,
      by_hour: byHour,
      avg_confidence: avgConfidence
    }
  }

  // Cameras
  async getCameras() {
    const { data, error } = await supabase
      .from('cameras')
      .select('*')
      .eq('is_active', true)
      .order('name')

    if (error) throw error
    return data || []
  }

  async addCamera(cameraData) {
    const { data, error } = await supabase
      .from('cameras')
      .insert([{
        name: cameraData.name,
        location: cameraData.location,
        type: cameraData.type,
        status: cameraData.status || 'offline',
        resolution: cameraData.resolution || '1920x1080',
        fps: cameraData.fps || 30,
        stream_url: cameraData.stream_url,
        is_active: true
      }])
      .select()
      .single()

    if (error) throw error
    return data
  }

  async updateCamera(cameraId, updates) {
    const { data, error } = await supabase
      .from('cameras')
      .update(updates)
      .eq('id', cameraId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async deleteCamera(cameraId) {
    const { error } = await supabase
      .from('cameras')
      .update({ is_active: false })
      .eq('id', cameraId)

    if (error) throw error
    return true
  }

  async updateCameraStatus(cameraId, status) {
    const { data, error } = await supabase
      .from('cameras')
      .update({ status })
      .eq('id', cameraId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  // System Logs
  async createSystemLog(level, message, module = null, metadata = {}) {
    const { data, error } = await supabase
      .from('system_logs')
      .insert([{
        level,
        message,
        module,
        metadata
      }])
      .select()
      .single()

    if (error) throw error
    return data
  }

  async getSystemLogs(limit = 100, level = null) {
    let query = supabase
      .from('system_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (level) {
      query = query.eq('level', level)
    }

    const { data, error } = await query
    if (error) throw error
    return data || []
  }

  // Reports
  async saveReport(reportData) {
    const user = await this.getCurrentUser()
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('reports')
      .insert([{
        title: reportData.title,
        type: reportData.type,
        time_range: reportData.time_range,
        content: reportData.content,
        metadata: reportData.metadata || {},
        generated_by: user.id
      }])
      .select()
      .single()

    if (error) throw error
    return data
  }

  async getReports(limit = 50) {
    const { data, error } = await supabase
      .from('reports')
      .select(`
        *,
        users:generated_by (username, email)
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  }

  async deleteReport(reportId) {
    const { error } = await supabase
      .from('reports')
      .delete()
      .eq('id', reportId)

    if (error) throw error
    return true
  }

  // Real-time subscriptions
  subscribeToAlerts(callback) {
    return supabase
      .channel('alerts')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'alerts' },
        callback
      )
      .subscribe()
  }

  subscribeToSystemLogs(callback) {
    return supabase
      .channel('system_logs')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'system_logs' },
        callback
      )
      .subscribe()
  }

  subscribeToCameras(callback) {
    return supabase
      .channel('cameras')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'cameras' },
        callback
      )
      .subscribe()
  }

  // System health
  async getSystemHealth() {
    try {
      // Get recent alerts count
      const { count: alertsCount } = await supabase
        .from('alerts')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

      // Get active cameras count
      const { count: activeCameras } = await supabase
        .from('cameras')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'online')

      // Get last detection - removed .single() to handle empty results
      const { data: lastAlertData } = await supabase
        .from('alerts')
        .select('timestamp')
        .order('timestamp', { ascending: false })
        .limit(1)

      const lastAlert = lastAlertData && lastAlertData.length > 0 ? lastAlertData[0] : null

      return {
        status: 'healthy',
        version: '2.0.0',
        uptime: 'Running',
        alerts_count: alertsCount || 0,
        active_cameras: activeCameras || 0,
        last_detection: lastAlert?.timestamp || null
      }
    } catch (error) {
      console.error('Health check failed:', error)
      return {
        status: 'degraded',
        version: '2.0.0',
        uptime: 'Unknown',
        alerts_count: 0,
        active_cameras: 0,
        last_detection: null
      }
    }
  }
}

export default new SupabaseService()