<template>
  <div id="app" class="min-h-screen bg-gradient-to-br from-spotify-black via-spotify-dark to-gray-900">
    <ErrorBoundary>
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </ErrorBoundary>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useAuthStore } from './stores/auth'
import ErrorBoundary from './components/ErrorBoundary.vue'

const authStore = useAuthStore()

onMounted(() => {
  // Check if user has existing token
  authStore.checkExistingAuth()
})
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
