# Integration Guide: Advanced ML Features

This guide explains how to integrate the new ML-powered recommendation system and advanced visualization components into your existing Spotify Discovery Visualizer.

## 📦 New Components Overview

### 1. ML Recommendation Engine
- **File**: `src/services/mlRecommendationEngine.js`
- **Purpose**: TensorFlow.js-based recommendation system with multi-algorithm orchestration
- **Features**: Audio DNA matching, discovery scores, listening pattern analysis

### 2. Feedback Learning Engine
- **File**: `src/services/feedbackLearningEngine.js`
- **Purpose**: Learn from user interactions using IndexedDB
- **Features**: Like/dislike tracking, learned preferences, recommendation insights

### 3. Discovery UI Components
- **AudioSimilarityRadar.vue**: Radar chart showing audio feature similarity
- **DiscoveryScoreBadge.vue**: Badge showing how undiscovered a track is
- **ConnectionGraph.vue**: D3.js force-directed graph of audio DNA connections
- **SerendipitySlider.vue**: User control over recommendation adventurousness
- **FeedbackButtons.vue**: Like/dislike buttons with learning
- **LearningDashboard.vue**: Insights into learned preferences

### 4. Advanced Visualizations
- **AdvancedVisualizer.vue**: 3 new visualization modes (Fractal, Emotional, Time-Travel)

---

## 🚀 Quick Start Integration

### Step 1: Update Discover View

Add the ML recommendation engine to your `Discover.vue`:

```vue
<script>
import mlRecommendationEngine from '@/services/mlRecommendationEngine'
import feedbackLearningEngine from '@/services/feedbackLearningEngine'
import SerendipitySlider from '@/components/Discovery/SerendipitySlider.vue'
import FeedbackButtons from '@/components/Discovery/FeedbackButtons.vue'
import DiscoveryScoreBadge from '@/components/Discovery/DiscoveryScoreBadge.vue'
import AudioSimilarityRadar from '@/components/Discovery/AudioSimilarityRadar.vue'

export default {
  components: {
    SerendipitySlider,
    FeedbackButtons,
    DiscoveryScoreBadge,
    AudioSimilarityRadar
  },
  data() {
    return {
      serendipityLevel: 0.3,
      recommendations: [],
      userAudioPreferences: null
    }
  },
  async mounted() {
    await this.loadRecommendations()
  },
  methods: {
    async loadRecommendations() {
      const spotify = this.$store.getters['auth/spotifyService']

      // Get user's tracks and artists
      const userTracks = await spotify.getTopTracks('medium_term', 50)
      const userArtists = await spotify.getTopArtists('medium_term', 50)
      const savedTracks = await spotify.getSavedTracks(50)
      const recentTracks = await spotify.getRecentlyPlayed(50)

      // Generate ML-powered recommendations
      const result = await mlRecommendationEngine.generateAdvancedRecommendations({
        userTracks: userTracks.items,
        userArtists: userArtists.items,
        savedTracks: savedTracks.items,
        recentTracks: recentTracks.items,
        serendipityLevel: this.serendipityLevel,
        maxPopularity: 60
      })

      this.recommendations = result.recommendations
      this.userAudioPreferences = result.metadata.avgFeatures

      // Filter out disliked tracks
      this.recommendations = await feedbackLearningEngine.filterRecommendations(
        this.recommendations
      )
    },

    async handleFeedback({ action, track }) {
      if (action === 'like' || action === 'dislike') {
        // Reload recommendations to reflect learned preferences
        await this.loadRecommendations()
      }
    }
  }
}
</script>

<template>
  <div class="discover-view">
    <!-- Serendipity Slider -->
    <SerendipitySlider
      v-model="serendipityLevel"
      @change="loadRecommendations"
    />

    <!-- Recommendations List -->
    <div class="recommendations-grid">
      <div
        v-for="rec in recommendations"
        :key="rec.track.id"
        class="recommendation-card"
      >
        <!-- Track Info -->
        <div class="track-info">
          <img :src="rec.track.album.images[0]?.url" />
          <div>
            <h3>{{ rec.track.name }}</h3>
            <p>{{ rec.track.artists[0].name }}</p>
          </div>
        </div>

        <!-- Discovery Score Badge -->
        <DiscoveryScoreBadge
          :score="rec.discoveryScore"
          :popularity="rec.track.popularity"
          show-tooltip
        />

        <!-- Feedback Buttons -->
        <FeedbackButtons
          :track="rec.track"
          :context="{
            reason: rec.reason,
            similarity: rec.similarity,
            serendipityLevel: serendipityLevel
          }"
          @feedback="handleFeedback"
        />

        <!-- Audio Similarity Radar -->
        <AudioSimilarityRadar
          :track-features="rec.features"
          :user-features="userAudioPreferences"
          :similarity="rec.similarity"
          :explanation="rec.explanation"
        />
      </div>
    </div>
  </div>
</template>
```

### Step 2: Add Learning Dashboard

Create a new route or tab for the learning dashboard:

```vue
<template>
  <div class="insights-page">
    <LearningDashboard @reset="handleReset" />
  </div>
</template>

<script>
import LearningDashboard from '@/components/Discovery/LearningDashboard.vue'

export default {
  components: {
    LearningDashboard
  },
  methods: {
    handleReset() {
      // Optionally reload recommendations or show message
      this.$emit('preferences-reset')
    }
  }
}
</script>
```

### Step 3: Add Connection Graph

Show the connection graph for visualizing audio DNA relationships:

```vue
<template>
  <div class="graph-view">
    <ConnectionGraph
      :user-tracks="userTracks"
      :recommendations="recommendations"
      :width="800"
      :height="600"
    />
  </div>
</template>

<script>
import ConnectionGraph from '@/components/Discovery/ConnectionGraph.vue'

export default {
  components: {
    ConnectionGraph
  },
  props: {
    userTracks: Array,
    recommendations: Array
  }
}
</script>
```

### Step 4: Add Advanced Visualizer

Replace or add alongside existing visualizer:

```vue
<template>
  <div class="visualizer-container">
    <AdvancedVisualizer
      :audio-data="audioData"
      :track-features="currentTrackFeatures"
      :is-playing="isPlaying"
    />
  </div>
</template>

<script>
import AdvancedVisualizer from '@/components/Visualizer/AdvancedVisualizer.vue'

export default {
  components: {
    AdvancedVisualizer
  },
  data() {
    return {
      audioData: {
        frequencies: [],
        timeDomain: [],
        energy: 0
      },
      currentTrackFeatures: {},
      isPlaying: false
    }
  },
  mounted() {
    this.setupAudioAnalysis()
  },
  methods: {
    setupAudioAnalysis() {
      // Connect Web Audio API
      // Update audioData in real-time
    }
  }
}
</script>
```

---

## 🎯 Key Integration Points

### 1. Initialize Engines on App Start

In your `main.js` or App.vue:

```javascript
import mlRecommendationEngine from '@/services/mlRecommendationEngine'
import feedbackLearningEngine from '@/services/feedbackLearningEngine'

// Initialize engines
mlRecommendationEngine.initialize()
feedbackLearningEngine.initialize()
```

### 2. Record User Actions

Whenever a user plays, skips, or interacts with a track:

```javascript
// When track plays
await feedbackLearningEngine.recordPlay(track, duration)

// When track is skipped
await feedbackLearningEngine.recordSkip(track, playedDuration)

// When user likes a track
await feedbackLearningEngine.likeTrack(track, {
  reason: 'Audio DNA Match',
  similarity: 0.85
})
```

### 3. Use Learned Preferences

Get learned preferences to improve recommendations:

```javascript
const learnedPrefs = await feedbackLearningEngine.getLearnedPreferences()

if (learnedPrefs) {
  // Use learned preferences as target for recommendations
  const recommendations = await mlRecommendationEngine.generateAdvancedRecommendations({
    // ... other params
    targetFeatures: learnedPrefs
  })
}
```

### 4. Filter Recommendations

Always filter out disliked tracks:

```javascript
let recommendations = await getRecommendations()
recommendations = await feedbackLearningEngine.filterRecommendations(recommendations)
```

---

## 📊 Data Flow

```
User Listening → Feedback Engine (IndexedDB) → Learned Preferences
                                                       ↓
User's Library → ML Recommendation Engine ← Learned Preferences
                        ↓
                Multi-Algorithm Processing
                   ↓      ↓      ↓
           Audio DNA  Hidden  Exploratory
                   ↓      ↓      ↓
              Ranked Recommendations
                        ↓
              Filter Disliked Tracks
                        ↓
              UI Components Display
```

---

## 🎨 Styling Tips

All components use consistent styling:
- Dark theme with `rgba(0, 0, 0, 0.3)` backgrounds
- `backdrop-filter: blur(10px)` for glass morphism
- Color palette: `#3b82f6` (blue), `#10b981` (green), `#f59e0b` (orange)
- Border radius: `12px` - `16px`
- Responsive design with mobile-first approach

---

## 🔧 Configuration Options

### ML Recommendation Engine

```javascript
const options = {
  userTracks: [],           // User's top tracks
  userArtists: [],          // User's top artists
  savedTracks: [],          // Saved/liked tracks
  recentTracks: [],         // Recently played
  serendipityLevel: 0.3,    // 0-1, exploration level
  maxPopularity: 60,        // Max popularity threshold
  limit: 50                 // Number of recommendations
}
```

### Serendipity Slider

```vue
<SerendipitySlider
  v-model="serendipityLevel"
  :min="0"
  :max="1"
  :step="0.05"
  @change="handleChange"
/>
```

### Audio Similarity Radar

```vue
<AudioSimilarityRadar
  :track-features="{
    energy: 0.8,
    valence: 0.6,
    danceability: 0.7,
    // ... other features
  }"
  :user-features="{ /* same structure */ }"
  :similarity="0.85"
  :explanation="'Matches your taste in energy, mood, and tempo'"
  :size="300"
  theme="dark"
/>
```

---

## 🚨 Error Handling

All components include error handling:

```javascript
try {
  const recommendations = await mlRecommendationEngine.generateAdvancedRecommendations(options)
} catch (error) {
  console.error('Recommendation error:', error)
  // Fall back to basic recommendations
  const fallback = await basicRecommendationEngine.generate()
}
```

---

## 💾 Storage Management

The feedback engine uses IndexedDB. To manage storage:

```javascript
// Get statistics
const stats = await feedbackLearningEngine.getListeningStats()
console.log('Storage used:', stats)

// Clear all data (for testing)
await feedbackLearningEngine.clearAllData()
```

---

## 🎯 Best Practices

1. **Initialize Early**: Initialize both engines when app starts
2. **Record Everything**: Track all user interactions for better learning
3. **Filter Dislikes**: Always filter out disliked tracks
4. **Progressive Enhancement**: Start with basic features, add advanced ones
5. **Error Boundaries**: Wrap ML components in error boundaries
6. **Loading States**: Show loading indicators during ML processing
7. **Caching**: Cache recommendations for better performance
8. **Mobile Optimization**: Reduce visualization complexity on mobile

---

## 📱 Mobile Considerations

The components are responsive, but for best mobile experience:

```javascript
// Reduce complexity on mobile
const isMobile = window.innerWidth < 768

const options = {
  // ... other options
  limit: isMobile ? 20 : 50
}

// Use lower quality for visualizations
const quality = isMobile ? 'low' : 'high'
```

---

## 🧪 Testing

Test the integration:

1. **Like/Dislike**: Test feedback buttons record correctly
2. **Recommendations**: Verify recommendations change based on feedback
3. **Learning**: Check if preferences update over time
4. **Visualization**: Test all 3 visualization modes
5. **Performance**: Monitor FPS and memory usage

---

## 🎓 Example: Complete Integration

See `src/views/DiscoverEnhanced.vue` (create this file) for a complete example integrating all components.

---

## 📚 Component API Reference

### mlRecommendationEngine

- `initialize()`: Initialize TensorFlow.js
- `generateAdvancedRecommendations(options)`: Generate recommendations
- `calculateDiscoveryScore(track)`: Calculate discovery score
- `analyzeListeningPatterns(tracks)`: Analyze patterns
- `dispose()`: Clean up resources

### feedbackLearningEngine

- `initialize()`: Initialize IndexedDB
- `likeTrack(track, context)`: Record like
- `dislikeTrack(track, context)`: Record dislike
- `recordPlay(track, duration)`: Record play
- `recordSkip(track, duration)`: Record skip
- `getLearnedPreferences()`: Get learned audio features
- `getListeningStats()`: Get statistics
- `getRecommendationInsights()`: Get insights
- `filterRecommendations(recs)`: Filter disliked tracks

---

## 🎉 You're Ready!

You now have all the tools to build a revolutionary music discovery platform. Start by integrating the components one by one, testing each thoroughly.

For questions or issues, check the inline documentation in each component file.

**Happy coding! 🚀**
