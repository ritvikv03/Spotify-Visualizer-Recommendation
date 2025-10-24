<template>
  <div
    class="relative w-full h-full bg-black overflow-hidden"
    @mousemove="handleMouseMove"
  >
    <canvas ref="canvas" class="w-full h-full"></canvas>

    <!-- Playback Controls (bottom center) -->
    <div class="absolute bottom-0 left-0 right-0 z-20 pb-6">
      <div class="flex items-center justify-center gap-3">
        <button @click="$emit('previous')" class="control-btn">
          <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
          </svg>
        </button>

        <button @click="$emit('toggle-play')" class="control-btn-large">
          <svg v-if="!isPlaying" class="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z"/>
          </svg>
          <svg v-else class="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 4h4v16H6zm8 0h4v16h-4z"/>
          </svg>
        </button>

        <button @click="$emit('next')" class="control-btn">
          <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- Now Playing Card (Bottom Right - appears on mouse move) -->
    <transition name="slide-fade">
      <div
        v-if="currentTrack && showNowPlaying"
        class="absolute bottom-24 right-6 z-20 glass-panel p-4 max-w-xs"
      >
        <div class="flex items-start gap-3">
          <!-- Album Art -->
          <img
            v-if="currentTrack.album?.images?.[0]?.url"
            :src="currentTrack.album.images[0].url"
            alt="Album art"
            class="w-16 h-16 rounded-lg shadow-2xl flex-shrink-0"
          />

          <!-- Track Info -->
          <div class="flex-1 min-w-0">
            <h3 class="text-sm font-bold truncate text-white">{{ currentTrack.name }}</h3>
            <p class="text-xs text-gray-300 truncate">{{ currentTrack.artists?.map(a => a.name).join(', ') }}</p>
            <p v-if="currentTrack.album?.name" class="text-xs text-gray-400 truncate mt-1">{{ currentTrack.album.name }}</p>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import * as THREE from 'three'
import spotifyService from '../../services/spotify'

const props = defineProps({
  isPlaying: Boolean,
  currentTrack: Object,
  visualizationMode: {
    type: String,
    default: 'spectrum'
  },
  audioFeatures: Object,
  theme: Object
})

const emit = defineEmits(['toggle-play', 'next', 'previous'])

const canvas = ref(null)
const bassLevel = ref(0)
const midLevel = ref(0)
const trebleLevel = ref(0)
const showNowPlaying = ref(false)

let mouseMovementTimer = null

const handleMouseMove = () => {
  showNowPlaying.value = true
  clearTimeout(mouseMovementTimer)
  mouseMovementTimer = setTimeout(() => {
    showNowPlaying.value = false
  }, 3000)
}

let scene, camera, renderer
let animationId = null
let audioContext, analyser, dataArray, bufferLength
let animationSpeed = 1.0
let audioAnalysis = null
let currentBeat = 0
let currentBar = 0
let beatIntensity = 0

// Visualization objects
let kaleidoscope = null
let particles = []
let waveform = null

// Theme colors
let primaryColor = new THREE.Color(0x8B5CF6)
let secondaryColor = new THREE.Color(0x06B6D4)
let accentColor = new THREE.Color(0xEF4444)

onMounted(() => {
  initThreeJS()
  initAudio()
  animate()
})

onUnmounted(() => {
  if (animationId) cancelAnimationFrame(animationId)
  if (renderer) renderer.dispose()
  if (audioContext) audioContext.close()
})

watch(() => props.isPlaying, (playing) => {
  if (playing && !audioContext) {
    initAudio()
  }
})

watch(() => props.audioFeatures, (features) => {
  if (features) {
    const tempoFactor = features.tempo ? Math.max(0.5, Math.min(2.0, features.tempo / 120)) : 1.0
    const energyFactor = features.energy || 0.7
    animationSpeed = tempoFactor * (0.7 + energyFactor * 0.6)
  }
})

watch(() => props.currentTrack, async (track) => {
  if (track && track.id) {
    try {
      audioAnalysis = await spotifyService.getAudioAnalysis(track.id)
      currentBeat = 0
      currentBar = 0
    } catch (error) {
      console.error('Error loading audio analysis:', error)
      audioAnalysis = null
    }
  }
})

watch(() => props.visualizationMode, (newMode) => {
  clearScene()
  initMode(newMode)
})

watch(() => props.theme, (theme) => {
  updateThemeColors(theme)
})

const initThreeJS = () => {
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x000000)

  // Wider FOV and better camera positioning to avoid cut-off
  camera = new THREE.PerspectiveCamera(
    75,
    canvas.value.clientWidth / canvas.value.clientHeight,
    0.1,
    2000
  )
  camera.position.z = 150
  camera.position.y = 0
  camera.lookAt(0, 0, 0)

  renderer = new THREE.WebGLRenderer({
    canvas: canvas.value,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance'
  })
  renderer.setSize(canvas.value.clientWidth, canvas.value.clientHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

  // Dynamic lighting based on theme
  updateThemeColors(props.theme)

  initMode(props.visualizationMode)

  window.addEventListener('resize', onWindowResize)
}

const initAudio = async () => {
  try {
    audioContext = new (window.AudioContext || window.webkitAudioContext)()
    analyser = audioContext.createAnalyser()
    analyser.fftSize = 2048
    analyser.smoothingTimeConstant = 0.8
    bufferLength = analyser.frequencyBinCount
    dataArray = new Uint8Array(bufferLength)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const source = audioContext.createMediaStreamSource(stream)
      source.connect(analyser)
    } catch (e) {
      console.log('Using procedural audio visualization')
    }
  } catch (error) {
    console.error('Audio init error:', error)
  }
}

const updateThemeColors = (theme) => {
  if (!theme) return

  // Parse theme colors
  primaryColor = new THREE.Color(theme.primary || '#8B5CF6')
  secondaryColor = new THREE.Color(theme.accent || '#06B6D4')
  accentColor = new THREE.Color(theme.textSecondary || '#EF4444')

  // Update lighting
  while(scene.children.length > 0) {
    const object = scene.children[0]
    if (object.isLight) {
      scene.remove(object)
    } else {
      break
    }
  }

  const ambientLight = new THREE.AmbientLight(0x0a0a0a, 1.0)
  scene.add(ambientLight)

  const pointLight1 = new THREE.PointLight(primaryColor.getHex(), 3, 500)
  pointLight1.position.set(100, 100, 100)
  scene.add(pointLight1)

  const pointLight2 = new THREE.PointLight(secondaryColor.getHex(), 3, 500)
  pointLight2.position.set(-100, -100, 100)
  scene.add(pointLight2)

  const pointLight3 = new THREE.PointLight(accentColor.getHex(), 2, 400)
  pointLight3.position.set(0, 0, -100)
  scene.add(pointLight3)

  // Update existing materials
  scene.traverse((object) => {
    if (object.isMesh && object.material) {
      if (object.userData.colorType === 'primary') {
        object.material.color = primaryColor.clone()
        object.material.emissive = primaryColor.clone().multiplyScalar(0.5)
      } else if (object.userData.colorType === 'secondary') {
        object.material.color = secondaryColor.clone()
        object.material.emissive = secondaryColor.clone().multiplyScalar(0.5)
      }
    }
  })
}

const clearScene = () => {
  while(scene.children.length > 0) {
    const object = scene.children[0]
    if (object.geometry) object.geometry.dispose()
    if (object.material) {
      if (Array.isArray(object.material)) {
        object.material.forEach(mat => mat.dispose())
      } else {
        object.material.dispose()
      }
    }
    scene.remove(object)
  }

  updateThemeColors(props.theme)

  kaleidoscope = null
  particles = []
  waveform = null
}

const initMode = (mode) => {
  switch(mode) {
    case 'spectrum':
      createKaleidoscope()
      break
    case 'particles':
      createParticleGalaxy()
      break
    case 'waveform':
      createFluidWaveform()
      break
  }
}

const createKaleidoscope = () => {
  // Kaleidoscope pattern with radial symmetry
  const segments = 64
  const layers = 4
  kaleidoscope = []

  for (let layer = 0; layer < layers; layer++) {
    const radius = 40 + layer * 25
    const barCount = segments * (layer + 1)

    for (let i = 0; i < barCount; i++) {
      const angle = (i / barCount) * Math.PI * 2

      // Create mirrored pairs for kaleidoscope effect
      for (let mirror = 0; mirror < 2; mirror++) {
        const mirrorAngle = mirror === 0 ? angle : -angle

        const geometry = new THREE.BoxGeometry(
          (Math.PI * 2 * radius) / barCount * 0.8,
          1,
          3 + layer
        )

        const colorLerp = (i / barCount + layer * 0.25) % 1
        const color = new THREE.Color().lerpColors(
          primaryColor,
          secondaryColor,
          colorLerp
        )

        const material = new THREE.MeshPhongMaterial({
          color: color,
          emissive: color.clone().multiplyScalar(0.6),
          emissiveIntensity: 1.5,
          shininess: 100,
          transparent: true,
          opacity: 0.9
        })

        const bar = new THREE.Mesh(geometry, material)
        bar.position.x = Math.cos(mirrorAngle) * radius
        bar.position.z = Math.sin(mirrorAngle) * radius
        bar.rotation.y = -mirrorAngle

        bar.userData = {
          angle: mirrorAngle,
          baseRadius: radius,
          layer,
          index: i,
          baseColor: color.clone(),
          frequencyIndex: Math.floor((i / barCount) * (bufferLength || 1024)),
          colorType: colorLerp < 0.5 ? 'primary' : 'secondary'
        }

        scene.add(bar)
        kaleidoscope.push(bar)
      }
    }
  }
}

const createParticleGalaxy = () => {
  // Spiral galaxy of particles
  const particleCount = 6000
  particles = []

  for (let i = 0; i < particleCount; i++) {
    const size = Math.random() * 1.2 + 0.4
    const geometry = new THREE.SphereGeometry(size, 8, 8)

    // Spiral pattern
    const spiral = i / particleCount
    const angle = spiral * Math.PI * 8
    const radius = 20 + spiral * 120

    const colorLerp = Math.random()
    const color = new THREE.Color().lerpColors(
      primaryColor,
      secondaryColor,
      colorLerp
    )

    const material = new THREE.MeshPhongMaterial({
      color: color,
      emissive: color.clone().multiplyScalar(0.7),
      emissiveIntensity: 2.0,
      transparent: true,
      opacity: 0.95
    })

    const particle = new THREE.Mesh(geometry, material)

    particle.position.x = Math.cos(angle) * radius
    particle.position.y = (Math.random() - 0.5) * 100
    particle.position.z = Math.sin(angle) * radius

    particle.userData = {
      baseX: particle.position.x,
      baseY: particle.position.y,
      baseZ: particle.position.z,
      angle: angle,
      radius: radius,
      spiral: spiral,
      baseSize: size,
      baseColor: color.clone(),
      frequencyBand: Math.floor(Math.random() * 3),
      colorType: colorLerp < 0.5 ? 'primary' : 'secondary'
    }

    scene.add(particle)
    particles.push(particle)
  }
}

const createFluidWaveform = () => {
  // Flowing ribbon waveform
  const segments = 200
  const rings = 40
  waveform = []

  for (let ring = 0; ring < rings; ring++) {
    const points = []
    const radius = 30 + ring * 2.5

    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2
      points.push(new THREE.Vector3(
        Math.cos(angle) * radius,
        0,
        Math.sin(angle) * radius
      ))
    }

    const curve = new THREE.CatmullRomCurve3(points)
    curve.closed = true

    const tubeGeometry = new THREE.TubeGeometry(curve, segments, 1.5, 8, true)

    const colorLerp = ring / rings
    const color = new THREE.Color().lerpColors(
      primaryColor,
      accentColor,
      colorLerp
    )

    const material = new THREE.MeshPhongMaterial({
      color: color,
      emissive: color.clone().multiplyScalar(0.6),
      emissiveIntensity: 1.8,
      transparent: true,
      opacity: 0.85,
      shininess: 120
    })

    const tube = new THREE.Mesh(tubeGeometry, material)
    tube.rotation.x = Math.PI / 2

    tube.userData = {
      ring: ring,
      baseY: (ring - rings / 2) * 4,
      baseColor: color.clone(),
      frequencyIndex: Math.floor((ring / rings) * (bufferLength || 1024)),
      phaseOffset: ring * 0.2,
      colorType: colorLerp < 0.3 ? 'primary' : (colorLerp < 0.7 ? 'secondary' : 'accent')
    }

    tube.position.y = tube.userData.baseY

    scene.add(tube)
    waveform.push(tube)
  }
}

const updateAudioLevels = () => {
  if (!analyser || !dataArray || !props.isPlaying) {
    const time = Date.now() * animationSpeed * 0.001
    bassLevel.value = Math.abs(Math.sin(time * 2)) * 0.8 + 0.2
    midLevel.value = Math.abs(Math.sin(time * 1.5)) * 0.7 + 0.3
    trebleLevel.value = Math.abs(Math.cos(time * 2.5)) * 0.6 + 0.4

    // Simulate beat
    if (Math.random() < 0.02 * animationSpeed) {
      beatIntensity = 1.0
    }
  } else {
    analyser.getByteFrequencyData(dataArray)

    const bassRange = dataArray.slice(0, Math.floor(bufferLength * 0.15))
    const midRange = dataArray.slice(Math.floor(bufferLength * 0.15), Math.floor(bufferLength * 0.5))
    const trebleRange = dataArray.slice(Math.floor(bufferLength * 0.5), bufferLength)

    bassLevel.value = bassRange.reduce((a, b) => a + b, 0) / bassRange.length / 255
    midLevel.value = midRange.reduce((a, b) => a + b, 0) / midRange.length / 255
    trebleLevel.value = trebleRange.reduce((a, b) => a + b, 0) / trebleRange.length / 255

    // Detect beats
    if (bassLevel.value > 0.7 && beatIntensity < 0.5) {
      beatIntensity = 1.0
    }
  }

  // Decay beat intensity
  beatIntensity *= 0.92
}

const animate = () => {
  animationId = requestAnimationFrame(animate)

  updateAudioLevels()

  const time = Date.now() * 0.0005 * animationSpeed

  switch(props.visualizationMode) {
    case 'spectrum':
      updateKaleidoscope(time)
      break
    case 'particles':
      updateParticleGalaxy(time)
      break
    case 'waveform':
      updateFluidWaveform(time)
      break
  }

  renderer.render(scene, camera)
}

const updateKaleidoscope = (time) => {
  if (!kaleidoscope) return

  kaleidoscope.forEach((bar) => {
    let intensity = 1

    if (analyser && dataArray) {
      const freqValue = dataArray[bar.userData.frequencyIndex] / 255
      intensity = freqValue * 4 + 0.3
    } else {
      const freqPos = bar.userData.index / 64
      if (freqPos < 0.15) intensity = bassLevel.value * 4 + 0.3
      else if (freqPos < 0.5) intensity = midLevel.value * 4 + 0.3
      else intensity = trebleLevel.value * 4 + 0.3
    }

    // Beat reactivity
    intensity += beatIntensity * 2

    // Smooth height animation
    const targetHeight = intensity * 35
    bar.scale.y = THREE.MathUtils.lerp(bar.scale.y || 1, targetHeight, 0.2)
    bar.position.y = (bar.scale.y - 1) / 2

    // Rotate kaleidoscope
    bar.rotation.y = -bar.userData.angle + time * 0.15

    // Theme-based color pulsing
    const baseColor = bar.userData.baseColor
    const pulseAmount = 0.3 + intensity * 0.4
    bar.material.emissiveIntensity = pulseAmount * 2

    // Color shifting
    const hsl = {}
    baseColor.getHSL(hsl)
    hsl.l = 0.5 + intensity * 0.2
    bar.material.color.setHSL(hsl.h, hsl.s, hsl.l)
    bar.material.emissive.setHSL(hsl.h, hsl.s, hsl.l * 0.6)
  })

  // Gentle camera rotation
  camera.rotation.z = Math.sin(time * 0.3) * 0.05
}

const updateParticleGalaxy = (time) => {
  if (!particles) return

  particles.forEach((particle) => {
    const bandLevels = [bassLevel.value, midLevel.value, trebleLevel.value]
    const bandLevel = bandLevels[particle.userData.frequencyBand]

    // Spiral rotation
    const rotationSpeed = 0.3 + bandLevel * 0.5
    const newAngle = particle.userData.angle + time * rotationSpeed * 0.1

    particle.position.x = Math.cos(newAngle) * particle.userData.radius
    particle.position.z = Math.sin(newAngle) * particle.userData.radius

    // Vertical wave motion
    particle.position.y = particle.userData.baseY + Math.sin(time * 2 + particle.userData.spiral * 10) * 15 * bandLevel

    // Beat reactive scaling
    const scale = 1 + bandLevel * 2 + beatIntensity
    particle.scale.set(scale, scale, scale)

    // Pulsing glow
    particle.material.emissiveIntensity = 1.5 + bandLevel * 1.5 + beatIntensity

    // Color variation
    const hsl = {}
    particle.userData.baseColor.getHSL(hsl)
    hsl.h = (hsl.h + time * 0.05) % 1
    particle.material.color.setHSL(hsl.h, hsl.s, 0.5 + bandLevel * 0.3)
    particle.material.emissive.setHSL(hsl.h, hsl.s, 0.6)
  })

  // Camera movement
  camera.position.y = Math.sin(time * 0.5) * 30
  camera.lookAt(0, 0, 0)
}

const updateFluidWaveform = (time) => {
  if (!waveform) return

  waveform.forEach((tube) => {
    let intensity = 1

    if (analyser && dataArray) {
      const freqValue = dataArray[tube.userData.frequencyIndex] / 255
      intensity = freqValue * 3 + 0.2
    } else {
      const freqPos = tube.userData.ring / 40
      if (freqPos < 0.3) intensity = bassLevel.value * 3 + 0.2
      else if (freqPos < 0.6) intensity = midLevel.value * 3 + 0.2
      else intensity = trebleLevel.value * 3 + 0.2
    }

    // Beat pulse
    intensity += beatIntensity * 1.5

    // Scale pulsing
    const scale = 1 + intensity * 0.5
    tube.scale.set(scale, scale, 1)

    // Wave motion
    const wave = Math.sin(time * 2 + tube.userData.phaseOffset) * intensity * 10
    tube.position.y = tube.userData.baseY + wave

    // Rotation
    tube.rotation.z = time * (0.2 + intensity * 0.3)

    // Color shifting
    const hsl = {}
    tube.userData.baseColor.getHSL(hsl)
    hsl.h = (hsl.h + time * 0.03) % 1
    hsl.l = 0.4 + intensity * 0.3
    tube.material.color.setHSL(hsl.h, hsl.s, hsl.l)
    tube.material.emissive.setHSL(hsl.h, hsl.s, hsl.l * 0.7)
    tube.material.emissiveIntensity = 1.2 + intensity * 0.8
  })

  // Smooth camera zoom
  camera.position.z = 150 + Math.sin(time * 0.8) * 20
}

const onWindowResize = () => {
  camera.aspect = canvas.value.clientWidth / canvas.value.clientHeight
  camera.updateProjectionMatrix()
  renderer.setSize(canvas.value.clientWidth, canvas.value.clientHeight)
}
</script>

<style scoped>
.glass-panel {
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

.control-btn {
  @apply w-12 h-12 rounded-full bg-white bg-opacity-10 hover:bg-opacity-20
         flex items-center justify-center transition-all duration-200
         hover:scale-110 text-white;
}

.control-btn-large {
  @apply w-16 h-16 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30
         flex items-center justify-center transition-all duration-200
         hover:scale-110 text-white shadow-xl;
}

.slide-fade-enter-active {
  transition: all 0.3s ease;
}

.slide-fade-leave-active {
  transition: all 0.3s ease;
}

.slide-fade-enter-from {
  transform: translateX(20px);
  opacity: 0;
}

.slide-fade-leave-to {
  transform: translateX(20px);
  opacity: 0;
}
</style>
