import axios from 'axios'
import { useAuthStore } from '../stores/auth'

const API_BASE = 'https://api.spotify.com/v1'

// Create axios instance with interceptor for auth
const spotifyApi = axios.create({
  baseURL: API_BASE,
})

// Add token to every request
spotifyApi.interceptors.request.use(
  (config) => {
    const authStore = useAuthStore()
    if (authStore.accessToken) {
      config.headers.Authorization = `Bearer ${authStore.accessToken}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Handle token refresh on 401 errors and enhanced 403 error handling
spotifyApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const authStore = useAuthStore()

    if (error.response?.status === 401) {
      // Token expired, try to refresh
      const refreshed = await authStore.refreshAccessToken()

      if (refreshed) {
        // Retry the original request
        error.config.headers.Authorization = `Bearer ${authStore.accessToken}`
        return spotifyApi.request(error.config)
      } else {
        // Refresh failed, logout
        authStore.logout()
        window.location.href = '/'
      }
    }

    // Enhanced 403/404 error handling for deprecated endpoints
    if (error.response?.status === 403 || error.response?.status === 404) {
      const statusCode = error.response?.status
      console.error(`⛔ ${statusCode} Error Detected`)
      console.error('Endpoint:', error.config?.url)
      console.error('Method:', error.config?.method?.toUpperCase())
      console.error('Response body:', error.response?.data || 'Empty')

      // Check if recommendations endpoint (deprecated as of Nov 27, 2024)
      // Can return 403 OR 404 depending on app status
      if (error.config?.url?.includes('recommendations')) {
        const customError = new Error('Spotify Recommendations endpoint is no longer available for new apps. Using alternative recommendation algorithm.')
        customError.isDeprecatedEndpoint = true
        customError.originalError = error
        return Promise.reject(customError)
      }

      // Check if audio-features endpoint (also deprecated)
      if (error.config?.url?.includes('audio-features')) {
        const customError = new Error('Audio Features endpoint is no longer available. This feature has been disabled.')
        customError.isDeprecatedEndpoint = true
        customError.originalError = error
        return Promise.reject(customError)
      }

      // Generic 403/404 guidance
      if (statusCode === 403) {
        console.error('📋 Common 403 Causes:')
        console.error('1. User not added to Developer Dashboard allowlist (Development Mode)')
        console.error('2. Endpoint deprecated/unavailable for new apps')
        console.error('3. Insufficient OAuth scopes')
        console.error('4. App not in Extended Quota Mode')
      } else if (statusCode === 404) {
        console.error('📋 Common 404 Causes:')
        console.error('1. Endpoint has been removed or deprecated')
        console.error('2. URL may be incorrect')
        console.error('3. API version mismatch')
      }
      console.error('\n💡 Solution: Add users to your app allowlist at https://developer.spotify.com/dashboard')
    }

    return Promise.reject(error)
  }
)

export default {
  // Get user's top tracks
  async getUserTopTracks(timeRange = 'medium_term', limit = 50) {
    try {
      const response = await spotifyApi.get('/me/top/tracks', {
        params: { time_range: timeRange, limit }
      })
      return response.data
    } catch (error) {
      console.error('Error fetching top tracks:', error)
      throw error
    }
  },

  // Get user's top artists
  async getUserTopArtists(timeRange = 'medium_term', limit = 50) {
    try {
      const response = await spotifyApi.get('/me/top/artists', {
        params: { time_range: timeRange, limit }
      })
      return response.data
    } catch (error) {
      console.error('Error fetching top artists:', error)
      throw error
    }
  },

  // Get recently played tracks
  async getRecentlyPlayed(limit = 50) {
    try {
      const response = await spotifyApi.get('/me/player/recently-played', {
        params: { limit }
      })
      return response.data
    } catch (error) {
      console.error('Error fetching recently played:', error)
      throw error
    }
  },

  // Get user's saved (liked) tracks
  async getSavedTracks(limit = 50) {
    try {
      const response = await spotifyApi.get('/me/tracks', {
        params: { limit }
      })
      return response.data
    } catch (error) {
      console.error('Error fetching saved tracks:', error)
      throw error
    }
  },

  // Get user's playlists
  async getUserPlaylists(limit = 50) {
    try {
      const response = await spotifyApi.get('/me/playlists', {
        params: { limit }
      })
      return response.data
    } catch (error) {
      console.error('Error fetching playlists:', error)
      throw error
    }
  },

  // Get tracks from a playlist
  async getPlaylistTracks(playlistId, limit = 100) {
    try {
      const response = await spotifyApi.get(`/playlists/${playlistId}/tracks`, {
        params: { limit }
      })
      return response.data
    } catch (error) {
      console.error('Error fetching playlist tracks:', error)
      throw error
    }
  },

  // Get audio features for multiple tracks
  async getAudioFeatures(trackIds) {
    try {
      // Ensure trackIds is an array and filter out invalid IDs
      const validIds = Array.isArray(trackIds) 
        ? trackIds.filter(id => id && typeof id === 'string')
        : []
      
      if (validIds.length === 0) {
        console.warn('No valid track IDs provided to getAudioFeatures')
        return { audio_features: [] }
      }
      
      // Spotify API accepts max 100 IDs
      const idsToFetch = validIds.slice(0, 100)
      
      const response = await spotifyApi.get('/audio-features', {
        params: { ids: idsToFetch.join(',') }
      })
      return response.data
    } catch (error) {
      console.error('Error fetching audio features:', error)
      console.error('Response:', error.response?.data)
      throw error
    }
  },

  // Get recommendations based on seed data
  async getRecommendations(params) {
    try {
      const response = await spotifyApi.get('/recommendations', {
        params: {
          ...params,
          limit: params.limit || 20
        }
      })
      return response.data
    } catch (error) {
      console.error('Error fetching recommendations:', error)
      throw error
    }
  },

  // Search for tracks
  async searchTracks(query, limit = 20) {
    try {
      const response = await spotifyApi.get('/search', {
        params: {
          q: query,
          type: 'track',
          limit
        }
      })
      return response.data
    } catch (error) {
      console.error('Error searching tracks:', error)
      throw error
    }
  },

  // Get track details
  async getTrack(trackId) {
    try {
      const response = await spotifyApi.get(`/tracks/${trackId}`)
      return response.data
    } catch (error) {
      console.error('Error fetching track:', error)
      throw error
    }
  },

  // Get artist details
  async getArtist(artistId) {
    try {
      const response = await spotifyApi.get(`/artists/${artistId}`)
      return response.data
    } catch (error) {
      console.error('Error fetching artist:', error)
      throw error
    }
  },

  // Get related artists (for discovery)
  async getRelatedArtists(artistId) {
    try {
      const response = await spotifyApi.get(`/artists/${artistId}/related-artists`)
      return response.data
    } catch (error) {
      console.error('Error fetching related artists:', error)
      throw error
    }
  },

  // Get current playback state
  async getCurrentPlayback() {
    try {
      const response = await spotifyApi.get('/me/player')
      return response.data
    } catch (error) {
      // 204 means no active playback
      if (error.response?.status === 204) {
        return null
      }
      console.error('Error fetching playback:', error)
      throw error
    }
  },

  // Play a track
  async play(uris, deviceId = null) {
    try {
      const params = deviceId ? { device_id: deviceId } : {}
      await spotifyApi.put('/me/player/play', { uris }, { params })
    } catch (error) {
      console.error('Error playing track:', error)
      throw error
    }
  },

  // Pause playback
  async pause(deviceId = null) {
    try {
      const params = deviceId ? { device_id: deviceId } : {}
      await spotifyApi.put('/me/player/pause', {}, { params })
    } catch (error) {
      console.error('Error pausing:', error)
      throw error
    }
  },

  // Skip to next track
  async skipToNext(deviceId = null) {
    try {
      const params = deviceId ? { device_id: deviceId } : {}
      await spotifyApi.post('/me/player/next', {}, { params })
    } catch (error) {
      console.error('Error skipping to next:', error)
      throw error
    }
  },

  // Skip to previous track
  async skipToPrevious(deviceId = null) {
    try {
      const params = deviceId ? { device_id: deviceId } : {}
      await spotifyApi.post('/me/player/previous', {}, { params })
    } catch (error) {
      console.error('Error skipping to previous:', error)
      throw error
    }
  },

  // Get available devices
  async getDevices() {
    try {
      const response = await spotifyApi.get('/me/player/devices')
      return response.data
    } catch (error) {
      console.error('Error fetching devices:', error)
      throw error
    }
  },

  // Create a new playlist
  async createPlaylist(userId, name, description = '', isPublic = true) {
    try {
      const response = await spotifyApi.post(`/users/${userId}/playlists`, {
        name,
        description,
        public: isPublic
      })
      return response.data
    } catch (error) {
      console.error('Error creating playlist:', error)
      throw error
    }
  },

  // Add tracks to playlist
  async addTracksToPlaylist(playlistId, trackUris) {
    try {
      const response = await spotifyApi.post(`/playlists/${playlistId}/tracks`, {
        uris: trackUris
      })
      return response.data
    } catch (error) {
      console.error('Error adding tracks to playlist:', error)
      throw error
    }
  },

  // Get audio analysis for a track (detailed time-series data)
  async getAudioAnalysis(trackId) {
    try {
      const response = await spotifyApi.get(`/audio-analysis/${trackId}`)
      return response.data
    } catch (error) {
      console.error('Error fetching audio analysis:', error)
      throw error
    }
  },

  // Get audio features for a single track (tempo, energy, etc.)
  async getTrackAudioFeatures(trackId) {
    try {
      const response = await spotifyApi.get(`/audio-features/${trackId}`)
      return response.data
    } catch (error) {
      console.error('Error fetching track audio features:', error)
      throw error
    }
  }
}