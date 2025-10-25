<template>
  <div v-if="error" class="min-h-screen flex items-center justify-center p-4">
    <div class="card max-w-2xl w-full border-2 border-red-500/30 bg-red-900/20">
      <div class="flex items-start gap-4">
        <svg class="w-12 h-12 text-red-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
        </svg>

        <div class="flex-1">
          <h2 class="text-2xl font-bold text-red-400 mb-3">Something went wrong</h2>

          <p class="text-gray-300 mb-4">
            We encountered an unexpected error. Don't worry, your data is safe!
          </p>

          <details class="mb-6">
            <summary class="cursor-pointer text-sm text-gray-400 hover:text-gray-300 mb-2">
              Technical Details
            </summary>
            <div class="bg-black/50 p-4 rounded-lg mt-2">
              <p class="text-sm font-mono text-red-300 mb-2">
                {{ error.message }}
              </p>
              <pre v-if="error.stack" class="text-xs text-gray-500 overflow-x-auto">{{ error.stack }}</pre>
            </div>
          </details>

          <div class="flex gap-3">
            <button
              @click="reset"
              class="btn-primary flex items-center gap-2"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Try Again
            </button>

            <button
              @click="goHome"
              class="btn-secondary flex items-center gap-2"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Go Home
            </button>

            <button
              @click="reload"
              class="btn-secondary flex items-center gap-2"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Reload Page
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <slot v-else />
</template>

<script setup>
import { ref, onErrorCaptured } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const error = ref(null)

// Capture errors from child components
onErrorCaptured((err, instance, info) => {
  console.error('Error captured by boundary:', err)
  console.error('Component:', instance)
  console.error('Info:', info)

  error.value = err

  // Prevent error from propagating further
  return false
})

// Reset error state
function reset() {
  error.value = null
}

// Navigate to home
function goHome() {
  error.value = null
  router.push('/')
}

// Reload the page
function reload() {
  window.location.reload()
}
</script>

<style scoped>
details summary::-webkit-details-marker {
  display: none;
}

details summary::marker {
  display: none;
}

details summary {
  list-style: none;
}

details summary:hover {
  text-decoration: underline;
}
</style>
