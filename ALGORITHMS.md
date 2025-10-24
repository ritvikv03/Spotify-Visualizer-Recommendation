# Algorithm Documentation: Next-Gen Music Discovery

This document explains the sophisticated algorithms powering the Spotify Discovery Visualizer's ML-based recommendation system.

## 🧠 Core Philosophy

**Goal**: Discover hidden gems by matching audio DNA, not popularity.

**Principles**:
1. **Zero Popularity Bias**: Penalize mainstream tracks
2. **Audio-First**: Match sonic characteristics, not genres
3. **Continuous Learning**: Improve from every interaction
4. **Explainable AI**: Show why recommendations were made
5. **User Control**: Serendipity slider for exploration vs exploitation

---

## 📊 Algorithm 1: Audio DNA Matching

### Overview
Genre-agnostic similarity matching based on pure audio characteristics.

### Input Features (10 dimensions)
```javascript
{
  energy: 0.0-1.0,           // Intensity and activity
  valence: 0.0-1.0,          // Musical positivity/happiness
  danceability: 0.0-1.0,     // Rhythm suitability for dancing
  acousticness: 0.0-1.0,     // Acoustic vs electronic
  instrumentalness: 0.0-1.0, // Vocal content
  liveness: 0.0-1.0,         // Live performance probability
  speechiness: 0.0-1.0,      // Spoken word content
  tempo: 0.0-1.0,            // Normalized BPM (0-250)
  loudness: 0.0-1.0,         // Normalized dB (-60 to 0)
  key: 0.0-1.0               // Musical key (0-11)
}
```

### Weighted Euclidean Distance

```javascript
similarity = 1 / (1 + √(Σ wᵢ(xᵢ - yᵢ)²))

where:
  wᵢ = weight for feature i
  xᵢ = user preference for feature i
  yᵢ = track value for feature i
```

### Feature Weights (Default)
```javascript
{
  energy: 0.20,          // Most important
  valence: 0.15,         // Mood matching
  danceability: 0.15,    // Rhythm matching
  acousticness: 0.12,    // Style matching
  instrumentalness: 0.10,
  tempo: 0.08,
  liveness: 0.08,
  speechiness: 0.05,
  loudness: 0.05,
  key: 0.02              // Least important
}
```

### Cosine Similarity (Alternative)
```javascript
similarity = (A · B) / (||A|| × ||B||)

where:
  A = user preference vector
  B = track feature vector
  · = dot product
  ||·|| = Euclidean norm
```

### Output
- Similarity score: 0.0-1.0
- Feature-by-feature breakdown
- Top 3 matching features
- Human-readable explanation

---

## 💎 Algorithm 2: Discovery Score Calculation

### Purpose
Quantify how "undiscovered" a track is (inverse popularity).

### Formula
```javascript
baseScore = 100 - popularity

// Bonuses
if (popularity < 20) {
  baseScore += 20  // Hidden gem bonus
} else if (popularity < 40) {
  baseScore += 10  // Undiscovered bonus
}

// Fresh release bonus
if (releaseYear === currentYear && popularity < 30) {
  baseScore += 15
}

discoveryScore = clamp(baseScore, 0, 100)
```

### Score Ranges
- **80-100**: Hidden Gem 💎 (almost nobody knows)
- **60-79**: Undiscovered ✨ (flying under radar)
- **40-59**: Emerging 🌟 (gaining attention)
- **0-39**: Known 🎵 (well-established)

### Use Cases
1. Filter recommendations by discovery threshold
2. Display badge on track cards
3. Sort by most undiscovered
4. Calculate diversity metrics

---

## 🎯 Algorithm 3: Multi-Strategy Recommendation Orchestrator

### Overview
Combines multiple recommendation strategies with configurable exploration/exploitation balance.

### Strategy Breakdown

#### Strategy 1: Audio DNA Similarity (40% - Exploitation)
```javascript
for each track in library:
  similarity = calculateAudioDNA(track, userPreferences)
  if similarity > threshold:
    score = similarity × 100 + discoveryScore × 0.3
    recommendations.push({ track, score, reason: 'Audio DNA Match' })

return top 40% by score
```

#### Strategy 2: Hidden Gems (30% - Smart Exploitation)
```javascript
hiddenGems = library.filter(track => {
  return track.popularity < avgUserPopularity &&
         matchesGenreOrArtist(track, userPreferences)
})

score each by:
  score = discoveryScore + (60 - popularity)

return top 30% by score
```

#### Strategy 3: Exploratory (30% - Exploration)
```javascript
// Create exploration vector (deviation from user preferences)
explorationVector = userPreferences.map(val => {
  noise = random(-serendipityLevel, +serendipityLevel)
  return clamp(val + noise, 0, 1)
})

for each track in library:
  similarity = calculateAudioDNA(track, explorationVector)
  avgSimilarity = calculateAudioDNA(track, userPreferences)

  // Bonus for being different
  explorationBonus = avgSimilarity < 0.7 ? 20 : 0

  score = similarity × 80 + discoveryScore × 0.3 + explorationBonus
  recommendations.push({ track, score, reason: 'Exploratory' })

return top 30% by score
```

### Serendipity Control

```javascript
// serendipityLevel: 0.0 (safe) to 1.0 (wild)

if (serendipityLevel < 0.2) {
  // Safe Mode: 80% audio DNA, 20% hidden gems, 0% exploratory
  weights = [0.8, 0.2, 0]
} else if (serendipityLevel < 0.4) {
  // Comfort Zone: 60% audio DNA, 30% hidden gems, 10% exploratory
  weights = [0.6, 0.3, 0.1]
} else if (serendipityLevel < 0.6) {
  // Balanced: 40% audio DNA, 30% hidden gems, 30% exploratory
  weights = [0.4, 0.3, 0.3]
} else if (serendipityLevel < 0.8) {
  // Adventurous: 30% audio DNA, 20% hidden gems, 50% exploratory
  weights = [0.3, 0.2, 0.5]
} else {
  // Wild: 20% audio DNA, 10% hidden gems, 70% exploratory
  weights = [0.2, 0.1, 0.7]
}
```

### Final Ranking

```javascript
// Combine strategies
allRecs = [
  ...audioDNARecs.slice(0, limit × weights[0]),
  ...hiddenGemRecs.slice(0, limit × weights[1]),
  ...exploratoryRecs.slice(0, limit × weights[2])
]

// Deduplicate
uniqueRecs = deduplicate(allRecs)

// ML scoring (if model trained)
if (mlModel) {
  uniqueRecs = mlModel.score(uniqueRecs)
}

// Apply anti-popularity filter
filtered = uniqueRecs.filter(rec => {
  return rec.track.popularity < maxPopularity
})

// Ensure artist diversity (max 2 per artist)
diverse = ensureArtistDiversity(filtered, maxPerArtist = 2)

// Sort by composite score
diverse.sort((a, b) => b.compositeScore - a.compositeScore)

return diverse.slice(0, limit)
```

---

## 🎓 Algorithm 4: Feedback Learning System

### Overview
Learns user preferences through exponential moving average with time-decay weighting.

### Learning Algorithm

#### Exponential Moving Average (EMA)
```javascript
// For each liked track
learningRate = 0.1

for each feature in audioFeatures:
  currentPref = learnedPreferences[feature]
  trackValue = likedTrack.features[feature]

  // Update preference
  newPref = currentPref × (1 - learningRate) + trackValue × learningRate

  learnedPreferences[feature] = newPref
```

#### Time-Decay Weighting
```javascript
// Recent actions matter more
for each action in history:
  age = currentTime - action.timestamp
  weight = exp(-age / decayConstant)

  // Apply weighted update
  updatePreference(action, weight)
```

### Implicit Signals

```javascript
// Like: Strong positive signal
if (action === 'like') {
  updatePreferences(trackFeatures, weight = 1.0, direction = 'toward')
}

// Dislike: Moderate negative signal
if (action === 'dislike') {
  updatePreferences(trackFeatures, weight = 0.5, direction = 'away')
}

// Play: Weak positive signal
if (action === 'play' && duration > 30000) {
  updatePreferences(trackFeatures, weight = 0.2, direction = 'toward')
}

// Skip: Weak negative signal
if (action === 'skip' && duration < 5000) {
  updatePreferences(trackFeatures, weight = 0.3, direction = 'away')
}
```

### Preference Vector Update

```javascript
// Moving toward liked features
updateToward(feature, trackValue, learningRate) {
  currentPref = preferences[feature]
  delta = trackValue - currentPref
  preferences[feature] += delta × learningRate
}

// Moving away from disliked features
updateAway(feature, trackValue, learningRate) {
  currentPref = preferences[feature]
  // Move toward opposite direction
  opposite = 1 - trackValue
  delta = opposite - currentPref
  preferences[feature] += delta × learningRate × 0.5
}
```

### Learning Rate Adjustment

```javascript
// Adaptive learning rate
baseLearningRate = 0.1
sampleCount = totalFeedbackCount

// Decrease learning rate as more data collected
adaptiveLearningRate = baseLearningRate / (1 + log(sampleCount / 100))

// Use adaptive rate for updates
updatePreferences(features, adaptiveLearningRate)
```

---

## 📈 Algorithm 5: Listening Pattern Analysis

### Time-Decay Weighted Analysis

```javascript
for each track in recentlyPlayed:
  age = currentTime - track.playedAt
  weight = exp(-age / 50) // Exponential decay

  // Time of day analysis
  hour = track.playedAt.getHours()
  timeOfDay = getTimeOfDay(hour)
  patterns.timeOfDay[timeOfDay] += weight

  // Energy progression
  patterns.energyProgression.push({
    timestamp: track.playedAt,
    energy: track.features.energy,
    weight: weight
  })
```

### Context-Aware Recommendations

```javascript
// Get current context
currentHour = new Date().getHours()
currentTimeOfDay = getTimeOfDay(currentHour)

// Weight recommendations by context match
for each recommendation in recommendations:
  contextMatch = patterns.timeOfDay[currentTimeOfDay] / totalPatterns

  // Boost score if matches listening patterns
  if (matchesTypicalListeningTime(recommendation)) {
    recommendation.score *= (1 + contextMatch × 0.3)
  }
```

---

## 🧮 Algorithm 6: TensorFlow.js Neural Network

### Architecture

#### Audio Feature Model
```javascript
Input Layer:  10 features
  ↓
Dense Layer:  32 units (ReLU) + Dropout(0.2)
  ↓
Dense Layer:  16 units (ReLU) + Dropout(0.2)
  ↓
Embedding:    8 units (Tanh)
  ↓
Output:       1 unit (Sigmoid) - similarity score
```

#### User Preference Model
```javascript
Input Layer:  15 features (10 audio + 5 behavioral)
  ↓
Dense Layer:  64 units (ReLU) + BatchNorm + Dropout(0.3)
  ↓
Dense Layer:  32 units (ReLU) + BatchNorm + Dropout(0.2)
  ↓
Dense Layer:  16 units (ReLU)
  ↓
Output:       1 unit (Sigmoid) - preference score
```

### Training Data Generation

```javascript
// Positive examples (liked tracks)
for each likedTrack in likedTracks:
  for each userTrack in userTopTracks:
    similarity = calculateAudioDNA(likedTrack, userTrack)
    if (similarity > 0.6) {
      trainingData.push({
        input: [
          ...likedTrack.features,
          ...userTrack.features
        ],
        output: 1 // Positive match
      })
    }
  }
}

// Negative examples (disliked tracks or very different tracks)
for each dislikedTrack in dislikedTracks:
  trainingData.push({
    input: [
      ...dislikedTrack.features,
      ...averageUserFeatures
    ],
    output: 0 // Negative match
  })
}
```

### Inference

```javascript
// Predict similarity for new track
async function predictSimilarity(trackFeatures, userFeatures) {
  const inputTensor = tf.tensor2d([
    [...trackFeatures, ...userFeatures]
  ])

  const prediction = model.predict(inputTensor)
  const similarity = await prediction.data()

  inputTensor.dispose()
  prediction.dispose()

  return similarity[0]
}
```

---

## 🎨 Algorithm 7: Artist Diversity Enforcement

### Purpose
Prevent recommendation lists dominated by few artists.

### Algorithm

```javascript
function ensureArtistDiversity(recommendations, maxPerArtist = 2) {
  const artistCounts = {}
  const diverse = []

  for (const rec of recommendations) {
    const mainArtistId = rec.track.artists[0]?.id

    if (!mainArtistId) {
      diverse.push(rec)
      continue
    }

    const count = artistCounts[mainArtistId] || 0

    if (count < maxPerArtist) {
      artistCounts[mainArtistId] = count + 1
      diverse.push(rec)
    }
  }

  return diverse
}
```

### Configurable Thresholds

```javascript
// Strict diversity (festivals, playlists)
ensureArtistDiversity(recs, maxPerArtist = 1)

// Moderate diversity (discovery)
ensureArtistDiversity(recs, maxPerArtist = 2)

// Relaxed diversity (artist radio)
ensureArtistDiversity(recs, maxPerArtist = 5)
```

---

## 📊 Performance Metrics

### Recommendation Quality Metrics

1. **Discovery Rate**: % of recommended tracks with popularity < 60
   ```javascript
   discoveryRate = undiscoveredTracks / totalRecommendations
   ```

2. **Hit Rate**: % of recommended tracks user likes
   ```javascript
   hitRate = likedRecommendations / totalRecommendations
   ```

3. **Diversity Score**: Variety of artists and genres
   ```javascript
   diversityScore = uniqueArtists / totalRecommendations
   ```

4. **Serendipity Score**: Unexpected but loved recommendations
   ```javascript
   serendipityScore = lovedExploratoryRecs / totalExploratoryRecs
   ```

### Computational Complexity

- **Audio DNA Matching**: O(n) per track, where n = feature count (10)
- **Multi-Strategy Orchestration**: O(m × n), where m = library size
- **Feedback Learning**: O(f), where f = feedback count
- **TensorFlow Inference**: O(n × h), where h = hidden layer size

### Optimization Techniques

1. **Batch Processing**: Process multiple tracks simultaneously
2. **Caching**: Cache frequently accessed data (user preferences, audio features)
3. **Lazy Loading**: Load recommendations incrementally
4. **Web Workers**: Run ML computations in background threads
5. **IndexedDB**: Store learned preferences locally

---

## 🔬 Future Enhancements

### 1. Collaborative Filtering
Find users with similar niche tastes:
```javascript
// Find users with < 1000 monthly listeners overlap
similarUsers = users.filter(user => {
  overlap = intersection(myTracks, user.tracks)
  return overlap.length > 10 && overlap.avgPopularity < 30
})

// Get their recommendations
collaborativeRecs = similarUsers.flatMap(u => u.likedTracks)
```

### 2. Lyric Analysis (NLP)
Match songs by emotional themes:
```javascript
import sentiment from 'sentiment'

lyricSimilarity = sentiment.analyze(lyrics1) ~ sentiment.analyze(lyrics2)
```

### 3. Sequence Prediction
Predict next song based on listening sequences:
```javascript
// LSTM model for sequence prediction
sequenceModel = LSTM([previousTrack1, previousTrack2, previousTrack3])
nextTrack = sequenceModel.predict()
```

### 4. Graph Neural Networks
Model music as a graph of audio features:
```javascript
// Node = track, Edge = similarity
musicGraph = buildGraph(tracks, similarities)
recommendations = GNN.propagate(musicGraph, userNode)
```

---

## 📚 References

### Academic Papers
1. "Audio-based Music Similarity" (2019)
2. "Collaborative Filtering for Implicit Feedback" (2008)
3. "Exploration vs Exploitation in Recommender Systems" (2020)

### Technologies
- TensorFlow.js: https://www.tensorflow.org/js
- Web Audio API: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API
- IndexedDB: https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API

---

## 🎉 Summary

This recommendation system combines:
- **Audio DNA matching** for sonic similarity
- **Discovery scoring** for anti-popularity bias
- **Multi-strategy orchestration** for balanced recommendations
- **Feedback learning** for continuous improvement
- **Context awareness** for personalized timing
- **Neural networks** for advanced pattern recognition
- **Explainable AI** for transparency

The result: A revolutionary music discovery platform that finds hidden gems tailored to each user's unique taste! 🚀
