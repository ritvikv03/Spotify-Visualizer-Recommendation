<template>
  <div class="relative w-full bg-black rounded-lg overflow-hidden shadow-2xl h-full min-h-[300px]">
    <canvas ref="canvas" class="w-full h-full"></canvas>

    <!-- Mode Controls -->
    <div class="absolute top-4 left-4 z-10">
      <div class="glass-effect px-4 py-3 rounded-lg">
        <h3 class="text-xs font-semibold mb-3 text-gray-300 uppercase tracking-wide">Visualization Mode</h3>
        <div class="flex flex-col gap-2">
          <button
            v-for="mode in visualizerModes"
            :key="mode.id"
            @click="currentMode = mode.id"
            :class="currentMode === mode.id ? 'bg-spotify-green text-black' : 'bg-spotify-gray text-white hover:bg-opacity-80'"
            class="px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-2 hover:scale-105"
          >
            <component :is="mode.icon" :size="18" :color="currentMode === mode.id ? '#000' : '#1DB954'" />
            {{ mode.name }}
          </button>
        </div>
      </div>

      <!-- Audio Levels Indicator -->
      <div v-if="isPlaying || isAnalyzed" class="glass-effect px-4 py-3 rounded-lg mt-3">
        <div class="text-xs space-y-2">
          <div class="flex justify-between items-center">
            <span class="text-gray-400 font-medium">Bass</span>
            <div class="w-24 h-1.5 bg-spotify-dark rounded-full overflow-hidden">
              <div class="h-full bg-gradient-to-r from-red-500 to-red-400 transition-all duration-100" :style="`width: ${bassLevel * 100}%`"></div>
            </div>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-gray-400 font-medium">Mids</span>
            <div class="w-24 h-1.5 bg-spotify-dark rounded-full overflow-hidden">
              <div class="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-100" :style="`width: ${midLevel * 100}%`"></div>
            </div>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-gray-400 font-medium">High</span>
            <div class="w-24 h-1.5 bg-spotify-dark rounded-full overflow-hidden">
              <div class="h-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-100" :style="`width: ${trebleLevel * 100}%`"></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Info Overlay -->
    <div v-if="!isPlaying && !isAnalyzed" class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm pointer-events-none">
      <div class="text-center px-4">
        <IconMusic :size="80" color="#1DB954" class="mx-auto mb-6 opacity-50" />
        <p class="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-cyan-500">
          Your Music Universe Awaits
        </p>
        <p class="text-sm text-gray-400 mt-3">Click Analyze to visualize your musical identity</p>
      </div>
    </div>

    <!-- Track Info Tooltip -->
    <div v-if="hoveredTrack" class="absolute bottom-4 left-1/2 transform -translate-x-1/2 glass-effect px-6 py-3 rounded-lg max-w-sm">
      <p class="text-sm font-bold truncate">{{ hoveredTrack.name }}</p>
      <p class="text-xs text-gray-400 truncate">{{ hoveredTrack.artists }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as THREE from 'three'
import IconSpectrum from '../icons/IconSpectrum.vue'
import IconParticles from '../icons/IconParticles.vue'
import IconWaveform from '../icons/IconWaveform.vue'
import IconMusic from '../icons/IconMusic.vue'

const props = defineProps({
  isPlaying: Boolean,
  isAnalyzed: Boolean,
  tracks: {
    type: Array,
    default: () => []
  },
  tasteProfile: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['play-track'])

const canvas = ref(null)
const currentMode = ref('spectrum')
const hoveredTrack = ref(null)
const bassLevel = ref(0)
const midLevel = ref(0)
const trebleLevel = ref(0)

const visualizerModes = [
  { id: 'spectrum', name: 'Frequency Spectrum', icon: IconSpectrum },
  { id: 'particles', name: 'Particle Field', icon: IconParticles },
  { id: 'waveform', name: 'Waveform Rings', icon: IconWaveform }
]

let scene, camera, renderer, raycaster, mouse
let animationId = null
let audioContext, analyser, dataArray, bufferLength

// Visualization objects
let spectrumBars = []
let particleSystem = []
let waveformRings = []

raycaster = new THREE.Raycaster()
mouse = new THREE.Vector2()

onMounted(() => {
  initThreeJS()
  initAudio()
  animate()

  canvas.value.addEventListener('mousemove', onMouseMove)
  canvas.value.addEventListener('click', onMouseClick)
})

onUnmounted(() => {
  if (animationId) cancelAnimationFrame(animationId)
  if (renderer) renderer.dispose()
  if (audioContext) audioContext.close()

  if (canvas.value) {
    canvas.value.removeEventListener('mousemove', onMouseMove)
    canvas.value.removeEventListener('click', onMouseClick)
  }
})

watch(() => props.isPlaying, (playing) => {
  if (playing && !audioContext) {
    initAudio()
  }
})

watch(() => props.isAnalyzed, (analyzed) => {
  if (analyzed && props.tracks.length > 0) {
    clearScene()
    initMode(currentMode.value)
  }
})

watch(currentMode, (newMode) => {
  clearScene()
  initMode(newMode)
})

const initThreeJS = () => {
  scene = new THREE.Scene()
  scene.fog = new THREE.FogExp2(0x000000, 0.0015)

  camera = new THREE.PerspectiveCamera(
    75,
    canvas.value.clientWidth / canvas.value.clientHeight,
    0.1,
    2000
  )
  camera.position.z = 80

  renderer = new THREE.WebGLRenderer({
    canvas: canvas.value,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance'
  })
  renderer.setSize(canvas.value.clientWidth, canvas.value.clientHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.5

  // Professional lighting setup
  const ambientLight = new THREE.AmbientLight(0x1a1a2e, 0.4)
  scene.add(ambientLight)

  const pointLight1 = new THREE.PointLight(0x1DB954, 2, 400)
  pointLight1.position.set(50, 50, 50)
  scene.add(pointLight1)

  const pointLight2 = new THREE.PointLight(0x00d9ff, 2, 400)
  pointLight2.position.set(-50, -50, -50)
  scene.add(pointLight2)

  initMode('spectrum')

  window.addEventListener('resize', onWindowResize)
}

const initAudio = async () => {
  try {
    audioContext = new (window.AudioContext || window.webkitAudioContext)()
    analyser = audioContext.createAnalyser()
    analyser.fftSize = 512
    analyser.smoothingTimeConstant = 0.75
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

  // Re-add lights
  const ambientLight = new THREE.AmbientLight(0x1a1a2e, 0.4)
  scene.add(ambientLight)

  const pointLight1 = new THREE.PointLight(0x1DB954, 2, 400)
  pointLight1.position.set(50, 50, 50)
  scene.add(pointLight1)

  const pointLight2 = new THREE.PointLight(0x00d9ff, 2, 400)
  pointLight2.position.set(-50, -50, -50)
  scene.add(pointLight2)

  spectrumBars = []
  particleSystem = []
  waveformRings = []
}

const initMode = (mode) => {
  switch(mode) {
    case 'spectrum':
      createSpectrum()
      break
    case 'particles':
      createParticleField()
      break
    case 'waveform':
      createWaveformRings()
      break
  }
}

const createSpectrum = () => {
  const barCount = 64
  const radius = 50

  for (let i = 0; i < barCount; i++) {
    const angle = (i / barCount) * Math.PI * 2
    const barWidth = (Math.PI * 2 * radius) / barCount * 0.8

    const geometry = new THREE.BoxGeometry(barWidth, 1, 2)
    const hue = (i / barCount) * 360
    const material = new THREE.MeshPhongMaterial({
      color: new THREE.Color(`hsl(${hue}, 100%, 50%)`),
      emissive: new THREE.Color(`hsl(${hue}, 100%, 30%)`),
      emissiveIntensity: 0.5,
      shininess: 100,
      transparent: true,
      opacity: 0.9
    })

    const bar = new THREE.Mesh(geometry, material)
    bar.position.x = Math.cos(angle) * radius
    bar.position.z = Math.sin(angle) * radius
    bar.rotation.y = -angle

    bar.userData = {
      angle,
      baseRadius: radius,
      hue,
      frequencyIndex: Math.floor((i / barCount) * bufferLength)
    }

    scene.add(bar)
    spectrumBars.push(bar)
  }
}

const createParticleField = () => {
  const particleCount = 2000

  for (let i = 0; i < particleCount; i++) {
    const size = Math.random() * 0.8 + 0.2
    const geometry = new THREE.SphereGeometry(size, 8, 8)

    const hue = Math.random() * 360
    const material = new THREE.MeshPhongMaterial({
      color: new THREE.Color(`hsl(${hue}, 100%, 60%)`),
      emissive: new THREE.Color(`hsl(${hue}, 100%, 40%)`),
      emissiveIntensity: 0.6,
      transparent: true,
      opacity: 0.8
    })

    const particle = new THREE.Mesh(geometry, material)

    // Distribute in sphere
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    const radius = 30 + Math.random() * 50

    particle.position.x = radius * Math.sin(phi) * Math.cos(theta)
    particle.position.y = radius * Math.sin(phi) * Math.sin(theta)
    particle.position.z = radius * Math.cos(phi)

    particle.userData = {
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 0.2,
        (Math.random() - 0.5) * 0.2,
        (Math.random() - 0.5) * 0.2
      ),
      hue,
      baseSize: size,
      frequencyBand: Math.floor(Math.random() * 3) // 0=bass, 1=mid, 2=treble
    }

    scene.add(particle)
    particleSystem.push(particle)
  }
}

const createWaveformRings = () => {
  const ringCount = 12

  for (let i = 0; i < ringCount; i++) {
    const segments = 128
    const radius = 20 + i * 4
    const geometry = new THREE.TorusGeometry(radius, 0.5, 16, segments)

    const hue = (i / ringCount) * 360
    const material = new THREE.MeshPhongMaterial({
      color: new THREE.Color(`hsl(${hue}, 100%, 50%)`),
      emissive: new THREE.Color(`hsl(${hue}, 100%, 30%)`),
      emissiveIntensity: 0.7,
      transparent: true,
      opacity: 0.7,
      wireframe: false
    })

    const ring = new THREE.Mesh(geometry, material)
    ring.rotation.x = Math.PI / 2
    ring.position.y = (i - ringCount / 2) * 3

    ring.userData = {
      baseRadius: radius,
      baseY: ring.position.y,
      hue,
      phaseOffset: i * 0.5,
      frequencyIndex: Math.floor((i / ringCount) * bufferLength)
    }

    scene.add(ring)
    waveformRings.push(ring)
  }
}

const updateAudioLevels = () => {
  if (!analyser || !dataArray || !props.isPlaying) {
    // Procedural fallback
    const time = Date.now()
    const diversity = props.tasteProfile?.diversityScore || 0.5
    const popularity = props.tasteProfile?.avgPopularity || 50

    bassLevel.value = Math.abs(Math.sin(time / (400 - diversity * 100))) * (0.4 + diversity * 0.4) + 0.2
    midLevel.value = Math.abs(Math.sin(time / (300 - popularity))) * 0.6 + 0.3
    trebleLevel.value = Math.abs(Math.cos(time / 500)) * (0.3 + (popularity / 100) * 0.5) + 0.2
    return
  }

  analyser.getByteFrequencyData(dataArray)

  const bassRange = dataArray.slice(0, Math.floor(bufferLength * 0.15))
  const midRange = dataArray.slice(Math.floor(bufferLength * 0.15), Math.floor(bufferLength * 0.5))
  const trebleRange = dataArray.slice(Math.floor(bufferLength * 0.5), bufferLength)

  bassLevel.value = bassRange.reduce((a, b) => a + b, 0) / bassRange.length / 255
  midLevel.value = midRange.reduce((a, b) => a + b, 0) / midRange.length / 255
  trebleLevel.value = trebleRange.reduce((a, b) => a + b, 0) / trebleRange.length / 255
}

const animate = () => {
  animationId = requestAnimationFrame(animate)

  if (props.isPlaying || props.isAnalyzed) {
    updateAudioLevels()
  }

  const time = Date.now() * 0.0005

  switch(currentMode.value) {
    case 'spectrum':
      updateSpectrum(time)
      break
    case 'particles':
      updateParticleField(time)
      break
    case 'waveform':
      updateWaveformRings(time)
      break
  }

  camera.position.x = Math.cos(time * 0.3) * 80
  camera.position.z = Math.sin(time * 0.3) * 80
  camera.lookAt(0, 0, 0)

  renderer.render(scene, camera)
}

const updateSpectrum = (time) => {
  spectrumBars.forEach((bar, i) => {
    let intensity = 1

    if (analyser && dataArray) {
      const freqValue = dataArray[bar.userData.frequencyIndex] / 255
      intensity = freqValue * 3 + 0.5
    } else {
      // Procedural
      const freqPos = i / spectrumBars.length
      if (freqPos < 0.15) intensity = bassLevel.value * 3 + 0.5
      else if (freqPos < 0.5) intensity = midLevel.value * 3 + 0.5
      else intensity = trebleLevel.value * 3 + 0.5
    }

    const targetHeight = intensity * 30
    bar.scale.y = THREE.MathUtils.lerp(bar.scale.y, targetHeight, 0.2)
    bar.position.y = bar.scale.y / 2

    // Color shift based on intensity
    const hue = (bar.userData.hue + intensity * 60) % 360
    bar.material.color.setHSL(hue / 360, 1, 0.5)
    bar.material.emissive.setHSL(hue / 360, 1, 0.3 + intensity * 0.2)

    bar.rotation.y = -bar.userData.angle + time * 0.5
  })
}

const updateParticleField = (time) => {
  particleSystem.forEach((particle, i) => {
    // Get frequency band level
    const bandLevels = [bassLevel.value, midLevel.value, trebleLevel.value]
    const bandLevel = bandLevels[particle.userData.frequencyBand]

    // Update position with physics
    particle.position.add(particle.userData.velocity)

    // Pulse size based on frequency band
    const scale = 1 + bandLevel * 2
    particle.scale.set(scale, scale, scale)

    // Color intensity
    const intensity = 0.4 + bandLevel * 0.6
    particle.material.emissiveIntensity = intensity

    // Boundary check - keep in sphere
    const distance = particle.position.length()
    if (distance > 100) {
      particle.position.normalize().multiplyScalar(100)
      particle.userData.velocity.multiplyScalar(-0.5)
    }

    // Attraction/repulsion based on audio
    const centerPull = new THREE.Vector3(0, 0, 0).sub(particle.position)
    centerPull.normalize().multiplyScalar(bassLevel.value * 0.1)
    particle.userData.velocity.add(centerPull)

    // Damping
    particle.userData.velocity.multiplyScalar(0.99)

    particle.rotation.x += 0.01
    particle.rotation.y += 0.01
  })
}

const updateWaveformRings = (time) => {
  waveformRings.forEach((ring, i) => {
    let intensity = 1

    if (analyser && dataArray) {
      const freqValue = dataArray[ring.userData.frequencyIndex] / 255
      intensity = freqValue * 2 + 0.3
    } else {
      const freqPos = i / waveformRings.length
      if (freqPos < 0.3) intensity = bassLevel.value * 2 + 0.3
      else if (freqPos < 0.6) intensity = midLevel.value * 2 + 0.3
      else intensity = trebleLevel.value * 2 + 0.3
    }

    // Scale rings
    const scale = 1 + intensity * 0.5
    ring.scale.set(scale, scale, 1)

    // Vertical wave motion
    const wave = Math.sin(time * 2 + ring.userData.phaseOffset) * intensity * 5
    ring.position.y = ring.userData.baseY + wave

    // Rotation
    ring.rotation.z += 0.002 + intensity * 0.01

    // Color
    const hue = (ring.userData.hue + intensity * 80 + time * 20) % 360
    ring.material.color.setHSL(hue / 360, 1, 0.5)
    ring.material.emissive.setHSL(hue / 360, 1, 0.3)
    ring.material.emissiveIntensity = 0.5 + intensity * 0.5
  })
}

const onWindowResize = () => {
  camera.aspect = canvas.value.clientWidth / canvas.value.clientHeight
  camera.updateProjectionMatrix()
  renderer.setSize(canvas.value.clientWidth, canvas.value.clientHeight)
}

const onMouseMove = (event) => {
  // Mouse interaction implementation (optional)
}

const onMouseClick = (event) => {
  // Click interaction implementation (optional)
}
</script>

<style scoped>
.glass-effect {
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}
</style>
