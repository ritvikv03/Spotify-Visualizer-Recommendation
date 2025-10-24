<template>
  <div class="h-screen w-screen overflow-hidden relative bg-black">
    <!-- Fullscreen Visualizer -->
    <DramaticVisualizer
      :is-playing="isPlaying"
      :current-track="currentTrack"
      :visualization-mode="currentMode"
      :audio-features="audioFeatures"
      :theme="themeStore.themes[themeStore.currentTheme]"
      @toggle-play="togglePlayback"
      @next="nextTrack"
      @previous="previousTrack"
      class="absolute inset-0"
    />

    <!-- Top Control Bar -->
    <div class="absolute top-0 left-0 right-0 z-30 p-6">
      <div class="flex items-center justify-between">
        <!-- Logo -->
        <div class="flex items-center gap-3">
          <IconMusic :size="32" :color="themeStore.themes[themeStore.currentTheme].primary" />
          <h1 class="text-2xl font-bold text-white">Discovery Studio</h1>
        </div>

        <!-- Controls -->
        <div class="flex items-center gap-3">
          <!-- Visualization Mode Dropdown -->
          <div class="relative" ref="modeDropdownRef">
            <button
              @click="showModeMenu = !showModeMenu"
              class="glass-btn px-4 py-2.5 flex items-center gap-2"
            >
              <component :is="visualizerModes.find(m => m.id === currentMode).icon" :size="18" color="#FFF" />
              <span class="hidden md:inline">{{ visualizerModes.find(m => m.id === currentMode).name }}</span>
              <svg class="w-4 h-4 transition-transform" :class="{ 'rotate-180': showModeMenu }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
              </svg>
            </button>

            <div v-if="showModeMenu" class="absolute top-full mt-2 right-0 glass-dropdown min-w-[200px]">
              <button
                v-for="mode in visualizerModes"
                :key="mode.id"
                @click="currentMode = mode.id; showModeMenu = false"
                class="dropdown-item"
                :class="{ 'active': currentMode === mode.id }"
              >
                <component :is="mode.icon" :size="18" />
                <span>{{ mode.name }}</span>
                <svg v-if="currentMode === mode.id" class="w-4 h-4 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
              </button>
            </div>
          </div>

          <!-- Theme Dropdown -->
          <div class="relative" ref="themeDropdownRef">
            <button
              @click="showThemeMenu = !showThemeMenu"
              class="glass-btn px-4 py-2.5 flex items-center gap-2"
              :style="{ borderColor: themeStore.themes[themeStore.currentTheme].primary + '40' }"
            >
              <IconPalette :size="18" />
              <span class="hidden md:inline">{{ themeStore.themes[themeStore.currentTheme].name }}</span>
              <svg class="w-4 h-4 transition-transform" :class="{ 'rotate-180': showThemeMenu }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
              </svg>
            </button>

            <div v-if="showThemeMenu" class="absolute top-full mt-2 right-0 glass-dropdown min-w-[180px]">
              <button
                v-for="(theme, key) in themeStore.themes"
                :key="key"
                @click="themeStore.currentTheme = key; showThemeMenu = false"
                class="dropdown-item"
                :class="{ 'active': themeStore.currentTheme === key }"
              >
                <div class="w-4 h-4 rounded-full" :style="{ background: theme.gradient }"></div>
                <span>{{ theme.name }}</span>
                <svg v-if="themeStore.currentTheme === key" class="w-4 h-4 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
              </button>
            </div>
          </div>

          <!-- Analyze Button -->
          <button
            @click="isAnalyzing ? stopAnalysis() : startAnalysis()"
            :disabled="isAnalyzing"
            class="glass-btn-primary px-6 py-2.5 flex items-center gap-2"
          >
            <IconAnalyze :size="18" :class="{ 'animate-spin': isAnalyzing }" />
            <span>{{ isAnalyzing ? 'Analyzing...' : 'Analyze' }}</span>
          </button>

          <!-- Logout -->
          <button @click="handleLogout" class="glass-btn px-4 py-2.5">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Side Panel for Recommendations (Slide in on demand) -->
    <div
      class="absolute right-0 top-0 bottom-0 w-96 transform transition-transform duration-300 z-40"
      :class="showSidebar ? 'translate-x-0' : 'translate-x-full'"
    >
      <div class="h-full glass-sidebar p-6 overflow-y-auto">
        <div class="flex items-center justify-between mb-6">
          <div class="flex items-center gap-2">
            <IconGem :size="24" :color="themeStore.themes[themeStore.currentTheme].primary" />
            <h3 class="text-xl font-bold text-white">Hidden Gems</h3>
            <span class="text-sm text-gray-400">({{ recommendations.length }})</span>
          </div>
          <button @click="showSidebar = false" class="text-white hover:text-gray-300">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div v-if="recommendations.length === 0" class="text-center py-12">
          <IconMusic :size="48" color="#666" class="mx-auto mb-4 opacity-50" />
          <p class="text-gray-400">Click Analyze to discover tracks</p>
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="track in recommendations"
            :key="track.id"
            @click="playTrack(track)"
            class="glass-track-card p-3 rounded-lg cursor-pointer hover:scale-[1.02] transition-transform"
          >
            <div class="flex items-center gap-3">
              <img
                v-if="track.album?.images?.[2]?.url"
                :src="track.album.images[2].url"
                alt="Album art"
                class="w-12 h-12 rounded"
              />
              <div class="flex-1 min-w-0">
                <p class="font-semibold text-white truncate text-sm">{{ track.name }}</p>
                <p class="text-xs text-gray-400 truncate">{{ track.artists?.map(a => a.name).join(', ') }}</p>
              </div>
              <div class="text-xs" :style="{ color: themeStore.themes[themeStore.currentTheme].primary }">
                {{ track.popularity }}%
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Toggle Sidebar Button -->
    <button
      v-if="!showSidebar && recommendations.length > 0"
      @click="showSidebar = true"
      class="absolute right-6 top-24 z-30 glass-btn-primary px-4 py-3 rounded-full"
    >
      <IconGem :size="20" />
    </button>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useThemeStore } from '../stores/theme'
import spotifyService from '../services/spotify'
import RecommendationEngine from '../services/recommendationEngine'
import DramaticVisualizer from '../components/Visualizer/DramaticVisualizer.vue'
import IconPalette from '../components/icons/IconPalette.vue'
import IconAnalyze from '../components/icons/IconAnalyze.vue'
import IconMusic from '../components/icons/IconMusic.vue'
import IconGem from '../components/icons/IconGem.vue'
import IconSpectrum from '../components/icons/IconSpectrum.vue'
import IconParticles from '../components/icons/IconParticles.vue'
import IconWaveform from '../components/icons/IconWaveform.vue'

const router = useRouter()
const authStore = useAuthStore()
const themeStore = useThemeStore()

const isAnalyzing = ref(false)
const isPlaying = ref(false)
const currentTrack = ref(null)
const audioFeatures = ref(null)
const recommendations = ref([])
const currentMode = ref('spectrum')
const showModeMenu = ref(false)
const showThemeMenu = ref(false)
const showSidebar = ref(false)
const modeDropdownRef = ref(null)
const themeDropdownRef = ref(null)

const visualizerModes = [
  { id: 'spectrum', name: 'Frequency Spectrum', icon: IconSpectrum },
  { id: 'particles', name: 'Particle Field', icon: IconParticles },
  { id: 'waveform', name: 'Waveform Rings', icon: IconWaveform }
]

let player = null
let deviceId = null

onMounted(() => {
  loadSpotifyPlayer()
  checkCurrentPlayback()
  themeStore.loadSavedTheme()

  // Close dropdowns when clicking outside
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  if (player) player.disconnect()
  document.removeEventListener('click', handleClickOutside)
})

const handleClickOutside = (e) => {
  if (modeDropdownRef.value && !modeDropdownRef.value.contains(e.target)) {
    showModeMenu.value = false
  }
  if (themeDropdownRef.value && !themeDropdownRef.value.contains(e.target)) {
    showThemeMenu.value = false
  }
}

const loadSpotifyPlayer = () => {
  if (!window.Spotify) {
    const script = document.createElement('script')
    script.src = 'https://sdk.scdn.co/spotify-player.js'
    script.async = true
    document.body.appendChild(script)
  }

  window.onSpotifyWebPlaybackSDKReady = () => {
    player = new window.Spotify.Player({
      name: 'Discovery Studio Player',
      getOAuthToken: cb => { cb(authStore.accessToken) },
      volume: 0.7
    })

    player.addListener('ready', ({ device_id }) => {
      deviceId = device_id
    })

    player.addListener('player_state_changed', state => {
      if (!state) return
      currentTrack.value = state.track_window.current_track
      isPlaying.value = !state.paused

      // Load audio features for current track
      if (currentTrack.value?.id) {
        loadAudioFeatures(currentTrack.value.id)
      }
    })

    player.connect()
  }
}

const loadAudioFeatures = async (trackId) => {
  try {
    audioFeatures.value = await spotifyService.getTrackAudioFeatures(trackId)
  } catch (error) {
    console.error('Error loading audio features:', error)
  }
}

const checkCurrentPlayback = async () => {
  try {
    const playback = await spotifyService.getCurrentPlayback()
    if (playback?.item) {
      currentTrack.value = playback.item
      isPlaying.value = playback.is_playing
      if (playback.item.id) {
        loadAudioFeatures(playback.item.id)
      }
    }
  } catch (error) {
    console.error('Error checking playback:', error)
  }
}

const startAnalysis = async () => {
  if (isAnalyzing.value) return

  isAnalyzing.value = true

  try {
    let allTracks = []
    let allArtists = []

    for (const timeRange of ['long_term', 'medium_term', 'short_term']) {
      if (allTracks.length >= 30) break
      try {
        const topTracks = await spotifyService.getUserTopTracks(timeRange, 30)
        if (topTracks?.items?.length > 0) {
          allTracks = [...allTracks, ...topTracks.items.filter(t => !t.is_local)]
          break
        }
      } catch (error) {
        console.log(`${timeRange} unavailable`)
      }
    }

    for (const timeRange of ['long_term', 'medium_term']) {
      if (allArtists.length >= 20) break
      try {
        const topArtists = await spotifyService.getUserTopArtists(timeRange, 20)
        if (topArtists?.items?.length > 0) {
          allArtists = [...allArtists, ...topArtists.items]
        }
      } catch (error) {
        // Silent fail
      }
    }

    const uniqueTracks = Array.from(
      new Map(allTracks.filter(t => t && t.id).map(t => [t.id, t])).values()
    )

    const uniqueArtists = Array.from(
      new Map(allArtists.filter(a => a && a.id).map(a => [a.id, a])).values()
    )

    if (uniqueTracks.length === 0) {
      alert('No music data found! Play some songs on Spotify first.')
      return
    }

    const result = await RecommendationEngine.generateRecommendations(
      spotifyService,
      uniqueTracks,
      uniqueArtists,
      { maxPopularity: 50 }
    )

    recommendations.value = result.tracks
    showSidebar.value = true
  } catch (error) {
    console.error('Analysis error:', error)
    alert(`Analysis failed: ${error.message}`)
  } finally {
    isAnalyzing.value = false
  }
}

const stopAnalysis = () => {
  isAnalyzing.value = false
}

const playTrack = async (track) => {
  try {
    if (deviceId) {
      await spotifyService.play([track.uri], deviceId)
    } else {
      await spotifyService.play([track.uri])
    }
    currentTrack.value = track
    isPlaying.value = true
    if (track.id) {
      loadAudioFeatures(track.id)
    }
  } catch (error) {
    console.error('Error playing track:', error)
  }
}

const togglePlayback = async () => {
  try {
    if (isPlaying.value) {
      await spotifyService.pause(deviceId)
    } else {
      if (currentTrack.value) {
        await spotifyService.play([currentTrack.value.uri], deviceId)
      }
    }
  } catch (error) {
    console.error('Error toggling playback:', error)
  }
}

const nextTrack = async () => {
  try {
    await spotifyService.skipToNext(deviceId)
    setTimeout(checkCurrentPlayback, 500)
  } catch (error) {
    console.error('Error skipping to next:', error)
  }
}

const previousTrack = async () => {
  try {
    await spotifyService.skipToPrevious(deviceId)
    setTimeout(checkCurrentPlayback, 500)
  } catch (error) {
    console.error('Error skipping to previous:', error)
  }
}

const handleLogout = () => {
  authStore.logout()
  router.push('/')
}
</script>

<style scoped>
.glass-btn {
  @apply bg-white bg-opacity-10 backdrop-blur-md border border-white border-opacity-20
         text-white font-medium rounded-lg
         hover:bg-opacity-20 transition-all duration-200;
}

.glass-btn-primary {
  @apply bg-white bg-opacity-20 backdrop-blur-md border border-white border-opacity-30
         text-white font-semibold rounded-lg
         hover:bg-opacity-30 hover:scale-105 transition-all duration-200
         disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100;
}

.glass-dropdown {
  @apply bg-black bg-opacity-80 backdrop-blur-xl border border-white border-opacity-20
         rounded-lg shadow-2xl overflow-hidden;
}

.dropdown-item {
  @apply w-full px-4 py-3 text-left text-sm text-white
         hover:bg-white hover:bg-opacity-10 transition-all duration-150
         flex items-center gap-3;
}

.dropdown-item.active {
  @apply bg-white bg-opacity-10;
}

.glass-sidebar {
  @apply bg-black bg-opacity-70 backdrop-blur-2xl border-l border-white border-opacity-10;
}

.glass-track-card {
  @apply bg-white bg-opacity-5 border border-white border-opacity-10
         hover:bg-opacity-10 hover:border-opacity-20;
}
</style>
