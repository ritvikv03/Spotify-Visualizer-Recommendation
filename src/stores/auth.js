import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const accessToken = ref(null)
  const refreshToken = ref(null)
  const expiresAt = ref(null)
  const user = ref(null)

  const isAuthenticated = computed(() => {
    if (!accessToken.value || !expiresAt.value) return false
    return Date.now() < expiresAt.value
  })

  const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID
  const redirectUri = import.meta.env.VITE_REDIRECT_URI
  const scopes = [
    'user-read-private',
    'user-read-email',
    'user-top-read',
    'user-read-recently-played',
    'user-library-read',
    'user-library-modify',
    'streaming',
    'user-read-playback-state',
    'user-modify-playback-state',
    'user-read-currently-playing',
    'playlist-read-private',
    'playlist-read-collaborative',
    'playlist-modify-public',
    'playlist-modify-private'
  ]

  // Generate random string for security
  function generateRandomString(length) {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    const values = crypto.getRandomValues(new Uint8Array(length))
    return values.reduce((acc, x) => acc + possible[x % possible.length], '')
  }

  // SHA256 hash function
  async function sha256(plain) {
    const encoder = new TextEncoder()
    const data = encoder.encode(plain)
    return window.crypto.subtle.digest('SHA-256', data)
  }

  // Base64 encode
  function base64encode(input) {
    return btoa(String.fromCharCode(...new Uint8Array(input)))
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
  }

  // Initiate Spotify login
  async function login() {
    const codeVerifier = generateRandomString(64)
    const hashed = await sha256(codeVerifier)
    const codeChallenge = base64encode(hashed)

    // Store code verifier for later
    window.localStorage.setItem('code_verifier', codeVerifier)

    const authUrl = new URL('https://accounts.spotify.com/authorize')
    const params = {
      response_type: 'code',
      client_id: clientId,
      scope: scopes.join(' '),
      code_challenge_method: 'S256',
      code_challenge: codeChallenge,
      redirect_uri: redirectUri,
    }

    authUrl.search = new URLSearchParams(params).toString()
    window.location.href = authUrl.toString()
  }

  // Handle callback from Spotify
  async function handleCallback(code) {
    const codeVerifier = window.localStorage.getItem('code_verifier')

    try {
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: clientId,
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: redirectUri,
          code_verifier: codeVerifier,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to exchange code for token')
      }

      const data = await response.json()
      setTokens(data)
      window.localStorage.removeItem('code_verifier')
      
      // Fetch user profile
      await fetchUserProfile()
      
      return true
    } catch (error) {
      console.error('Error in handleCallback:', error)
      return false
    }
  }

  // Store tokens
  function setTokens(data) {
    accessToken.value = data.access_token
    refreshToken.value = data.refresh_token
    expiresAt.value = Date.now() + (data.expires_in * 1000)

    // Save to localStorage for persistence
    window.localStorage.setItem('spotify_access_token', data.access_token)
    window.localStorage.setItem('spotify_refresh_token', data.refresh_token)
    window.localStorage.setItem('spotify_expires_at', expiresAt.value.toString())
  }

  // Check for existing authentication
  function checkExistingAuth() {
    const savedToken = window.localStorage.getItem('spotify_access_token')
    const savedRefresh = window.localStorage.getItem('spotify_refresh_token')
    const savedExpiry = window.localStorage.getItem('spotify_expires_at')

    if (savedToken && savedRefresh && savedExpiry) {
      accessToken.value = savedToken
      refreshToken.value = savedRefresh
      expiresAt.value = parseInt(savedExpiry)

      // If token is expired, refresh it
      if (Date.now() >= expiresAt.value) {
        refreshAccessToken()
      } else {
        fetchUserProfile()
      }
    }
  }

  // Refresh access token
  async function refreshAccessToken() {
    if (!refreshToken.value) return false

    try {
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: clientId,
          grant_type: 'refresh_token',
          refresh_token: refreshToken.value,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to refresh token')
      }

      const data = await response.json()
      setTokens({
        ...data,
        refresh_token: refreshToken.value // Keep existing refresh token
      })
      
      return true
    } catch (error) {
      console.error('Error refreshing token:', error)
      logout()
      return false
    }
  }

  // Fetch user profile
  async function fetchUserProfile() {
    if (!accessToken.value) return

    try {
      const response = await fetch('https://api.spotify.com/v1/me', {
        headers: {
          'Authorization': `Bearer ${accessToken.value}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch user profile')
      }

      user.value = await response.json()
    } catch (error) {
      console.error('Error fetching user profile:', error)
    }
  }

  // Logout
  function logout() {
    accessToken.value = null
    refreshToken.value = null
    expiresAt.value = null
    user.value = null

    window.localStorage.removeItem('spotify_access_token')
    window.localStorage.removeItem('spotify_refresh_token')
    window.localStorage.removeItem('spotify_expires_at')
  }

  return {
    accessToken,
    refreshToken,
    user,
    isAuthenticated,
    login,
    handleCallback,
    checkExistingAuth,
    refreshAccessToken,
    logout
  }
})