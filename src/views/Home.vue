<template>
  <div class="min-h-screen flex items-center justify-center p-4">
    <div class="max-w-4xl w-full">
      <!-- Hero Section -->
      <div class="text-center mb-12">
        <h1 class="text-6xl md:text-8xl font-bold mb-6 bg-gradient-to-r from-spotify-green via-green-400 to-emerald-500 bg-clip-text text-transparent animate-pulse-slow">
          Discover Hidden Gems
        </h1>
        <p class="text-xl md:text-2xl text-spotify-lightgray mb-4">
          Uncover unknown artists that match your taste
        </p>
        <p class="text-lg text-gray-400 max-w-2xl mx-auto">
          Experience music like never before with intelligent recommendations and mesmerizing audio visualizations
        </p>
      </div>

      <!-- Feature Cards -->
      <div class="grid md:grid-cols-3 gap-6 mb-12">
        <div class="card text-center transform hover:scale-105 transition-transform">
          <div class="text-5xl mb-4">🎵</div>
          <h3 class="text-xl font-semibold mb-2">Smart Discovery</h3>
          <p class="text-gray-400 text-sm">
            AI-powered recommendations that find artists under the radar
          </p>
        </div>
        
        <div class="card text-center transform hover:scale-105 transition-transform">
          <div class="text-5xl mb-4">🌊</div>
          <h3 class="text-xl font-semibold mb-2">Live Visualizer</h3>
          <p class="text-gray-400 text-sm">
            Dynamic waveforms that dance to your music in real-time
          </p>
        </div>
        
        <div class="card text-center transform hover:scale-105 transition-transform">
          <div class="text-5xl mb-4">💎</div>
          <h3 class="text-xl font-semibold mb-2">Hidden Talent</h3>
          <p class="text-gray-400 text-sm">
            Support emerging artists and expand your musical horizons
          </p>
        </div>
      </div>

      <!-- Login Button -->
      <div class="text-center">
        <button 
          @click="handleLogin" 
          :disabled="isLoading"
          class="btn-primary text-lg px-12 py-4 inline-flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg v-if="!isLoading" class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
          </svg>
          <svg v-else class="animate-spin h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {{ isLoading ? 'Connecting...' : 'Connect with Spotify' }}
        </button>
        
        <p class="text-sm text-gray-500 mt-4">
          Your data is private and never stored on our servers
        </p>
      </div>

      <!-- Features List -->
      <div class="mt-16 glass-effect p-8">
        <h3 class="text-2xl font-semibold mb-6 text-center">What You'll Get</h3>
        <div class="grid md:grid-cols-2 gap-4 text-gray-300">
          <div class="flex items-start gap-3">
            <span class="text-spotify-green text-xl">✓</span>
            <span>Personalized recommendations based on your listening history</span>
          </div>
          <div class="flex items-start gap-3">
            <span class="text-spotify-green text-xl">✓</span>
            <span>Focus on artists with less than 50% popularity</span>
          </div>
          <div class="flex items-start gap-3">
            <span class="text-spotify-green text-xl">✓</span>
            <span>Real-time audio waveform visualizations</span>
          </div>
          <div class="flex items-start gap-3">
            <span class="text-spotify-green text-xl">✓</span>
            <span>Deep analysis of audio features and patterns</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()
const isLoading = ref(false)

const handleLogin = async () => {
  isLoading.value = true
  try {
    await authStore.login()
  } catch (error) {
    console.error('Login error:', error)
    isLoading.value = false
  }
}
</script>
