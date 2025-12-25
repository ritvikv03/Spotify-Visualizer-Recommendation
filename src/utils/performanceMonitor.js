/**
 * Performance Monitoring Utility
 *
 * Tracks and logs performance metrics for key operations.
 * Helps validate performance claims and identify bottlenecks.
 *
 * @module utils/performanceMonitor
 */

export class PerformanceMonitor {
  /**
   * Measure execution time of async recommendation generation
   *
   * @param {Function} fn - Async function to measure
   * @param {string} [label='Operation'] - Label for console output
   * @returns {Promise<{result: any, duration: number}>} Result and duration in ms
   *
   * @example
   * const { result, duration } = await PerformanceMonitor.measure(
   *   () => generateRecommendations(options),
   *   'Recommendation Generation'
   * )
   * console.log(`Took ${duration}ms`)
   */
  static async measure(fn, label = 'Operation') {
    const start = performance.now()
    const result = await fn()
    const duration = performance.now() - start

    console.log(`⏱️  ${label}: ${duration.toFixed(0)}ms`)

    // Track performance metrics (could send to analytics in production)
    this._trackMetric(label, duration)

    return { result, duration }
  }

  /**
   * Measure synchronous operation (e.g., TensorFlow.js inference)
   *
   * @param {Function} fn - Synchronous function to measure
   * @param {string} [label='Sync Operation'] - Label for console output
   * @returns {{result: any, duration: number}} Result and duration in ms
   */
  static measureSync(fn, label = 'Sync Operation') {
    const start = performance.now()
    const result = fn()
    const duration = performance.now() - start

    console.log(`⏱️  ${label}: ${duration.toFixed(0)}ms`)

    this._trackMetric(label, duration)

    return { result, duration }
  }

  /**
   * Mark the start of a performance measurement
   *
   * @param {string} markName - Unique name for this measurement
   *
   * @example
   * PerformanceMonitor.start('api-fetch')
   * await fetchData()
   * const duration = PerformanceMonitor.end('api-fetch')
   */
  static start(markName) {
    performance.mark(`${markName}-start`)
  }

  /**
   * Mark the end of a performance measurement and return duration
   *
   * @param {string} markName - Same name used in start()
   * @returns {number} Duration in milliseconds
   */
  static end(markName) {
    const endMark = `${markName}-end`
    const measureName = `${markName}-measure`

    performance.mark(endMark)

    try {
      performance.measure(measureName, `${markName}-start`, endMark)

      const measure = performance.getEntriesByName(measureName)[0]
      const duration = measure.duration

      console.log(`⏱️  ${markName}: ${duration.toFixed(0)}ms`)

      // Cleanup
      performance.clearMarks(`${markName}-start`)
      performance.clearMarks(endMark)
      performance.clearMeasures(measureName)

      return duration
    } catch (error) {
      console.warn(`Performance measurement failed for ${markName}:`, error)
      return 0
    }
  }

  /**
   * Get Web Vitals metrics
   *
   * @returns {{FCP: number|null, LCP: number|null, CLS: number|null, FID: number|null}} Web Vitals
   */
  static getWebVitals() {
    const paintEntries = performance.getEntriesByType('paint')
    const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint')

    return {
      FCP: fcp ? fcp.startTime : null,
      LCP: null, // Requires web-vitals library
      CLS: null, // Requires web-vitals library
      FID: null, // Requires web-vitals library
    }
  }

  /**
   * Track performance metric (could integrate with analytics)
   *
   * @private
   * @param {string} label - Metric label
   * @param {number} duration - Duration in ms
   */
  static _trackMetric(label, duration) {
    // Store in sessionStorage for debugging
    const metrics = JSON.parse(sessionStorage.getItem('performance-metrics') || '[]')
    metrics.push({
      label,
      duration,
      timestamp: new Date().toISOString(),
    })

    // Keep only last 100 metrics
    if (metrics.length > 100) {
      metrics.shift()
    }

    sessionStorage.setItem('performance-metrics', JSON.stringify(metrics))
  }

  /**
   * Get all tracked performance metrics
   *
   * @returns {Array<{label: string, duration: number, timestamp: string}>} Performance metrics
   */
  static getMetrics() {
    return JSON.parse(sessionStorage.getItem('performance-metrics') || '[]')
  }

  /**
   * Get average duration for a specific operation
   *
   * @param {string} label - Operation label
   * @returns {number|null} Average duration in ms, or null if no data
   */
  static getAverageDuration(label) {
    const metrics = this.getMetrics().filter(m => m.label === label)

    if (metrics.length === 0) {
      return null
    }

    const sum = metrics.reduce((acc, m) => acc + m.duration, 0)
    return sum / metrics.length
  }

  /**
   * Clear all tracked metrics
   */
  static clearMetrics() {
    sessionStorage.removeItem('performance-metrics')
  }

  /**
   * Log performance summary
   */
  static logSummary() {
    const metrics = this.getMetrics()

    if (metrics.length === 0) {
      console.log('📊 No performance metrics tracked yet')
      return
    }

    console.log('📊 Performance Summary:')

    // Group by label
    const grouped = metrics.reduce((acc, m) => {
      if (!acc[m.label]) {
        acc[m.label] = []
      }
      acc[m.label].push(m.duration)
      return acc
    }, {})

    Object.entries(grouped).forEach(([label, durations]) => {
      const avg = durations.reduce((a, b) => a + b, 0) / durations.length
      const min = Math.min(...durations)
      const max = Math.max(...durations)

      console.log(`  ${label}:`)
      console.log(`    Average: ${avg.toFixed(0)}ms`)
      console.log(`    Min: ${min.toFixed(0)}ms`)
      console.log(`    Max: ${max.toFixed(0)}ms`)
      console.log(`    Samples: ${durations.length}`)
    })
  }
}

export default PerformanceMonitor
