/**
 * Track Playability Utilities
 *
 * Ensures all recommended tracks are playable on Spotify
 * Filters out:
 * - Local files (is_local = true)
 * - Unavailable tracks (is_playable = false)
 * - Tracks without URIs
 * - Tracks from unavailable markets
 * - Restricted tracks
 */

/**
 * Check if a track is playable
 * @param {Object} track - Spotify track object
 * @param {string} userMarket - User's market/country code (optional)
 * @returns {boolean} - True if track is playable
 */
export function isTrackPlayable(track, userMarket = null) {
  if (!track) {
    return false;
  }

  // Filter out local files
  if (track.is_local === true) {
    return false;
  }

  // Must have a valid Spotify URI
  if (!track.uri || !track.uri.startsWith('spotify:track:')) {
    return false;
  }

  // Must have an ID
  if (!track.id) {
    return false;
  }

  // Check is_playable flag (if available)
  // Note: This field is only present when explicitly requested in the API call
  if (track.is_playable === false) {
    return false;
  }

  // Check for restrictions
  if (track.restrictions) {
    // If there are restrictions, check if they apply to playback
    if (track.restrictions.reason === 'market' ||
        track.restrictions.reason === 'product' ||
        track.restrictions.reason === 'explicit') {
      return false;
    }
  }

  // Check available markets (if provided and userMarket is specified)
  if (userMarket && track.available_markets) {
    if (Array.isArray(track.available_markets) && track.available_markets.length > 0) {
      if (!track.available_markets.includes(userMarket)) {
        return false;
      }
    }
  }

  // Check if track has preview_url or uri (at least one should be present for playability)
  if (!track.uri && !track.preview_url) {
    return false;
  }

  return true;
}

/**
 * Filter an array of tracks to only include playable ones
 * @param {Array} tracks - Array of Spotify track objects
 * @param {string} userMarket - User's market/country code (optional)
 * @returns {Array} - Filtered array of playable tracks
 */
export function filterPlayableTracks(tracks, userMarket = null) {
  if (!Array.isArray(tracks)) {
    return [];
  }

  return tracks.filter(track => isTrackPlayable(track, userMarket));
}

/**
 * Check if a track object from saved tracks/playlist is playable
 * (handles nested track structure like { track: {...} })
 * @param {Object} item - Item that might contain a track
 * @param {string} userMarket - User's market/country code (optional)
 * @returns {boolean} - True if playable
 */
export function isItemPlayable(item, userMarket = null) {
  if (!item) {
    return false;
  }

  // Handle nested track structure (from saved tracks, playlists)
  const track = item.track || item;

  return isTrackPlayable(track, userMarket);
}

/**
 * Extract playable track from an item
 * @param {Object} item - Item that might contain a track
 * @returns {Object|null} - Track object if playable, null otherwise
 */
export function extractPlayableTrack(item, userMarket = null) {
  if (!item) {
    return null;
  }

  const track = item.track || item;

  return isTrackPlayable(track, userMarket) ? track : null;
}

/**
 * Validate and clean an array of tracks/items
 * Handles both direct tracks and nested structures
 * @param {Array} items - Array of tracks or items containing tracks
 * @param {string} userMarket - User's market/country code (optional)
 * @returns {Array} - Array of playable tracks
 */
export function cleanTrackList(items, userMarket = null) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map(item => extractPlayableTrack(item, userMarket))
    .filter(track => track !== null);
}

/**
 * Get playability issues for a track (for debugging)
 * @param {Object} track - Spotify track object
 * @returns {Array} - Array of issue strings
 */
export function getPlayabilityIssues(track) {
  const issues = [];

  if (!track) {
    issues.push('Track is null or undefined');
    return issues;
  }

  if (track.is_local === true) {
    issues.push('Track is a local file');
  }

  if (!track.uri || !track.uri.startsWith('spotify:track:')) {
    issues.push('Invalid or missing Spotify URI');
  }

  if (!track.id) {
    issues.push('Missing track ID');
  }

  if (track.is_playable === false) {
    issues.push('Track marked as not playable');
  }

  if (track.restrictions) {
    issues.push(`Track has restrictions: ${track.restrictions.reason || 'unknown'}`);
  }

  if (!track.uri && !track.preview_url) {
    issues.push('No URI or preview URL available');
  }

  return issues;
}

/**
 * Check if a track can be played with Web Playback SDK
 * @param {Object} track - Spotify track object
 * @returns {boolean} - True if track can be played with SDK
 */
export function canPlayWithSDK(track) {
  if (!isTrackPlayable(track)) {
    return false;
  }

  // Web Playback SDK requires Spotify Premium for full tracks
  // But we can still attempt to play - Spotify will show upgrade prompt if needed
  return track.uri && track.uri.startsWith('spotify:track:');
}

/**
 * Validate recommendations before displaying to user
 * @param {Array} recommendations - Array of recommended tracks
 * @param {string} userMarket - User's market/country code (optional)
 * @returns {Object} - { valid, invalid, validTracks }
 */
export function validateRecommendations(recommendations, userMarket = null) {
  const valid = [];
  const invalid = [];

  if (!Array.isArray(recommendations)) {
    return { valid: [], invalid: [], validTracks: [] };
  }

  recommendations.forEach(rec => {
    const track = rec.track || rec;

    if (isTrackPlayable(track, userMarket)) {
      valid.push(rec);
    } else {
      invalid.push({
        track,
        issues: getPlayabilityIssues(track)
      });
    }
  });

  return {
    valid,
    invalid,
    validTracks: valid.map(v => v.track || v)
  };
}

/**
 * Log playability statistics
 * @param {Array} originalTracks - Original track list
 * @param {Array} filteredTracks - Filtered track list
 * @param {string} context - Context for logging (e.g., "recommendations", "saved tracks")
 */
export function logPlayabilityStats(originalTracks, filteredTracks, context = 'tracks') {
  const original = originalTracks?.length || 0;
  const filtered = filteredTracks?.length || 0;
  const removed = original - filtered;

  if (removed > 0) {
    console.log(`🎵 Playability Filter (${context}): ${filtered}/${original} tracks playable (${removed} filtered out)`);
  } else {
    console.log(`✅ Playability Filter (${context}): All ${filtered} tracks playable`);
  }
}

export default {
  isTrackPlayable,
  filterPlayableTracks,
  isItemPlayable,
  extractPlayableTrack,
  cleanTrackList,
  getPlayabilityIssues,
  canPlayWithSDK,
  validateRecommendations,
  logPlayabilityStats
};
