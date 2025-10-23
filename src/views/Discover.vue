<template>
  <div class="min-h-screen">
    <!-- Header -->
    <header class="glass-effect border-b border-white border-opacity-10 sticky top-0 z-50">
      <div class="container mx-auto px-2 sm:px-4 py-3 sm:py-4">
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2 sm:gap-4">
            <h1 class="text-base sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-spotify-green to-emerald-500 bg-clip-text text-transparent">
              Discovery Studio
            </h1>
            <span v-if="authStore.user" class="text-gray-400 text-xs hidden lg:inline">
              Welcome, {{ authStore.user.display_name }}!
            </span>
          </div>
          
          <div class="flex items-center gap-1 sm:gap-2 md:gap-4">
            <!-- Theme Selector -->
            <div class="relative">
              <button
                @click="showThemeMenu = !showThemeMenu"
                class="btn-secondary text-xs px-2 sm:px-4 md:px-6 py-2 md:py-3 flex items-center gap-1 sm:gap-2 font-semibold whitespace-nowrap"
                :style="{ 
                  backgroundColor: themeStore.themes[themeStore.currentTheme].primary,
                  color: themeStore.currentTheme === 'neon' || themeStore.currentTheme === 'ocean' ? '#000' : '#fff'
                }"
              >
                <span class="hidden sm:inline">🎨</span>
                <span>Theme</span>
                <svg class="w-3 h-3 sm:w-4 sm:h-4 transition-transform" :class="{ 'rotate-180': showThemeMenu }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                </svg>
              </button>
              
              <!-- Dropdown Menu -->
              <div 
                v-if="showThemeMenu"
                class="absolute top-full mt-2 right-0 bg-spotify-gray rounded-lg shadow-xl border border-white border-opacity-20 overflow-hidden z-50 min-w-[160px] sm:min-w-[180px]"
              >
                <button
                  v-for="(theme, key) in themeStore.themes"
                  :key="key"
                  @click="themeStore.currentTheme = key; showThemeMenu = false"
                  class="w-full px-3 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm hover:bg-opacity-80 transition-colors flex items-center gap-2 sm:gap-3"
                  :style="{ 
                    backgroundColor: theme.primary,
                    color: key === 'neon' || key === 'ocean' ? '#000' : '#fff'
                  }"
                >
                  <span v-if="themeStore.currentTheme === key" class="text-base sm:text-lg">✓</span>
                  <span v-else class="text-base sm:text-lg opacity-0">✓</span>
                  <span class="font-semibold">{{ theme.name }}</span>
                </button>
              </div>
            </div>
            
            <button
              @click="isAnalyzing ? stopAnalysis() : startAnalysis()"
              :class="isAnalyzing ? 'btn-secondary' : 'btn-primary'"
              class="text-xs px-2 sm:px-4 md:px-6 py-2 md:py-3 whitespace-nowrap"
              :disabled="isAnalyzing"
            >
              <span class="hidden sm:inline">{{ isAnalyzing ? '⏳ Analyzing...' : '✨ Analyze My Taste' }}</span>
              <span class="sm:hidden">{{ isAnalyzing ? '⏳' : '✨' }}</span>
            </button>
            <button @click="handleLogout" class="btn-secondary text-xs px-2 sm:px-4 md:px-6 py-2 md:py-3 whitespace-nowrap">
              <span class="hidden sm:inline">Logout</span>
              <span class="sm:hidden">Exit</span>
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
              🌌 Your Music Universe
              <span v-if="isPlaying" class="text-xs md:text-sm font-normal text-spotify-green animate-pulse">(🎵 Live Audio)</span>
              <span v-else-if="analysisComplete" class="text-xs md:text-sm font-normal text-cyan-400">(✨ Visualized)</span>
            </h2>
            <CosmicVisualizer
              :is-playing="isPlaying"
              :is-analyzed="analysisComplete"
              :tracks="recommendations"
              :taste-profile="tasteProfile"
              @play-track="playTrack"
              class="h-[300px] md:h-[400px] lg:h-[600px]"
            />
          </div>

          <!-- Error Message -->
          <div v-if="analysisError" class="card bg-red-900 bg-opacity-30 border border-red-500">
            <div class="flex items-start gap-3">
              <span class="text-2xl">⚠️</span>
              <div class="flex-1">
                <h3 class="font-semibold text-red-400 mb-2">Analysis Error</h3>
                <p class="text-sm text-gray-300">{{ analysisError }}</p>
                <button @click="analysisError = null" class="mt-3 text-xs text-red-400 hover:text-red-300">
                  Dismiss
                </button>
              </div>
            </div>
          </div>

          <!-- Now Playing Card -->
          <div v-if="currentTrack" class="card border border-spotify-green/30">
            <h3 class="text-xl font-semibold mb-4 flex items-center gap-2">
              <span class="text-spotify-green animate-pulse">♫</span>
              Now Playing
            </h3>
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
          <div v-if="analysisComplete && tasteProfile" class="card bg-gradient-to-br from-purple-900/30 to-blue-900/30 border border-purple-500/20">
            <h3 class="text-xl font-semibold mb-4">✨ Your Musical Identity</h3>
            <div class="grid grid-cols-2 gap-4">
              <div class="bg-black/40 p-4 rounded-lg backdrop-blur-sm border border-purple-500/10">
                <p class="text-sm text-gray-400">Popularity Index</p>
                <p class="text-2xl font-bold bg-gradient-to-r from-spotify-green to-emerald-400 bg-clip-text text-transparent">{{ tasteProfile.avgPopularity.toFixed(0) }}%</p>
                <p class="text-xs text-cyan-400 mt-1">
                  {{ tasteProfile.avgPopularity > 70 ? '🔥 Chart Chaser' :
                     tasteProfile.avgPopularity > 50 ? '🎵 Balanced Listener' :
                     '💎 Underground Explorer' }}
                </p>
              </div>
              <div class="bg-black/40 p-4 rounded-lg backdrop-blur-sm border border-purple-500/10">
                <p class="text-sm text-gray-400">Taste Diversity</p>
                <p class="text-2xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">{{ (tasteProfile.diversityScore * 100).toFixed(0) }}%</p>
                <p class="text-xs text-pink-400 mt-1">
                  {{ tasteProfile.diversityScore > 0.75 ? '🌈 Eclectic Adventurer' :
                     tasteProfile.diversityScore > 0.5 ? '🎨 Genre Hopper' :
                     '🎯 Genre Specialist' }}
                </p>
              </div>
              <div class="bg-black/40 p-4 rounded-lg backdrop-blur-sm border border-purple-500/10">
                <p class="text-sm text-gray-400">Core Genre</p>
                <p class="text-lg font-bold text-cyan-300 capitalize">{{ tasteProfile.topGenre }}</p>
              </div>
              <div class="bg-black/40 p-4 rounded-lg backdrop-blur-sm border border-purple-500/10">
                <p class="text-sm text-gray-400">Songs Analyzed</p>
                <p class="text-2xl font-bold text-emerald-400">{{ tasteProfile.tracksAnalyzed }}</p>
              </div>
            </div>
            <div v-if="tasteProfile.topGenres" class="mt-4 pt-4 border-t border-purple-500/20">
              <p class="text-sm text-gray-400 mb-3">🎼 Your Genre Palette:</p>
              <div class="flex flex-wrap gap-2">
                <span
                  v-for="genre in tasteProfile.topGenres"
                  :key="genre"
                  class="px-3 py-1 bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 rounded-full text-xs border border-purple-500/30 capitalize"
                >
                  {{ genre }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Column - Recommendations -->
        <div class="space-y-6">
          <!-- Discovery Filters -->
          <DiscoveryFilters @update="updateFilters" />

          <!-- Discovery Queue -->
          <div class="card border border-cyan-500/20">
            <h3 class="text-xl font-semibold mb-4 flex items-center gap-2">
              💎 Your Hidden Gems
              <span class="text-sm font-normal text-cyan-400">({{ recommendations.length }})</span>
            </h3>
            
            <div v-if="isLoadingRecommendations" class="text-center py-8">
              <div class="animate-spin w-8 h-8 border-4 border-spotify-green border-t-transparent rounded-full mx-auto"></div>
              <p class="text-gray-400 mt-4">✨ Discovering your perfect tracks...</p>
            </div>

            <div v-else-if="recommendations.length === 0" class="text-center py-8">
              <div class="text-6xl mb-4">🎵</div>
              <p class="text-lg font-semibold mb-2">Ready to Discover?</p>
              <p class="text-gray-400 text-sm">Click "✨ Analyze My Taste" above to unlock personalized hidden gems based on your music profile!</p>
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
              <span v-if="!isLoadingRecommendations">🔍 Discover More Gems</span>
              <span v-else>⏳ Searching...</span>
            </button>

            <button
              v-if="savedTracks.length > 0"
              @click="saveToPlaylist"
              class="btn-primary w-full mt-2 flex items-center justify-center gap-2"
              :disabled="isSavingPlaylist"
            >
              <span v-if="!isSavingPlaylist">💾 Save {{ savedTracks.length }} {{ savedTracks.length === 1 ? 'Track' : 'Tracks' }} to Spotify</span>
              <span v-else>✨ Creating Playlist...</span>
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
import RecommendationEngine from '../services/recommendationEngine'
import CosmicVisualizer from '../components/Visualizer/CosmicVisualizer.vue'
import DiscoveryFilters from '../components/Discovery/DiscoveryFilters.vue'

const router = useRouter()
const authStore = useAuthStore()
const themeStore = useThemeStore()

const isAnalyzing = ref(false)
const analysisComplete = ref(false)
const isLoadingRecommendations = ref(false)
const isSavingPlaylist = ref(false)
const analysisError = ref(null) // Track error state
const tasteProfile = ref(null)
const recommendations = ref([])
const savedTracks = ref([]) // Favorited tracks
const currentTrack = ref(null)
const isPlaying = ref(false)
const showThemeMenu = ref(false)
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
  
  // Close theme menu when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.relative')) {
      showThemeMenu.value = false
    }
  })
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
  if (isAnalyzing.value) return // Prevent multiple clicks
  
  isAnalyzing.value = true
  isLoadingRecommendations.value = true
  analysisError.value = null
  recommendations.value = [] // Clear old recommendations
  
  try {
    console.log('🎵 Starting smart analysis...')
    
    let allTracks = []
    let allArtists = []
    
    // Get user data from multiple sources
    try {
      // Try recently played first
      const recentResult = await spotifyService.getRecentlyPlayed(50)
      if (recentResult?.items?.length > 0) {
        allTracks = recentResult.items.map(item => item.track).filter(t => t && t.id && !t.is_local)
        console.log(`✓ ${allTracks.length} recent tracks`)
      }
    } catch (error) {
      console.log('Recently played unavailable')
    }
    
    // Get top tracks for better quality seeds
    for (const timeRange of ['long_term', 'medium_term', 'short_term']) {
      if (allTracks.length >= 30) break
      try {
        const topTracks = await spotifyService.getUserTopTracks(timeRange, 30)
        if (topTracks?.items?.length > 0) {
          allTracks = [...allTracks, ...topTracks.items.filter(t => !t.is_local)]
          console.log(`✓ ${topTracks.items.length} from ${timeRange}`)
          break
        }
      } catch (error) {
        console.log(`${timeRange} unavailable`)
      }
    }
    
    // Get top artists
    for (const timeRange of ['long_term', 'medium_term', 'short_term']) {
      if (allArtists.length >= 20) break
      try {
        const topArtists = await spotifyService.getUserTopArtists(timeRange, 20)
        if (topArtists?.items?.length > 0) {
          allArtists = [...allArtists, ...topArtists.items]
          console.log(`✓ ${topArtists.items.length} artists from ${timeRange}`)
        }
      } catch (error) {
        // Silent fail
      }
    }
    
    // Remove duplicates
    const uniqueTracks = Array.from(
      new Map(allTracks.filter(t => t && t.id).map(t => [t.id, t])).values()
    )
    
    const uniqueArtists = Array.from(
      new Map(allArtists.filter(a => a && a.id).map(a => [a.id, a])).values()
    )
    
    console.log(`🎯 ${uniqueTracks.length} unique tracks, ${uniqueArtists.length} unique artists`)

    if (uniqueTracks.length === 0) {
      analysisError.value = 'No music data found! Play 5-10 songs on Spotify first.'
      return
    }

    // Use the new recommendation engine!
    const result = await RecommendationEngine.generateRecommendations(
      spotifyService,
      uniqueTracks,
      uniqueArtists,
      discoveryFilters.value
    )

    // Update state
    recommendations.value = result.tracks
    tasteProfile.value = {
      avgPopularity: result.analysis.avgPopularity,
      topGenre: result.analysis.recentTrends[0] || 'Mixed',
      tracksAnalyzed: uniqueTracks.length,
      diversityScore: result.analysis.diversityScore,
      topGenres: result.analysis.recentTrends.slice(0, 3)
    }
    
    analysisComplete.value = true
    console.log(`🎉 Found ${recommendations.value.length} hidden gems!`)
    
  } catch (error) {
    console.error('❌ Analysis error:', error)

    // Enhanced error messaging based on error type
    if (error.response?.status === 403) {
      analysisError.value = `🔒 Access Denied: This app is in Development Mode. Please ask the developer to add your Spotify account to the app's allowlist in the Spotify Developer Dashboard, or try logging in with a different account that has been approved.`
    } else if (error.response?.status === 404) {
      analysisError.value = `⚠️ API Endpoint Not Found: Some Spotify features have been deprecated. Using alternative recommendation algorithm. Check console for details.`
    } else if (error.isDeprecatedEndpoint) {
      analysisError.value = `⚠️ ${error.message} Your analysis is using an alternative recommendation algorithm.`
    } else if (error.message.includes('No music data found')) {
      analysisError.value = error.message
    } else {
      analysisError.value = `Analysis failed: ${error.message}. Check console for details.`
    }
  } finally {
    isAnalyzing.value = false
    isLoadingRecommendations.value = false
  }
}

const loadRecommendations = async () => {
  // This is now handled by RecommendationEngine in startAnalysis
  // Keep this function for the "Load More" button
  try {
    if (!tasteProfile.value) return
    
    isLoadingRecommendations.value = true
    
    // Get fresh user data for new seeds
    const topTracks = await spotifyService.getUserTopTracks('short_term', 10).catch(() => 
      spotifyService.getUserTopTracks('long_term', 10)
    )
    const topArtists = await spotifyService.getUserTopArtists('short_term', 5).catch(() => 
      spotifyService.getUserTopArtists('long_term', 5)
    )
    
    if (!topTracks?.items?.length) {
      console.error('No tracks available for more recommendations')
      return
    }
    
    // Use recommendation engine
    const result = await RecommendationEngine.generateRecommendations(
      spotifyService,
      topTracks.items,
      topArtists?.items || [],
      discoveryFilters.value
    )

    // Add new recommendations (avoiding duplicates)
    const existingIds = new Set(recommendations.value.map(t => t.id))
    const newTracks = result.tracks.filter(t => !existingIds.has(t.id))
    
    recommendations.value = [...recommendations.value, ...newTracks]
    console.log(`✓ Added ${newTracks.length} more recommendations`)
  } catch (error) {
    console.error('Error loading more recommendations:', error)

    // Enhanced error messaging
    if (error.response?.status === 403) {
      analysisError.value = `🔒 Access Denied: Unable to load more recommendations. Your account may not be approved for this app. Ask the developer to add you to the allowlist.`
    } else if (error.response?.status === 404) {
      analysisError.value = 'Some Spotify endpoints are unavailable. Using alternative recommendation algorithm.'
    } else if (error.isDeprecatedEndpoint) {
      analysisError.value = 'Using alternative recommendation algorithm. Results may be limited.'
    } else {
      analysisError.value = 'Failed to load more. Try adjusting filters or analyzing again.'
    }
  } finally {
    isLoadingRecommendations.value = false
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