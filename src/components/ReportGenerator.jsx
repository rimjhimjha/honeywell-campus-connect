import React, { useState } from 'react'
import { FileText, Download, Copy, Save, Sparkles, Calendar, BarChart3, Shield, Users, AlertTriangle, Clock, Loader2, CheckCircle, X } from 'lucide-react'
import { format } from 'date-fns'
import SupabaseService from '../services/supabase'
import GeminiService from '../services/gemini'

const ReportGenerator = ({ alerts, systemStatus, onClose }) => {
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedReport, setGeneratedReport] = useState(null)
  const [reportType, setReportType] = useState('comprehensive')
  const [timeRange, setTimeRange] = useState('7d')
  const [error, setError] = useState(null)
  const [copySuccess, setCopySuccess] = useState(false)

  const reportTypes = [
    { id: 'comprehensive', label: 'Comprehensive Report', description: 'Complete analysis with insights and recommendations' },
    { id: 'security', label: 'Security Summary', description: 'Focus on security incidents and threats' },
    { id: 'performance', label: 'Performance Analysis', description: 'System performance and efficiency metrics' },
    { id: 'executive', label: 'Executive Summary', description: 'High-level overview for management' }
  ]

  const timeRanges = [
    { id: '24h', label: 'Last 24 Hours' },
    { id: '7d', label: 'Last 7 Days' },
    { id: '30d', label: 'Last 30 Days' },
    { id: '90d', label: 'Last 90 Days' }
  ]

  const generateReportWithGemini = async () => {
    setIsGenerating(true)
    setError(null)

    try {
      // Get real data from Supabase
      const reportData = await prepareReportData()
      
      // Create AI prompt
      const prompt = createPrompt(reportData)
      
      // Check if Gemini API key is available
      if (!import.meta.env.VITE_GEMINI_API_KEY) {
        throw new Error('Gemini API key not configured. Please add VITE_GEMINI_API_KEY to your environment variables to enable AI report generation.')
      }
      
      // Generate report with Gemini AI
      const aiReport = await GeminiService.generateReport(prompt)
      
      // Structure the final report
      const finalReport = {
        id: `report_${Date.now()}`,
        type: reportType,
        time_range: timeRange,
        generatedAt: new Date().toISOString(),
        title: getReportTitle(),
        content: aiReport,
        metadata: {
          totalAlerts: reportData.totalAlerts,
          systemStatus: systemStatus.status,
          dataPoints: reportData.dataPoints,
          aiGenerated: true,
          generatedBy: 'Gemini AI'
        }
      }

      setGeneratedReport(finalReport)
      
      // Log report generation
      await SupabaseService.createSystemLog(
        'INFO',
        `AI report generated: ${finalReport.title}`,
        'reports',
        { reportType, timeRange, dataPoints: reportData.dataPoints }
      )

    } catch (error) {
      console.error('Report generation failed:', error)
      setError(error.message || 'Failed to generate report. Please try again.')
      
      // Log error
      await SupabaseService.createSystemLog(
        'ERROR',
        `Report generation failed: ${error.message}`,
        'reports'
      )
    } finally {
      setIsGenerating(false)
    }
  }

  const prepareReportData = async () => {
    // Get time range in hours
    const timeRangeHours = {
      '24h': 24,
      '7d': 168,
      '30d': 720,
      '90d': 2160
    }

    const hours = timeRangeHours[timeRange]

    // Get real data from Supabase
    const [alertsData, alertStats, cameras, systemLogs] = await Promise.all([
      SupabaseService.getAlerts({ hours, limit: 1000 }),
      SupabaseService.getAlertStats(hours),
      SupabaseService.getCameras(),
      SupabaseService.getSystemLogs(100)
    ])

    // Analyze alert patterns
    const alertsByLocation = alertsData.reduce((acc, alert) => {
      acc[alert.location] = (acc[alert.location] || 0) + 1
      return acc
    }, {})

    const alertsBySeverity = alertsData.reduce((acc, alert) => {
      acc[alert.severity] = (acc[alert.severity] || 0) + 1
      return acc
    }, { high: 0, medium: 0, low: 0 })

    const acknowledgedAlerts = alertsData.filter(alert => alert.acknowledged).length
    const responseRate = alertsData.length > 0 ? (acknowledgedAlerts / alertsData.length) * 100 : 0

    // System performance metrics
    const onlineCameras = cameras.filter(cam => cam.status === 'online').length
    const totalCameras = cameras.length
    const cameraUptime = totalCameras > 0 ? (onlineCameras / totalCameras) * 100 : 0

    // Error logs in time period
    const errorLogs = systemLogs.filter(log => log.level === 'ERROR').length
    const warningLogs = systemLogs.filter(log => log.level === 'WARNING').length

    return {
      timeRange,
      totalAlerts: alertsData.length,
      alertsByType: alertStats.by_type,
      alertsByHour: alertStats.by_hour,
      alertsByLocation,
      alertsBySeverity,
      avgConfidence: alertStats.avg_confidence,
      responseRate,
      acknowledgedAlerts,
      systemStatus: systemStatus.status,
      activeCameras: onlineCameras,
      totalCameras,
      cameraUptime,
      errorLogs,
      warningLogs,
      dataPoints: alertsData.length + cameras.length + systemLogs.length
    }
  }

  const createPrompt = (data) => {
    const basePrompt = `You are an AI security analyst generating a professional safety monitoring report for NigraniAI system. 

REPORT TYPE: ${reportTypes.find(t => t.id === reportType)?.label}
TIME PERIOD: ${timeRanges.find(t => t.id === timeRange)?.label}
GENERATED: ${format(new Date(), 'MMMM dd, yyyy at HH:mm')}

REAL SYSTEM DATA:
- Total Alerts: ${data.totalAlerts}
- System Status: ${data.systemStatus}
- Active Cameras: ${data.activeCameras}/${data.totalCameras} (${data.cameraUptime.toFixed(1)}% uptime)
- Average Detection Confidence: ${(data.avgConfidence * 100).toFixed(1)}%
- Response Rate: ${data.responseRate.toFixed(1)}% (${data.acknowledgedAlerts}/${data.totalAlerts} acknowledged)
- Alert Types: ${JSON.stringify(data.alertsByType)}
- Alerts by Severity: ${JSON.stringify(data.alertsBySeverity)}
- Alerts by Location: ${JSON.stringify(data.alertsByLocation)}
- Peak Activity Hours: ${JSON.stringify(data.alertsByHour)}
- System Errors: ${data.errorLogs} errors, ${data.warningLogs} warnings
- Data Points Analyzed: ${data.dataPoints}

ANALYSIS FOCUS:
${reportType === 'security' ? 'Focus on security incidents, threat analysis, and safety recommendations.' :
  reportType === 'performance' ? 'Focus on system performance, efficiency metrics, and technical optimization.' :
  reportType === 'executive' ? 'Focus on high-level insights, business impact, and strategic recommendations.' :
  'Provide comprehensive analysis covering all aspects of the system.'}

Please generate a detailed, professional report in markdown format with the following sections:
1. Executive Summary
2. Key Findings & Metrics
3. Alert Analysis & Patterns
4. System Performance Assessment
5. Security & Safety Insights
6. Operational Efficiency
7. Recommendations & Action Items
8. Conclusion & Next Steps

Make it data-driven, actionable, and suitable for both technical and non-technical stakeholders. Include specific metrics and insights based on the real data provided. Use professional language and provide concrete recommendations.`

    return basePrompt
  }

  const getReportTitle = () => {
    const typeLabel = reportTypes.find(t => t.id === reportType)?.label
    const timeLabel = timeRanges.find(t => t.id === timeRange)?.label
    return `${typeLabel} - ${timeLabel}`
  }

  const downloadReport = () => {
    if (!generatedReport) return

    const content = `# ${generatedReport.title}\n\nGenerated: ${format(new Date(generatedReport.generatedAt), 'PPpp')}\nGenerated by: NigraniAI with Gemini AI\n\n${generatedReport.content}`
    
    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `nigraniai-report-${format(new Date(), 'yyyy-MM-dd-HHmm')}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const copyToClipboard = async () => {
    if (!generatedReport) return

    try {
      await navigator.clipboard.writeText(generatedReport.content)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
    }
  }

  const saveReport = async () => {
    if (!generatedReport) return
    
    try {
      await SupabaseService.saveReport({
        title: generatedReport.title,
        type: generatedReport.type,
        time_range: generatedReport.time_range,
        content: generatedReport.content,
        metadata: generatedReport.metadata
      })
      
      alert('Report saved successfully!')
      
      // Log the save action
      await SupabaseService.createSystemLog(
        'INFO',
        `Report saved: ${generatedReport.title}`,
        'reports'
      )
    } catch (error) {
      console.error('Failed to save report:', error)
      alert('Failed to save report. Please try again.')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary-100 dark:bg-primary-900/20 rounded-lg">
              <Sparkles className="h-6 w-6 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">AI Report Generator</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Generate comprehensive reports using Gemini AI with real Supabase data</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <div className="flex h-[calc(90vh-80px)]">
          {/* Configuration Panel */}
          <div className="w-1/3 p-6 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Report Configuration</h3>
            
            {/* Report Type */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Report Type
              </label>
              <div className="space-y-2">
                {reportTypes.map((type) => (
                  <label key={type.id} className="flex items-start space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="reportType"
                      value={type.id}
                      checked={reportType === type.id}
                      onChange={(e) => setReportType(e.target.value)}
                      className="mt-1 text-primary-600 focus:ring-primary-500"
                    />
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{type.label}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{type.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Time Range */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Time Range
              </label>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {timeRanges.map((range) => (
                  <option key={range.id} value={range.id}>{range.label}</option>
                ))}
              </select>
            </div>

            {/* Data Preview */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Live Data Preview</h4>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Total Alerts:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{alerts.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">System Status:</span>
                  <span className={`font-medium ${systemStatus.status === 'healthy' ? 'text-success-600' : 'text-warning-600'}`}>
                    {systemStatus.status}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Active Cameras:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{systemStatus.active_cameras || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Data Source:</span>
                  <span className="font-medium text-success-600">Supabase Live</span>
                </div>
              </div>
            </div>

            {/* Generate Button */}
            <button
              onClick={generateReportWithGemini}
              disabled={isGenerating}
              className="w-full btn-primary py-3 text-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <div className="flex items-center justify-center space-x-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Generating with AI...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-2">
                  <Sparkles className="w-5 h-5" />
                  <span>Generate Report</span>
                </div>
              )}
            </button>

            {error && (
              <div className="mt-4 p-3 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-lg">
                <p className="text-danger-600 dark:text-danger-400 text-sm">{error}</p>
              </div>
            )}
          </div>

          {/* Report Display */}
          <div className="flex-1 flex flex-col">
            {generatedReport ? (
              <>
                {/* Report Header */}
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{generatedReport.title}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Generated on {format(new Date(generatedReport.generatedAt), 'PPpp')} • Powered by Gemini AI
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={copyToClipboard}
                        className="btn-secondary flex items-center space-x-2"
                        title="Copy to clipboard"
                      >
                        {copySuccess ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        <span>{copySuccess ? 'Copied!' : 'Copy'}</span>
                      </button>
                      <button
                        onClick={saveReport}
                        className="btn-secondary flex items-center space-x-2"
                        title="Save to Supabase"
                      >
                        <Save className="h-4 w-4" />
                        <span>Save</span>
                      </button>
                      <button
                        onClick={downloadReport}
                        className="btn-primary flex items-center space-x-2"
                        title="Download as Markdown"
                      >
                        <Download className="h-4 w-4" />
                        <span>Download</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Report Content */}
                <div className="flex-1 p-6 overflow-y-auto">
                  <div className="prose prose-gray dark:prose-invert max-w-none">
                    <div 
                      className="whitespace-pre-wrap text-gray-900 dark:text-white"
                      dangerouslySetInnerHTML={{ 
                        __html: generatedReport.content
                          .replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold mb-4 text-gray-900 dark:text-white">$1</h1>')
                          .replace(/^## (.*$)/gm, '<h2 class="text-xl font-semibold mb-3 mt-6 text-gray-900 dark:text-white">$1</h2>')
                          .replace(/^### (.*$)/gm, '<h3 class="text-lg font-medium mb-2 mt-4 text-gray-900 dark:text-white">$1</h3>')
                          .replace(/^\*\*(.*?)\*\*/gm, '<strong class="font-semibold text-gray-900 dark:text-white">$1</strong>')
                          .replace(/^\- (.*$)/gm, '<li class="ml-4 text-gray-700 dark:text-gray-300">$1</li>')
                          .replace(/\n\n/g, '</p><p class="mb-4 text-gray-700 dark:text-gray-300">')
                          .replace(/^(?!<[h|l|s])/gm, '<p class="mb-4 text-gray-700 dark:text-gray-300">')
                      }}
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <FileText className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Report Generated</h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-6">
                    Configure your report settings and click "Generate Report" to create an AI-powered analysis using real Supabase data
                  </p>
                  <div className="grid grid-cols-2 gap-4 max-w-md mx-auto text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center space-x-2">
                      <BarChart3 className="h-4 w-4" />
                      <span>Real-time Data</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Shield className="h-4 w-4" />
                      <span>Security Analysis</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4" />
                      <span>Performance Metrics</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="h-4 w-4" />
                      <span>AI Recommendations</span>
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

export default ReportGenerator