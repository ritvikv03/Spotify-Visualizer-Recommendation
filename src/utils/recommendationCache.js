/**
 * Recommendation Cache
 *
 * Caches recommendations in IndexedDB to:
 * - Reduce API calls to Spotify
 * - Enable instant re-displays
 * - Improve rate limit handling
 * - Better offline experience
 */

const DB_NAME = 'spotify-discovery-cache'
const DB_VERSION = 1
const STORE_NAME = 'recommendations'
const CACHE_DURATION = 60 * 60 * 1000 // 1 hour in milliseconds

let db = null

/**
 * Initialize IndexedDB
 */
async function initDB() {
  if (db) return db

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      db = request.result
      resolve(db)
    }

    request.onupgradeneeded = (event) => {
      const database = event.target.result

      // Create object store if it doesn't exist
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = database.createObjectStore(STORE_NAME, { keyPath: 'userId' })
        objectStore.createIndex('timestamp', 'timestamp', { unique: false })
      }
    }
  })
}

/**
 * Save recommendations to cache
 */
export async function cacheRecommendations(userId, recommendations, metadata = {}) {
  try {
    const database = await initDB()
    const transaction = database.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)

    const cacheData = {
      userId,
      recommendations,
      metadata,
      timestamp: Date.now()
    }

    await new Promise((resolve, reject) => {
      const request = store.put(cacheData)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })

    console.log('💾 Cached', recommendations.length, 'recommendations for user', userId)
    return true
  } catch (error) {
    console.error('Error caching recommendations:', error)
    return false
  }
}

/**
 * Get cached recommendations if still fresh
 */
export async function getCachedRecommendations(userId, maxAge = CACHE_DURATION) {
  try {
    const database = await initDB()
    const transaction = database.transaction([STORE_NAME], 'readonly')
    const store = transaction.objectStore(STORE_NAME)

    const cacheData = await new Promise((resolve, reject) => {
      const request = store.get(userId)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })

    if (!cacheData) {
      console.log('📭 No cached recommendations found for user', userId)
      return null
    }

    const age = Date.now() - cacheData.timestamp

    if (age > maxAge) {
      console.log('⏰ Cache expired (', Math.round(age / 60000), 'minutes old)')
      await clearCache(userId) // Clean up expired cache
      return null
    }

    console.log('✅ Found cached recommendations:', cacheData.recommendations.length, 'tracks (', Math.round(age / 60000), 'minutes old)')
    return cacheData
  } catch (error) {
    console.error('Error retrieving cached recommendations:', error)
    return null
  }
}

/**
 * Clear cache for specific user
 */
export async function clearCache(userId) {
  try {
    const database = await initDB()
    const transaction = database.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)

    await new Promise((resolve, reject) => {
      const request = store.delete(userId)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })

    console.log('🗑️ Cleared cache for user', userId)
    return true
  } catch (error) {
    console.error('Error clearing cache:', error)
    return false
  }
}

/**
 * Clear all expired caches (maintenance)
 */
export async function clearExpiredCaches() {
  try {
    const database = await initDB()
    const transaction = database.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const index = store.index('timestamp')

    const cutoffTime = Date.now() - CACHE_DURATION
    const range = IDBKeyRange.upperBound(cutoffTime)

    let deletedCount = 0

    await new Promise((resolve, reject) => {
      const request = index.openCursor(range)

      request.onsuccess = (event) => {
        const cursor = event.target.result
        if (cursor) {
          cursor.delete()
          deletedCount++
          cursor.continue()
        } else {
          resolve()
        }
      }

      request.onerror = () => reject(request.error)
    })

    if (deletedCount > 0) {
      console.log('🧹 Cleared', deletedCount, 'expired caches')
    }

    return deletedCount
  } catch (error) {
    console.error('Error clearing expired caches:', error)
    return 0
  }
}

export default {
  cacheRecommendations,
  getCachedRecommendations,
  clearCache,
  clearExpiredCaches
}
