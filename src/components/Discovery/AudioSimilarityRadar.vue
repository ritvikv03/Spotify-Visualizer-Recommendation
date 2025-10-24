<template>
  <div class="audio-radar-container">
    <div class="radar-header">
      <h3 class="radar-title">Audio DNA Match</h3>
      <div class="similarity-score">
        <span class="score-value">{{ Math.round(similarity * 100) }}%</span>
        <span class="score-label">Similar</span>
      </div>
    </div>

    <div class="radar-chart" ref="radarContainer">
      <svg :width="size" :height="size" :viewBox="`0 0 ${size} ${size}`">
        <!-- Background circles -->
        <g :transform="`translate(${center}, ${center})`">
          <circle
            v-for="i in 5"
            :key="'circle-' + i"
            :r="(radius / 5) * i"
            fill="none"
            :stroke="gridColor"
            stroke-width="1"
            opacity="0.3"
          />

          <!-- Axes -->
          <g v-for="(feature, index) in features" :key="'axis-' + index">
            <line
              :x1="0"
              :y1="0"
              :x2="getX(1, index)"
              :y2="getY(1, index)"
              :stroke="gridColor"
              stroke-width="1"
              opacity="0.3"
            />

            <!-- Label -->
            <text
              :x="getX(1.2, index)"
              :y="getY(1.2, index)"
              :fill="textColor"
              text-anchor="middle"
              dominant-baseline="middle"
              class="feature-label"
              :class="{ 'strong-match': isStrongMatch(feature.key) }"
            >
              {{ feature.name }}
            </text>
          </g>

          <!-- User preference polygon (background) -->
          <polygon
            :points="getUserPolygonPoints()"
            :fill="userColor"
            :opacity="0.2"
            :stroke="userColor"
            stroke-width="2"
          />

          <!-- Track polygon (foreground) -->
          <polygon
            :points="getTrackPolygonPoints()"
            :fill="trackColor"
            :opacity="0.4"
            :stroke="trackColor"
            stroke-width="2"
          />

          <!-- Data points -->
          <g v-for="(feature, index) in features" :key="'point-' + index">
            <!-- User preference point -->
            <circle
              :cx="getX(userFeatures[feature.key], index)"
              :cy="getY(userFeatures[feature.key], index)"
              r="4"
              :fill="userColor"
            />

            <!-- Track point -->
            <circle
              :cx="getX(trackFeatures[feature.key], index)"
              :cy="getY(trackFeatures[feature.key], index)"
              r="4"
              :fill="trackColor"
            />
          </g>
        </g>
      </svg>
    </div>

    <!-- Feature match breakdown -->
    <div class="feature-breakdown">
      <div
        v-for="(feature, index) in sortedFeatures"
        :key="'bar-' + index"
        class="feature-bar"
      >
        <div class="feature-name">
          <span>{{ feature.name }}</span>
          <span class="feature-match" :class="getMatchClass(feature.match)">
            {{ Math.round(feature.match * 100) }}%
          </span>
        </div>
        <div class="bar-container">
          <div
            class="bar-fill"
            :style="{
              width: feature.match * 100 + '%',
              backgroundColor: getMatchColor(feature.match)
            }"
          ></div>
        </div>
      </div>
    </div>

    <!-- Explanation -->
    <div class="explanation" v-if="explanation">
      <div class="explanation-icon">💡</div>
      <p class="explanation-text">{{ explanation }}</p>
    </div>
  </div>
</template>

<script>
export default {
  name: 'AudioSimilarityRadar',
  props: {
    trackFeatures: {
      type: Object,
      required: true
    },
    userFeatures: {
      type: Object,
      required: true
    },
    similarity: {
      type: Number,
      default: 0
    },
    explanation: {
      type: String,
      default: ''
    },
    size: {
      type: Number,
      default: 300
    },
    theme: {
      type: String,
      default: 'dark'
    }
  },
  data() {
    return {
      features: [
        { key: 'energy', name: 'Energy' },
        { key: 'valence', name: 'Mood' },
        { key: 'danceability', name: 'Dance' },
        { key: 'acousticness', name: 'Acoustic' },
        { key: 'instrumentalness', name: 'Instrumental' },
        { key: 'speechiness', name: 'Vocal' },
        { key: 'tempo', name: 'Tempo' },
        { key: 'loudness', name: 'Loudness' }
      ]
    }
  },
  computed: {
    center() {
      return this.size / 2
    },
    radius() {
      return this.size / 2 - 40
    },
    gridColor() {
      return this.theme === 'dark' ? '#ffffff40' : '#00000030'
    },
    textColor() {
      return this.theme === 'dark' ? '#ffffff' : '#000000'
    },
    userColor() {
      return '#3b82f6' // Blue
    },
    trackColor() {
      return '#10b981' // Green
    },
    sortedFeatures() {
      return this.features
        .map(f => ({
          ...f,
          match: 1 - Math.abs((this.trackFeatures[f.key] || 0.5) - (this.userFeatures[f.key] || 0.5))
        }))
        .sort((a, b) => b.match - a.match)
    }
  },
  methods: {
    getX(value, index) {
      const angle = (index / this.features.length) * 2 * Math.PI - Math.PI / 2
      return Math.cos(angle) * this.radius * value
    },
    getY(value, index) {
      const angle = (index / this.features.length) * 2 * Math.PI - Math.PI / 2
      return Math.sin(angle) * this.radius * value
    },
    getUserPolygonPoints() {
      return this.features
        .map((f, i) => {
          const value = this.userFeatures[f.key] || 0.5
          return `${this.getX(value, i)},${this.getY(value, i)}`
        })
        .join(' ')
    },
    getTrackPolygonPoints() {
      return this.features
        .map((f, i) => {
          const value = this.trackFeatures[f.key] || 0.5
          return `${this.getX(value, i)},${this.getY(value, i)}`
        })
        .join(' ')
    },
    isStrongMatch(key) {
      const match = 1 - Math.abs((this.trackFeatures[key] || 0.5) - (this.userFeatures[key] || 0.5))
      return match > 0.85
    },
    getMatchClass(match) {
      if (match > 0.85) return 'excellent'
      if (match > 0.70) return 'good'
      if (match > 0.55) return 'fair'
      return 'weak'
    },
    getMatchColor(match) {
      if (match > 0.85) return '#10b981' // Green
      if (match > 0.70) return '#3b82f6' // Blue
      if (match > 0.55) return '#f59e0b' // Orange
      return '#ef4444' // Red
    }
  }
}
</script>

<style scoped>
.audio-radar-container {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 16px;
  padding: 20px;
  backdrop-filter: blur(10px);
}

.radar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.radar-title {
  font-size: 18px;
  font-weight: 600;
  color: white;
  margin: 0;
}

.similarity-score {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.score-value {
  font-size: 24px;
  font-weight: 700;
  color: #10b981;
  line-height: 1;
}

.score-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.radar-chart {
  display: flex;
  justify-content: center;
  margin: 20px 0;
}

.feature-label {
  font-size: 12px;
  font-weight: 500;
  fill: rgba(255, 255, 255, 0.8);
}

.feature-label.strong-match {
  fill: #10b981;
  font-weight: 700;
}

.feature-breakdown {
  margin-top: 24px;
  space-y: 12px;
}

.feature-bar {
  margin-bottom: 12px;
}

.feature-name {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.9);
}

.feature-match {
  font-weight: 600;
  font-size: 12px;
}

.feature-match.excellent {
  color: #10b981;
}

.feature-match.good {
  color: #3b82f6;
}

.feature-match.fair {
  color: #f59e0b;
}

.feature-match.weak {
  color: #ef4444;
}

.bar-container {
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.explanation {
  margin-top: 20px;
  padding: 16px;
  background: rgba(59, 130, 246, 0.1);
  border-left: 3px solid #3b82f6;
  border-radius: 8px;
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.explanation-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.explanation-text {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.9);
}

@media (max-width: 640px) {
  .audio-radar-container {
    padding: 16px;
  }

  .radar-title {
    font-size: 16px;
  }

  .score-value {
    font-size: 20px;
  }

  .feature-label {
    font-size: 10px;
  }
}
</style>
