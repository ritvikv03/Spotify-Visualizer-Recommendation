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
                <IconPalette :size="16" class="hidden sm:inline" />
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
                  <svg v-if="themeStore.currentTheme === key" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                  </svg>
                  <span v-else class="w-4 h-4"></span>
                  <span class="font-semibold">{{ theme.name }}</span>
                </button>
              </div>
            </div>
            
            <button
              @click="isAnalyzing ? stopAnalysis() : startAnalysis()"
              :class="isAnalyzing ? 'btn-secondary' : 'btn-primary'"
              class="text-xs px-2 sm:px-4 md:px-6 py-2 md:py-3 whitespace-nowrap flex items-center gap-2"
              :disabled="isAnalyzing"
            >
              <IconAnalyze :size="16" :class="{ 'animate-spin': isAnalyzing }" />
              <span class="hidden sm:inline">{{ isAnalyzing ? 'Analyzing...' : 'Analyze My Taste' }}</span>
              <span class="sm:hidden">{{ isAnalyzing ? 'Scan' : 'Analyze' }}</span>
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
            <h2 class="text-xl md:text-2xl font-bold mb-4 flex items-center gap-3">
              <IconMusic :size="28" color="#1DB954" />
              <span>Your Music Universe</span>
              <span v-if="isPlaying" class="text-xs md:text-sm font-normal text-spotify-green animate-pulse flex items-center gap-1">
                <span class="w-2 h-2 bg-spotify-green rounded-full animate-pulse"></span>
                Live Audio
              </span>
              <span v-else-if="analysisComplete" class="text-xs md:text-sm font-normal text-cyan-400 flex items-center gap-1">
                <span class="w-2 h-2 bg-cyan-400 rounded-full"></span>
                Visualized
              </span>
            </h2>
            <MusicVisualizer
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
              <svg class="w-6 h-6 text-red-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
              </svg>
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
              <IconMusic :size="24" color="#1DB954" class="animate-pulse" />
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
            <h3 class="text-xl font-semibold mb-4 flex items-center gap-2">
              <IconAnalyze :size="24" color="#a855f7" />
              Your Musical Identity
            </h3>
            <div class="grid grid-cols-2 gap-4">
              <div class="bg-black/40 p-4 rounded-lg backdrop-blur-sm border border-purple-500/10">
                <p class="text-sm text-gray-400">Popularity Index</p>
                <p class="text-2xl font-bold bg-gradient-to-r from-spotify-green to-emerald-400 bg-clip-text text-transparent">{{ tasteProfile.avgPopularity.toFixed(0) }}%</p>
                <p class="text-xs text-cyan-400 mt-1">
                  {{ tasteProfile.avgPopularity > 70 ? 'Chart Chaser' :
                     tasteProfile.avgPopularity > 50 ? 'Balanced Listener' :
                     'Underground Explorer' }}
                </p>
              </div>
              <div class="bg-black/40 p-4 rounded-lg backdrop-blur-sm border border-purple-500/10">
                <p class="text-sm text-gray-400">Taste Diversity</p>
                <p class="text-2xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">{{ (tasteProfile.diversityScore * 100).toFixed(0) }}%</p>
                <p class="text-xs text-pink-400 mt-1">
                  {{ tasteProfile.diversityScore > 0.75 ? 'Eclectic Adventurer' :
                     tasteProfile.diversityScore > 0.5 ? 'Genre Hopper' :
                     'Genre Specialist' }}
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
              <p class="text-sm text-gray-400 mb-3 flex items-center gap-2">
                <IconMusic :size="16" color="#a855f7" />
                Your Genre Palette
              </p>
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
          <!-- Serendipity Slider (ML Feature) -->
          <SerendipitySlider
            v-model="serendipityLevel"
            @change="handleSerendipityChange"
          />

          <!-- Discovery Filters -->
          <DiscoveryFilters @update="updateFilters" />

          <!-- Discovery Queue -->
          <div class="card border border-cyan-500/20">
            <h3 class="text-xl font-semibold mb-4 flex items-center gap-2">
              <IconGem :size="24" color="#22d3ee" />
              <span>Your Hidden Gems</span>
              <span class="text-sm font-normal text-cyan-400">({{ recommendations.length }})</span>
            </h3>
            
            <div v-if="isLoadingRecommendations" class="text-center py-8">
              <div class="animate-spin w-8 h-8 border-4 border-spotify-green border-t-transparent rounded-full mx-auto"></div>
              <p class="text-gray-400 mt-4">Discovering your perfect tracks...</p>
            </div>

            <div v-else-if="recommendations.length === 0" class="text-center py-8">
              <IconMusic :size="64" color="#1DB954" class="mx-auto mb-4 opacity-50" />
              <p class="text-lg font-semibold mb-2">Ready to Discover?</p>
              <p class="text-gray-400 text-sm">Click "Analyze My Taste" above to unlock personalized hidden gems based on your music profile!</p>
            </div>

            <div v-else class="space-y-3 max-h-[600px] overflow-y-auto">
              <div
                v-for="track in recommendations"
                :key="track.id"
                class="bg-spotify-dark p-3 rounded-lg hover:bg-opacity-60 transition-all relative group"
              >
                <div class="flex items-start gap-3 mb-2">
                  <img
                    v-if="track.album?.images?.[2]?.url"
                    :src="track.album.images[2].url"
                    alt="Album art"
                    class="w-12 h-12 rounded cursor-pointer flex-shrink-0"
                    @click="playTrack(track)"
                  />
                  <div class="flex-1 min-w-0 cursor-pointer" @click="playTrack(track)">
                    <p class="font-semibold truncate">{{ track.name }}</p>
                    <p class="text-sm text-gray-400 truncate">{{ track.artists?.map(a => a.name).join(', ') }}</p>
                    <!-- ML: Discovery Score Badge -->
                    <div class="mt-1">
                      <DiscoveryScoreBadge
                        v-if="track.discoveryScore !== undefined"
                        :score="track.discoveryScore"
                        :popularity="track.popularity || 0"
                      />
                      <span v-else class="text-xs text-spotify-green">
                        {{ track.popularity }}% popular
                      </span>
                    </div>
                  </div>
                  <div class="flex flex-col items-end gap-2">
                    <!-- Original favorite button -->
                    <button
                      @click="toggleFavorite(track)"
                      class="hover:scale-125 transition-transform"
                      :title="isFavorited(track) ? 'Remove from favorites' : 'Add to favorites'"
                    >
                      <svg :class="isFavorited(track) ? 'text-red-500 fill-current' : 'text-gray-400'" class="w-5 h-5" viewBox="0 0 24 24" :fill="isFavorited(track) ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                      </svg>
                    </button>
                  </div>
                </div>

                <!-- ML: Feedback Buttons -->
                <FeedbackButtons
                  v-if="useMLEngine"
                  :track="track"
                  :context="{
                    reason: track.reason,
                    similarity: track.similarity,
                    serendipityLevel: serendipityLevel
                  }"
                  @feedback="handleFeedback"
                  class="mt-2"
                />
              </div>
            </div>

            <button
              v-if="analysisComplete && recommendations.length > 0"
              @click="loadMoreRecommendations"
              class="btn-secondary w-full mt-4 flex items-center justify-center gap-2"
              :disabled="isLoadingRecommendations"
            >
              <svg v-if="!isLoadingRecommendations" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8" stroke-width="2"/>
                <path d="M21 21l-4.35-4.35" stroke-width="2" stroke-linecap="round"/>
              </svg>
              <svg v-else class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
              <span>{{ isLoadingRecommendations ? 'Searching...' : 'Discover More Gems' }}</span>
            </button>

            <button
              v-if="savedTracks.length > 0"
              @click="saveToPlaylist"
              class="btn-primary w-full mt-2 flex items-center justify-center gap-2"
              :disabled="isSavingPlaylist"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <polyline points="17 21 17 13 7 13 7 21" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <polyline points="7 3 7 8 15 8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span>{{ isSavingPlaylist ? 'Creating Playlist...' : `Save ${savedTracks.length} ${savedTracks.length === 1 ? 'Track' : 'Tracks'} to Spotify` }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useThemeStore } from '../stores/theme'
import spotifyService from '../services/spotify'
import RecommendationEngine from '../services/recommendationEngine'
import mlRecommendationEngine from '../services/mlRecommendationEngine'
import feedbackLearningEngine from '../services/feedbackLearningEngine'
import recommendationOrchestrator from '../services/recommendationOrchestrator'
import { isTrackPlayable, canPlayWithSDK } from '../utils/trackPlayability'
import MusicVisualizer from '../components/Visualizer/MusicVisualizer.vue'
import DiscoveryFilters from '../components/Discovery/DiscoveryFilters.vue'
import SerendipitySlider from '../components/Discovery/SerendipitySlider.vue'
import FeedbackButtons from '../components/Discovery/FeedbackButtons.vue'
import DiscoveryScoreBadge from '../components/Discovery/DiscoveryScoreBadge.vue'
import AudioSimilarityRadar from '../components/Discovery/AudioSimilarityRadar.vue'
import IconPalette from '../components/icons/IconPalette.vue'
import IconAnalyze from '../components/icons/IconAnalyze.vue'
import IconMusic from '../components/icons/IconMusic.vue'
import IconGem from '../components/icons/IconGem.vue'

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
const serendipityLevel = ref(0.3) // ML: Exploration level (0-1)
const userAudioPreferences = ref(null) // ML: Learned audio preferences
const useMLEngine = ref(true) // Toggle between ML and basic engine
const useOrchestrator = ref(true) // Use YouTube Music-inspired orchestrator
const recommendationStrategy = ref(null) // Track which strategy was used
const recommendationConfidence = ref(0) // Bandit algorithm confidence
const currentContext = ref(null) // Current listening context (time, mood, etc.)
const discoveryFilters = ref({
  maxPopularity: 100,
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

// Initialize Spotify Web Playback SDK and ML Engines
onMounted(async () => {
  loadSpotifyPlayer()
  checkCurrentPlayback()
  themeStore.loadSavedTheme()

  // Initialize ML engines and orchestrator
  await mlRecommendationEngine.initialize()
  await feedbackLearningEngine.initialize()
  await recommendationOrchestrator.initialize()

  // Load learned preferences if available
  const learnedPrefs = await feedbackLearningEngine.getLearnedPreferences()
  if (learnedPrefs) {
    userAudioPreferences.value = learnedPrefs
    console.log('✅ Loaded learned preferences:', learnedPrefs)
  }

  // Get current listening context
  currentContext.value = recommendationOrchestrator.getCurrentContext()
  console.log('🎯 Current context:', currentContext.value)

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

    // Try to get saved tracks for ML engine
    let savedTracksData = []
    try {
      const saved = await spotifyService.getSavedTracks(50)
      savedTracksData = saved?.items || []
    } catch (error) {
      console.log('Saved tracks unavailable')
    }

    // Use orchestrator if enabled (YouTube Music-inspired recommendations)
    let result
    if (useOrchestrator.value) {
      console.log('🎼 Using YouTube Music-Inspired Orchestrator...')
      result = await recommendationOrchestrator.generateRecommendations(
        spotifyService,
        {
          useMultiArmedBandit: true,
          fallbackToAll: false,
          limit: 100, // Fetch more for better variety
          serendipityLevel: serendipityLevel.value,
          maxPopularity: discoveryFilters.value.maxPopularity
        }
      )

      // Extract recommendations
      recommendations.value = result.tracks
      recommendationStrategy.value = result.strategy
      recommendationConfidence.value = result.confidence || 0
      currentContext.value = result.metadata?.context || currentContext.value

      // Filter out disliked tracks
      recommendations.value = await feedbackLearningEngine.filterRecommendations(
        recommendations.value
      )

      // Shuffle to add variety and prevent same order every time
      recommendations.value = recommendations.value
        .map(track => ({ track, sort: Math.random() }))
        .sort((a, b) => a.sort - b.sort)
        .map(({ track }) => track)

      console.log(`✅ Strategy: ${result.strategy}, Confidence: ${(recommendationConfidence.value * 100).toFixed(1)}%), ${recommendations.value.length} unique tracks`)

      tasteProfile.value = {
        avgPopularity: allTracks.reduce((sum, t) => sum + (t.popularity || 0), 0) / allTracks.length,
        topGenre: uniqueArtists[0]?.genres?.[0] || 'Mixed',
        tracksAnalyzed: uniqueTracks.length,
        diversityScore: uniqueArtists.length / uniqueTracks.length,
        topGenres: uniqueArtists.slice(0, 5).flatMap(a => a.genres || []).slice(0, 5)
      }
    } else if (useMLEngine.value) {
      console.log('🧠 Using ML Recommendation Engine...')
      result = await mlRecommendationEngine.generateAdvancedRecommendations({
        userTracks: uniqueTracks,
        userArtists: uniqueArtists,
        savedTracks: savedTracksData,
        recentTracks: allTracks.slice(0, 50),
        serendipityLevel: serendipityLevel.value,
        maxPopularity: discoveryFilters.value.maxPopularity,
        limit: 100 // Fetch more for better variety
      })

      // Extract recommendations
      recommendations.value = result.recommendations
      userAudioPreferences.value = result.metadata.avgFeatures

      // Filter out disliked tracks
      recommendations.value = await feedbackLearningEngine.filterRecommendations(
        recommendations.value
      )

      // Shuffle to add variety and prevent same order every time
      recommendations.value = recommendations.value
        .map(track => ({ track, sort: Math.random() }))
        .sort((a, b) => a.sort - b.sort)
        .map(({ track }) => track)

      tasteProfile.value = {
        avgPopularity: allTracks.reduce((sum, t) => sum + (t.popularity || 0), 0) / allTracks.length,
        topGenre: result.metadata.patterns?.recentTrends?.[0] || 'Mixed',
        tracksAnalyzed: uniqueTracks.length,
        diversityScore: uniqueArtists.length / uniqueTracks.length,
        topGenres: Object.keys(result.metadata.patterns || {}).slice(0, 3)
      }
    } else {
      // Fallback to basic engine
      console.log('📊 Using Basic Recommendation Engine...')
      result = await RecommendationEngine.generateRecommendations(
        spotifyService,
        uniqueTracks,
        uniqueArtists,
        discoveryFilters.value
      )

      recommendations.value = result.tracks

      // Shuffle to add variety and prevent same order every time
      recommendations.value = recommendations.value
        .map(track => ({ track, sort: Math.random() }))
        .sort((a, b) => a.sort - b.sort)
        .map(({ track }) => track)

      tasteProfile.value = {
        avgPopularity: result.analysis.avgPopularity,
        topGenre: result.analysis.recentTrends[0] || 'Mixed',
        tracksAnalyzed: uniqueTracks.length,
        diversityScore: result.analysis.diversityScore,
        topGenres: result.analysis.recentTrends.slice(0, 3)
      }
    }

    analysisComplete.value = true
    console.log(`🎉 Found ${recommendations.value.length} unique hidden gems!`)
    
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
    // Validate track is playable before attempting to play
    if (!isTrackPlayable(track)) {
      console.error('❌ Track is not playable:', track.name)
      alert(`Sorry, "${track.name}" is not available for playback. This might be due to regional restrictions or the track being unavailable.`)
      return
    }

    if (!canPlayWithSDK(track)) {
      console.warn('⚠️ Track may not be playable with Web Playback SDK:', track.name)
    }

    // Ensure track has valid URI
    if (!track.uri || !track.uri.startsWith('spotify:track:')) {
      console.error('❌ Invalid track URI:', track.uri)
      alert(`Sorry, "${track.name}" cannot be played - invalid track format.`)
      return
    }

    if (deviceId) {
      await spotifyService.play([track.uri], deviceId)
    } else {
      // Fallback to default device
      await spotifyService.play([track.uri])
    }
    currentTrack.value = track
    isPlaying.value = true
    console.log('✅ Now playing:', track.name)
  } catch (error) {
    console.error('Error playing track:', error)

    // Provide user-friendly error message
    if (error.status === 403) {
      alert('Playback requires Spotify Premium. Please upgrade your account to play full tracks.')
    } else if (error.status === 404) {
      alert(`Track "${track.name}" not found or unavailable.`)
    } else {
      alert(`Unable to play "${track.name}". Error: ${error.message || 'Unknown error'}`)
    }
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

// ML: Handle serendipity slider changes
const handleSerendipityChange = async (newLevel) => {
  console.log('🎚️ Serendipity level changed to:', newLevel)
  if (analysisComplete.value && recommendations.value.length > 0) {
    // Optionally refresh recommendations with new serendipity level
    console.log('Refresh recommendations with new serendipity level')
  }
}

// ML: Handle feedback (like/dislike)
const handleFeedback = async ({ action, track }) => {
  console.log(`📊 Feedback: ${action} on ${track.name}`)

  if (action === 'like') {
    // Track is already recorded by FeedbackButtons component
    console.log('💚 Track liked, AI learning...')
  } else if (action === 'dislike') {
    // Remove from current recommendations
    recommendations.value = recommendations.value.filter(t => t.id !== track.id)
    console.log('👎 Track removed from recommendations')
  }

  // Record feedback in orchestrator (updates multi-armed bandit)
  if (useOrchestrator.value && recommendationStrategy.value) {
    await recommendationOrchestrator.recordFeedback(
      track,
      action,
      recommendationStrategy.value
    )
    console.log(`🎯 Updated bandit algorithm for strategy: ${recommendationStrategy.value}`)
  }

  // Reload learned preferences
  const learnedPrefs = await feedbackLearningEngine.getLearnedPreferences()
  if (learnedPrefs) {
    userAudioPreferences.value = learnedPrefs
  }
}
</script>