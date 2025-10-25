import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router/index.js'
import './assets/main.css'

// Vercel Analytics & Speed Insights
import { inject } from '@vercel/analytics'
import { injectSpeedInsights } from '@vercel/speed-insights'

// Web Vitals Tracking
import { onCLS, onINP, onLCP, onFCP, onTTFB } from 'web-vitals'

// Initialize Vercel monitoring
inject()
injectSpeedInsights()

// Track Web Vitals
function sendToAnalytics(metric) {
  // Log to console in development
  if (import.meta.env.DEV) {
    console.log(`[Web Vitals] ${metric.name}:`, metric.value, metric)
  }

  // Send to Vercel Analytics in production
  if (window.va) {
    window.va('event', {
      name: `web-vitals-${metric.name.toLowerCase()}`,
      value: metric.value,
      label: metric.id
    })
  }
}

onCLS(sendToAnalytics)
onINP(sendToAnalytics) // INP replaced FID in web-vitals v3+
onLCP(sendToAnalytics)
onFCP(sendToAnalytics)
onTTFB(sendToAnalytics)

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.mount('#app')
