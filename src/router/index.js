import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/Home.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/callback',
    name: 'Callback',
    component: () => import('../views/Callback.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/discover',
    name: 'Discover',
    component: () => import('../views/DiscoverFullscreen.vue'),
    meta: { requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Navigation guard to check authentication
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    // Redirect to home if not authenticated
    next('/')
  } else if (to.name === 'Home' && authStore.isAuthenticated) {
    // Redirect to discover if already authenticated
    next('/discover')
  } else {
    next()
  }
})

export default router
