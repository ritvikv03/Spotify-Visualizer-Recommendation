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
import spotifyService from '../../services/spotify'

const props = defineProps({
  isPlaying: {
    type: Boolean,
    default: false
  },
  currentTrack: {
    type: Object,
    default: null
  },
  playbackPosition: {
    type: Number,
    default: 0
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

// Beat synchronization
let audioAnalysisData = null
let playbackStartTime = 0
let beatPulse = 0
let lastBeatTime = 0

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
    playbackStartTime = Date.now()
  }
})

watch(() => props.currentTrack, async (newTrack, oldTrack) => {
  if (newTrack && newTrack.id !== oldTrack?.id) {
    await loadAudioAnalysis(newTrack.id)
    playbackStartTime = Date.now()
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

const loadAudioAnalysis = async (trackId) => {
  try {
    console.log('Loading audio analysis for track:', trackId)
    audioAnalysisData = await spotifyService.getAudioAnalysis(trackId)
    console.log('Audio analysis loaded:', audioAnalysisData)
  } catch (error) {
    console.error('Error loading audio analysis:', error)
    audioAnalysisData = null
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

    // Use procedural visualization synchronized with playback
    console.log('Using beat-synchronized visualization with Spotify playback')

    // Load audio analysis for current track if available
    if (props.currentTrack?.id) {
      await loadAudioAnalysis(props.currentTrack.id)
    }
  } catch (error) {
    console.error('Error initializing audio analysis:', error)
  }
}

const getCurrentPlaybackPosition = () => {
  // Use playback position from Spotify SDK (in milliseconds), convert to seconds
  if (props.playbackPosition > 0) {
    return props.playbackPosition / 1000
  }
  // Fallback to calculated position
  if (props.isPlaying && playbackStartTime) {
    return (Date.now() - playbackStartTime) / 1000
  }
  return 0
}

const getBeatAtTime = (time) => {
  if (!audioAnalysisData?.beats) return null

  // Find the beat closest to current time
  for (let i = 0; i < audioAnalysisData.beats.length; i++) {
    const beat = audioAnalysisData.beats[i]
    if (beat.start <= time && beat.start + beat.duration >= time) {
      return { ...beat, index: i }
    }
  }
  return null
}

const updateBeatPulse = () => {
  const currentTime = getCurrentPlaybackPosition()
  const currentBeat = getBeatAtTime(currentTime)

  if (currentBeat) {
    // Calculate position within the beat (0 to 1)
    const beatProgress = (currentTime - currentBeat.start) / currentBeat.duration

    // Create pulsation effect that peaks at the beat start
    if (beatProgress < 0.2) {
      // Quick rise
      beatPulse = 1.0 - (beatProgress / 0.2)
    } else {
      // Slow decay
      beatPulse = Math.max(0, 1.0 - ((beatProgress - 0.2) / 0.8))
    }

    // Amplify based on beat confidence
    beatPulse *= currentBeat.confidence

    if (currentBeat.start !== lastBeatTime) {
      lastBeatTime = currentBeat.start
      // console.log('Beat hit at', currentTime, 'confidence:', currentBeat.confidence)
    }
  } else {
    // Gradual decay when no beat detected
    beatPulse *= 0.95
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

  // Update beat synchronization
  updateBeatPulse()

  // Get frequency data or use beat-synced procedural animation
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
    // Beat-synced procedural animation
    const beatIntensity = beatPulse * 0.5 + 0.5
    bassLevel = beatIntensity * 0.8 + Math.abs(Math.sin(Date.now() / 400)) * 0.2
    midLevel = beatIntensity * 0.6 + Math.abs(Math.sin(Date.now() / 300)) * 0.4
    trebleLevel = beatIntensity * 0.4 + Math.abs(Math.sin(Date.now() / 500)) * 0.6
  }

  // Dynamic color based on audio and beats
  hueShift = (hueShift + 0.5 + beatPulse * 2) % 360

  // Draw frequency bars (spectrum) with beat pulsation
  drawFrequencyBars(width, height)

  // Draw waveforms with beat pulsation
  drawMultiLayerWaveform(width, height, centerY)

  // Draw particles with beat-triggered spawning
  drawAudioParticles(width, height, centerY)

  phase += 0.02 + beatPulse * 0.03
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

    const waveHeight = (40 + w * 15) * (1 + beatPulse * 0.5)
    const frequency = 0.015 + w * 0.005
    const phaseOffset = phase + w * 0.5

    // Reactive amplitude based on frequency bands with beat boost
    const baseLevels = [bassLevel, midLevel, trebleLevel][w]
    const amplitude = (baseLevels * 1.5 + 0.5) * (1 + beatPulse * 0.8)
    
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
  // Spawn particles based on beat pulse
  const spawnRate = beatPulse > 0.5 ? 0.5 : (bassLevel > 0.7 ? 0.8 : 0.95)

  if (Math.random() > spawnRate && particles.length < 150) {
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