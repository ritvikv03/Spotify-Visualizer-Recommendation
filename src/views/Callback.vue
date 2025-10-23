<template>
  <div class="min-h-screen flex items-center justify-center p-4">
    <div class="text-center">
      <!-- Loading Animation -->
      <div v-if="isProcessing" class="mb-8">
        <div class="relative w-32 h-32 mx-auto mb-6">
          <div class="absolute inset-0 border-4 border-spotify-green border-t-transparent rounded-full animate-spin"></div>
          <div class="absolute inset-2 border-4 border-green-400 border-t-transparent rounded-full animate-spin" style="animation-duration: 1.5s;"></div>
          <div class="absolute inset-4 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" style="animation-duration: 2s;"></div>
        </div>
        <h2 class="text-3xl font-bold mb-2">Connecting to Spotify</h2>
        <p class="text-gray-400">{{ statusMessage }}</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="card max-w-md mx-auto">
        <div class="text-6xl mb-4">⚠️</div>
        <h2 class="text-2xl font-bold mb-2 text-red-400">Authentication Failed</h2>
        <p class="text-gray-400 mb-6">{{ error }}</p>
        <button @click="goHome" class="btn-primary">
          Return to Home
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const isProcessing = ref(true)
const error = ref(null)
const statusMessage = ref('Authenticating...')

onMounted(async () => {
  // Get the authorization code from URL
  const urlParams = new URLSearchParams(window.location.search)
  const code = urlParams.get('code')
  const errorParam = urlParams.get('error')

  if (errorParam) {
    error.value = 'You denied the authorization request'
    isProcessing.value = false
    return
  }

  if (!code) {
    error.value = 'No authorization code received'
    isProcessing.value = false
    return
  }

  try {
    statusMessage.value = 'Exchanging authorization code...'
    const success = await authStore.handleCallback(code)

    if (success) {
      statusMessage.value = 'Success! Redirecting...'
      setTimeout(() => {
        router.push('/discover')
      }, 1000)
    } else {
      error.value = 'Failed to complete authentication'
      isProcessing.value = false
    }
  } catch (err) {
    console.error('Callback error:', err)
    error.value = 'An unexpected error occurred'
    isProcessing.value = false
  }
})

const goHome = () => {
  router.push('/')
}
</script>
