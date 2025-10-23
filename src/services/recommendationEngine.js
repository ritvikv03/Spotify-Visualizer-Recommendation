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
   * Uses Spotify's collaborative filtering principle
   */
  static selectSeeds(tracks, artists, analysis) {
    const seeds = {
      tracks: [],
      artists: [],
      genres: []
    }

    // Strategy 1: Use a mix of favorite and less-played tracks (diversity)
    const sortedByPopularity = [...tracks].sort((a, b) => b.popularity - a.popularity)
    
    // Pick one very popular track (anchor)
    if (sortedByPopularity.length > 0) {
      seeds.tracks.push(sortedByPopularity[0].id)
    }
    
    // Pick tracks from middle range (for exploration)
    const midRange = sortedByPopularity.slice(Math.floor(sortedByPopularity.length * 0.3), Math.floor(sortedByPopularity.length * 0.7))
    if (midRange.length > 0) {
      seeds.tracks.push(midRange[Math.floor(Math.random() * midRange.length)].id)
    }

    // Strategy 2: Use top artists as seeds
    const topArtists = artists.slice(0, 2)
    seeds.artists = topArtists.map(a => a.id)

    // Strategy 3: Use genres from trends
    seeds.genres = analysis.recentTrends.slice(0, 1)

    return seeds
  }

  /**
   * Build recommendation parameters
   * Following Spotify's content-based filtering principles
   */
  static buildRecommendationParams(seeds, analysis, filters = {}) {
    const params = {
      limit: 20
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
   * Generate personalized recommendations
   */
  static async generateRecommendations(spotifyService, tracks, artists, filters = {}) {
    try {
      // Step 1: Analyze user's taste
      const analysis = this.analyzeTaste(tracks, artists)
      console.log('📊 Taste analysis:', analysis)

      // Step 2: Select optimal seeds
      const seeds = this.selectSeeds(tracks, artists, analysis)
      console.log('🌱 Seeds selected:', seeds)

      // Step 3: Build recommendation parameters
      const params = this.buildRecommendationParams(seeds, analysis, filters)
      console.log('🎯 Recommendation params:', params)

      // Step 4: Get recommendations from Spotify
      const response = await spotifyService.getRecommendations(params)

      if (!response?.tracks) {
        throw new Error('No recommendations returned from Spotify')
      }

      // Step 5: Score and rank recommendations
      const scored = this.scoreRecommendations(response.tracks, analysis)
      console.log('⭐ Scored recommendations:', scored.length)

      return {
        tracks: scored,
        analysis,
        seeds
      }
    } catch (error) {
      console.error('Recommendation generation error:', error)
      throw error
    }
  }
}

export default RecommendationEngine