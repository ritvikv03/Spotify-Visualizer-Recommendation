<template>
  <div class="relative w-full bg-gradient-to-br from-spotify-dark via-gray-900 to-black rounded-lg overflow-hidden shadow-2xl" style="height: 400px;">
    <canvas ref="canvas" class="w-full h-full"></canvas>
    
    <!-- Overlay message when not playing -->
    <div v-if="!isPlaying" class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm">
      <div class="text-center">
        <div class="text-6xl mb-4 animate-pulse">🎵</div>
        <p class="text-xl text-gray-300 font-semibold">Play a track to see the magic</p>
        <p class="text-sm text-gray-500 mt-2">Audio-reactive visualizer with live frequency analysis</p>
      </div>
    </div>

    <!-- Audio element for analysis -->
    <audio ref="audioElement" crossorigin="anonymous" style="display: none;"></audio>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'

const props = defineProps({
  isPlaying: {
    type: Boolean,
    default: false
  }
})

const canvas = ref(null)
const audioElement = ref(null)
let ctx = null
let animationId = null
let audioContext = null
let analyser = null
let dataArray = null
let bufferLength = 0
let source = null

// Wave animation properties
let phase = 0
let bassLevel = 0
let midLevel = 0
let trebleLevel = 0

// Color shift for gradient
let hueShift = 0

onMounted(() => {
  if (canvas.value) {
    ctx = canvas.value.getContext('2d')
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    
    // Start animation loop
    animate()
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', resizeCanvas)
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
  if (audioContext) {
    audioContext.close()
  }
})

watch(() => props.isPlaying, async (newVal) => {
  if (newVal) {
    await initAudioAnalysis()
  }
})

const resizeCanvas = () => {
  if (canvas.value) {
    const rect = canvas.value.getBoundingClientRect()
    canvas.value.width = rect.width * window.devicePixelRatio
    canvas.value.height = rect.height * window.devicePixelRatio
    if (ctx) {
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    }
  }
}

const initAudioAnalysis = async () => {
  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)()
      analyser = audioContext.createAnalyser()
      analyser.fftSize = 2048
      analyser.smoothingTimeConstant = 0.8
      bufferLength = analyser.frequencyBinCount
      dataArray = new Uint8Array(bufferLength)
    }

    // Try to capture system audio (this works for some browsers/setups)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        } 
      })
      if (source) {
        source.disconnect()
      }
      source = audioContext.createMediaStreamSource(stream)
      source.connect(analyser)
      console.log('Connected to microphone audio')
    } catch (e) {
      console.log('Microphone access denied, using procedural visualization')
    }
  } catch (error) {
    console.error('Error initializing audio analysis:', error)
  }
}

const animate = () => {
  animationId = requestAnimationFrame(animate)
  
  if (!ctx || !canvas.value) return
  
  const width = canvas.value.width / window.devicePixelRatio
  const height = canvas.value.height / window.devicePixelRatio
  
  // Clear canvas with trail effect
  ctx.fillStyle = 'rgba(0, 0, 0, 0.15)'
  ctx.fillRect(0, 0, width, height)
  
  if (props.isPlaying) {
    drawAudioReactiveVisualizer(width, height)
  } else {
    drawIdleState(width, height)
  }
}

const drawAudioReactiveVisualizer = (width, height) => {
  const centerY = height / 2
  
  // Get frequency data
  if (analyser && dataArray) {
    analyser.getByteFrequencyData(dataArray)
    
    // Calculate frequency bands
    const bassRange = dataArray.slice(0, Math.floor(bufferLength * 0.1))
    const midRange = dataArray.slice(Math.floor(bufferLength * 0.1), Math.floor(bufferLength * 0.4))
    const trebleRange = dataArray.slice(Math.floor(bufferLength * 0.4), Math.floor(bufferLength * 0.8))
    
    bassLevel = bassRange.reduce((a, b) => a + b, 0) / bassRange.length / 255
    midLevel = midRange.reduce((a, b) => a + b, 0) / midRange.length / 255
    trebleLevel = trebleRange.reduce((a, b) => a + b, 0) / trebleRange.length / 255
  } else {
    // Fallback to procedural animation
    bassLevel = Math.abs(Math.sin(Date.now() / 400)) * 0.6 + 0.4
    midLevel = Math.abs(Math.sin(Date.now() / 300)) * 0.5 + 0.5
    trebleLevel = Math.abs(Math.sin(Date.now() / 500)) * 0.4 + 0.6
  }

  // Dynamic color based on audio
  hueShift = (hueShift + 0.5) % 360

  // Draw frequency bars (spectrum)
  drawFrequencyBars(width, height)
  
  // Draw waveforms
  drawMultiLayerWaveform(width, height, centerY)
  
  // Draw particles
  drawAudioParticles(width, height, centerY)
  
  phase += 0.02
}

const drawFrequencyBars = (width, height) => {
  if (!analyser || !dataArray) return
  
  analyser.getByteFrequencyData(dataArray)
  
  const barCount = 64
  const barWidth = width / barCount
  const sampleSize = Math.floor(bufferLength / barCount)
  
  for (let i = 0; i < barCount; i++) {
    const startIndex = i * sampleSize
    const endIndex = startIndex + sampleSize
    const slice = dataArray.slice(startIndex, endIndex)
    const average = slice.reduce((a, b) => a + b, 0) / slice.length
    
    const barHeight = (average / 255) * (height * 0.6)
    const x = i * barWidth
    const y = height - barHeight
    
    // Dynamic gradient based on frequency
    const hue = (i / barCount) * 120 + hueShift
    const gradient = ctx.createLinearGradient(x, y, x, height)
    gradient.addColorStop(0, `hsla(${hue}, 100%, 60%, 0.8)`)
    gradient.addColorStop(0.5, `hsla(${hue + 30}, 100%, 50%, 0.6)`)
    gradient.addColorStop(1, `hsla(${hue + 60}, 100%, 40%, 0.3)`)
    
    ctx.fillStyle = gradient
    ctx.fillRect(x, y, barWidth - 2, barHeight)
    
    // Add glow
    ctx.shadowBlur = 15
    ctx.shadowColor = `hsla(${hue}, 100%, 60%, 0.8)`
    ctx.fillRect(x, y, barWidth - 2, barHeight)
    ctx.shadowBlur = 0
  }
}

const drawMultiLayerWaveform = (width, height, centerY) => {
  const numWaves = 3
  
  for (let w = 0; w < numWaves; w++) {
    ctx.beginPath()
    
    const waveHeight = 40 + w * 15
    const frequency = 0.015 + w * 0.005
    const phaseOffset = phase + w * 0.5
    
    // Reactive amplitude based on frequency bands
    const amplitude = [bassLevel, midLevel, trebleLevel][w] * 1.5 + 0.5
    
    for (let x = 0; x < width; x++) {
      let y = centerY
      
      // Complex waveform
      y += Math.sin(x * frequency + phaseOffset) * waveHeight * amplitude
      y += Math.sin(x * frequency * 2 + phaseOffset * 1.3) * (waveHeight * 0.5) * amplitude
      y += Math.sin(x * frequency * 0.5 + phaseOffset * 0.7) * (waveHeight * 0.3) * amplitude
      
      // Add frequency data if available
      if (analyser && dataArray) {
        const index = Math.floor((x / width) * bufferLength)
        const freqValue = dataArray[index] / 255
        y += Math.sin(x * 0.03 + phase) * freqValue * 25
      }
      
      if (x === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    }
    
    // Rainbow gradient
    const gradient = ctx.createLinearGradient(0, 0, width, 0)
    const hue1 = (hueShift + w * 40) % 360
    const hue2 = (hueShift + w * 40 + 60) % 360
    const hue3 = (hueShift + w * 40 + 120) % 360
    
    gradient.addColorStop(0, `hsla(${hue1}, 100%, 60%, 0)`)
    gradient.addColorStop(0.25, `hsla(${hue1}, 100%, 60%, ${0.5 - w * 0.1})`)
    gradient.addColorStop(0.5, `hsla(${hue2}, 100%, 60%, ${0.7 - w * 0.1})`)
    gradient.addColorStop(0.75, `hsla(${hue3}, 100%, 60%, ${0.5 - w * 0.1})`)
    gradient.addColorStop(1, `hsla(${hue3}, 100%, 60%, 0)`)
    
    ctx.strokeStyle = gradient
    ctx.lineWidth = 3 + w
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()
    
    // Glow effect
    ctx.shadowBlur = 20 + w * 5
    ctx.shadowColor = `hsla(${hue2}, 100%, 60%, 0.6)`
    ctx.stroke()
    ctx.shadowBlur = 0
  }
}

let particles = []

const drawAudioParticles = (width, height, centerY) => {
  // Spawn particles based on audio intensity
  const spawnRate = bassLevel > 0.7 ? 0.8 : 0.95
  
  if (Math.random() > spawnRate && particles.length < 100) {
    particles.push({
      x: Math.random() * width,
      y: centerY + (Math.random() - 0.5) * 150 * midLevel,
      vx: (Math.random() - 0.5) * 3,
      vy: (Math.random() - 0.5) * 3,
      life: 1,
      size: Math.random() * 4 + 2,
      hue: (hueShift + Math.random() * 60) % 360
    })
  }
  
  particles = particles.filter(p => {
    p.x += p.vx
    p.y += p.vy
    p.life -= 0.008
    
    if (p.life <= 0) return false
    
    // Draw particle with glow
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
    
    const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2)
    gradient.addColorStop(0, `hsla(${p.hue}, 100%, 60%, ${p.life})`)
    gradient.addColorStop(1, `hsla(${p.hue}, 100%, 60%, 0)`)
    
    ctx.fillStyle = gradient
    ctx.fill()
    
    return true
  })
}

const drawIdleState = (width, height) => {
  const centerY = height / 2
  
  ctx.beginPath()
  
  for (let x = 0; x < width; x++) {
    const y = centerY + Math.sin(x * 0.02 + phase * 0.5) * 15
    
    if (x === 0) {
      ctx.moveTo(x, y)
    } else {
      ctx.lineTo(x, y)
    }
  }
  
  const gradient = ctx.createLinearGradient(0, 0, width, 0)
  gradient.addColorStop(0, 'rgba(29, 185, 84, 0)')
  gradient.addColorStop(0.5, 'rgba(29, 185, 84, 0.4)')
  gradient.addColorStop(1, 'rgba(29, 185, 84, 0)')
  
  ctx.strokeStyle = gradient
  ctx.lineWidth = 2
  ctx.stroke()
  
  phase += 0.008
}
</script>

<style scoped>
canvas {
  display: block;
}
</style>