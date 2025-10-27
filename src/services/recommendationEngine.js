import { filterPlayableTracks, cleanTrackList, logPlayabilityStats } from '../utils/trackPlayability.js'

export class RecommendationEngine {
  /**
   * Analyze user's music taste from available data
   */
  static analyzeTaste(tracks, artists) {
    const analysis = {
      genres: {},
      avgPopularity: 0,
      artistFrequency: {},
      recentTrends: [],
      diversityScore: 0
    }

    // Genre analysis (collaborative filtering principle)
    artists.forEach(artist => {
      artist.genres?.forEach(genre => {
        analysis.genres[genre] = (analysis.genres[genre] || 0) + 1
      })
    })

    // Artist frequency
    tracks.forEach(track => {
      track.artists?.forEach(artist => {
        analysis.artistFrequency[artist.id] = (analysis.artistFrequency[artist.id] || 0) + 1
      })
    })

    // Popularity analysis
    const popularitySum = tracks.reduce((sum, track) => sum + (track.popularity || 0), 0)
    analysis.avgPopularity = tracks.length > 0 ? popularitySum / tracks.length : 50

    // Calculate diversity (how many different artists vs total tracks)
    const uniqueArtists = new Set(tracks.flatMap(t => t.artists?.map(a => a.id) || []))
    analysis.diversityScore = tracks.length > 0 ? uniqueArtists.size / tracks.length : 0

    // Identify trends (most common genres)
    analysis.recentTrends = Object.entries(analysis.genres)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([genre]) => genre)

    return analysis
  }

  /**
   * Select optimal seeds for recommendations
   * Uses Spotify's collaborative filtering principle with randomization for variety
   */
  static selectSeeds(tracks, artists, analysis) {
    const seeds = {
      tracks: [],
      artists: [],
      genres: []
    }

    // Add randomization to get different recommendations each time
    const shuffleTracks = [...tracks].sort(() => Math.random() - 0.5)
    const shuffleArtists = [...artists].sort(() => Math.random() - 0.5)

    // Strategy 1: Use a mix of favorite and less-played tracks (diversity)
    const sortedByPopularity = [...shuffleTracks].sort((a, b) => b.popularity - a.popularity)

    // Pick one popular track (anchor) - randomize from top 5
    const topTracks = sortedByPopularity.slice(0, 5)
    if (topTracks.length > 0) {
      seeds.tracks.push(topTracks[Math.floor(Math.random() * topTracks.length)].id)
    }

    // Pick tracks from middle range (for exploration) - increased range
    const midRange = sortedByPopularity.slice(
      Math.floor(sortedByPopularity.length * 0.2),
      Math.floor(sortedByPopularity.length * 0.8)
    )
    if (midRange.length > 0) {
      seeds.tracks.push(midRange[Math.floor(Math.random() * midRange.length)].id)
    }

    // Strategy 2: Use top artists as seeds - randomize from top 10 artists
    const topArtists = shuffleArtists.slice(0, Math.min(10, shuffleArtists.length))
    const selectedArtists = topArtists
      .sort(() => Math.random() - 0.5)
      .slice(0, 2)
      .map(a => a.id)
    seeds.artists = selectedArtists

    // Strategy 3: Use genres from trends - randomize genre selection
    const availableGenres = analysis.recentTrends.slice(0, 3)
    if (availableGenres.length > 0) {
      seeds.genres = [availableGenres[Math.floor(Math.random() * availableGenres.length)]]
    }

    return seeds
  }

  /**
   * Build recommendation parameters
   * Following Spotify's content-based filtering principles
   */
  static buildRecommendationParams(seeds, analysis, filters = {}) {
    const params = {
      limit: 50
    }

    // Add seeds (up to 5 total across tracks, artists, genres)
    if (seeds.tracks.length > 0) {
      params.seed_tracks = seeds.tracks.slice(0, 2).join(',')
    }
    if (seeds.artists.length > 0) {
      params.seed_artists = seeds.artists.slice(0, 2).join(',')
    }
    if (seeds.genres.length > 0) {
      params.seed_genres = seeds.genres.slice(0, 1).join(',')
    }

    // Hidden gems focus: cap popularity below user's average
    const maxPopularity = Math.min(filters.maxPopularity || 50, analysis.avgPopularity - 10)
    params.max_popularity = Math.max(maxPopularity, 20) // At least 20 to ensure quality

    // Optional: Add target market for cultural relevance
    params.market = 'US'

    return params
  }

  /**
   * Score and rank recommendations
   * Uses principles of collaborative + content-based filtering
   */
  static scoreRecommendations(recommendations, analysis) {
    return recommendations.map(track => {
      let score = 100 // Base score

      // Penalize if too popular (we want hidden gems)
      if (track.popularity > 60) {
        score -= (track.popularity - 60) * 2
      }

      // Bonus for genre match
      const trackArtistGenres = track.artists?.flatMap(a => a.genres || []) || []
      const genreMatches = trackArtistGenres.filter(g => analysis.recentTrends.includes(g))
      score += genreMatches.length * 10

      // Bonus for artist diversity (new artists you haven't heard)
      const artistIds = track.artists?.map(a => a.id) || []
      const isNewArtist = !artistIds.some(id => analysis.artistFrequency[id])
      if (isNewArtist) {
        score += 20
      }

      // Penalize if release is too old (unless user likes classics)
      const releaseYear = track.album?.release_date ? parseInt(track.album.release_date.substring(0, 4)) : 2020
      const yearsOld = new Date().getFullYear() - releaseYear
      if (yearsOld > 10 && analysis.avgPopularity > 50) {
        score -= yearsOld * 2
      }

      return { ...track, discoveryScore: Math.max(score, 0) }
    }).sort((a, b) => b.discoveryScore - a.discoveryScore)
  }

  /**
   * Fallback: Generate recommendations from user's library
   * Used when Spotify recommendations endpoint is unavailable
   * Uses search API and user's library - NO deprecated endpoints
   */
  static async generateFromLibrary(spotifyService, tracks, artists, analysis, filters = {}) {
    console.log('🔄 Using fallback: generating recommendations from search and user library')

    const maxPopularity = filters.maxPopularity || 100
    const targetCount = 300 // Generate 300 tracks for huge pool (50 displayed + 250 for refresh/replace)

    let allRecommendations = []

    // Strategy 1: Try artist-based endpoints (might work for some apps)
    let artistEndpointsWorking = false
    const topArtists = artists.slice(0, 5) // Try with just 5 artists first

    console.log(`🎤 Attempting to fetch tracks from ${topArtists.length} artists...`)
    for (const artist of topArtists) {
      try {
        const artistTopTracks = await spotifyService.getArtistTopTracks(artist.id)
        if (artistTopTracks && artistTopTracks.tracks) {
          allRecommendations.push(...artistTopTracks.tracks)
          artistEndpointsWorking = true
        }
      } catch (error) {
        // Endpoint likely deprecated - will use search fallback
        break
      }
    }

    // Strategy 2: If artist endpoints work, get more
    if (artistEndpointsWorking) {
      console.log('✅ Artist endpoints working - fetching more tracks')
      const moreArtists = artists.slice(5, 30)
      for (const artist of moreArtists) {
        try {
          const artistTopTracks = await spotifyService.getArtistTopTracks(artist.id)
          if (artistTopTracks && artistTopTracks.tracks) {
            allRecommendations.push(...artistTopTracks.tracks)
          }
        } catch (error) {
          console.warn(`Failed to get tracks for artist ${artist.id}:`, error.message)
        }
      }

      // Skip related artists - endpoint is deprecated (returns 404)
      console.log('ℹ️ Skipping related artists (endpoint deprecated)')
    }

    // Strategy 3: Search-based discovery (works even when artist endpoints are deprecated)
    if (!artistEndpointsWorking || allRecommendations.length < 100) {
      console.log('🔍 Using search-based discovery (artist endpoints unavailable or insufficient)')

      // 3a. Search by top genres
      const topGenres = analysis.recentTrends.slice(0, 10) // Top 10 genres
      console.log(`🎵 Searching for tracks in genres:`, topGenres)

      for (const genre of topGenres) {
        try {
          // Search for tracks in this genre (limit 50 per genre = 500 tracks potential)
          const searchResult = await spotifyService.searchTracks(`genre:"${genre}"`, 50)
          if (searchResult?.tracks?.items) {
            const genreTracks = searchResult.tracks.items.filter(t => t && !t.is_local)
            allRecommendations.push(...genreTracks)
            console.log(`  ✓ Found ${genreTracks.length} tracks for genre "${genre}"`)
          }
        } catch (error) {
          console.warn(`Search failed for genre "${genre}":`, error.message)
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      // 3b. Search by artist names directly
      const topArtistNames = artists.slice(0, 20).map(a => a.name)
      console.log(`🎤 Searching tracks by ${topArtistNames.length} artist names...`)

      for (const artistName of topArtistNames) {
        try {
          // Search for tracks by this artist
          const searchResult = await spotifyService.searchTracks(`artist:"${artistName}"`, 20)
          if (searchResult?.tracks?.items) {
            const artistTracks = searchResult.tracks.items.filter(t => t && !t.is_local)
            allRecommendations.push(...artistTracks)
          }
        } catch (error) {
          console.warn(`Search failed for artist "${artistName}":`, error.message)
        }
      }

      // 3c. Get user's playlists and extract tracks
      try {
        console.log(`📚 Fetching tracks from user's playlists...`)
        const playlistsData = await spotifyService.getUserPlaylists(50)
        const playlists = playlistsData?.items || []

        // Get tracks from first 10 playlists
        for (const playlist of playlists.slice(0, 10)) {
          try {
            const playlistTracks = await spotifyService.getPlaylistTracks(playlist.id, 100)
            const tracks = playlistTracks?.items
              ?.map(item => item.track)
              .filter(t => t && !t.is_local) || []
            allRecommendations.push(...tracks)
            console.log(`  ✓ Got ${tracks.length} tracks from playlist "${playlist.name}"`)
          } catch (error) {
            console.warn(`Failed to get tracks from playlist ${playlist.id}:`, error.message)
          }
        }
      } catch (error) {
        console.warn('Failed to get user playlists:', error.message)
      }
    }

    // Strategy 4: Always include user's saved tracks for expansion
    try {
      console.log(`💾 Fetching user's saved tracks...`)
      const savedTracksData = await spotifyService.getSavedTracks(50)
      const savedTracks = savedTracksData.items?.map(item => item.track).filter(t => t && !t.is_local) || []
      allRecommendations.push(...savedTracks)
      console.log(`  ✓ Got ${savedTracks.length} saved tracks`)
    } catch (error) {
      console.warn('Failed to get saved tracks:', error.message)
    }

    // Strategy 5: Include user's existing top tracks (passed in)
    console.log(`🎵 Including ${tracks.length} user top tracks in pool`)
    allRecommendations.push(...tracks)

    // Filter out unplayable tracks
    const playableTracks = filterPlayableTracks(allRecommendations)
    logPlayabilityStats(allRecommendations, playableTracks, 'library-based recommendations')

    // Deduplicate by track ID
    const uniqueTracks = Array.from(
      new Map(playableTracks.filter(t => t && t.id).map(t => [t.id, t])).values()
    )

    console.log(`📊 Found ${uniqueTracks.length} unique playable tracks before filtering`)

    // Filter by max popularity limit
    const filteredByPopularity = uniqueTracks.filter(t =>
      t.popularity <= maxPopularity
    )

    console.log(`📊 After popularity filter (≤${maxPopularity}%): ${filteredByPopularity.length} tracks`)

    // Randomize order for variety on each visit
    const shuffled = filteredByPopularity.sort(() => Math.random() - 0.5)

    // Take target count
    const recommendations = shuffled.slice(0, targetCount)

    console.log(`✅ Generated ${recommendations.length} recommendations (target: ${targetCount})`)

    if (recommendations.length < 50) {
      console.warn(`⚠️ Only got ${recommendations.length} tracks. Expected at least 50.`)
    }

    return recommendations
  }

  /**
   * Generate personalized recommendations
   * Tries Spotify API first, falls back to library-based algorithm if unavailable
   * Enhanced to fetch multiple batches for larger recommendation pool
   */
  static async generateRecommendations(spotifyService, tracks, artists, filters = {}) {
    try {
      // Step 1: Analyze user's taste
      const analysis = this.analyzeTaste(tracks, artists)
      console.log('📊 Taste analysis:', analysis)

      let allRecommendedTracks = []
      const targetCount = filters.limit || 200

      try {
        // Strategy: Make multiple API calls with different seeds to get more variety
        // Spotify API returns max 50 per call, so we make 4-5 calls to reach 200+ tracks
        const numberOfBatches = Math.ceil(targetCount / 50)
        console.log(`🎯 Fetching ${numberOfBatches} batches to reach target of ${targetCount} tracks`)

        for (let i = 0; i < numberOfBatches; i++) {
          // Step 2: Select different seeds for each batch (randomization ensures variety)
          const seeds = this.selectSeeds(tracks, artists, analysis)
          console.log(`🌱 Batch ${i + 1} seeds:`, seeds)

          // Step 3: Build recommendation parameters
          const params = this.buildRecommendationParams(seeds, analysis, filters)

          try {
            // Step 4: Get recommendations from Spotify API
            const response = await spotifyService.getRecommendations(params)

            if (response?.tracks) {
              const rawTracks = response.tracks
              const playableTracks = filterPlayableTracks(rawTracks)

              console.log(`✅ Batch ${i + 1}: Got ${playableTracks.length} playable tracks from Spotify API`)
              allRecommendedTracks.push(...playableTracks)
            }
          } catch (batchError) {
            console.warn(`⚠️ Batch ${i + 1} failed, continuing with other batches...`)
          }

          // Small delay to avoid rate limiting
          if (i < numberOfBatches - 1) {
            await new Promise(resolve => setTimeout(resolve, 100))
          }
        }

        // Remove duplicates by track ID
        const uniqueTracks = Array.from(
          new Map(allRecommendedTracks.map(t => [t.id, t])).values()
        )

        console.log(`✅ Total unique tracks after ${numberOfBatches} batches: ${uniqueTracks.length}`)
        allRecommendedTracks = uniqueTracks

        // If we still don't have enough tracks, use fallback
        if (allRecommendedTracks.length < 100) {
          console.log('⚠️ Not enough tracks from API, supplementing with library-based recommendations')
          const fallbackTracks = await this.generateFromLibrary(spotifyService, tracks, artists, analysis, filters)

          // Combine and deduplicate
          const combined = [...allRecommendedTracks, ...fallbackTracks]
          allRecommendedTracks = Array.from(
            new Map(combined.map(t => [t.id, t])).values()
          )
        }

      } catch (apiError) {
        // Check if it's the deprecated endpoint error (403 or 404)
        const isDeprecated = apiError.isDeprecatedEndpoint ||
                           apiError.response?.status === 403 ||
                           apiError.response?.status === 404

        if (isDeprecated) {
          console.log('⚠️ Spotify recommendations endpoint unavailable, using fallback algorithm')
          allRecommendedTracks = await this.generateFromLibrary(spotifyService, tracks, artists, analysis, filters)
        } else {
          // Different error, rethrow
          throw apiError
        }
      }

      // Step 5: Score and rank recommendations
      const scored = this.scoreRecommendations(allRecommendedTracks, analysis)
      console.log(`⭐ Final scored recommendations: ${scored.length} tracks`)

      return {
        tracks: scored,
        analysis,
        seeds: {} // Multiple seeds used
      }
    } catch (error) {
      console.error('Recommendation generation error:', error)
      throw error
    }
  }
}

export default RecommendationEngine