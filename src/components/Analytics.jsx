import React, { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Area, AreaChart } from 'recharts'
import { TrendingUp, Calendar, Clock, MapPin, AlertTriangle, Users, Activity } from 'lucide-react'
import { format, subDays, startOfDay, endOfDay } from 'date-fns'

const Analytics = ({ alerts }) => {
  const [timeRange, setTimeRange] = useState('7d')
  const [selectedMetric, setSelectedMetric] = useState('events')

  // Process data for charts
  const processAlertsByType = () => {
    const types = alerts.reduce((acc, alert) => {
      acc[alert.type] = (acc[alert.type] || 0) + 1
      return acc
    }, {})

    return Object.entries(types).map(([type, count]) => ({
      name: type.charAt(0).toUpperCase() + type.slice(1),
      value: count,
      color: getTypeColor(type)
    }))
  }

  const processAlertsByHour = () => {
    const hours = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      count: 0,
      label: `${i.toString().padStart(2, '0')}:00`
    }))

    alerts.forEach(alert => {
      const hour = new Date(alert.timestamp).getHours()
      hours[hour].count++
    })

    return hours
  }

  const processAlertsByDay = () => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i)
      return {
        date: format(date, 'MMM dd'),
        count: 0,
        high: 0,
        medium: 0,
        low: 0
      }
    })

    alerts.forEach(alert => {
      const alertDate = new Date(alert.timestamp)
      const dayIndex = days.findIndex(day => 
        format(alertDate, 'MMM dd') === day.date
      )
      
      if (dayIndex !== -1) {
        days[dayIndex].count++
        days[dayIndex][alert.severity]++
      }
    })

    return days
  }

  const processConfidenceDistribution = () => {
    const ranges = [
      { range: '60-70%', min: 0.6, max: 0.7, count: 0 },
      { range: '70-80%', min: 0.7, max: 0.8, count: 0 },
      { range: '80-90%', min: 0.8, max: 0.9, count: 0 },
      { range: '90-100%', min: 0.9, max: 1.0, count: 0 },
    ]

    alerts.forEach(alert => {
      const range = ranges.find(r => alert.confidence >= r.min && alert.confidence < r.max)
      if (range) range.count++
    })

    return ranges
  }

  const getTypeColor = (type) => {
    const colors = {
      fight: '#ef4444',
      fall: '#f97316',
      overcrowding: '#eab308',
      loitering: '#22c55e'
    }
    return colors[type] || '#6b7280'
  }

  const alertsByType = processAlertsByType()
  const alertsByHour = processAlertsByHour()
  const alertsByDay = processAlertsByDay()
  const confidenceDistribution = processConfidenceDistribution()

  const totalAlerts = alerts.length
  const avgConfidence = alerts.length > 0 
    ? alerts.reduce((acc, alert) => acc + alert.confidence, 0) / alerts.length 
    : 0
  const highPriorityAlerts = alerts.filter(alert => alert.severity === 'high').length
  const acknowledgedAlerts = alerts.filter(alert => alert.acknowledged).length

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600 mt-1">Comprehensive insights and trends analysis</p>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="metric-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Events</p>
              <p className="text-3xl font-bold text-primary-600">{totalAlerts}</p>
            </div>
            <div className="p-3 bg-primary-100 rounded-full">
              <Activity className="h-6 w-6 text-primary-600" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-sm text-gray-500">All detected events</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">High Priority</p>
              <p className="text-3xl font-bold text-danger-600">{highPriorityAlerts}</p>
            </div>
            <div className="p-3 bg-danger-100 rounded-full">
              <AlertTriangle className="h-6 w-6 text-danger-600" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-sm text-gray-500">Critical incidents</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Confidence</p>
              <p className="text-3xl font-bold text-success-600">{Math.round(avgConfidence * 100)}%</p>
            </div>
            <div className="p-3 bg-success-100 rounded-full">
              <TrendingUp className="h-6 w-6 text-success-600" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-sm text-gray-500">Detection accuracy</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Response Rate</p>
              <p className="text-3xl font-bold text-primary-600">
                {totalAlerts > 0 ? Math.round((acknowledgedAlerts / totalAlerts) * 100) : 0}%
              </p>
            </div>
            <div className="p-3 bg-primary-100 rounded-full">
              <Users className="h-6 w-6 text-primary-600" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-sm text-gray-500">Acknowledged alerts</span>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Events by Type */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Events by Type</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={alertsByType}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {alertsByType.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Events by Hour */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Events by Hour</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={alertsByHour}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Daily Trends */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Trends</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={alertsByDay}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="high" stackId="1" stroke="#ef4444" fill="#ef4444" />
                <Area type="monotone" dataKey="medium" stackId="1" stroke="#f59e0b" fill="#f59e0b" />
                <Area type="monotone" dataKey="low" stackId="1" stroke="#22c55e" fill="#22c55e" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Confidence Distribution */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Confidence Distribution</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={confidenceDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="range" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Detailed Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Location Analysis */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Location Analysis</h3>
          <div className="space-y-4">
            {Array.from(new Set(alerts.map(alert => alert.location))).map(location => {
              const locationAlerts = alerts.filter(alert => alert.location === location)
              const percentage = (locationAlerts.length / totalAlerts) * 100
              
              return (
                <div key={location} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-900">{location}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-primary-600 h-2 rounded-full" 
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-600 w-12 text-right">
                      {locationAlerts.length}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Detection Accuracy</span>
              <span className="font-semibold text-success-600">{Math.round(avgConfidence * 100)}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Response Time</span>
              <span className="font-semibold text-primary-600">{'< 30s'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">False Positive Rate</span>
              <span className="font-semibold text-warning-600">5.2%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">System Uptime</span>
              <span className="font-semibold text-success-600">99.8%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Alert Resolution Rate</span>
              <span className="font-semibold text-primary-600">
                {totalAlerts > 0 ? Math.round((acknowledgedAlerts / totalAlerts) * 100) : 0}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Insights and Recommendations */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Insights & Recommendations</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Key Findings</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-primary-600 rounded-full mt-2"></div>
                <span>Peak activity occurs between 2-4 PM daily</span>
              </li>
              <li className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-primary-600 rounded-full mt-2"></div>
                <span>Main entrance shows highest alert frequency</span>
              </li>
              <li className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-primary-600 rounded-full mt-2"></div>
                <span>Fall detection accuracy improved by 15% this week</span>
              </li>
              <li className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-primary-600 rounded-full mt-2"></div>
                <span>Response time decreased by 20% compared to last month</span>
              </li>
            </ul>
          </div>
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Recommendations</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-warning-600 rounded-full mt-2"></div>
                <span>Consider additional camera coverage in parking area</span>
              </li>
              <li className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-warning-600 rounded-full mt-2"></div>
                <span>Increase monitoring during peak hours (2-4 PM)</span>
              </li>
              <li className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-warning-600 rounded-full mt-2"></div>
                <span>Review and update crowd threshold settings</span>
              </li>
              <li className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-warning-600 rounded-full mt-2"></div>
                <span>Schedule maintenance for Camera 4 (offline)</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Analytics