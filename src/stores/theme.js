import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export const useThemeStore = defineStore('theme', () => {
  const currentTheme = ref('spotify')
  
  const themes = {
    spotify: {
      name: 'Spotify Green',
      primary: '#1DB954',
      secondary: '#191414',
      background: '#121212',
      surface: '#282828',
      text: '#FFFFFF',
      textSecondary: '#B3B3B3'
    },
    sunset: {
      name: 'Sunset Vibes',
      primary: '#FF6B6B',
      secondary: '#1A1423',
      background: '#0F0B1A',
      surface: '#2D1B3D',
      text: '#FFFFFF',
      textSecondary: '#C8A8E0'
    },
    ocean: {
      name: 'Ocean Depths',
      primary: '#00D9FF',
      secondary: '#0A1929',
      background: '#001E3C',
      surface: '#0D3D5C',
      text: '#FFFFFF',
      textSecondary: '#84CEFA'
    },
    neon: {
      name: 'Neon City',
      primary: '#FF00FF',
      secondary: '#0D0D0D',
      background: '#000000',
      surface: '#1A001A',
      text: '#00FFFF',
      textSecondary: '#FF00FF'
    },
    forest: {
      name: 'Forest Night',
      primary: '#4ADE80',
      secondary: '#0F1B0F',
      background: '#05120A',
      surface: '#1A2F1A',
      text: '#FFFFFF',
      textSecondary: '#86EFAC'
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
      applyTheme('spotify')
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