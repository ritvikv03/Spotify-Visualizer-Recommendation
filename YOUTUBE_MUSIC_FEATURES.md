# YouTube Music-Inspired Recommendation Features

## Overview

This project now includes advanced recommendation techniques inspired by YouTube Music's approach, implemented using legitimate Spotify API data. These features enhance the existing ML-based recommendation system with contextual awareness, adaptive learning, and intelligent queue generation.

## New Features

### 1. **Contextual Recommendations** 🕐
Recommendations adapt based on:
- **Time of Day**: Morning (energetic), Afternoon (focus), Evening (relaxed), Night (chill)
- **Day of Week**: Weekday vs Weekend patterns
- **Inferred Mood**: Automatically suggests mood based on context
- **Historical Patterns**: Learns what you typically listen to in similar contexts

### 2. **Multi-Armed Bandit Algorithm** 🎰
Intelligently balances exploration vs exploitation:
- **Thompson Sampling**: Uses Beta distributions to select the best recommendation strategy
- **5 Strategy Arms**:
  - `spotify-api`: Spotify's native recommendations
  - `audio-dna`: TensorFlow-based audio similarity
  - `contextual`: Time-aware, mood-aware recommendations
  - `hidden-gems`: Discovery-focused library picks
  - `exploratory`: Random low-popularity tracks
- **Adaptive Learning**: Improves over time based on your feedback
- **Confidence Scoring**: Shows how confident the system is in its strategy choice

### 3. **Session-Based Learning** 📊
Tracks your listening sessions:
- **Session Context**: Records time, mood, and tracks played
- **Pattern Extraction**: Identifies what you listen to in specific contexts
- **Temporal Analysis**: Recent interactions matter more (exponential decay)
- **Persistent Storage**: IndexedDB stores session history

### 4. **Smart Queue Generation** 🎵
Creates intelligent play queues:
- **40% Similar**: Smooth transitions from current track
- **30% Contextual**: Fits current time/mood
- **30% Discovery**: New music to explore
- **Transition Smoothing**: Reorders queue for better flow
- **Audio Feature Matching**: Considers energy, tempo, key, and mode compatibility

### 5. **Personalized Mixes** 🎨
Generate custom mixes like YouTube Music:
- **Discovery Mix**: Hidden gems based on your taste
- **Mood Mix**: Curated for current context
- **Genre Mix**: Deep dive into specific genres
- **Artist Mix**: Artist radio with similar artists
- **Decade Mix**: Music from specific eras

### 6. **Advanced Audio Analysis** 🎼
Enhanced audio feature processing:
- **10 Audio Features**: Energy, valence, danceability, acousticness, instrumentalness, liveness, speechiness, tempo, loudness, key
- **Weighted Distance**: Emphasizes important characteristics
- **Key Compatibility**: Circle of fifths matching
- **Mood Mapping**: Translates audio features to moods

## Architecture

### File Structure
```
src/services/
├── youtubeMusicInspiredEngine.js    # Core YouTube Music-inspired engine
├── recommendationOrchestrator.js     # Coordinates all recommendation engines
├── recommendationEngine.js           # Original Spotify API engine
├── mlRecommendationEngine.js         # TensorFlow-based engine
└── feedbackLearningEngine.js         # User feedback learning
```

### Data Storage (IndexedDB)
The system uses 4 new object stores:

1. **sessions**: Listening sessions with context
   - `id`, `startTime`, `endTime`, `tracks[]`, `context`, `interactions[]`

2. **banditMetrics**: Multi-armed bandit performance
   - `armId`, `alpha`, `beta`, `pulls`, `rewards`, `lastPull`

3. **personalizedMixes**: Generated mixes
   - `id`, `type`, `created`, `tracks[]`, `seedData`, `context`

4. **queueHistory**: Play queue history
   - `id`, `seedTrackId`, `queue[]`, `timestamp`, `context`

## How It Works

### Recommendation Flow

```
User Requests Recommendations
         ↓
Orchestrator Initialized
         ↓
Fetch User Data (tracks, artists, recent plays)
         ↓
Multi-Armed Bandit Selects Strategy
         ↓
Thompson Sampling (Beta Distribution)
         ↓
Execute Selected Strategy
         ↓
Apply Contextual Scoring
         ↓
Filter Disliked Tracks
         ↓
Return Recommendations
```

### Feedback Loop

```
User Likes/Dislikes Track
         ↓
Update Feedback Learning Engine
         ↓
Update Multi-Armed Bandit Reward
         ↓
Record in Current Session
         ↓
Improve Future Recommendations
```

### Context Detection

```javascript
// Example context object
{
  timeOfDay: 'morning',      // morning, afternoon, evening, night
  dayOfWeek: 2,              // 0-6 (Sunday-Saturday)
  dayType: 'weekday',        // weekday, weekend
  hour: 9,                   // 0-23
  suggestedMood: 'energetic', // energetic, focus, relaxed, party, chill
  timestamp: '2025-10-25T09:00:00Z'
}
```

## API Reference

### RecommendationOrchestrator

```javascript
import recommendationOrchestrator from '@/services/recommendationOrchestrator'

// Initialize
await recommendationOrchestrator.initialize()

// Generate recommendations with multi-armed bandit
const result = await recommendationOrchestrator.generateRecommendations(
  spotifyService,
  {
    useMultiArmedBandit: true,  // Use bandit algorithm
    fallbackToAll: false,        // Don't blend all strategies
    limit: 50,                   // Number of recommendations
    serendipityLevel: 0.3,       // Exploration level (0-1)
    maxPopularity: 50            // Hidden gems threshold
  }
)

// Result structure
{
  tracks: [...],              // Array of recommended tracks
  strategy: 'audio-dna',      // Strategy used
  confidence: 0.82,           // Confidence score (0-1)
  metadata: {
    context: {...},           // Current context
    userData: {...}           // User data used
  }
}

// Generate smart queue for current track
const queue = await recommendationOrchestrator.generateSmartQueue(
  currentTrack,
  spotifyService,
  { queueLength: 10 }
)

// Generate personalized mix
const mix = await recommendationOrchestrator.generatePersonalizedMix(
  'discovery',               // Type: discovery, mood, genre, artist, decade
  { genre: 'indie' },       // Seed data (depends on type)
  spotifyService,
  { mixSize: 50 }
)

// Record user feedback
await recommendationOrchestrator.recordFeedback(
  track,
  'like',                   // like, love, play, skip, dislike
  'audio-dna'               // Strategy that recommended this track
)

// Get current context
const context = recommendationOrchestrator.getCurrentContext()

// Get statistics
const stats = await recommendationOrchestrator.getRecommendationStats()
```

### YouTubeMusicInspiredEngine

```javascript
import youtubeMusicEngine from '@/services/youtubeMusicInspiredEngine'

// Get contextual recommendations
const contextual = await youtubeMusicEngine.getContextualRecommendations(
  userTracks,
  allAvailableTracks,
  context  // Optional, uses current time if not provided
)

// Multi-armed bandit
const banditResult = await youtubeMusicEngine.multiArmedBandit(
  {
    'strategy-1': async (context) => [...tracks],
    'strategy-2': async (context) => [...tracks],
  },
  context
)

// Update bandit reward
await youtubeMusicEngine.updateBanditReward('strategy-1', 1.0)

// Generate smart queue
const queue = await youtubeMusicEngine.generateSmartQueue(
  currentTrack,
  availableTracks,
  10  // Queue length
)

// Generate personalized mix
const mix = await youtubeMusicEngine.generatePersonalizedMix(
  'mood',                   // Type
  { mood: 'energetic' },    // Seed data
  availableTracks,
  50                        // Mix size
)
```

## Mood Mapping

The system maps audio features to moods:

| Mood | Energy | Valence | Danceability | Acousticness | Use Case |
|------|--------|---------|--------------|--------------|----------|
| **Energetic** | High (>0.6) | Any | High | Low | Morning, workout |
| **Focus** | Medium | Any | Low | High | Work, study |
| **Relaxed** | Low | High | Any | High | Evening wind-down |
| **Party** | High | High | High | Low | Night out, socializing |
| **Chill** | Low | Medium | Any | Medium | Default, casual listening |

## Multi-Armed Bandit Details

### Thompson Sampling

Uses Beta distribution for each strategy arm:
- **Alpha (α)**: Success count + 1
- **Beta (β)**: Failure count + 1

Sample from each arm's Beta(α, β) distribution and select the highest.

### Reward System

Feedback translates to rewards:
- **Love**: +1.5
- **Like**: +1.0
- **Play**: +0.5
- **Skip**: -0.5
- **Dislike**: -1.0

### Example Evolution

```
Initial State (all arms equal):
  audio-dna:   α=1, β=1  (50% success rate)
  contextual:  α=1, β=1  (50% success rate)

After user likes audio-dna recommendation:
  audio-dna:   α=2, β=1  (67% success rate) ← More likely to be selected
  contextual:  α=1, β=1  (50% success rate)

After user dislikes contextual recommendation:
  audio-dna:   α=2, β=1  (67% success rate)
  contextual:  α=1, β=2  (33% success rate) ← Less likely to be selected
```

## Performance Considerations

- **IndexedDB**: Asynchronous storage for non-blocking UI
- **Parallel Fetching**: Multiple Spotify API calls in parallel
- **Strategy Caching**: Bandit metrics cached in memory
- **Lazy Initialization**: Engines initialize only when needed
- **Batch Processing**: Efficient TensorFlow operations

## Future Enhancements

Potential additions:
1. **Collaborative Filtering**: Cross-user recommendations (requires backend)
2. **Social Integration**: Friend listening patterns
3. **Advanced NLP**: Lyric analysis for mood detection
4. **Playlist Generation**: Auto-create playlists from mixes
5. **A/B Testing**: Compare strategy performance systematically
6. **Temporal Forecasting**: Predict future listening patterns
7. **Multi-objective Optimization**: Balance discovery, familiarity, and mood

## Differences from YouTube Music

This implementation is **inspired by** YouTube Music's approach but:
- ✅ Uses **only Spotify API** (no scraping)
- ✅ Runs **entirely client-side** (no proprietary algorithms)
- ✅ **Open source** and customizable
- ✅ **Privacy-focused** (all data stored locally)
- ❌ Does not use YouTube's actual algorithms
- ❌ Does not access YouTube's servers
- ❌ Operates within Spotify's Terms of Service

## Legal & Ethical Notice

This implementation:
- Uses **only legitimate APIs** (Spotify Web API)
- Does **not scrape** or reverse engineer any services
- Stores data **locally in the browser**
- Respects **all terms of service**
- Is designed for **defensive/educational purposes** only

## Credits

Inspired by research on recommendation systems including:
- Multi-Armed Bandit algorithms
- Contextual recommendation techniques
- Audio feature-based similarity
- Session-based learning patterns

Built with:
- TensorFlow.js for ML models
- IndexedDB for persistent storage
- Spotify Web API for music data
- Vue 3 for reactive UI
