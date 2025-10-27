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
    <div class="absolute top-0 left-0 right-0 z-30 p-3 sm:p-6">
      <div class="flex items-center justify-between gap-2">
        <!-- Logo -->
        <div class="flex items-center gap-2">
          <IconMusic :size="24" :sm-size="32" :color="themeStore.themes[themeStore.currentTheme].primary" />
          <h1 class="text-lg sm:text-2xl font-bold text-white">Discovery Studio</h1>
        </div>

        <!-- Controls -->
        <div class="flex items-center gap-1.5 sm:gap-3">
          <!-- Visualization Mode Dropdown -->
          <div class="relative" ref="modeDropdownRef">
            <button
              @click="showModeMenu = !showModeMenu"
              class="glass-btn px-2 sm:px-4 py-2 sm:py-2.5 flex items-center gap-1 sm:gap-2 touch-manipulation"
            >
              <component :is="visualizerModes.find(m => m.id === currentMode).icon" :size="18" color="#FFF" />
              <span class="hidden md:inline">{{ visualizerModes.find(m => m.id === currentMode).name }}</span>
              <svg class="w-4 h-4 transition-transform" :class="{ 'rotate-180': showModeMenu }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
              </svg>
            </button>

            <div v-if="showModeMenu" class="absolute top-full mt-2 left-0 sm:right-0 sm:left-auto glass-dropdown w-[calc(100vw-1.5rem)] sm:w-auto sm:min-w-[280px] max-w-[calc(100vw-1.5rem)]">
              <div class="px-3 py-2 border-b border-white border-opacity-10">
                <p class="text-xs text-gray-400 font-medium">Visualization Modes</p>
              </div>
              <button
                v-for="mode in visualizerModes"
                :key="mode.id"
                @click="currentMode = mode.id; showModeMenu = false"
                class="dropdown-item-detailed touch-manipulation active:bg-white active:bg-opacity-10"
                :class="{ 'active': currentMode === mode.id }"
              >
                <div class="flex items-start gap-3 flex-1">
                  <component :is="mode.icon" :size="20" :class="currentMode === mode.id ? 'text-white' : 'text-gray-400'" />
                  <div class="flex-1">
                    <p class="text-sm font-medium">{{ mode.name }}</p>
                    <p class="text-xs text-gray-400 mt-0.5">{{ mode.description }}</p>
                  </div>
                </div>
                <svg v-if="currentMode === mode.id" class="w-4 h-4 flex-shrink-0" :style="{ color: themeStore.themes[themeStore.currentTheme].primary }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
              </button>
            </div>
          </div>

          <!-- Theme Dropdown -->
          <div class="relative" ref="themeDropdownRef">
            <button
              @click="showThemeMenu = !showThemeMenu"
              class="glass-btn px-2 sm:px-4 py-2 sm:py-2.5 flex items-center gap-1 sm:gap-2 touch-manipulation"
              :style="{ borderColor: themeStore.themes[themeStore.currentTheme].primary + '40' }"
            >
              <IconPalette :size="18" />
              <span class="hidden md:inline">{{ themeStore.themes[themeStore.currentTheme].name }}</span>
              <svg class="w-4 h-4 transition-transform" :class="{ 'rotate-180': showThemeMenu }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
              </svg>
            </button>

            <div v-if="showThemeMenu" class="absolute top-full mt-2 left-0 sm:right-0 sm:left-auto glass-dropdown w-[calc(100vw-1.5rem)] sm:w-auto sm:min-w-[180px] max-w-[calc(100vw-1.5rem)]">
              <button
                v-for="(theme, key) in themeStore.themes"
                :key="key"
                @click="themeStore.currentTheme = key; showThemeMenu = false"
                class="dropdown-item touch-manipulation active:bg-white active:bg-opacity-10"
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
            class="glass-btn-primary px-3 sm:px-6 py-2 sm:py-2.5 flex items-center gap-1 sm:gap-2 touch-manipulation"
          >
            <IconAnalyze :size="18" :class="{ 'animate-spin': isAnalyzing }" />
            <span class="text-sm sm:text-base">{{ isAnalyzing ? 'Analyzing...' : 'Analyze' }}</span>
          </button>

          <!-- Logout -->
          <button @click="handleLogout" class="glass-btn px-2 sm:px-4 py-2 sm:py-2.5 touch-manipulation">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Side Panel for Recommendations (Slide in on demand) -->
    <div
      class="absolute right-0 top-0 bottom-0 w-full sm:w-96 transform transition-transform duration-300 z-40"
      :class="showSidebar ? 'translate-x-0' : 'translate-x-full'"
    >
      <div class="h-full glass-sidebar p-4 sm:p-6 overflow-y-auto">
        <div class="mb-6">
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-2">
              <IconGem :size="24" :color="themeStore.themes[themeStore.currentTheme].primary" />
              <h3 class="text-xl font-bold text-white">Hidden Gems</h3>
            </div>
            <button @click="showSidebar = false" class="text-white hover:text-gray-300 touch-manipulation">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <div class="flex items-center gap-2 text-xs text-gray-400">
            <span>Showing {{ recommendations.length }} of {{ allAvailableTracks.length }}</span>
            <span v-if="allAvailableTracks.length > recommendations.length">•</span>
            <span v-if="allAvailableTracks.length > recommendations.length" class="text-green-400">
              {{ allAvailableTracks.length - recommendations.length }} more available
            </span>
          </div>
        </div>

        <div v-if="recommendations.length === 0" class="text-center py-12">
          <IconMusic :size="48" color="#666" class="mx-auto mb-4 opacity-50" />
          <p class="text-gray-400">Click Analyze to discover tracks</p>
        </div>

        <div v-else>
          <!-- Action Buttons -->
          <div class="flex gap-2 mb-4">
            <!-- Refresh Button -->
            <button
              @click="refreshRecommendations"
              class="flex-1 glass-btn px-4 py-3.5 sm:py-3 flex items-center justify-center gap-2 touch-manipulation active:scale-95 transition-transform text-sm sm:text-base"
              :style="{ borderColor: themeStore.themes[themeStore.currentTheme].primary + '40' }"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
              <span class="hidden sm:inline">Refresh</span>
            </button>

            <!-- Generate Playlist Button -->
            <button
              @click="generatePlaylist"
              :disabled="isGeneratingPlaylist"
              class="flex-1 glass-btn-primary px-4 py-3.5 sm:py-3 flex items-center justify-center gap-2 touch-manipulation active:scale-95 transition-transform text-sm sm:text-base"
            >
              <svg class="w-5 h-5" :class="{ 'animate-spin': isGeneratingPlaylist }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
              </svg>
              <span class="hidden sm:inline">{{ isGeneratingPlaylist ? 'Creating...' : 'Save Playlist' }}</span>
              <span class="sm:hidden">{{ isGeneratingPlaylist ? '...' : 'Save' }}</span>
            </button>
          </div>

          <!-- Track List -->
          <div class="space-y-3">
            <div
              v-for="track in recommendations"
              :key="track.id"
              class="glass-track-card p-3 rounded-lg transition-all hover:bg-opacity-15"
            >
              <!-- Click area for playing -->
              <div class="flex items-center gap-2">
                <div @click="playTrack(track)" class="flex items-center gap-3 cursor-pointer flex-1 touch-manipulation active:scale-95 transition-transform min-w-0">
                  <img
                    v-if="track.album?.images?.[2]?.url"
                    :src="track.album.images[2].url"
                    alt="Album art"
                    class="w-14 h-14 sm:w-12 sm:h-12 rounded flex-shrink-0"
                  />
                  <div class="flex-1 min-w-0">
                    <p class="font-semibold text-white truncate text-sm sm:text-base">{{ cleanTrackName(track.name) }}</p>
                    <p class="text-xs sm:text-sm text-gray-400 truncate">{{ track.artists?.map(a => a.name).join(', ') }}</p>
                  </div>
                  <div class="text-xs sm:text-sm font-semibold tabular-nums flex-shrink-0 w-12 text-right" :style="{ color: themeStore.themes[themeStore.currentTheme].primary }">
                    {{ track.popularity }}%
                  </div>
                </div>
                <!-- Replace button (fixed positioning) -->
                <button
                  @click="replaceTrack(track)"
                  class="w-9 h-9 sm:w-7 sm:h-7 flex items-center justify-center rounded-full bg-white bg-opacity-5 hover:bg-opacity-15 active:bg-opacity-20 transition-all text-gray-400 hover:text-red-400 touch-manipulation flex-shrink-0"
                  title="Replace this song"
                >
                  <svg class="w-5 h-5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>

              <!-- Action Buttons -->
              <div class="flex items-center gap-2">
                <button
                  @click="toggleLikeTrack(track)"
                  class="flex-1 text-xs sm:text-sm px-3 py-2.5 sm:py-2 rounded-lg transition-all touch-manipulation active:scale-95"
                  :class="track.isLiked ? 'bg-green-500 bg-opacity-20 text-green-400' : 'bg-white bg-opacity-5 text-gray-400 hover:bg-opacity-10 active:bg-opacity-15'"
                >
                  <svg class="w-4 h-4 inline mr-1" :fill="track.isLiked ? 'currentColor' : 'none'" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
                  </svg>
                  {{ track.isLiked ? 'Liked' : 'Like' }}
                </button>
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
      class="absolute right-3 sm:right-6 top-20 sm:top-24 z-30 glass-btn-primary px-4 py-3 rounded-full touch-manipulation shadow-lg"
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
const replacementTracks = ref([])
const allAvailableTracks = ref([]) // All 150 tracks for refresh pool
const currentMode = ref('kaleidosync')
const showModeMenu = ref(false)
const showThemeMenu = ref(false)
const showSidebar = ref(false)
const modeDropdownRef = ref(null)
const themeDropdownRef = ref(null)
const isGeneratingPlaylist = ref(false)

const visualizerModes = [
  { id: 'kaleidosync', name: 'Kaleidoscope', icon: IconSpectrum, description: 'Multi-layer symmetrical patterns' },
  { id: 'vortex', name: 'Vortex', icon: IconGem, description: 'Infinite spiral tunnel' },
  { id: 'starfield', name: 'Star Field', icon: IconParticles, description: 'Cosmic nebula with stars' },
  { id: 'mandala', name: 'Fractal Mandala', icon: IconMusic, description: 'Recursive sacred geometry' },
  { id: 'bars', name: 'Radial Bars', icon: IconWaveform, description: 'Circular audio spectrum' }
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
      { maxPopularity: 100, limit: 200 } // Fetch 200 to ensure 50+ after filtering
    )

    console.log('✓ Generated recommendations:', {
      total: result.tracks.length,
      maxPopularity: 100,
      avgPopularity: Math.round(result.tracks.reduce((sum, t) => sum + t.popularity, 0) / result.tracks.length)
    })

    // Sort recommendations by popularity in descending order (most popular first)
    const sortedTracks = result.tracks.sort((a, b) => b.popularity - a.popularity)

    // Check which tracks are already liked
    try {
      const trackIds = sortedTracks.map(t => t.id)
      const likedStatus = await spotifyService.checkSavedTracks(trackIds)
      sortedTracks.forEach((track, index) => {
        track.isLiked = likedStatus[index] || false
      })
    } catch (error) {
      console.error('Error checking liked status:', error)
      sortedTracks.forEach(track => {
        track.isLiked = false
      })
    }

    // Store all tracks for refresh functionality
    allAvailableTracks.value = sortedTracks

    // Split into displayed recommendations (first 50) and replacement pool (rest)
    recommendations.value = sortedTracks.slice(0, 50)
    replacementTracks.value = sortedTracks.slice(50)

    console.log('✓ Recommendations split:', {
      displayed: recommendations.value.length,
      replacementPool: replacementTracks.value.length,
      total: allAvailableTracks.value.length,
      availableForRefresh: allAvailableTracks.value.length - 50
    })

    // Log final count for debugging
    console.log(`🎵 Final recommendation count: ${recommendations.value.length} tracks`)

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

const toggleLikeTrack = async (track) => {
  try {
    if (track.isLiked) {
      await spotifyService.removeTrack(track.id)
      track.isLiked = false
    } else {
      await spotifyService.saveTrack(track.id)
      track.isLiked = true
    }
  } catch (error) {
    console.error('Error toggling like:', error)
    alert('Failed to update liked status')
  }
}

// Clean track name - remove parentheses and content inside them
const cleanTrackName = (name) => {
  if (!name) return ''
  // Remove anything in parentheses: (feat. Artist), (Remix), (Remastered), etc.
  return name.replace(/\s*\([^)]*\)/g, '').trim()
}

const replaceTrack = async (track) => {
  // Check if we have replacement tracks available
  if (replacementTracks.value.length === 0) {
    console.warn('No more replacement tracks available')
    return
  }

  try {
    // Get the next replacement track
    const replacementTrack = replacementTracks.value.shift()

    // Check if the replacement track is liked
    try {
      const likedStatus = await spotifyService.checkSavedTracks([replacementTrack.id])
      replacementTrack.isLiked = likedStatus[0] || false
    } catch (error) {
      console.error('Error checking liked status for replacement:', error)
      replacementTrack.isLiked = false
    }

    // Find the index of the track to replace
    const index = recommendations.value.findIndex(t => t.id === track.id)

    if (index !== -1) {
      // Replace the track with smooth transition
      recommendations.value.splice(index, 1, replacementTrack)
      console.log('Replaced track:', track.name, '→', replacementTrack.name)
    }
  } catch (error) {
    console.error('Error replacing track:', error)
  }
}

const refreshRecommendations = async () => {
  // Check if we have enough tracks to refresh
  if (allAvailableTracks.value.length < 40) {
    console.warn('Not enough tracks to refresh. Run Analyze again for more recommendations.')
    return
  }

  try {
    // Get currently displayed track IDs to avoid showing them immediately
    const currentTrackIds = new Set(recommendations.value.map(t => t.id))

    // Filter available tracks to exclude currently displayed ones
    const availableForRefresh = allAvailableTracks.value.filter(t => !currentTrackIds.has(t.id))

    if (availableForRefresh.length < 50) {
      console.warn('Not enough new tracks available. Refreshing with all available tracks.')
      // If we don't have enough unique tracks, just rotate from the beginning
      recommendations.value = allAvailableTracks.value.slice(50, 100)
      replacementTracks.value = allAvailableTracks.value.slice(100).concat(allAvailableTracks.value.slice(0, 50))
    } else {
      // Get next 50 tracks from the available pool
      const newRecommendations = availableForRefresh.slice(0, 50)

      // Check liked status for new recommendations
      try {
        const trackIds = newRecommendations.map(t => t.id)
        const likedStatus = await spotifyService.checkSavedTracks(trackIds)
        newRecommendations.forEach((track, index) => {
          track.isLiked = likedStatus[index] || false
        })
      } catch (error) {
        console.error('Error checking liked status:', error)
        newRecommendations.forEach(track => {
          track.isLiked = false
        })
      }

      // Update displayed recommendations
      recommendations.value = newRecommendations

      // Update replacement pool (everything except what's displayed)
      replacementTracks.value = availableForRefresh.slice(50)

      console.log('🔄 Refreshed recommendations:', {
        displayed: recommendations.value.length,
        replacementPool: replacementTracks.value.length,
        total: allAvailableTracks.value.length
      })

      // Log final count for debugging
      console.log(`🎵 Final recommendation count after refresh: ${recommendations.value.length} tracks`)
    }
  } catch (error) {
    console.error('Error refreshing recommendations:', error)
  }
}

const generatePlaylist = async () => {
  if (isGeneratingPlaylist.value || recommendations.value.length === 0) return

  isGeneratingPlaylist.value = true

  try {
    // Get current user
    const user = await spotifyService.getCurrentUser()

    // Create playlist
    const timestamp = new Date().toLocaleDateString()
    const playlistName = `Discovery Studio - ${timestamp}`
    const playlistDescription = `Hidden gems discovered on ${timestamp} with Discovery Studio. Featuring ${recommendations.value.length} tracks sorted by uniqueness.`

    const playlist = await spotifyService.createPlaylist(
      user.id,
      playlistName,
      playlistDescription,
      true
    )

    // Add tracks to playlist
    const trackUris = recommendations.value.map(track => track.uri)
    await spotifyService.addTracksToPlaylist(playlist.id, trackUris)

    alert(`Playlist "${playlistName}" created successfully with ${recommendations.value.length} tracks!`)
  } catch (error) {
    console.error('Error generating playlist:', error)
    alert(`Failed to create playlist: ${error.message}`)
  } finally {
    isGeneratingPlaylist.value = false
  }
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

.dropdown-item-detailed {
  @apply w-full px-4 py-3 text-left text-white
         hover:bg-white hover:bg-opacity-10 transition-all duration-150
         flex items-center gap-3;
}

.dropdown-item-detailed.active {
  @apply bg-white bg-opacity-15;
}

.glass-sidebar {
  @apply bg-black bg-opacity-70 backdrop-blur-2xl border-l border-white border-opacity-10;
}

.glass-track-card {
  @apply bg-white bg-opacity-5 border border-white border-opacity-10
         hover:bg-opacity-10 hover:border-opacity-20;
}
</style>
