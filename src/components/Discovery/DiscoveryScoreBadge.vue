<template>
  <div class="discovery-badge" :class="scoreClass">
    <div class="badge-icon">{{ scoreIcon }}</div>
    <div class="badge-content">
      <div class="badge-label">Discovery Score</div>
      <div class="badge-score">{{ Math.round(score) }}</div>
    </div>
    <div class="badge-bar">
      <div class="badge-bar-fill" :style="{ width: score + '%' }"></div>
    </div>
    <div class="badge-tooltip" v-if="showTooltip">
      {{ tooltipText }}
    </div>
  </div>
</template>

<script>
export default {
  name: 'DiscoveryScoreBadge',
  props: {
    score: {
      type: Number,
      required: true
    },
    popularity: {
      type: Number,
      default: 0
    },
    showTooltip: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    scoreClass() {
      if (this.score >= 80) return 'hidden-gem'
      if (this.score >= 60) return 'undiscovered'
      if (this.score >= 40) return 'emerging'
      return 'known'
    },
    scoreIcon() {
      if (this.score >= 80) return '💎'
      if (this.score >= 60) return '✨'
      if (this.score >= 40) return '🌟'
      return '🎵'
    },
    tooltipText() {
      if (this.score >= 80) {
        return `Hidden Gem! Only ${this.popularity}% popular - almost nobody knows this track yet.`
      }
      if (this.score >= 60) {
        return `Undiscovered treasure! Still flying under the radar at ${this.popularity}% popularity.`
      }
      if (this.score >= 40) {
        return `Emerging track gaining attention (${this.popularity}% popularity).`
      }
      return `Well-known track (${this.popularity}% popularity).`
    }
  }
}
</script>

<style scoped>
.discovery-badge {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(10px);
  border: 2px solid;
  transition: all 0.3s ease;
}

.discovery-badge:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.discovery-badge.hidden-gem {
  border-color: #10b981;
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(5, 150, 105, 0.1));
}

.discovery-badge.undiscovered {
  border-color: #3b82f6;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(37, 99, 235, 0.1));
}

.discovery-badge.emerging {
  border-color: #f59e0b;
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(217, 119, 6, 0.1));
}

.discovery-badge.known {
  border-color: #6b7280;
  background: linear-gradient(135deg, rgba(107, 114, 128, 0.2), rgba(75, 85, 99, 0.1));
}

.badge-icon {
  font-size: 20px;
  line-height: 1;
  animation: pulse 2s ease-in-out infinite;
}

.badge-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.badge-label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: rgba(255, 255, 255, 0.6);
  font-weight: 600;
}

.badge-score {
  font-size: 18px;
  font-weight: 700;
  color: white;
  line-height: 1;
}

.badge-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 0 0 10px 10px;
  overflow: hidden;
}

.badge-bar-fill {
  height: 100%;
  transition: width 1s cubic-bezier(0.4, 0, 0.2, 1);
}

.hidden-gem .badge-bar-fill {
  background: linear-gradient(90deg, #10b981, #059669);
}

.undiscovered .badge-bar-fill {
  background: linear-gradient(90deg, #3b82f6, #2563eb);
}

.emerging .badge-bar-fill {
  background: linear-gradient(90deg, #f59e0b, #d97706);
}

.known .badge-bar-fill {
  background: linear-gradient(90deg, #6b7280, #4b5563);
}

.badge-tooltip {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%) translateY(-8px);
  background: rgba(0, 0, 0, 0.9);
  color: white;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 12px;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.3s ease;
  z-index: 10;
}

.discovery-badge:hover .badge-tooltip {
  opacity: 1;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}

@media (max-width: 640px) {
  .discovery-badge {
    padding: 6px 10px;
    gap: 6px;
  }

  .badge-icon {
    font-size: 16px;
  }

  .badge-label {
    font-size: 9px;
  }

  .badge-score {
    font-size: 16px;
  }
}
</style>
