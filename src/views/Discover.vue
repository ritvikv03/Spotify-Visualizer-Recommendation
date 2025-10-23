<template>
  <div class="min-h-screen">
    <!-- Header -->
    <header class="glass-effect border-b border-white border-opacity-10 sticky top-0 z-50">
      <div class="container mx-auto px-4 py-4">
        <div class="flex items-center justify-between flex-wrap gap-4">
          <div class="flex items-center gap-4">
            <h1 class="text-xl md:text-2xl font-bold bg-gradient-to-r from-spotify-green to-emerald-500 bg-clip-text text-transparent">
              Discovery Studio
            </h1>
            <span v-if="authStore.user" class="text-gray-400 text-xs md:text-sm hidden sm:inline">
              Welcome, {{ authStore.user.display_name }}!
            </span>
          </div>
          
          <div class="flex items-center gap-2 md:gap-4">
            <!-- Theme Selector -->
            <select 
              v-model="themeStore.currentTheme"
              class="bg-spotify-gray px-2 md:px-3 py-2 rounded text-xs md:text-sm border border-white border-opacity-20 hover:border-opacity-40 transition-colors"
            >
              <option v-for="(theme, key) in themeStore.themes" :key="key" :value="key">
                {{ theme.name }}
              </option>
            </select>
            
            <button 
              @click="isAnalyzing ? stopAnalysis() : startAnalysis()" 
              :class="isAnalyzing ? 'btn-secondary' : 'btn-primary'"
              class="text-xs md:text-sm px-4 md:px-6 py-2 md:py-3"
            >
              {{ isAnalyzing ? '⏸ Stop' : '▶ Analyze' }}
            </button>
            <button @click="handleLogout" class="btn-secondary text-xs md:text-sm px-4 md:px-6 py-2 md:py-3">
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <div class="container mx-auto px-4 py-8">
      <div class="grid lg:grid-cols-3 gap-6 md:gap-8">
        <!-- Left Column - Visualizer -->
        <div class="lg:col-span-2 space-y-4 md:space-y-6">
          <!-- Visualizer Card -->
          <div class="card">
            <h2 class="text-xl md:text-2xl font-bold mb-4 flex items-center gap-2">
              🌌 Music Cosmos
              <span v-if="isPlaying" class="text-xs md:text-sm font-normal text-spotify-green">(Live)</span>
            </h2>
            <CosmicVisualizer 
              :is-playing="isPlaying" 
              :tracks="recommendations"
              @play-track="playTrack"
              class="h-[300px] md:h-[400px] lg:h-[600px]"
            />
          </div>

          <!-- Now Playing Card -->
          <div v-if="currentTrack" class="card">
            <h3 class="text-xl font-semibold mb-4">Now Playing</h3>
            <div class="flex items-center gap-4">
              <img 
                v-if="currentTrack.album?.images?.[0]?.url" 
                :src="currentTrack.album.images[0].url" 
                alt="Album art"
                class="w-24 h-24 rounded-lg shadow-lg"
              />
              <div class="flex-1">
                <h4 class="text-lg font-semibold">{{ currentTrack.name }}</h4>
                <p class="text-gray-400">{{ currentTrack.artists?.map(a => a.name).join(', ') }}</p>
                <p class="text-sm text-gray-500 mt-1">{{ currentTrack.album?.name }}</p>
              </div>
            </div>
            
            <!-- Playback Controls -->
            <div class="mt-6 flex items-center justify-center gap-4">
              <button @click="previousTrack" class="hover:text-spotify-green transition-colors">
                <svg class="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
                </svg>
              </button>
              
              <button 
                @click="togglePlayback" 
                class="bg-spotify-green rounded-full p-4 hover:scale-110 transition-transform"
              >
                <svg v-if="!isPlaying" class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
                <svg v-else class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6zm8 0h4v16h-4z"/>
                </svg>
              </button>
              
              <button @click="nextTrack" class="hover:text-spotify-green transition-colors">
                <svg class="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
                </svg>
              </button>
            </div>
          </div>

          <!-- Analysis Results -->
          <div v-if="analysisComplete && tasteProfile" class="card">
            <h3 class="text-xl font-semibold mb-4">Your Music Taste Profile</h3>
            <div class="grid grid-cols-2 gap-4">
              <div class="bg-spotify-dark p-4 rounded-lg">
                <p class="text-sm text-gray-400">Average Energy</p>
                <p class="text-2xl font-bold text-spotify-green">{{ (tasteProfile.avgEnergy * 100).toFixed(0) }}%</p>
              </div>
              <div class="bg-spotify-dark p-4 rounded-lg">
                <p class="text-sm text-gray-400">Average Danceability</p>
                <p class="text-2xl font-bold text-spotify-green">{{ (tasteProfile.avgDanceability * 100).toFixed(0) }}%</p>
              </div>
              <div class="bg-spotify-dark p-4 rounded-lg">
                <p class="text-sm text-gray-400">Average Valence</p>
                <p class="text-2xl font-bold text-spotify-green">{{ (tasteProfile.avgValence * 100).toFixed(0) }}%</p>
              </div>
              <div class="bg-spotify-dark p-4 rounded-lg">
                <p class="text-sm text-gray-400">Top Genre</p>
                <p class="text-lg font-bold text-spotify-green">{{ tasteProfile.topGenre || 'Mixed' }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Column - Recommendations -->
        <div class="space-y-6">
          <!-- Discovery Filters -->
          <DiscoveryFilters @update="updateFilters" />

          <!-- Discovery Queue -->
          <div class="card">
            <h3 class="text-xl font-semibold mb-4 flex items-center gap-2">
              💎 Hidden Gems
              <span class="text-sm font-normal text-gray-400">({{ recommendations.length }})</span>
            </h3>
            
            <div v-if="isLoadingRecommendations" class="text-center py-8">
              <div class="animate-spin w-8 h-8 border-4 border-spotify-green border-t-transparent rounded-full mx-auto"></div>
              <p class="text-gray-400 mt-4">Finding hidden gems...</p>
            </div>

            <div v-else-if="recommendations.length === 0" class="text-center py-8">
              <p class="text-gray-400 mb-4">Click "Analyze My Taste" to discover new music!</p>
            </div>

            <div v-else class="space-y-3 max-h-[600px] overflow-y-auto">
              <div 
                v-for="track in recommendations" 
                :key="track.id"
                class="bg-spotify-dark p-3 rounded-lg hover:bg-opacity-60 transition-all hover:scale-[1.02] relative group"
              >
                <div class="flex items-center gap-3">
                  <img 
                    v-if="track.album?.images?.[2]?.url" 
                    :src="track.album.images[2].url" 
                    alt="Album art"
                    class="w-12 h-12 rounded cursor-pointer"
                    @click="playTrack(track)"
                  />
                  <div class="flex-1 min-w-0 cursor-pointer" @click="playTrack(track)">
                    <p class="font-semibold truncate">{{ track.name }}</p>
                    <p class="text-sm text-gray-400 truncate">{{ track.artists?.map(a => a.name).join(', ') }}</p>
                  </div>
                  <div class="flex items-center gap-2">
                    <button
                      @click="toggleFavorite(track)"
                      class="text-2xl hover:scale-125 transition-transform"
                      :title="isFavorited(track) ? 'Remove from favorites' : 'Add to favorites'"
                    >
                      {{ isFavorited(track) ? '❤️' : '🤍' }}
                    </button>
                    <div class="text-xs text-spotify-green">
                      {{ track.popularity }}% 
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <button 
              v-if="analysisComplete && recommendations.length > 0"
              @click="loadMoreRecommendations" 
              class="btn-secondary w-full mt-4"
              :disabled="isLoadingRecommendations"
            >
              Load More
            </button>

            <button 
              v-if="savedTracks.length > 0"
              @click="saveToPlaylist" 
              class="btn-primary w-full mt-2 flex items-center justify-center gap-2"
              :disabled="isSavingPlaylist"
            >
              <span v-if="!isSavingPlaylist">💾 Save {{ savedTracks.length }} to Playlist</span>
              <span v-else>Saving...</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useThemeStore } from '../stores/theme'
import spotifyService from '../services/spotify'
import CosmicVisualizer from '../components/Visualizer/CosmicVisualizer.vue'
import DiscoveryFilters from '../components/Discovery/DiscoveryFilters.vue'

const router = useRouter()
const authStore = useAuthStore()
const themeStore = useThemeStore()

const isAnalyzing = ref(false)
const analysisComplete = ref(false)
const isLoadingRecommendations = ref(false)
const isSavingPlaylist = ref(false)
const tasteProfile = ref(null)
const recommendations = ref([])
const savedTracks = ref([]) // Favorited tracks
const currentTrack = ref(null)
const isPlaying = ref(false)
const discoveryFilters = ref({
  maxPopularity: 50,
  targetEnergy: 0.5,
  targetDanceability: 0.5,
  targetValence: 0.5,
  minYear: 1980,
  maxYear: 2025,
  genre: '',
  useAcousticness: false,
  targetAcousticness: 0.5
})

let player = null
let deviceId = null

// Initialize Spotify Web Playback SDK
onMounted(() => {
  loadSpotifyPlayer()
  checkCurrentPlayback()
  themeStore.loadSavedTheme()
})

onUnmounted(() => {
  if (player) {
    player.disconnect()
  }
})

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
      volume: 0.5
    })

    player.addListener('ready', ({ device_id }) => {
      console.log('Ready with Device ID', device_id)
      deviceId = device_id
    })

    player.addListener('player_state_changed', state => {
      if (!state) return
      
      currentTrack.value = state.track_window.current_track
      isPlaying.value = !state.paused
    })

    player.connect()
  }
}

const checkCurrentPlayback = async () => {
  try {
    const playback = await spotifyService.getCurrentPlayback()
    if (playback?.item) {
      currentTrack.value = playback.item
      isPlaying.value = playback.is_playing
    }
  } catch (error) {
    console.error('Error checking playback:', error)
  }
}

const startAnalysis = async () => {
  isAnalyzing.value = true
  isLoadingRecommendations.value = true
  
  try {
    console.log('Starting analysis...')
    
    // Try different time ranges as fallback
    let topTracks = null
    let topArtists = null
    
    // Try short_term first (last 4 weeks)
    try {
      console.log('Trying short_term...')
      topTracks = await spotifyService.getUserTopTracks('short_term', 20)
      topArtists = await spotifyService.getUserTopArtists('short_term', 10)
    } catch (error) {
      console.log('short_term failed, trying medium_term...', error)
      // Fallback to medium_term (last 6 months)
      try {
        topTracks = await spotifyService.getUserTopTracks('medium_term', 20)
        topArtists = await spotifyService.getUserTopArtists('medium_term', 10)
      } catch (error2) {
        console.log('medium_term failed, trying long_term...', error2)
        // Last resort: long_term (all time)
        topTracks = await spotifyService.getUserTopTracks('long_term', 20)
        topArtists = await spotifyService.getUserTopArtists('long_term', 10)
      }
    }

    console.log('Got top tracks:', topTracks?.items?.length || 0)
    console.log('Got top artists:', topArtists?.items?.length || 0)

    if (!topTracks?.items?.length) {
      alert('No listening history found! Play some music on Spotify first, then try again in a few minutes.')
      isAnalyzing.value = false
      isLoadingRecommendations.value = false
      return
    }

    // Get audio features
    const trackIds = topTracks.items.map(t => t.id)
    console.log('Fetching audio features for', trackIds.length, 'tracks...')
    const audioFeatures = await spotifyService.getAudioFeatures(trackIds)

    console.log('Got audio features:', audioFeatures)

    // Calculate taste profile
    const features = audioFeatures.audio_features.filter(f => f !== null)
    
    if (features.length === 0) {
      alert('Could not analyze audio features. Try again!')
      isAnalyzing.value = false
      isLoadingRecommendations.value = false
      return
    }

    tasteProfile.value = {
      avgEnergy: features.reduce((sum, f) => sum + f.energy, 0) / features.length,
      avgDanceability: features.reduce((sum, f) => sum + f.danceability, 0) / features.length,
      avgValence: features.reduce((sum, f) => sum + f.valence, 0) / features.length,
      topGenre: topArtists.items[0]?.genres?.[0] || 'Mixed'
    }

    console.log('Taste profile:', tasteProfile.value)

    // Get recommendations focusing on lesser-known artists
    await loadRecommendations()
    
    analysisComplete.value = true
    console.log('Analysis complete! Found', recommendations.value.length, 'recommendations')
  } catch (error) {
    console.error('Analysis error:', error)
    console.error('Error details:', error.response?.data || error.message)
    alert('Error analyzing your taste: ' + error.message + '. Check console for details.')
  } finally {
    isAnalyzing.value = false
    isLoadingRecommendations.value = false
  }
}

const loadRecommendations = async () => {
  try {
    // Get seed tracks from top tracks
    const topTracks = await spotifyService.getUserTopTracks('short_term', 5)
    const seedTracks = topTracks.items.slice(0, 3).map(t => t.id)

    // Build parameters with filters
    const params = {
      seed_tracks: seedTracks,
      limit: 20,
      max_popularity: discoveryFilters.value.maxPopularity,
      target_energy: discoveryFilters.value.targetEnergy,
      target_danceability: discoveryFilters.value.targetDanceability,
      target_valence: discoveryFilters.value.targetValence
    }

    // Add optional filters
    if (discoveryFilters.value.useAcousticness) {
      params.target_acousticness = discoveryFilters.value.targetAcousticness
    }

    // Request recommendations
    const recs = await spotifyService.getRecommendations(params)

    // Filter by year if needed
    let filteredTracks = recs.tracks
    if (discoveryFilters.value.minYear > 1950 || discoveryFilters.value.maxYear < 2025) {
      filteredTracks = recs.tracks.filter(track => {
        if (!track.album?.release_date) return true
        const year = parseInt(track.album.release_date.substring(0, 4))
        return year >= discoveryFilters.value.minYear && year <= discoveryFilters.value.maxYear
      })
    }

    recommendations.value = [...recommendations.value, ...filteredTracks]
  } catch (error) {
    console.error('Error loading recommendations:', error)
  }
}

const updateFilters = (newFilters) => {
  discoveryFilters.value = newFilters
  // Refresh recommendations with new filters
  if (analysisComplete.value) {
    recommendations.value = []
    loadRecommendations()
  }
}

const loadMoreRecommendations = async () => {
  isLoadingRecommendations.value = true
  await loadRecommendations()
  isLoadingRecommendations.value = false
}

const stopAnalysis = () => {
  isAnalyzing.value = false
}

const playTrack = async (track) => {
  try {
    if (deviceId) {
      await spotifyService.play([track.uri], deviceId)
    } else {
      // Fallback to default device
      await spotifyService.play([track.uri])
    }
    currentTrack.value = track
    isPlaying.value = true
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

const toggleFavorite = (track) => {
  const index = savedTracks.value.findIndex(t => t.id === track.id)
  if (index > -1) {
    savedTracks.value.splice(index, 1)
  } else {
    savedTracks.value.push(track)
  }
}

const isFavorited = (track) => {
  return savedTracks.value.some(t => t.id === track.id)
}

const saveToPlaylist = async () => {
  if (savedTracks.value.length === 0) return
  
  isSavingPlaylist.value = true
  
  try {
    const userId = authStore.user.id
    const playlistName = `Hidden Gems - ${new Date().toLocaleDateString()}`
    const description = `Discovered ${savedTracks.value.length} hidden gems with Discovery Studio`
    
    // Create playlist
    const playlist = await spotifyService.createPlaylist(userId, playlistName, description, true)
    
    // Add tracks
    const trackUris = savedTracks.value.map(t => t.uri)
    await spotifyService.addTracksToPlaylist(playlist.id, trackUris)
    
    alert(`✅ Saved ${savedTracks.value.length} tracks to "${playlistName}"!\n\nCheck your Spotify library!`)
    savedTracks.value = []
  } catch (error) {
    console.error('Error saving playlist:', error)
    alert('Error saving playlist. Check console for details.')
  } finally {
    isSavingPlaylist.value = false
  }
}
</script>
