// Performance monitoring and optimization utilities
export class PerformanceMonitor {
  constructor() {
    this.metrics = new Map()
    this.isProduction = import.meta.env.NODE_ENV === 'production'
  }

  startTiming(label) {
    this.metrics.set(label, performance.now())
  }

  endTiming(label) {
    const startTime = this.metrics.get(label)
    if (startTime) {
      const duration = performance.now() - startTime
      this.metrics.delete(label)
      
      if (!this.isProduction) {
        console.log(`⏱️ ${label}: ${duration.toFixed(2)}ms`)
      }
      
      return duration
    }
    return 0
  }

  measureAsync(label, asyncFn) {
    return async (...args) => {
      this.startTiming(label)
      try {
        const result = await asyncFn(...args)
        return result
      } finally {
        this.endTiming(label)
      }
    }
  }

  measureComponent(WrappedComponent, componentName) {
    return function MeasuredComponent(props) {
      const startTime = performance.now()
      
      React.useEffect(() => {
        const renderTime = performance.now() - startTime
        if (!this.isProduction && renderTime > 16) { // > 1 frame at 60fps
          console.warn(`🐌 Slow render: ${componentName} took ${renderTime.toFixed(2)}ms`)
        }
      })

      return React.createElement(WrappedComponent, props)
    }
  }

  // Memory usage monitoring
  getMemoryUsage() {
    if (performance.memory) {
      return {
        used: Math.round(performance.memory.usedJSHeapSize / 1048576), // MB
        total: Math.round(performance.memory.totalJSHeapSize / 1048576), // MB
        limit: Math.round(performance.memory.jsHeapSizeLimit / 1048576) // MB
      }
    }
    return null
  }

  // Network performance
  measureNetworkRequest(url, options = {}) {
    const startTime = performance.now()
    
    return fetch(url, options).then(response => {
      const duration = performance.now() - startTime
      
      if (!this.isProduction) {
        console.log(`🌐 Network: ${url} - ${duration.toFixed(2)}ms`)
      }
      
      // Log slow requests
      if (duration > 5000) { // > 5 seconds
        console.warn(`🐌 Slow network request: ${url} took ${duration.toFixed(2)}ms`)
      }
      
      return response
    })
  }
}

export const performanceMonitor = new PerformanceMonitor()

// React performance hooks
export const usePerformanceTimer = (label) => {
  React.useEffect(() => {
    performanceMonitor.startTiming(label)
    return () => performanceMonitor.endTiming(label)
  }, [label])
}

export const useMemoizedCallback = (callback, deps) => {
  return React.useCallback(callback, deps)
}

export const useMemoizedValue = (factory, deps) => {
  return React.useMemo(factory, deps)
}