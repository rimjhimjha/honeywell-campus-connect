import React, { useState } from 'react'
import { AlertTriangle, Clock, MapPin, Users, CheckCircle, Filter, Search, Trash2, Download } from 'lucide-react'
import { format } from 'date-fns'

const AlertsPanel = ({ alerts, onAcknowledgeAlert, onClearAlerts }) => {
  const [filter, setFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('timestamp')

  const getAlertIcon = (type) => {
    switch (type) {
      case 'fight': return '🥊'
      case 'fall': return '🚨'
      case 'overcrowding': return '👥'
      case 'loitering': return '👁️'
      default: return '⚠️'
    }
  }

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return 'text-danger-600 bg-danger-50 border-danger-200'
      case 'medium': return 'text-warning-600 bg-warning-50 border-warning-200'
      case 'low': return 'text-success-600 bg-success-50 border-success-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const filteredAlerts = alerts
    .filter(alert => {
      if (filter === 'active') return !alert.acknowledged
      if (filter === 'acknowledged') return alert.acknowledged
      if (filter !== 'all') return alert.type === filter
      return true
    })
    .filter(alert => 
      alert.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.type.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'timestamp') return new Date(b.timestamp) - new Date(a.timestamp)
      if (sortBy === 'severity') {
        const severityOrder = { high: 3, medium: 2, low: 1 }
        return severityOrder[b.severity] - severityOrder[a.severity]
      }
      if (sortBy === 'confidence') return b.confidence - a.confidence
      return 0
    })

  const filterOptions = [
    { value: 'all', label: 'All Alerts', count: alerts.length },
    { value: 'active', label: 'Active', count: alerts.filter(a => !a.acknowledged).length },
    { value: 'acknowledged', label: 'Acknowledged', count: alerts.filter(a => a.acknowledged).length },
    { value: 'fight', label: 'Fights', count: alerts.filter(a => a.type === 'fight').length },
    { value: 'fall', label: 'Falls', count: alerts.filter(a => a.type === 'fall').length },
    { value: 'overcrowding', label: 'Overcrowding', count: alerts.filter(a => a.type === 'overcrowding').length },
    { value: 'loitering', label: 'Loitering', count: alerts.filter(a => a.type === 'loitering').length },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Alert Management</h1>
          <p className="text-gray-600 mt-1">Monitor and manage all safety alerts</p>
        </div>
        <div className="flex items-center space-x-4">
          <button className="btn-secondary">
            <Download className="h-4 w-4 mr-2" />
            Export
          </button>
          <button 
            onClick={onClearAlerts}
            className="btn-danger"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear All
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search alerts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          {/* Sort */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="timestamp">Sort by Time</option>
                <option value="severity">Sort by Severity</option>
                <option value="confidence">Sort by Confidence</option>
              </select>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2 mt-4">
          {filterOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setFilter(option.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === option.value
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {option.label}
              {option.count > 0 && (
                <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                  filter === option.value
                    ? 'bg-white/20 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {option.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Alerts List */}
      <div className="space-y-4">
        {filteredAlerts.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <AlertTriangle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No alerts found</h3>
            <p className="text-gray-500">
              {searchTerm ? 'Try adjusting your search terms' : 'No alerts match the current filter'}
            </p>
          </div>
        ) : (
          filteredAlerts.map((alert) => (
            <div key={alert.id} className={`alert-card alert-${alert.severity} animate-slide-up`}>
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 flex-1">
                  <div className="text-3xl">{getAlertIcon(alert.type)}</div>
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-xl font-semibold text-gray-900 capitalize">{alert.type}</h3>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getSeverityColor(alert.severity)}`}>
                        {alert.severity.toUpperCase()}
                      </span>
                      <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {(alert.confidence * 100).toFixed(0)}% confidence
                      </span>
                    </div>
                    
                    <p className="text-gray-700 mb-4 text-lg">{alert.description}</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span>{format(new Date(alert.timestamp), 'MMM dd, yyyy HH:mm:ss')}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span>{alert.location}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Users className="h-4 w-4 text-gray-400" />
                        <span>{alert.personCount} people detected</span>
                      </div>
                    </div>

                    {alert.acknowledged && (
                      <div className="mt-4 p-3 bg-success-50 border border-success-200 rounded-lg">
                        <div className="flex items-center space-x-2 text-success-700">
                          <CheckCircle className="h-4 w-4" />
                          <span className="text-sm font-medium">
                            Acknowledged at {format(new Date(alert.timestamp), 'HH:mm:ss')}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end space-y-2">
                  {!alert.acknowledged ? (
                    <button
                      onClick={() => onAcknowledgeAlert(alert.id)}
                      className="btn-primary"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Acknowledge
                    </button>
                  ) : (
                    <span className="text-success-600 text-sm font-medium flex items-center space-x-1">
                      <CheckCircle className="h-4 w-4" />
                      <span>Resolved</span>
                    </span>
                  )}
                  
                  <div className="text-xs text-gray-400">
                    ID: {alert.id}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Summary Stats */}
      {filteredAlerts.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Summary Statistics</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary-600">{filteredAlerts.length}</p>
              <p className="text-sm text-gray-600">Total Alerts</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-danger-600">
                {filteredAlerts.filter(a => a.severity === 'high').length}
              </p>
              <p className="text-sm text-gray-600">High Priority</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-success-600">
                {filteredAlerts.filter(a => a.acknowledged).length}
              </p>
              <p className="text-sm text-gray-600">Acknowledged</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">
                {filteredAlerts.length > 0 
                  ? Math.round(filteredAlerts.reduce((acc, alert) => acc + alert.confidence, 0) / filteredAlerts.length * 100)
                  : 0
                }%
              </p>
              <p className="text-sm text-gray-600">Avg Confidence</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AlertsPanel