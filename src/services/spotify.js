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

// Handle token refresh on 401 errors
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

  // Get audio features for multiple tracks
  async getAudioFeatures(trackIds) {
    try {
      const response = await spotifyApi.get('/audio-features', {
        params: { ids: trackIds.join(',') }
      })
      return response.data
    } catch (error) {
      console.error('Error fetching audio features:', error)
      throw error
    }
  },

  // Get detailed audio analysis for a track (includes beats, bars, sections)
  async getAudioAnalysis(trackId) {
    try {
      const response = await spotifyApi.get(`/audio-analysis/${trackId}`)
      return response.data
    } catch (error) {
      console.error('Error fetching audio analysis:', error)
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
  }
}
