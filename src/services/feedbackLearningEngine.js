import { openDB } from 'idb'

/**
 * Feedback Learning Engine
 * Learns from user interactions to improve recommendations over time
 * Stores preferences in IndexedDB for persistent learning
 */
export class FeedbackLearningEngine {
  constructor() {
    this.dbName = 'SpotifyDiscoveryDB'
    this.dbVersion = 1
    this.db = null
    this.initialized = false
  }

  /**
   * Initialize IndexedDB
   */
  async initialize() {
    if (this.initialized) return

    try {
      this.db = await openDB(this.dbName, this.dbVersion, {
        upgrade(db) {
          // Store for liked tracks
          if (!db.objectStoreNames.contains('likedTracks')) {
            const likedStore = db.createObjectStore('likedTracks', {
              keyPath: 'id'
            })
            likedStore.createIndex('timestamp', 'timestamp')
            likedStore.createIndex('discoveryScore', 'discoveryScore')
          }

          // Store for disliked tracks
          if (!db.objectStoreNames.contains('dislikedTracks')) {
            const dislikedStore = db.createObjectStore('dislikedTracks', {
              keyPath: 'id'
            })
            dislikedStore.createIndex('timestamp', 'timestamp')
          }

          // Store for listening history
          if (!db.objectStoreNames.contains('listeningHistory')) {
            const historyStore = db.createObjectStore('listeningHistory', {
              keyPath: 'id',
              autoIncrement: true
            })
            historyStore.createIndex('trackId', 'trackId')
            historyStore.createIndex('timestamp', 'timestamp')
            historyStore.createIndex('playCount', 'playCount')
          }

          // Store for learned preferences
          if (!db.objectStoreNames.contains('learnedPreferences')) {
            db.createObjectStore('learnedPreferences', {
              keyPath: 'key'
            })
          }

          // Store for recommendation feedback
          if (!db.objectStoreNames.contains('recommendationFeedback')) {
            const feedbackStore = db.createObjectStore('recommendationFeedback', {
              keyPath: 'id',
              autoIncrement: true
            })
            feedbackStore.createIndex('trackId', 'trackId')
            feedbackStore.createIndex('timestamp', 'timestamp')
            feedbackStore.createIndex('action', 'action')
          }
        }
      })

      this.initialized = true
      console.log('✅ Feedback Learning Engine initialized')
    } catch (error) {
      console.error('❌ Failed to initialize FeedbackLearningEngine:', error)
    }
  }

  /**
   * Record a like action
   */
  async likeTrack(track, context = {}) {
    await this.initialize()

    if (!this.db) return

    try {
      const likedTrack = {
        id: track.id,
        name: track.name,
        artists: track.artists?.map(a => ({ id: a.id, name: a.name })),
        album: {
          id: track.album?.id,
          name: track.album?.name,
          images: track.album?.images
        },
        popularity: track.popularity || 0,
        discoveryScore: track.discoveryScore || 0,
        features: this.extractFeatures(track),
        context: {
          recommendationReason: context.reason,
          similarity: context.similarity,
          serendipityLevel: context.serendipityLevel
        },
        timestamp: Date.now()
      }

      await this.db.put('likedTracks', likedTrack)

      // Record feedback
      await this.recordFeedback(track.id, 'like', context)

      // Update learned preferences
      await this.updateLearnedPreferences('like', likedTrack.features)

      console.log('👍 Track liked:', track.name)
    } catch (error) {
      console.error('Error recording like:', error)
    }
  }

  /**
   * Record a dislike action
   */
  async dislikeTrack(track, context = {}) {
    await this.initialize()

    if (!this.db) return

    try {
      const dislikedTrack = {
        id: track.id,
        name: track.name,
        artists: track.artists?.map(a => ({ id: a.id, name: a.name })),
        features: this.extractFeatures(track),
        reason: context.reason,
        timestamp: Date.now()
      }

      await this.db.put('dislikedTracks', dislikedTrack)

      // Record feedback
      await this.recordFeedback(track.id, 'dislike', context)

      // Update learned preferences
      await this.updateLearnedPreferences('dislike', dislikedTrack.features)

      console.log('👎 Track disliked:', track.name)
    } catch (error) {
      console.error('Error recording dislike:', error)
    }
  }

  /**
   * Record track play
   */
  async recordPlay(track, duration = 0) {
    await this.initialize()

    if (!this.db) return

    try {
      // Check if track already in history
      const existing = await this.db.getFromIndex(
        'listeningHistory',
        'trackId',
        track.id
      )

      if (existing) {
        // Update play count
        existing.playCount += 1
        existing.lastPlayed = Date.now()
        existing.totalDuration += duration
        await this.db.put('listeningHistory', existing)
      } else {
        // Add new entry
        const historyEntry = {
          trackId: track.id,
          name: track.name,
          artists: track.artists?.map(a => a.name).join(', '),
          playCount: 1,
          totalDuration: duration,
          firstPlayed: Date.now(),
          lastPlayed: Date.now(),
          timestamp: Date.now()
        }
        await this.db.add('listeningHistory', historyEntry)
      }

      // Record feedback
      await this.recordFeedback(track.id, 'play', { duration })
    } catch (error) {
      console.error('Error recording play:', error)
    }
  }

  /**
   * Record skip action
   */
  async recordSkip(track, playedDuration = 0) {
    await this.initialize()

    if (!this.db) return

    try {
      await this.recordFeedback(track.id, 'skip', { playedDuration })

      // If skipped very quickly (< 5 seconds), count as implicit dislike
      if (playedDuration < 5000) {
        const features = this.extractFeatures(track)
        await this.updateLearnedPreferences('dislike', features, 0.5) // Lower weight
      }

      console.log('⏭️ Track skipped:', track.name)
    } catch (error) {
      console.error('Error recording skip:', error)
    }
  }

  /**
   * Extract audio features from track
   */
  extractFeatures(track) {
    return {
      energy: track.energy ?? 0.5,
      valence: track.valence ?? 0.5,
      danceability: track.danceability ?? 0.5,
      acousticness: track.acousticness ?? 0.5,
      instrumentalness: track.instrumentalness ?? 0.5,
      liveness: track.liveness ?? 0.5,
      speechiness: track.speechiness ?? 0.5,
      tempo: track.tempo ? Math.min(track.tempo / 250, 1) : 0.5,
      loudness: track.loudness ? (track.loudness + 60) / 60 : 0.5,
      key: track.key !== undefined ? track.key / 11 : 0.5
    }
  }

  /**
   * Record feedback action
   */
  async recordFeedback(trackId, action, context = {}) {
    if (!this.db) return

    try {
      const feedback = {
        trackId,
        action, // 'like', 'dislike', 'play', 'skip'
        context,
        timestamp: Date.now()
      }

      await this.db.add('recommendationFeedback', feedback)
    } catch (error) {
      console.error('Error recording feedback:', error)
    }
  }

  /**
   * Update learned preferences based on feedback
   */
  async updateLearnedPreferences(action, features, weight = 1.0) {
    if (!this.db) return

    try {
      // Get current preferences
      const current = await this.db.get('learnedPreferences', 'audioFeatures')

      let preferences = current?.value || {
        energy: 0.5,
        valence: 0.5,
        danceability: 0.5,
        acousticness: 0.5,
        instrumentalness: 0.5,
        liveness: 0.5,
        speechiness: 0.5,
        tempo: 0.5,
        loudness: 0.5,
        key: 0.5
      }

      let sampleCount = current?.sampleCount || 0

      // Update preferences using exponential moving average
      const learningRate = 0.1 * weight
      const featureKeys = Object.keys(preferences)

      featureKeys.forEach(key => {
        if (features[key] !== undefined) {
          if (action === 'like') {
            // Move preference towards liked feature
            preferences[key] = preferences[key] * (1 - learningRate) + features[key] * learningRate
          } else if (action === 'dislike') {
            // Move preference away from disliked feature
            preferences[key] = preferences[key] * (1 - learningRate * 0.5) +
              (1 - features[key]) * learningRate * 0.5
          }
        }
      })

      sampleCount++

      // Store updated preferences
      await this.db.put('learnedPreferences', {
        key: 'audioFeatures',
        value: preferences,
        sampleCount,
        lastUpdated: Date.now()
      })

      console.log('📊 Learned preferences updated:', preferences)
    } catch (error) {
      console.error('Error updating learned preferences:', error)
    }
  }

  /**
   * Get learned audio feature preferences
   */
  async getLearnedPreferences() {
    await this.initialize()

    if (!this.db) return null

    try {
      const prefs = await this.db.get('learnedPreferences', 'audioFeatures')
      return prefs?.value || null
    } catch (error) {
      console.error('Error getting learned preferences:', error)
      return null
    }
  }

  /**
   * Get all liked tracks
   */
  async getLikedTracks(limit = 100) {
    await this.initialize()

    if (!this.db) return []

    try {
      const tx = this.db.transaction('likedTracks', 'readonly')
      const store = tx.objectStore('likedTracks')
      const index = store.index('timestamp')

      const tracks = await index.getAll()

      // Sort by timestamp (most recent first) and limit
      return tracks.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit)
    } catch (error) {
      console.error('Error getting liked tracks:', error)
      return []
    }
  }

  /**
   * Get all disliked tracks
   */
  async getDislikedTracks(limit = 100) {
    await this.initialize()

    if (!this.db) return []

    try {
      const tx = this.db.transaction('dislikedTracks', 'readonly')
      const store = tx.objectStore('dislikedTracks')
      const index = store.index('timestamp')

      const tracks = await index.getAll()

      return tracks.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit)
    } catch (error) {
      console.error('Error getting disliked tracks:', error)
      return []
    }
  }

  /**
   * Check if track is liked
   */
  async isLiked(trackId) {
    await this.initialize()

    if (!this.db) return false

    try {
      const track = await this.db.get('likedTracks', trackId)
      return !!track
    } catch (error) {
      return false
    }
  }

  /**
   * Check if track is disliked
   */
  async isDisliked(trackId) {
    await this.initialize()

    if (!this.db) return false

    try {
      const track = await this.db.get('dislikedTracks', trackId)
      return !!track
    } catch (error) {
      return false
    }
  }

  /**
   * Remove track from liked
   */
  async removeLike(trackId) {
    await this.initialize()

    if (!this.db) return

    try {
      await this.db.delete('likedTracks', trackId)
      console.log('🗑️ Like removed for track:', trackId)
    } catch (error) {
      console.error('Error removing like:', error)
    }
  }

  /**
   * Get listening statistics
   */
  async getListeningStats() {
    await this.initialize()

    if (!this.db) return null

    try {
      const [likedTracks, dislikedTracks, history, feedback] = await Promise.all([
        this.db.getAll('likedTracks'),
        this.db.getAll('dislikedTracks'),
        this.db.getAll('listeningHistory'),
        this.db.getAll('recommendationFeedback')
      ])

      const totalPlays = history.reduce((sum, entry) => sum + entry.playCount, 0)
      const totalDuration = history.reduce((sum, entry) => sum + entry.totalDuration, 0)

      const actions = feedback.reduce((acc, f) => {
        acc[f.action] = (acc[f.action] || 0) + 1
        return acc
      }, {})

      return {
        likedCount: likedTracks.length,
        dislikedCount: dislikedTracks.length,
        uniqueTracksPlayed: history.length,
        totalPlays,
        totalDuration,
        averagePlaysPerTrack: history.length > 0 ? totalPlays / history.length : 0,
        actions,
        feedbackCount: feedback.length
      }
    } catch (error) {
      console.error('Error getting listening stats:', error)
      return null
    }
  }

  /**
   * Get recommendation insights
   * Analyzes which recommendation strategies work best for the user
   */
  async getRecommendationInsights() {
    await this.initialize()

    if (!this.db) return null

    try {
      const likedTracks = await this.db.getAll('likedTracks')

      const reasonCounts = {}
      const avgSimilarity = {}
      const avgDiscoveryScore = {}

      likedTracks.forEach(track => {
        const reason = track.context?.recommendationReason || 'Unknown'
        reasonCounts[reason] = (reasonCounts[reason] || 0) + 1

        if (track.context?.similarity !== undefined) {
          if (!avgSimilarity[reason]) {
            avgSimilarity[reason] = { sum: 0, count: 0 }
          }
          avgSimilarity[reason].sum += track.context.similarity
          avgSimilarity[reason].count += 1
        }

        if (track.discoveryScore !== undefined) {
          if (!avgDiscoveryScore[reason]) {
            avgDiscoveryScore[reason] = { sum: 0, count: 0 }
          }
          avgDiscoveryScore[reason].sum += track.discoveryScore
          avgDiscoveryScore[reason].count += 1
        }
      })

      // Calculate averages
      Object.keys(avgSimilarity).forEach(reason => {
        avgSimilarity[reason] = avgSimilarity[reason].sum / avgSimilarity[reason].count
      })

      Object.keys(avgDiscoveryScore).forEach(reason => {
        avgDiscoveryScore[reason] = avgDiscoveryScore[reason].sum / avgDiscoveryScore[reason].count
      })

      return {
        totalLikes: likedTracks.length,
        reasonCounts,
        avgSimilarity,
        avgDiscoveryScore,
        mostSuccessfulReason: Object.entries(reasonCounts)
          .sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown'
      }
    } catch (error) {
      console.error('Error getting recommendation insights:', error)
      return null
    }
  }

  /**
   * Filter out disliked tracks from recommendations
   */
  async filterRecommendations(recommendations) {
    await this.initialize()

    if (!this.db) return recommendations

    try {
      const dislikedTracks = await this.getDislikedTracks()
      const dislikedIds = new Set(dislikedTracks.map(t => t.id))

      return recommendations.filter(rec => {
        const trackId = rec.track?.id || rec.id
        return !dislikedIds.has(trackId)
      })
    } catch (error) {
      console.error('Error filtering recommendations:', error)
      return recommendations
    }
  }

  /**
   * Clear all data (for testing or reset)
   */
  async clearAllData() {
    await this.initialize()

    if (!this.db) return

    try {
      await Promise.all([
        this.db.clear('likedTracks'),
        this.db.clear('dislikedTracks'),
        this.db.clear('listeningHistory'),
        this.db.clear('learnedPreferences'),
        this.db.clear('recommendationFeedback')
      ])

      console.log('🗑️ All feedback data cleared')
    } catch (error) {
      console.error('Error clearing data:', error)
    }
  }
}

export default new FeedbackLearningEngine()
