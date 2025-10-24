<template>
  <div class="feedback-buttons">
    <button
      @click="handleDislike"
      :class="['feedback-btn', 'dislike-btn', { active: isDisliked }]"
      :disabled="loading"
      title="Don't show recommendations like this"
    >
      <span class="btn-icon">{{ isDisliked ? '💔' : '👎' }}</span>
      <span class="btn-label">Pass</span>
    </button>

    <button
      @click="handleLike"
      :class="['feedback-btn', 'like-btn', { active: isLiked }]"
      :disabled="loading"
      title="More recommendations like this!"
    >
      <span class="btn-icon">{{ isLiked ? '💚' : '👍' }}</span>
      <span class="btn-label">Love It</span>
    </button>
  </div>
</template>

<script>
import feedbackEngine from '@/services/feedbackLearningEngine'

export default {
  name: 'FeedbackButtons',
  props: {
    track: {
      type: Object,
      required: true
    },
    context: {
      type: Object,
      default: () => ({})
    }
  },
  emits: ['feedback'],
  data() {
    return {
      isLiked: false,
      isDisliked: false,
      loading: false
    }
  },
  async mounted() {
    await this.checkStatus()
  },
  watch: {
    'track.id'() {
      this.checkStatus()
    }
  },
  methods: {
    async checkStatus() {
      if (!this.track?.id) return

      this.isLiked = await feedbackEngine.isLiked(this.track.id)
      this.isDisliked = await feedbackEngine.isDisliked(this.track.id)
    },

    async handleLike() {
      if (this.loading || !this.track?.id) return

      this.loading = true

      try {
        if (this.isLiked) {
          // Unlike
          await feedbackEngine.removeLike(this.track.id)
          this.isLiked = false
          this.$emit('feedback', { action: 'unlike', track: this.track })
        } else {
          // Like
          await feedbackEngine.likeTrack(this.track, this.context)
          this.isLiked = true
          this.isDisliked = false
          this.$emit('feedback', { action: 'like', track: this.track })

          // Show celebration animation
          this.showCelebration()
        }
      } catch (error) {
        console.error('Error handling like:', error)
      } finally {
        this.loading = false
      }
    },

    async handleDislike() {
      if (this.loading || !this.track?.id) return

      this.loading = true

      try {
        if (this.isDisliked) {
          // Remove dislike
          this.isDisliked = false
          this.$emit('feedback', { action: 'undislike', track: this.track })
        } else {
          // Dislike
          await feedbackEngine.dislikeTrack(this.track, this.context)
          this.isDisliked = true
          this.isLiked = false
          this.$emit('feedback', { action: 'dislike', track: this.track })
        }
      } catch (error) {
        console.error('Error handling dislike:', error)
      } finally {
        this.loading = false
      }
    },

    showCelebration() {
      // Emit event for parent to show celebration
      this.$emit('celebrate')
    }
  }
}
</script>

<style scoped>
.feedback-buttons {
  display: flex;
  gap: 12px;
  align-items: center;
}

.feedback-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border: 2px solid;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 600;
  font-size: 14px;
}

.feedback-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.feedback-btn:not(:disabled):hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.dislike-btn {
  border-color: #ef4444;
  color: #ef4444;
}

.dislike-btn:not(:disabled):hover {
  background: rgba(239, 68, 68, 0.2);
}

.dislike-btn.active {
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: white;
  border-color: transparent;
}

.like-btn {
  border-color: #10b981;
  color: #10b981;
}

.like-btn:not(:disabled):hover {
  background: rgba(16, 185, 129, 0.2);
}

.like-btn.active {
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  border-color: transparent;
  animation: pulse 0.5s ease;
}

.btn-icon {
  font-size: 20px;
  line-height: 1;
}

.btn-label {
  font-size: 13px;
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
  .feedback-buttons {
    gap: 8px;
  }

  .feedback-btn {
    padding: 8px 12px;
    gap: 6px;
  }

  .btn-icon {
    font-size: 18px;
  }

  .btn-label {
    font-size: 12px;
  }
}
</style>
