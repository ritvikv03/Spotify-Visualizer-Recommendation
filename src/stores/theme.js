import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export const useThemeStore = defineStore('theme', () => {
  const currentTheme = ref('midnight')
  
  const themes = {
    midnight: {
      name: 'Midnight',
      primary: '#8B5CF6',
      secondary: '#1E1B4B',
      background: '#0F0A1F',
      surface: 'rgba(139, 92, 246, 0.1)',
      text: '#FFFFFF',
      textSecondary: '#A78BFA',
      accent: '#C084FC',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    },
    aurora: {
      name: 'Aurora',
      primary: '#10B981',
      secondary: '#064E3B',
      background: '#022C22',
      surface: 'rgba(16, 185, 129, 0.1)',
      text: '#FFFFFF',
      textSecondary: '#6EE7B7',
      accent: '#34D399',
      gradient: 'linear-gradient(135deg, #667eea 0%, #10B981 100%)'
    },
    crimson: {
      name: 'Crimson',
      primary: '#EF4444',
      secondary: '#7F1D1D',
      background: '#1A0505',
      surface: 'rgba(239, 68, 68, 0.1)',
      text: '#FFFFFF',
      textSecondary: '#FCA5A5',
      accent: '#F87171',
      gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
    },
    electric: {
      name: 'Electric',
      primary: '#06B6D4',
      secondary: '#164E63',
      background: '#041420',
      surface: 'rgba(6, 182, 212, 0.1)',
      text: '#FFFFFF',
      textSecondary: '#67E8F9',
      accent: '#22D3EE',
      gradient: 'linear-gradient(135deg, #00d2ff 0%, #928DAB 100%)'
    },
    gold: {
      name: 'Gold',
      primary: '#F59E0B',
      secondary: '#78350F',
      background: '#1C0A00',
      surface: 'rgba(245, 158, 11, 0.1)',
      text: '#FFFFFF',
      textSecondary: '#FCD34D',
      accent: '#FBBF24',
      gradient: 'linear-gradient(135deg, #f093fb 0%, #f5af19 100%)'
    },
    monochrome: {
      name: 'Monochrome',
      primary: '#FFFFFF',
      secondary: '#374151',
      background: '#000000',
      surface: 'rgba(255, 255, 255, 0.05)',
      text: '#FFFFFF',
      textSecondary: '#9CA3AF',
      accent: '#E5E7EB',
      gradient: 'linear-gradient(135deg, #434343 0%, #000000 100%)'
    }
  }

  // Apply theme to CSS variables
  const applyTheme = (themeName) => {
    const theme = themes[themeName]
    if (!theme) return

    const root = document.documentElement
    root.style.setProperty('--color-primary', theme.primary)
    root.style.setProperty('--color-secondary', theme.secondary)
    root.style.setProperty('--color-background', theme.background)
    root.style.setProperty('--color-surface', theme.surface)
    root.style.setProperty('--color-text', theme.text)
    root.style.setProperty('--color-text-secondary', theme.textSecondary)

    currentTheme.value = themeName
    localStorage.setItem('theme', themeName)
  }

  // Load saved theme
  const loadSavedTheme = () => {
    const saved = localStorage.getItem('theme')
    if (saved && themes[saved]) {
      applyTheme(saved)
    } else {
      applyTheme('midnight')
    }
  }

  // Watch for theme changes
  watch(currentTheme, (newTheme) => {
    applyTheme(newTheme)
  })

  return {
    currentTheme,
    themes,
    applyTheme,
    loadSavedTheme
  }
})