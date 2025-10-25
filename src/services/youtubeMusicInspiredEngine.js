/**
 * YouTube Music-Inspired Recommendation Engine
 *
 * Implements recommendation techniques inspired by YouTube Music's approach:
 * - Contextual recommendations (time-aware, mood-aware)
 * - Multi-armed bandit algorithm for exploration/exploitation
 * - Session-based recommendations
 * - Smart queue generation
 * - Personalized mix creation
 */

import { openDB } from 'idb';

const DB_NAME = 'YTMusicInspiredDB';
const DB_VERSION = 1;

export class YouTubeMusicInspiredEngine {
  constructor() {
    this.db = null;
    this.currentSession = null;
    this.banditArms = new Map(); // For multi-armed bandit algorithm
    this.contextCache = {
      timeOfDay: null,
      dayOfWeek: null,
      lastUpdated: null
    };
  }

  /**
   * Initialize the engine and database
   */
  async initialize() {
    this.db = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Store listening sessions with context
        if (!db.objectStoreNames.contains('sessions')) {
          const sessionStore = db.createObjectStore('sessions', {
            keyPath: 'id',
            autoIncrement: true
          });
          sessionStore.createIndex('timestamp', 'timestamp');
          sessionStore.createIndex('context', 'context.timeOfDay');
        }

        // Store bandit arm performance metrics
        if (!db.objectStoreNames.contains('banditMetrics')) {
          const banditStore = db.createObjectStore('banditMetrics', {
            keyPath: 'armId'
          });
          banditStore.createIndex('lastUpdated', 'lastUpdated');
        }

        // Store generated mixes
        if (!db.objectStoreNames.contains('personalizedMixes')) {
          const mixStore = db.createObjectStore('personalizedMixes', {
            keyPath: 'id'
          });
          mixStore.createIndex('type', 'type');
          mixStore.createIndex('created', 'created');
        }

        // Store play queue history
        if (!db.objectStoreNames.contains('queueHistory')) {
          const queueStore = db.createObjectStore('queueHistory', {
            keyPath: 'id',
            autoIncrement: true
          });
          queueStore.createIndex('timestamp', 'timestamp');
        }
      }
    });

    // Initialize current session
    this.startNewSession();
  }

  /**
   * Get current context (time of day, day of week, etc.)
   */
  getCurrentContext() {
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday

    // Determine time period
    let timeOfDay;
    if (hour >= 5 && hour < 12) timeOfDay = 'morning';
    else if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
    else if (hour >= 17 && hour < 21) timeOfDay = 'evening';
    else timeOfDay = 'night';

    // Determine day type
    const dayType = (dayOfWeek === 0 || dayOfWeek === 6) ? 'weekend' : 'weekday';

    // Infer mood/activity from time and day
    let suggestedMood;
    if (timeOfDay === 'morning' && dayType === 'weekday') {
      suggestedMood = 'energetic'; // Morning commute/workout
    } else if (timeOfDay === 'afternoon' && dayType === 'weekday') {
      suggestedMood = 'focus'; // Work/study
    } else if (timeOfDay === 'evening') {
      suggestedMood = 'relaxed'; // Wind down
    } else if (timeOfDay === 'night' && dayType === 'weekend') {
      suggestedMood = 'party'; // Night out
    } else {
      suggestedMood = 'chill'; // Default
    }

    return {
      timeOfDay,
      dayOfWeek,
      dayType,
      hour,
      suggestedMood,
      timestamp: now.toISOString()
    };
  }

  /**
   * Start a new listening session
   */
  startNewSession() {
    this.currentSession = {
      id: Date.now(),
      startTime: new Date().toISOString(),
      tracks: [],
      context: this.getCurrentContext(),
      interactions: []
    };
  }

  /**
   * Add track to current session
   */
  async addToSession(track, interaction = 'play') {
    if (!this.currentSession) {
      this.startNewSession();
    }

    this.currentSession.tracks.push({
      ...track,
      playedAt: new Date().toISOString(),
      interaction
    });

    this.currentSession.interactions.push({
      type: interaction,
      trackId: track.id,
      timestamp: new Date().toISOString()
    });

    // Save session periodically (every 5 tracks or on significant events)
    if (this.currentSession.tracks.length % 5 === 0 || interaction === 'like' || interaction === 'dislike') {
      await this.saveSession();
    }
  }

  /**
   * Save current session to database
   */
  async saveSession() {
    if (!this.db || !this.currentSession) return;

    const sessionToSave = {
      ...this.currentSession,
      endTime: new Date().toISOString(),
      duration: new Date() - new Date(this.currentSession.startTime)
    };

    await this.db.put('sessions', sessionToSave);
  }

  /**
   * Get contextual recommendations based on time, mood, and listening patterns
   */
  async getContextualRecommendations(userTracks, allAvailableTracks, context = null) {
    const currentContext = context || this.getCurrentContext();

    // Get historical sessions with similar context
    const similarSessions = await this.getSimilarContextSessions(currentContext);

    // Extract patterns from similar sessions
    const contextualPatterns = this.extractContextualPatterns(similarSessions);

    // Score tracks based on contextual fit
    const scoredTracks = allAvailableTracks.map(track => {
      let score = 0;

      // Audio feature matching for suggested mood
      score += this.calculateMoodFitScore(track, currentContext.suggestedMood);

      // Boost tracks similar to what user typically plays in this context
      if (contextualPatterns.preferredFeatures) {
        score += this.calculateContextualSimilarity(track, contextualPatterns.preferredFeatures);
      }

      // Boost tracks from genres commonly played in this context
      if (contextualPatterns.preferredGenres && track.genres) {
        const genreMatch = track.genres.some(g =>
          contextualPatterns.preferredGenres.includes(g)
        );
        if (genreMatch) score += 15;
      }

      // Time-of-day energy matching
      score += this.calculateEnergyFitScore(track, currentContext.timeOfDay);

      return { ...track, contextualScore: score };
    });

    // Sort by contextual score
    return scoredTracks
      .sort((a, b) => b.contextualScore - a.contextualScore)
      .slice(0, 50);
  }

  /**
   * Calculate how well a track fits a mood
   */
  calculateMoodFitScore(track, mood) {
    if (!track.audio_features) return 0;

    const features = track.audio_features;
    let score = 0;

    switch (mood) {
      case 'energetic':
        score += features.energy * 20;
        score += features.tempo > 120 ? 15 : 0;
        score += features.danceability * 10;
        break;
      case 'focus':
        score += features.instrumentalness * 25;
        score += (1 - features.speechiness) * 15;
        score += features.acousticness * 10;
        score -= features.loudness > -5 ? 10 : 0; // Prefer quieter
        break;
      case 'relaxed':
        score += features.valence * 15;
        score += (1 - features.energy) * 20;
        score += features.acousticness * 15;
        break;
      case 'party':
        score += features.danceability * 25;
        score += features.energy * 20;
        score += features.valence * 10;
        break;
      case 'chill':
      default:
        score += features.valence * 10;
        score += (1 - features.energy) * 15;
        score += features.acousticness * 10;
        break;
    }

    return score;
  }

  /**
   * Calculate energy fit for time of day
   */
  calculateEnergyFitScore(track, timeOfDay) {
    if (!track.audio_features) return 0;

    const energy = track.audio_features.energy;

    switch (timeOfDay) {
      case 'morning':
        return energy > 0.6 ? 15 : 5; // Prefer energetic
      case 'afternoon':
        return Math.abs(energy - 0.5) < 0.2 ? 15 : 5; // Moderate energy
      case 'evening':
        return energy < 0.6 ? 15 : 5; // Lower energy
      case 'night':
        return energy < 0.5 ? 15 : 5; // Calm
      default:
        return 10;
    }
  }

  /**
   * Multi-Armed Bandit Algorithm (Thompson Sampling)
   * Balances exploration (trying new music) vs exploitation (known preferences)
   */
  async multiArmedBandit(recommendationStrategies, context = {}) {
    // Each "arm" is a recommendation strategy (e.g., "audio-similarity", "genre-based", "discovery")
    const arms = Object.keys(recommendationStrategies);

    // Get or initialize metrics for each arm
    for (const arm of arms) {
      if (!this.banditArms.has(arm)) {
        // Initialize with Thompson Sampling parameters (Beta distribution)
        this.banditArms.set(arm, {
          alpha: 1, // Success count + 1
          beta: 1,  // Failure count + 1
          pulls: 0,
          rewards: 0,
          lastPull: null
        });
      }
    }

    // Sample from each arm's Beta distribution
    const samples = arms.map(arm => {
      const metrics = this.banditArms.get(arm);
      return {
        arm,
        sample: this.sampleBeta(metrics.alpha, metrics.beta)
      };
    });

    // Select arm with highest sample (Thompson Sampling)
    samples.sort((a, b) => b.sample - a.sample);
    const selectedArm = samples[0].arm;

    // Update pull count
    const metrics = this.banditArms.get(selectedArm);
    metrics.pulls++;
    metrics.lastPull = new Date().toISOString();

    // Save metrics to database
    await this.saveBanditMetrics();

    // Return the selected strategy and its recommendations
    return {
      strategy: selectedArm,
      recommendations: await recommendationStrategies[selectedArm](context),
      confidence: samples[0].sample
    };
  }

  /**
   * Update bandit arm performance based on user feedback
   */
  async updateBanditReward(strategy, reward) {
    if (!this.banditArms.has(strategy)) return;

    const metrics = this.banditArms.get(strategy);

    if (reward > 0) {
      metrics.alpha += reward; // Increase success count
    } else {
      metrics.beta += Math.abs(reward); // Increase failure count
    }

    metrics.rewards += reward;

    await this.saveBanditMetrics();
  }

  /**
   * Sample from Beta distribution (approximation using Gamma distribution)
   */
  sampleBeta(alpha, beta) {
    const gammaAlpha = this.sampleGamma(alpha);
    const gammaBeta = this.sampleGamma(beta);
    return gammaAlpha / (gammaAlpha + gammaBeta);
  }

  /**
   * Sample from Gamma distribution (Marsaglia and Tsang method)
   */
  sampleGamma(shape, scale = 1) {
    if (shape < 1) {
      return this.sampleGamma(shape + 1, scale) * Math.pow(Math.random(), 1 / shape);
    }

    const d = shape - 1/3;
    const c = 1 / Math.sqrt(9 * d);

    while (true) {
      let x, v;
      do {
        x = this.randomNormal();
        v = 1 + c * x;
      } while (v <= 0);

      v = v * v * v;
      const u = Math.random();

      if (u < 1 - 0.0331 * x * x * x * x) {
        return d * v * scale;
      }

      if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) {
        return d * v * scale;
      }
    }
  }

  /**
   * Generate random number from normal distribution (Box-Muller transform)
   */
  randomNormal(mean = 0, stdDev = 1) {
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return z0 * stdDev + mean;
  }

  /**
   * Generate smart play queue based on current track and session
   */
  async generateSmartQueue(currentTrack, availableTracks, queueLength = 10) {
    const context = this.getCurrentContext();
    const queue = [];

    // Strategy: Mix of similarity, variety, and contextual fit
    const usedTracks = new Set([currentTrack.id]);

    // 40% similar to current track (smooth transitions)
    const similarCount = Math.floor(queueLength * 0.4);
    const similarTracks = this.findSimilarTracks(currentTrack, availableTracks, similarCount * 2);
    for (let i = 0; i < similarCount && i < similarTracks.length; i++) {
      if (!usedTracks.has(similarTracks[i].id)) {
        queue.push({ ...similarTracks[i], reason: 'similar' });
        usedTracks.add(similarTracks[i].id);
      }
    }

    // 30% contextually appropriate
    const contextualCount = Math.floor(queueLength * 0.3);
    const contextualTracks = await this.getContextualRecommendations(
      [currentTrack],
      availableTracks.filter(t => !usedTracks.has(t.id)),
      context
    );
    for (let i = 0; i < contextualCount && i < contextualTracks.length; i++) {
      if (!usedTracks.has(contextualTracks[i].id)) {
        queue.push({ ...contextualTracks[i], reason: 'contextual' });
        usedTracks.add(contextualTracks[i].id);
      }
    }

    // 30% discovery (new but related)
    const discoveryCount = queueLength - queue.length;
    const discoveryTracks = availableTracks
      .filter(t => !usedTracks.has(t.id))
      .filter(t => t.popularity < 60) // Favor less popular
      .sort(() => Math.random() - 0.5) // Shuffle
      .slice(0, discoveryCount);

    for (const track of discoveryTracks) {
      queue.push({ ...track, reason: 'discovery' });
      usedTracks.add(track.id);
    }

    // Smooth the queue by reordering for better transitions
    const smoothedQueue = this.smoothQueueTransitions(queue);

    // Save queue to history
    await this.saveQueueToHistory(currentTrack, smoothedQueue);

    return smoothedQueue;
  }

  /**
   * Find tracks similar to a seed track
   */
  findSimilarTracks(seedTrack, availableTracks, count = 10) {
    if (!seedTrack.audio_features) return [];

    const seedFeatures = seedTrack.audio_features;

    const scoredTracks = availableTracks
      .filter(t => t.id !== seedTrack.id && t.audio_features)
      .map(track => {
        const distance = this.calculateAudioDistance(seedFeatures, track.audio_features);
        return { ...track, similarityScore: 100 - distance };
      })
      .sort((a, b) => b.similarityScore - a.similarityScore);

    return scoredTracks.slice(0, count);
  }

  /**
   * Calculate Euclidean distance between audio features
   */
  calculateAudioDistance(features1, features2) {
    const weights = {
      energy: 2,
      valence: 2,
      danceability: 1.5,
      acousticness: 1,
      instrumentalness: 1,
      tempo: 0.5,
      loudness: 0.3
    };

    let distance = 0;

    for (const [feature, weight] of Object.entries(weights)) {
      if (features1[feature] !== undefined && features2[feature] !== undefined) {
        let diff;
        if (feature === 'tempo') {
          // Normalize tempo to 0-1 range
          const normalized1 = features1[feature] / 200;
          const normalized2 = features2[feature] / 200;
          diff = Math.abs(normalized1 - normalized2);
        } else if (feature === 'loudness') {
          // Normalize loudness (-60 to 0 dB range)
          const normalized1 = (features1[feature] + 60) / 60;
          const normalized2 = (features2[feature] + 60) / 60;
          diff = Math.abs(normalized1 - normalized2);
        } else {
          diff = Math.abs(features1[feature] - features2[feature]);
        }
        distance += diff * diff * weight;
      }
    }

    return Math.sqrt(distance) * 10; // Scale to 0-100
  }

  /**
   * Smooth queue transitions by reordering tracks for better flow
   */
  smoothQueueTransitions(queue) {
    if (queue.length <= 2) return queue;

    const smoothed = [queue[0]];
    const remaining = queue.slice(1);

    while (remaining.length > 0) {
      const current = smoothed[smoothed.length - 1];

      // Find the most compatible next track
      let bestIndex = 0;
      let bestScore = -Infinity;

      for (let i = 0; i < remaining.length; i++) {
        const score = this.calculateTransitionScore(current, remaining[i]);
        if (score > bestScore) {
          bestScore = score;
          bestIndex = i;
        }
      }

      smoothed.push(remaining[bestIndex]);
      remaining.splice(bestIndex, 1);
    }

    return smoothed;
  }

  /**
   * Calculate how smooth a transition would be between two tracks
   */
  calculateTransitionScore(track1, track2) {
    if (!track1.audio_features || !track2.audio_features) return 0;

    const f1 = track1.audio_features;
    const f2 = track2.audio_features;

    // Prefer similar energy levels
    const energyDiff = Math.abs(f1.energy - f2.energy);
    const energyScore = (1 - energyDiff) * 30;

    // Prefer similar tempo (within 20 BPM)
    const tempoDiff = Math.abs(f1.tempo - f2.tempo);
    const tempoScore = tempoDiff < 20 ? 25 : (50 - tempoDiff) / 2;

    // Prefer similar valence (mood)
    const valenceDiff = Math.abs(f1.valence - f2.valence);
    const valenceScore = (1 - valenceDiff) * 20;

    // Key compatibility (circle of fifths)
    const keyScore = this.calculateKeyCompatibility(f1.key, f2.key) * 15;

    // Mode matching (minor vs major)
    const modeScore = f1.mode === f2.mode ? 10 : 0;

    return energyScore + tempoScore + valenceScore + keyScore + modeScore;
  }

  /**
   * Calculate key compatibility using circle of fifths
   */
  calculateKeyCompatibility(key1, key2) {
    if (key1 === -1 || key2 === -1) return 0.5; // No key detected
    if (key1 === key2) return 1; // Same key

    // Circle of fifths distances
    const distance = Math.abs(key1 - key2);
    const circleDistance = Math.min(distance, 12 - distance);

    // Perfect fifth (7 semitones) or perfect fourth (5 semitones) are compatible
    if (circleDistance === 7 || circleDistance === 5) return 0.8;
    if (circleDistance === 2 || circleDistance === 10) return 0.6; // Relative keys
    if (circleDistance <= 3) return 0.5;

    return 0.3;
  }

  /**
   * Generate personalized mixes (like YouTube Music's mixes)
   */
  async generatePersonalizedMix(type, seedData, availableTracks, mixSize = 50) {
    let mix = [];
    const context = this.getCurrentContext();

    switch (type) {
      case 'discovery':
        // Discovery Mix: New music based on taste
        mix = await this.generateDiscoveryMix(seedData, availableTracks, mixSize);
        break;

      case 'mood':
        // Mood Mix: Based on current context and mood
        mix = await this.generateMoodMix(context.suggestedMood, availableTracks, mixSize);
        break;

      case 'genre':
        // Genre Mix: Deep dive into a specific genre
        mix = await this.generateGenreMix(seedData.genre, availableTracks, mixSize);
        break;

      case 'artist':
        // Artist Mix: Artist radio with similar artists
        mix = await this.generateArtistMix(seedData.artist, availableTracks, mixSize);
        break;

      case 'decade':
        // Decade Mix: Music from a specific era
        mix = await this.generateDecadeMix(seedData.decade, availableTracks, mixSize);
        break;

      default:
        // Default: Personalized based on recent activity
        mix = await this.generatePersonalizedDefault(availableTracks, mixSize);
    }

    // Save mix to database
    const savedMix = {
      id: `${type}_${Date.now()}`,
      type,
      created: new Date().toISOString(),
      tracks: mix,
      seedData,
      context
    };

    if (this.db) {
      await this.db.put('personalizedMixes', savedMix);
    }

    return savedMix;
  }

  /**
   * Generate a discovery mix with hidden gems
   */
  async generateDiscoveryMix(userTaste, availableTracks, size) {
    return availableTracks
      .filter(t => t.popularity < 50) // Focus on hidden gems
      .filter(t => t.audio_features) // Must have audio features
      .map(track => ({
        ...track,
        discoveryScore: this.calculateDiscoveryScore(track, userTaste)
      }))
      .sort((a, b) => b.discoveryScore - a.discoveryScore)
      .slice(0, size);
  }

  /**
   * Generate a mood-based mix
   */
  async generateMoodMix(mood, availableTracks, size) {
    return availableTracks
      .filter(t => t.audio_features)
      .map(track => ({
        ...track,
        moodScore: this.calculateMoodFitScore(track, mood)
      }))
      .sort((a, b) => b.moodScore - a.moodScore)
      .slice(0, size);
  }

  /**
   * Generate a genre-based mix
   */
  async generateGenreMix(genre, availableTracks, size) {
    return availableTracks
      .filter(t => t.genres && t.genres.some(g =>
        g.toLowerCase().includes(genre.toLowerCase())
      ))
      .sort(() => Math.random() - 0.5) // Shuffle for variety
      .slice(0, size);
  }

  /**
   * Generate an artist mix
   */
  async generateArtistMix(seedArtist, availableTracks, size) {
    // 30% from the artist, 70% similar artists
    const artistTracks = availableTracks.filter(t =>
      t.artists && t.artists.some(a => a.id === seedArtist.id)
    ).slice(0, Math.floor(size * 0.3));

    const similarTracks = availableTracks
      .filter(t => t.artists && !t.artists.some(a => a.id === seedArtist.id))
      .sort(() => Math.random() - 0.5)
      .slice(0, size - artistTracks.length);

    return [...artistTracks, ...similarTracks];
  }

  /**
   * Generate a decade mix
   */
  async generateDecadeMix(decade, availableTracks, size) {
    const startYear = parseInt(decade);
    const endYear = startYear + 9;

    return availableTracks
      .filter(t => {
        if (!t.album || !t.album.release_date) return false;
        const year = parseInt(t.album.release_date.substring(0, 4));
        return year >= startYear && year <= endYear;
      })
      .sort(() => Math.random() - 0.5)
      .slice(0, size);
  }

  /**
   * Generate personalized default mix
   */
  async generatePersonalizedDefault(availableTracks, size) {
    const context = this.getCurrentContext();
    return this.getContextualRecommendations([], availableTracks, context)
      .then(tracks => tracks.slice(0, size));
  }

  /**
   * Calculate discovery score for a track
   */
  calculateDiscoveryScore(track, userTaste = {}) {
    let score = 0;

    // Lower popularity = higher discovery potential
    score += (100 - (track.popularity || 50)) * 0.5;

    // Bonus for new releases
    if (track.album && track.album.release_date) {
      const releaseDate = new Date(track.album.release_date);
      const daysSinceRelease = (Date.now() - releaseDate) / (1000 * 60 * 60 * 24);
      if (daysSinceRelease < 90) score += 20; // Released in last 3 months
    }

    // Audio feature diversity bonus
    if (track.audio_features) {
      const uniqueness = this.calculateUniqueness(track.audio_features);
      score += uniqueness * 15;
    }

    return score;
  }

  /**
   * Calculate how unique a track's audio features are
   */
  calculateUniqueness(features) {
    // Tracks with extreme or unusual feature combinations are more unique
    const extremeFeatures = [
      Math.abs(features.energy - 0.5),
      Math.abs(features.valence - 0.5),
      Math.abs(features.danceability - 0.5),
      features.instrumentalness,
      features.acousticness
    ];

    return extremeFeatures.reduce((sum, val) => sum + val, 0) / extremeFeatures.length;
  }

  /**
   * Get sessions with similar context
   */
  async getSimilarContextSessions(targetContext, limit = 10) {
    if (!this.db) return [];

    const allSessions = await this.db.getAll('sessions');

    const scoredSessions = allSessions.map(session => ({
      ...session,
      contextSimilarity: this.calculateContextSimilarity(session.context, targetContext)
    }));

    return scoredSessions
      .sort((a, b) => b.contextSimilarity - a.contextSimilarity)
      .slice(0, limit);
  }

  /**
   * Calculate similarity between two contexts
   */
  calculateContextSimilarity(context1, context2) {
    let score = 0;

    if (context1.timeOfDay === context2.timeOfDay) score += 30;
    if (context1.dayType === context2.dayType) score += 20;
    if (context1.suggestedMood === context2.suggestedMood) score += 25;

    // Day of week proximity
    const dayDiff = Math.abs(context1.dayOfWeek - context2.dayOfWeek);
    score += (7 - dayDiff) * 3;

    return score;
  }

  /**
   * Extract patterns from similar sessions
   */
  extractContextualPatterns(sessions) {
    if (sessions.length === 0) return {};

    const allTracks = sessions.flatMap(s => s.tracks || []);

    // Extract preferred genres
    const genreCounts = {};
    const featureSums = {
      energy: 0,
      valence: 0,
      danceability: 0,
      acousticness: 0,
      instrumentalness: 0,
      count: 0
    };

    allTracks.forEach(track => {
      if (track.genres) {
        track.genres.forEach(genre => {
          genreCounts[genre] = (genreCounts[genre] || 0) + 1;
        });
      }

      if (track.audio_features) {
        featureSums.energy += track.audio_features.energy || 0;
        featureSums.valence += track.audio_features.valence || 0;
        featureSums.danceability += track.audio_features.danceability || 0;
        featureSums.acousticness += track.audio_features.acousticness || 0;
        featureSums.instrumentalness += track.audio_features.instrumentalness || 0;
        featureSums.count++;
      }
    });

    // Calculate average features
    const avgFeatures = featureSums.count > 0 ? {
      energy: featureSums.energy / featureSums.count,
      valence: featureSums.valence / featureSums.count,
      danceability: featureSums.danceability / featureSums.count,
      acousticness: featureSums.acousticness / featureSums.count,
      instrumentalness: featureSums.instrumentalness / featureSums.count
    } : null;

    // Get top genres
    const topGenres = Object.entries(genreCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([genre]) => genre);

    return {
      preferredGenres: topGenres,
      preferredFeatures: avgFeatures,
      totalTracks: allTracks.length,
      sessionCount: sessions.length
    };
  }

  /**
   * Calculate contextual similarity between track and preferred features
   */
  calculateContextualSimilarity(track, preferredFeatures) {
    if (!track.audio_features || !preferredFeatures) return 0;

    const features = track.audio_features;
    let score = 0;

    score += (1 - Math.abs(features.energy - preferredFeatures.energy)) * 20;
    score += (1 - Math.abs(features.valence - preferredFeatures.valence)) * 20;
    score += (1 - Math.abs(features.danceability - preferredFeatures.danceability)) * 15;
    score += (1 - Math.abs(features.acousticness - preferredFeatures.acousticness)) * 10;
    score += (1 - Math.abs(features.instrumentalness - preferredFeatures.instrumentalness)) * 10;

    return score;
  }

  /**
   * Save bandit metrics to database
   */
  async saveBanditMetrics() {
    if (!this.db) return;

    for (const [armId, metrics] of this.banditArms.entries()) {
      await this.db.put('banditMetrics', {
        armId,
        ...metrics,
        lastUpdated: new Date().toISOString()
      });
    }
  }

  /**
   * Save queue to history
   */
  async saveQueueToHistory(seedTrack, queue) {
    if (!this.db) return;

    await this.db.add('queueHistory', {
      seedTrackId: seedTrack.id,
      queue: queue.map(t => ({ id: t.id, reason: t.reason })),
      timestamp: new Date().toISOString(),
      context: this.getCurrentContext()
    });
  }

  /**
   * Get statistics about recommendation performance
   */
  async getRecommendationStats() {
    if (!this.db) return null;

    const sessions = await this.db.getAll('sessions');
    const banditMetrics = await this.db.getAll('banditMetrics');
    const mixes = await this.db.getAll('personalizedMixes');

    return {
      totalSessions: sessions.length,
      totalTracks: sessions.reduce((sum, s) => sum + (s.tracks?.length || 0), 0),
      banditArms: banditMetrics.map(m => ({
        arm: m.armId,
        pulls: m.pulls,
        successRate: m.alpha / (m.alpha + m.beta),
        totalReward: m.rewards
      })),
      mixesGenerated: mixes.length,
      currentContext: this.getCurrentContext()
    };
  }
}

export default new YouTubeMusicInspiredEngine();
