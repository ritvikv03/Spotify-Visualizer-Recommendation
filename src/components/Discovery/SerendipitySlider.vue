<template>
  <div class="serendipity-container">
    <div class="slider-header">
      <div class="header-content">
        <h3 class="slider-title">Discovery Mode</h3>
        <div class="mode-badge" :class="modeClass">
          {{ modeLabel }}
        </div>
      </div>
      <p class="slider-description">{{ modeDescription }}</p>
    </div>

    <div class="slider-track-container">
      <div class="slider-track" ref="sliderTrack">
        <div class="slider-fill" :style="{ width: percentage + '%' }"></div>
        <div
          class="slider-thumb"
          :style="{ left: percentage + '%' }"
          @mousedown="startDrag"
          @touchstart="startDrag"
        >
          <div class="thumb-icon">{{ modeIcon }}</div>
        </div>
      </div>

      <div class="slider-markers">
        <div
          v-for="(marker, index) in markers"
          :key="index"
          class="marker"
          :style="{ left: (marker.value / max) * 100 + '%' }"
          @click="setValue(marker.value)"
        >
          <div class="marker-dot" :class="{ active: isMarkerActive(marker.value) }"></div>
          <div class="marker-label">{{ marker.label }}</div>
        </div>
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon">🎯</div>
        <div class="stat-content">
          <div class="stat-label">Familiar</div>
          <div class="stat-value">{{ familiarPercentage }}%</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🚀</div>
        <div class="stat-content">
          <div class="stat-label">Exploratory</div>
          <div class="stat-value">{{ exploratoryPercentage }}%</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">💎</div>
        <div class="stat-content">
          <div class="stat-label">Hidden Gems</div>
          <div class="stat-value">{{ hiddenGemsPercentage }}%</div>
        </div>
      </div>
    </div>

    <div class="presets">
      <button
        v-for="preset in presets"
        :key="preset.name"
        @click="setValue(preset.value)"
        :class="['preset-btn', { active: isPresetActive(preset.value) }]"
      >
        <span class="preset-icon">{{ preset.icon }}</span>
        <span class="preset-name">{{ preset.name }}</span>
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'SerendipitySlider',
  props: {
    modelValue: {
      type: Number,
      default: 0.3
    },
    min: {
      type: Number,
      default: 0
    },
    max: {
      type: Number,
      default: 1
    },
    step: {
      type: Number,
      default: 0.05
    }
  },
  emits: ['update:modelValue', 'change'],
  data() {
    return {
      isDragging: false,
      markers: [
        { value: 0, label: 'Safe' },
        { value: 0.25, label: 'Comfort' },
        { value: 0.5, label: 'Balanced' },
        { value: 0.75, label: 'Adventurous' },
        { value: 1, label: 'Wild' }
      ],
      presets: [
        { name: 'Comfort Zone', icon: '🏠', value: 0.1 },
        { name: 'Gentle Explorer', icon: '🧭', value: 0.3 },
        { name: 'Balanced', icon: '⚖️', value: 0.5 },
        { name: 'Deep Diver', icon: '🤿', value: 0.7 },
        { name: 'Treasure Hunter', icon: '🗺️', value: 0.9 }
      ]
    }
  },
  computed: {
    percentage() {
      return ((this.modelValue - this.min) / (this.max - this.min)) * 100
    },
    modeClass() {
      if (this.modelValue < 0.2) return 'safe'
      if (this.modelValue < 0.4) return 'comfort'
      if (this.modelValue < 0.6) return 'balanced'
      if (this.modelValue < 0.8) return 'adventurous'
      return 'wild'
    },
    modeLabel() {
      if (this.modelValue < 0.2) return 'Safe Mode'
      if (this.modelValue < 0.4) return 'Comfort Zone'
      if (this.modelValue < 0.6) return 'Balanced Mix'
      if (this.modelValue < 0.8) return 'Adventurous'
      return 'Wild Explorer'
    },
    modeIcon() {
      if (this.modelValue < 0.2) return '🛡️'
      if (this.modelValue < 0.4) return '🏠'
      if (this.modelValue < 0.6) return '⚖️'
      if (this.modelValue < 0.8) return '🚀'
      return '🌟'
    },
    modeDescription() {
      if (this.modelValue < 0.2) {
        return 'Stick to what you know and love. Minimal surprises.'
      }
      if (this.modelValue < 0.4) {
        return 'Stay close to your favorites with gentle variations.'
      }
      if (this.modelValue < 0.6) {
        return 'Perfect balance of familiar and new discoveries.'
      }
      if (this.modelValue < 0.8) {
        return 'Venture into exciting new musical territories.'
      }
      return 'Maximum exploration! Discover the most unexpected gems.'
    },
    familiarPercentage() {
      // Inverse relationship: higher serendipity = lower familiarity
      return Math.round((1 - this.modelValue) * 70 + 20)
    },
    exploratoryPercentage() {
      // Direct relationship
      return Math.round(this.modelValue * 60 + 10)
    },
    hiddenGemsPercentage() {
      // Increases with serendipity
      return Math.round(this.modelValue * 80 + 10)
    }
  },
  methods: {
    setValue(value) {
      const newValue = Math.max(this.min, Math.min(this.max, value))
      this.$emit('update:modelValue', newValue)
      this.$emit('change', newValue)
    },
    startDrag(event) {
      this.isDragging = true
      document.addEventListener('mousemove', this.onDrag)
      document.addEventListener('mouseup', this.stopDrag)
      document.addEventListener('touchmove', this.onDrag)
      document.addEventListener('touchend', this.stopDrag)
      this.onDrag(event)
    },
    onDrag(event) {
      if (!this.isDragging) return

      const track = this.$refs.sliderTrack
      if (!track) return

      const rect = track.getBoundingClientRect()
      const clientX = event.type.includes('touch')
        ? event.touches[0].clientX
        : event.clientX

      const x = clientX - rect.left
      const percentage = Math.max(0, Math.min(1, x / rect.width))
      const rawValue = this.min + percentage * (this.max - this.min)

      // Snap to step
      const steppedValue = Math.round(rawValue / this.step) * this.step
      this.setValue(steppedValue)
    },
    stopDrag() {
      this.isDragging = false
      document.removeEventListener('mousemove', this.onDrag)
      document.removeEventListener('mouseup', this.stopDrag)
      document.removeEventListener('touchmove', this.onDrag)
      document.removeEventListener('touchend', this.stopDrag)
    },
    isMarkerActive(value) {
      return Math.abs(this.modelValue - value) < 0.05
    },
    isPresetActive(value) {
      return Math.abs(this.modelValue - value) < 0.05
    }
  }
}
</script>

<style scoped>
.serendipity-container {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 16px;
  padding: 24px;
  backdrop-filter: blur(10px);
}

.slider-header {
  margin-bottom: 24px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.slider-title {
  font-size: 20px;
  font-weight: 600;
  color: white;
  margin: 0;
}

.mode-badge {
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  transition: all 0.3s ease;
}

.mode-badge.safe {
  background: linear-gradient(135deg, #6b7280, #4b5563);
  color: white;
}

.mode-badge.comfort {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: white;
}

.mode-badge.balanced {
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
  color: white;
}

.mode-badge.adventurous {
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: white;
}

.mode-badge.wild {
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: white;
  animation: pulse 2s ease-in-out infinite;
}

.slider-description {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
  margin: 0;
  line-height: 1.5;
}

.slider-track-container {
  position: relative;
  padding: 20px 0 60px;
}

.slider-track {
  position: relative;
  height: 12px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  cursor: pointer;
  overflow: hidden;
}

.slider-fill {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #8b5cf6, #f59e0b, #ef4444);
  border-radius: 6px;
  transition: width 0.2s ease;
}

.slider-thumb {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 48px;
  height: 48px;
  background: white;
  border-radius: 50%;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  cursor: grab;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease;
}

.slider-thumb:active {
  cursor: grabbing;
  transform: translate(-50%, -50%) scale(1.1);
}

.thumb-icon {
  font-size: 24px;
}

.slider-markers {
  position: absolute;
  top: 40px;
  left: 0;
  right: 0;
  height: 40px;
}

.marker {
  position: absolute;
  transform: translateX(-50%);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.marker-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  transition: all 0.3s ease;
}

.marker-dot.active {
  background: white;
  transform: scale(1.5);
  box-shadow: 0 0 8px rgba(255, 255, 255, 0.5);
}

.marker:hover .marker-dot {
  background: rgba(255, 255, 255, 0.6);
  transform: scale(1.2);
}

.marker-label {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.6);
  white-space: nowrap;
  font-weight: 500;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}

.stat-card {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  padding: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.stat-icon {
  font-size: 24px;
}

.stat-content {
  flex: 1;
}

.stat-label {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.6);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 18px;
  font-weight: 700;
  color: white;
}

.presets {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.preset-btn {
  flex: 1;
  min-width: 0;
  padding: 12px 8px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  color: white;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.preset-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.3);
  transform: translateY(-2px);
}

.preset-btn.active {
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  border-color: transparent;
}

.preset-icon {
  font-size: 20px;
}

.preset-name {
  font-weight: 500;
  text-align: center;
  line-height: 1.2;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}

@media (max-width: 768px) {
  .serendipity-container {
    padding: 20px;
  }

  .stats-grid {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .presets {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }

  .preset-btn {
    min-width: unset;
  }

  .marker-label {
    font-size: 9px;
  }
}
</style>
