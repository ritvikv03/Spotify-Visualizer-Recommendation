/**
 * Recommendation Orchestrator
 *
 * Coordinates multiple recommendation engines and strategies:
 * - Traditional RecommendationEngine (Spotify API + fallback)
 * - MLRecommendationEngine (TensorFlow-based audio DNA)
 * - YouTubeMusicInspiredEngine (contextual, bandit, sessions)
 *
 * Uses multi-armed bandit to optimize strategy selection over time
 */

import { RecommendationEngine } from './recommendationEngine.js';
import mlRecommendationEngine from './mlRecommendationEngine.js';
import youtubeMusicEngine from './youtubeMusicInspiredEngine.js';
import feedbackLearningEngine from './feedbackLearningEngine.js';

export class RecommendationOrchestrator {
  constructor() {
    this.initialized = false;
    this.strategies = {
      'spotify-api': this.getSpotifyAPIRecommendations.bind(this),
      'audio-dna': this.getAudioDNARecommendations.bind(this),
      'contextual': this.getContextualRecommendations.bind(this),
      'hidden-gems': this.getHiddenGemsRecommendations.bind(this),
      'exploratory': this.getExploratoryRecommendations.bind(this)
    };
  }

  /**
   * Initialize all recommendation engines
   */
  async initialize() {
    if (this.initialized) return;

    await Promise.all([
      mlRecommendationEngine.initialize(),
      youtubeMusicEngine.initialize(),
      feedbackLearningEngine.initialize()
    ]);

    this.initialized = true;
    console.log('🎼 Recommendation Orchestrator initialized');
  }

  /**
   * Generate recommendations using the best strategy (multi-armed bandit)
   */
  async generateRecommendations(spotifyService, options = {}) {
    await this.initialize();

    const {
      useMultiArmedBandit = true,
      fallbackToAll = true,
      limit = 50
    } = options;

    // Fetch user data
    const userData = await this.fetchUserData(spotifyService);

    if (useMultiArmedBandit) {
      // Use multi-armed bandit to select best strategy
      const result = await youtubeMusicEngine.multiArmedBandit(
        this.strategies,
        { ...userData, ...options }
      );

      console.log(`🎯 Selected strategy: ${result.strategy} (confidence: ${(result.confidence * 100).toFixed(1)}%)`);

      return {
        tracks: result.recommendations.slice(0, limit),
        strategy: result.strategy,
        confidence: result.confidence,
        metadata: {
          context: youtubeMusicEngine.getCurrentContext(),
          userData
        }
      };
    }

    if (fallbackToAll) {
      // Use all strategies and merge results
      return this.generateBlendedRecommendations(spotifyService, userData, options);
    }

    // Default: use Spotify API strategy
    return {
      tracks: await this.getSpotifyAPIRecommendations({ ...userData, ...options }),
      strategy: 'spotify-api',
      metadata: { userData }
    };
  }

  /**
   * Generate blended recommendations from all strategies
   */
  async generateBlendedRecommendations(spotifyService, userData, options = {}) {
    const { limit = 50 } = options;

    console.log('🎨 Generating blended recommendations from all strategies...');

    // Run all strategies in parallel
    const [spotify, audioDNA, contextual, hiddenGems, exploratory] = await Promise.allSettled([
      this.getSpotifyAPIRecommendations({ ...userData, ...options, limit: 15 }),
      this.getAudioDNARecommendations({ ...userData, ...options, limit: 15 }),
      this.getContextualRecommendations({ ...userData, ...options, limit: 10 }),
      this.getHiddenGemsRecommendations({ ...userData, ...options, limit: 5 }),
      this.getExploratoryRecommendations({ ...userData, ...options, limit: 5 })
    ]);

    // Collect all recommendations
    const allRecommendations = [];

    if (spotify.status === 'fulfilled') {
      allRecommendations.push(...spotify.value.map(t => ({ ...t, strategy: 'spotify-api' })));
    }
    if (audioDNA.status === 'fulfilled') {
      allRecommendations.push(...audioDNA.value.map(t => ({ ...t, strategy: 'audio-dna' })));
    }
    if (contextual.status === 'fulfilled') {
      allRecommendations.push(...contextual.value.map(t => ({ ...t, strategy: 'contextual' })));
    }
    if (hiddenGems.status === 'fulfilled') {
      allRecommendations.push(...hiddenGems.value.map(t => ({ ...t, strategy: 'hidden-gems' })));
    }
    if (exploratory.status === 'fulfilled') {
      allRecommendations.push(...exploratory.value.map(t => ({ ...t, strategy: 'exploratory' })));
    }

    // Deduplicate by track ID, keeping the highest scoring version
    const trackMap = new Map();
    allRecommendations.forEach(rec => {
      const trackId = rec.track?.id || rec.id;
      if (!trackId) return;

      const existingScore = trackMap.get(trackId)?.compositeScore || 0;
      const newScore = rec.compositeScore || rec.discoveryScore || 0;

      if (!trackMap.has(trackId) || newScore > existingScore) {
        trackMap.set(trackId, rec);
      }
    });

    // Convert back to array and sort
    const uniqueRecommendations = Array.from(trackMap.values())
      .sort((a, b) => (b.compositeScore || b.discoveryScore || 0) - (a.compositeScore || a.discoveryScore || 0))
      .slice(0, limit);

    console.log(`✅ Blended ${uniqueRecommendations.length} recommendations from ${allRecommendations.length} total`);

    return {
      tracks: uniqueRecommendations,
      strategy: 'blended',
      strategyBreakdown: {
        spotify: spotify.status === 'fulfilled' ? spotify.value.length : 0,
        audioDNA: audioDNA.status === 'fulfilled' ? audioDNA.value.length : 0,
        contextual: contextual.status === 'fulfilled' ? contextual.value.length : 0,
        hiddenGems: hiddenGems.status === 'fulfilled' ? hiddenGems.value.length : 0,
        exploratory: exploratory.status === 'fulfilled' ? exploratory.value.length : 0
      },
      metadata: {
        context: youtubeMusicEngine.getCurrentContext(),
        userData
      }
    };
  }

  /**
   * Strategy 1: Spotify API recommendations
   */
  async getSpotifyAPIRecommendations(context) {
    const { spotifyService, tracks, artists, limit = 20 } = context;

    if (!spotifyService || !tracks || !artists) {
      console.warn('Missing required data for Spotify API strategy');
      return [];
    }

    try {
      const result = await RecommendationEngine.generateRecommendations(
        spotifyService,
        tracks,
        artists,
        { maxPopularity: context.maxPopularity || 50 }
      );

      return result.tracks || [];
    } catch (error) {
      console.error('Spotify API strategy error:', error);
      return [];
    }
  }

  /**
   * Strategy 2: Audio DNA recommendations
   */
  async getAudioDNARecommendations(context) {
    const { tracks = [], savedTracks = [], recentTracks = [], artists = [], limit = 20 } = context;

    try {
      const result = await mlRecommendationEngine.generateAdvancedRecommendations({
        userTracks: tracks,
        userArtists: artists,
        savedTracks,
        recentTracks,
        serendipityLevel: context.serendipityLevel || 0.3,
        maxPopularity: context.maxPopularity || 60,
        limit
      });

      return result.recommendations.map(r => r.track || r);
    } catch (error) {
      console.error('Audio DNA strategy error:', error);
      return [];
    }
  }

  /**
   * Strategy 3: Contextual recommendations (time-aware, mood-aware)
   */
  async getContextualRecommendations(context) {
    const { tracks = [], savedTracks = [], limit = 20 } = context;

    try {
      // Combine all available tracks
      const allTracks = [
        ...tracks,
        ...savedTracks.map(item => item.track || item)
      ].filter(t => t && t.id && !t.is_local);

      // Deduplicate
      const uniqueTracks = Array.from(
        new Map(allTracks.map(t => [t.id, t])).values()
      );

      // Get contextual recommendations
      const recommendations = await youtubeMusicEngine.getContextualRecommendations(
        tracks,
        uniqueTracks,
        youtubeMusicEngine.getCurrentContext()
      );

      return recommendations.slice(0, limit);
    } catch (error) {
      console.error('Contextual strategy error:', error);
      return [];
    }
  }

  /**
   * Strategy 4: Hidden gems from library
   */
  async getHiddenGemsRecommendations(context) {
    const { tracks = [], savedTracks = [], limit = 20 } = context;

    try {
      const allTracks = [
        ...tracks,
        ...savedTracks.map(item => item.track || item)
      ].filter(t => t && t.id && !t.is_local && t.popularity < 50);

      const uniqueTracks = Array.from(
        new Map(allTracks.map(t => [t.id, t])).values()
      );

      // Score by discovery potential
      const scored = uniqueTracks.map(track => ({
        track,
        discoveryScore: mlRecommendationEngine.calculateDiscoveryScore(track),
        compositeScore: (100 - track.popularity) + mlRecommendationEngine.calculateDiscoveryScore(track)
      }));

      return scored
        .sort((a, b) => b.compositeScore - a.compositeScore)
        .slice(0, limit);
    } catch (error) {
      console.error('Hidden gems strategy error:', error);
      return [];
    }
  }

  /**
   * Strategy 5: Exploratory recommendations
   */
  async getExploratoryRecommendations(context) {
    const { tracks = [], savedTracks = [], limit = 20 } = context;

    try {
      const allTracks = [
        ...tracks,
        ...savedTracks.map(item => item.track || item)
      ].filter(t => t && t.id && !t.is_local);

      const uniqueTracks = Array.from(
        new Map(allTracks.map(t => [t.id, t])).values()
      );

      // Random selection from lower popularity tracks
      return uniqueTracks
        .filter(t => t.popularity < 60)
        .sort(() => Math.random() - 0.5)
        .slice(0, limit);
    } catch (error) {
      console.error('Exploratory strategy error:', error);
      return [];
    }
  }

  /**
   * Generate smart play queue for current track
   */
  async generateSmartQueue(currentTrack, spotifyService, options = {}) {
    await this.initialize();

    const { queueLength = 10 } = options;

    // Fetch user data
    const userData = await this.fetchUserData(spotifyService);

    // Combine all available tracks
    const allTracks = [
      ...userData.tracks,
      ...userData.savedTracks.map(item => item.track || item),
      ...userData.recentTracks.map(item => item.track || item)
    ].filter(t => t && t.id && !t.is_local);

    const uniqueTracks = Array.from(
      new Map(allTracks.map(t => [t.id, t])).values()
    );

    // Generate smart queue
    const queue = await youtubeMusicEngine.generateSmartQueue(
      currentTrack,
      uniqueTracks,
      queueLength
    );

    return queue;
  }

  /**
   * Generate personalized mix
   */
  async generatePersonalizedMix(type, seedData, spotifyService, options = {}) {
    await this.initialize();

    const { mixSize = 50 } = options;

    // Fetch user data
    const userData = await this.fetchUserData(spotifyService);

    // Combine all available tracks
    const allTracks = [
      ...userData.tracks,
      ...userData.savedTracks.map(item => item.track || item),
      ...userData.recentTracks.map(item => item.track || item)
    ].filter(t => t && t.id && !t.is_local);

    const uniqueTracks = Array.from(
      new Map(allTracks.map(t => [t.id, t])).values()
    );

    // Generate mix
    const mix = await youtubeMusicEngine.generatePersonalizedMix(
      type,
      seedData,
      uniqueTracks,
      mixSize
    );

    return mix;
  }

  /**
   * Record user feedback to improve recommendations
   */
  async recordFeedback(track, feedbackType, strategy = null) {
    await this.initialize();

    // Record in feedback learning engine
    await feedbackLearningEngine.recordFeedback(track, feedbackType);

    // Update multi-armed bandit if strategy is specified
    if (strategy) {
      let reward = 0;

      switch (feedbackType) {
        case 'like':
          reward = 1.0;
          break;
        case 'love':
          reward = 1.5;
          break;
        case 'play':
          reward = 0.5;
          break;
        case 'skip':
          reward = -0.5;
          break;
        case 'dislike':
          reward = -1.0;
          break;
        default:
          reward = 0;
      }

      await youtubeMusicEngine.updateBanditReward(strategy, reward);
    }

    // Add to current session
    await youtubeMusicEngine.addToSession(track, feedbackType);
  }

  /**
   * Fetch all required user data from Spotify
   */
  async fetchUserData(spotifyService) {
    try {
      const [topTracks, topArtists, savedTracks, recentTracks] = await Promise.allSettled([
        spotifyService.getUserTopTracks('medium_term', 50),
        spotifyService.getUserTopArtists('medium_term', 20),
        spotifyService.getSavedTracks(50),
        spotifyService.getRecentlyPlayed(50)
      ]);

      return {
        spotifyService,
        tracks: topTracks.status === 'fulfilled' ? (topTracks.value.items || []) : [],
        artists: topArtists.status === 'fulfilled' ? (topArtists.value.items || []) : [],
        savedTracks: savedTracks.status === 'fulfilled' ? (savedTracks.value.items || []) : [],
        recentTracks: recentTracks.status === 'fulfilled' ? (recentTracks.value.items || []) : []
      };
    } catch (error) {
      console.error('Error fetching user data:', error);
      return {
        spotifyService,
        tracks: [],
        artists: [],
        savedTracks: [],
        recentTracks: []
      };
    }
  }

  /**
   * Get current listening context
   */
  getCurrentContext() {
    return youtubeMusicEngine.getCurrentContext();
  }

  /**
   * Get recommendation statistics and performance
   */
  async getRecommendationStats() {
    await this.initialize();
    return youtubeMusicEngine.getRecommendationStats();
  }

  /**
   * Start a new listening session
   */
  startNewSession() {
    youtubeMusicEngine.startNewSession();
  }

  /**
   * Save current session
   */
  async saveSession() {
    await youtubeMusicEngine.saveSession();
  }
}

export default new RecommendationOrchestrator();
