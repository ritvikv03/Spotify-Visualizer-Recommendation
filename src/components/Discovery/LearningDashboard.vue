<template>
  <div class="learning-dashboard">
    <div class="dashboard-header">
      <h2 class="dashboard-title">🧠 Your Musical DNA</h2>
      <p class="dashboard-subtitle">
        The AI is learning from your taste to find better discoveries
      </p>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Analyzing your preferences...</p>
    </div>

    <div v-else-if="stats" class="dashboard-content">
      <!-- Stats Overview -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">💚</div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.likedCount }}</div>
            <div class="stat-label">Loved Tracks</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon">🎵</div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.uniqueTracksPlayed }}</div>
            <div class="stat-label">Tracks Explored</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon">⏱️</div>
          <div class="stat-content">
            <div class="stat-value">{{ formatDuration(stats.totalDuration) }}</div>
            <div class="stat-label">Listening Time</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon">📊</div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.feedbackCount }}</div>
            <div class="stat-label">Feedback Given</div>
          </div>
        </div>
      </div>

      <!-- Learned Preferences -->
      <div v-if="learnedPreferences" class="preferences-section">
        <h3 class="section-title">Your Learned Audio Preferences</h3>
        <div class="preferences-grid">
          <div
            v-for="(value, key) in displayPreferences"
            :key="key"
            class="preference-item"
          >
            <div class="preference-header">
              <span class="preference-name">{{ formatFeatureName(key) }}</span>
              <span class="preference-value">{{ Math.round(value * 100) }}%</span>
            </div>
            <div class="preference-bar">
              <div
                class="preference-fill"
                :style="{
                  width: value * 100 + '%',
                  background: getFeatureColor(key, value)
                }"
              ></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Recommendation Insights -->
      <div v-if="insights" class="insights-section">
        <h3 class="section-title">What Works Best For You</h3>

        <div class="insight-card highlight">
          <div class="insight-icon">🎯</div>
          <div class="insight-content">
            <div class="insight-title">Most Successful Strategy</div>
            <div class="insight-value">{{ insights.mostSuccessfulReason }}</div>
            <div class="insight-detail">
              {{ insights.reasonCounts[insights.mostSuccessfulReason] }} tracks loved
            </div>
          </div>
        </div>

        <div class="strategies-grid">
          <div
            v-for="(count, reason) in insights.reasonCounts"
            :key="reason"
            class="strategy-card"
          >
            <div class="strategy-name">{{ reason }}</div>
            <div class="strategy-stats">
              <div class="strategy-count">{{ count }} tracks</div>
              <div v-if="insights.avgSimilarity[reason]" class="strategy-similarity">
                {{ Math.round(insights.avgSimilarity[reason] * 100) }}% match
              </div>
              <div v-if="insights.avgDiscoveryScore[reason]" class="strategy-discovery">
                💎 {{ Math.round(insights.avgDiscoveryScore[reason]) }} discovery score
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Action Breakdown -->
      <div v-if="stats.actions" class="actions-section">
        <h3 class="section-title">Your Listening Behavior</h3>
        <div class="actions-chart">
          <div
            v-for="(count, action) in stats.actions"
            :key="action"
            class="action-bar"
            :style="{ width: getActionPercentage(action, count) + '%' }"
          >
            <span class="action-label">{{ formatAction(action) }}</span>
            <span class="action-count">{{ count }}</span>
          </div>
        </div>
      </div>

      <!-- Reset Button -->
      <div class="danger-zone">
        <button @click="confirmReset" class="reset-btn">
          🗑️ Reset Learning Data
        </button>
        <p class="danger-text">
          This will clear all learned preferences and start fresh
        </p>
      </div>
    </div>

    <div v-else class="empty-state">
      <div class="empty-icon">🎧</div>
      <h3>Start Building Your Profile</h3>
      <p>Like and dislike tracks to help the AI learn your taste!</p>
    </div>

    <!-- Reset Confirmation Modal -->
    <div v-if="showResetModal" class="modal-overlay" @click="showResetModal = false">
      <div class="modal" @click.stop>
        <h3>Reset Learning Data?</h3>
        <p>This will permanently delete all your learned preferences and feedback history.</p>
        <div class="modal-actions">
          <button @click="showResetModal = false" class="btn-secondary">Cancel</button>
          <button @click="resetData" class="btn-danger">Reset Everything</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import feedbackEngine from '@/services/feedbackLearningEngine'

export default {
  name: 'LearningDashboard',
  data() {
    return {
      loading: true,
      stats: null,
      learnedPreferences: null,
      insights: null,
      showResetModal: false
    }
  },
  computed: {
    displayPreferences() {
      if (!this.learnedPreferences) return {}

      // Sort by value for better visualization
      return Object.entries(this.learnedPreferences)
        .sort((a, b) => b[1] - a[1])
        .reduce((acc, [key, value]) => {
          acc[key] = value
          return acc
        }, {})
    }
  },
  async mounted() {
    await this.loadData()
  },
  methods: {
    async loadData() {
      this.loading = true

      try {
        const [stats, preferences, insights] = await Promise.all([
          feedbackEngine.getListeningStats(),
          feedbackEngine.getLearnedPreferences(),
          feedbackEngine.getRecommendationInsights()
        ])

        this.stats = stats
        this.learnedPreferences = preferences
        this.insights = insights
      } catch (error) {
        console.error('Error loading learning data:', error)
      } finally {
        this.loading = false
      }
    },

    formatFeatureName(key) {
      const names = {
        energy: 'Energy Level',
        valence: 'Happiness/Mood',
        danceability: 'Danceability',
        acousticness: 'Acoustic',
        instrumentalness: 'Instrumental',
        liveness: 'Live Performance',
        speechiness: 'Vocals/Speech',
        tempo: 'Tempo (BPM)',
        loudness: 'Loudness',
        key: 'Musical Key'
      }
      return names[key] || key
    },

    getFeatureColor(key, value) {
      const hue = value * 120 // 0 (red) to 120 (green)
      return `hsl(${hue}, 70%, 50%)`
    },

    formatAction(action) {
      const actions = {
        like: '💚 Loved',
        dislike: '👎 Passed',
        play: '▶️ Played',
        skip: '⏭️ Skipped'
      }
      return actions[action] || action
    },

    getActionPercentage(action, count) {
      const total = Object.values(this.stats.actions).reduce((sum, c) => sum + c, 0)
      return total > 0 ? (count / total) * 100 : 0
    },

    formatDuration(ms) {
      const hours = Math.floor(ms / 3600000)
      const minutes = Math.floor((ms % 3600000) / 60000)

      if (hours > 0) {
        return `${hours}h ${minutes}m`
      }
      return `${minutes}m`
    },

    confirmReset() {
      this.showResetModal = true
    },

    async resetData() {
      try {
        await feedbackEngine.clearAllData()
        this.showResetModal = false
        await this.loadData()
        this.$emit('reset')
      } catch (error) {
        console.error('Error resetting data:', error)
      }
    }
  }
}
</script>

<style scoped>
.learning-dashboard {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.dashboard-header {
  margin-bottom: 32px;
  text-align: center;
}

.dashboard-title {
  font-size: 32px;
  font-weight: 700;
  color: white;
  margin: 0 0 8px 0;
}

.dashboard-subtitle {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.7);
  margin: 0;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: white;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(255, 255, 255, 0.1);
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.dashboard-content {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.stat-card {
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.stat-icon {
  font-size: 36px;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: white;
  line-height: 1;
  margin-bottom: 6px;
}

.stat-label {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.6);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.section-title {
  font-size: 20px;
  font-weight: 600;
  color: white;
  margin: 0 0 16px 0;
}

.preferences-section {
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 24px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.preferences-grid {
  display: grid;
  gap: 16px;
}

.preference-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.preference-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.preference-name {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.9);
  font-weight: 500;
}

.preference-value {
  font-size: 14px;
  color: white;
  font-weight: 700;
}

.preference-bar {
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
}

.preference-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.insights-section {
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 24px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.insight-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  margin-bottom: 20px;
}

.insight-card.highlight {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(139, 92, 246, 0.2));
  border: 2px solid rgba(59, 130, 246, 0.5);
}

.insight-icon {
  font-size: 40px;
}

.insight-content {
  flex: 1;
}

.insight-title {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.6);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 6px;
}

.insight-value {
  font-size: 24px;
  font-weight: 700;
  color: white;
  margin-bottom: 4px;
}

.insight-detail {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
}

.strategies-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 12px;
}

.strategy-card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 16px;
}

.strategy-name {
  font-size: 15px;
  font-weight: 600;
  color: white;
  margin-bottom: 12px;
}

.strategy-stats {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
}

.strategy-count {
  color: #3b82f6;
  font-weight: 600;
}

.actions-section {
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 24px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.actions-chart {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.action-bar {
  background: linear-gradient(90deg, #3b82f6, #8b5cf6);
  border-radius: 8px;
  padding: 12px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: white;
  font-weight: 600;
  transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.danger-zone {
  background: rgba(239, 68, 68, 0.1);
  border: 2px solid rgba(239, 68, 68, 0.3);
  border-radius: 12px;
  padding: 20px;
  text-align: center;
}

.reset-btn {
  background: rgba(239, 68, 68, 0.2);
  border: 2px solid #ef4444;
  color: #ef4444;
  padding: 12px 24px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.reset-btn:hover {
  background: #ef4444;
  color: white;
}

.danger-text {
  margin: 12px 0 0 0;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.6);
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: white;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 20px;
}

.empty-state h3 {
  font-size: 24px;
  margin: 0 0 12px 0;
}

.empty-state p {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.7);
  margin: 0;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal {
  background: rgba(20, 20, 20, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  padding: 32px;
  max-width: 400px;
  width: 100%;
  border: 2px solid rgba(239, 68, 68, 0.5);
}

.modal h3 {
  color: white;
  font-size: 20px;
  margin: 0 0 12px 0;
}

.modal p {
  color: rgba(255, 255, 255, 0.7);
  margin: 0 0 24px 0;
  line-height: 1.5;
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.btn-secondary,
.btn-danger {
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.2);
}

.btn-danger {
  background: #ef4444;
  border: none;
  color: white;
}

.btn-danger:hover {
  background: #dc2626;
}

@media (max-width: 768px) {
  .learning-dashboard {
    padding: 16px;
  }

  .dashboard-title {
    font-size: 24px;
  }

  .stats-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .strategies-grid {
    grid-template-columns: 1fr;
  }
}
</style>
