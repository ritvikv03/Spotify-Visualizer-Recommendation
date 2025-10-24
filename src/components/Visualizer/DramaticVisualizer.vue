<template>
  <div class="relative w-full h-full bg-black overflow-hidden">
    <canvas ref="canvas" class="w-full h-full"></canvas>

    <!-- Bottom Control Bar -->
    <div class="absolute bottom-0 left-0 right-0 z-20">
      <!-- Audio Level Bars -->
      <div class="flex items-end justify-center gap-1 px-8 pb-4">
        <div
          v-for="(bar, i) in audioLevelBars"
          :key="i"
          class="w-1 bg-gradient-to-t transition-all duration-100 rounded-t-full"
          :class="bar.color"
          :style="{ height: `${bar.height}px` }"
        ></div>
      </div>

      <!-- Now Playing Card -->
      <div v-if="currentTrack" class="glass-panel mx-auto max-w-2xl mb-6 px-6 py-4">
        <div class="flex items-center gap-6">
          <!-- Album Art -->
          <img
            v-if="currentTrack.album?.images?.[0]?.url"
            :src="currentTrack.album.images[0].url"
            alt="Album art"
            class="w-20 h-20 rounded-lg shadow-2xl"
          />

          <!-- Track Info -->
          <div class="flex-1 min-w-0">
            <h3 class="text-lg font-bold truncate text-white">{{ currentTrack.name }}</h3>
            <p class="text-sm text-gray-300 truncate">{{ currentTrack.artists?.map(a => a.name).join(', ') }}</p>
          </div>

          <!-- Playback Controls -->
          <div class="flex items-center gap-3">
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
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import * as THREE from 'three'

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

// Create 100 audio level bars for visualization
const audioLevelBars = computed(() => {
  const bars = []
  for (let i = 0; i < 100; i++) {
    const position = i / 100
    let level = 0
    let color = 'from-purple-500 to-purple-400'

    if (position < 0.3) {
      level = bassLevel.value
      color = 'from-red-500 to-red-400'
    } else if (position < 0.7) {
      level = midLevel.value
      color = 'from-green-500 to-green-400'
    } else {
      level = trebleLevel.value
      color = 'from-blue-500 to-blue-400'
    }

    bars.push({
      height: 4 + level * 60,
      color
    })
  }
  return bars
})

let scene, camera, renderer, raycaster, mouse
let animationId = null
let audioContext, analyser, dataArray, bufferLength
let animationSpeed = 1.0

// Visualization objects
let spectrumBars = []
let particles = []
let waveformRings = []

raycaster = new THREE.Raycaster()
mouse = new THREE.Vector2()

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
    // Adjust animation speed based on tempo and energy
    const tempoFactor = features.tempo ? Math.max(0.5, Math.min(2.0, features.tempo / 120)) : 1.0
    const energyFactor = features.energy || 0.7
    animationSpeed = tempoFactor * (0.7 + energyFactor * 0.6)
  }
})

watch(() => props.visualizationMode, (newMode) => {
  clearScene()
  initMode(newMode)
})

watch(() => props.theme, () => {
  updateThemeColors()
})

const initThreeJS = () => {
  scene = new THREE.Scene()
  scene.fog = new THREE.Fog(0x000000, 50, 300)

  camera = new THREE.PerspectiveCamera(
    60,
    canvas.value.clientWidth / canvas.value.clientHeight,
    0.1,
    1000
  )
  camera.position.z = 100
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

  // Dramatic lighting
  const ambientLight = new THREE.AmbientLight(0x1a1a2e, 0.5)
  scene.add(ambientLight)

  const pointLight1 = new THREE.PointLight(0x8B5CF6, 4, 300)
  pointLight1.position.set(80, 80, 80)
  scene.add(pointLight1)

  const pointLight2 = new THREE.PointLight(0x06B6D4, 4, 300)
  pointLight2.position.set(-80, -80, 80)
  scene.add(pointLight2)

  const pointLight3 = new THREE.PointLight(0xEF4444, 3, 250)
  pointLight3.position.set(0, 0, -80)
  scene.add(pointLight3)

  initMode(props.visualizationMode)

  window.addEventListener('resize', onWindowResize)
}

const initAudio = async () => {
  try {
    audioContext = new (window.AudioContext || window.webkitAudioContext)()
    analyser = audioContext.createAnalyser()
    analyser.fftSize = 1024
    analyser.smoothingTimeConstant = 0.7
    bufferLength = analyser.frequencyBinCount
    dataArray = new Uint8Array(bufferLength)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const source = audioContext.createMediaStreamSource(stream)
      source.connect(analyser)
    } catch (e) {
      console.log('Using procedural audio')
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
  const ambientLight = new THREE.AmbientLight(0x1a1a2e, 0.5)
  scene.add(ambientLight)

  const pointLight1 = new THREE.PointLight(0x8B5CF6, 4, 300)
  pointLight1.position.set(80, 80, 80)
  scene.add(pointLight1)

  const pointLight2 = new THREE.PointLight(0x06B6D4, 4, 300)
  pointLight2.position.set(-80, -80, 80)
  scene.add(pointLight2)

  const pointLight3 = new THREE.PointLight(0xEF4444, 3, 250)
  pointLight3.position.set(0, 0, -80)
  scene.add(pointLight3)

  spectrumBars = []
  particles = []
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
  const barCount = 128
  const radius = 70

  for (let i = 0; i < barCount; i++) {
    const angle = (i / barCount) * Math.PI * 2
    const barWidth = (Math.PI * 2 * radius) / barCount * 0.85

    const geometry = new THREE.BoxGeometry(barWidth, 1, 4)
    const hue = (i / barCount) * 360
    const material = new THREE.MeshPhongMaterial({
      color: new THREE.Color(`hsl(${hue}, 100%, 50%)`),
      emissive: new THREE.Color(`hsl(${hue}, 100%, 40%)`),
      emissiveIntensity: 1.2,
      shininess: 150,
      transparent: true,
      opacity: 0.95
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
  const particleCount = 5000

  for (let i = 0; i < particleCount; i++) {
    const size = Math.random() * 1.2 + 0.3
    const geometry = new THREE.SphereGeometry(size, 6, 6)

    const hue = Math.random() * 360
    const material = new THREE.MeshPhongMaterial({
      color: new THREE.Color(`hsl(${hue}, 100%, 60%)`),
      emissive: new THREE.Color(`hsl(${hue}, 100%, 50%)`),
      emissiveIntensity: 1.5,
      transparent: true,
      opacity: 0.9
    })

    const particle = new THREE.Mesh(geometry, material)

    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    const radius = 40 + Math.random() * 80

    particle.position.x = radius * Math.sin(phi) * Math.cos(theta)
    particle.position.y = radius * Math.sin(phi) * Math.sin(theta)
    particle.position.z = radius * Math.cos(phi)

    particle.userData = {
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 0.4,
        (Math.random() - 0.5) * 0.4,
        (Math.random() - 0.5) * 0.4
      ),
      hue,
      baseSize: size,
      frequencyBand: Math.floor(Math.random() * 3)
    }

    scene.add(particle)
    particles.push(particle)
  }
}

const createWaveformRings = () => {
  const ringCount = 20

  for (let i = 0; i < ringCount; i++) {
    const segments = 256
    const radius = 25 + i * 5
    const geometry = new THREE.TorusGeometry(radius, 1.2, 20, segments)

    const hue = (i / ringCount) * 360
    const material = new THREE.MeshPhongMaterial({
      color: new THREE.Color(`hsl(${hue}, 100%, 50%)`),
      emissive: new THREE.Color(`hsl(${hue}, 100%, 40%)`),
      emissiveIntensity: 1.5,
      transparent: true,
      opacity: 0.8,
      wireframe: false
    })

    const ring = new THREE.Mesh(geometry, material)
    ring.rotation.x = Math.PI / 2
    ring.position.y = (i - ringCount / 2) * 4

    ring.userData = {
      baseRadius: radius,
      baseY: ring.position.y,
      hue,
      phaseOffset: i * 0.3,
      frequencyIndex: Math.floor((i / ringCount) * bufferLength)
    }

    scene.add(ring)
    waveformRings.push(ring)
  }
}

const updateAudioLevels = () => {
  if (!analyser || !dataArray || !props.isPlaying) {
    const time = Date.now() * animationSpeed
    bassLevel.value = Math.abs(Math.sin(time / 400)) * 0.8 + 0.2
    midLevel.value = Math.abs(Math.sin(time / 300)) * 0.7 + 0.3
    trebleLevel.value = Math.abs(Math.cos(time / 500)) * 0.6 + 0.4
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

  if (props.isPlaying) {
    updateAudioLevels()
  }

  const time = Date.now() * 0.0005 * animationSpeed

  switch(props.visualizationMode) {
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

  renderer.render(scene, camera)
}

const updateSpectrum = (time) => {
  spectrumBars.forEach((bar, i) => {
    let intensity = 1

    if (analyser && dataArray) {
      const freqValue = dataArray[bar.userData.frequencyIndex] / 255
      intensity = freqValue * 5 + 0.5
    } else {
      const freqPos = i / spectrumBars.length
      if (freqPos < 0.15) intensity = bassLevel.value * 5 + 0.5
      else if (freqPos < 0.5) intensity = midLevel.value * 5 + 0.5
      else intensity = trebleLevel.value * 5 + 0.5
    }

    const targetHeight = intensity * 50
    bar.scale.y = THREE.MathUtils.lerp(bar.scale.y, targetHeight, 0.25)
    bar.position.y = bar.scale.y / 2

    const hue = (bar.userData.hue + intensity * 80) % 360
    bar.material.color.setHSL(hue / 360, 1, 0.5)
    bar.material.emissive.setHSL(hue / 360, 1, 0.4)
    bar.material.emissiveIntensity = 0.8 + intensity * 0.7
  })
}

const updateParticleField = (time) => {
  particles.forEach((particle) => {
    const bandLevels = [bassLevel.value, midLevel.value, trebleLevel.value]
    const bandLevel = bandLevels[particle.userData.frequencyBand]

    particle.position.add(particle.userData.velocity.clone().multiplyScalar(animationSpeed))

    const scale = 1 + bandLevel * 3
    particle.scale.set(scale, scale, scale)

    particle.material.emissiveIntensity = 1.0 + bandLevel * 1.5

    const distance = particle.position.length()
    if (distance > 150) {
      particle.position.normalize().multiplyScalar(150)
      particle.userData.velocity.multiplyScalar(-0.6)
    }

    const centerPull = new THREE.Vector3(0, 0, 0).sub(particle.position)
    centerPull.normalize().multiplyScalar(bassLevel.value * 0.15)
    particle.userData.velocity.add(centerPull)

    particle.userData.velocity.multiplyScalar(0.98)

    particle.rotation.x += 0.02 * animationSpeed
    particle.rotation.y += 0.02 * animationSpeed
  })
}

const updateWaveformRings = (time) => {
  waveformRings.forEach((ring, i) => {
    let intensity = 1

    if (analyser && dataArray) {
      const freqValue = dataArray[ring.userData.frequencyIndex] / 255
      intensity = freqValue * 3 + 0.3
    } else {
      const freqPos = i / waveformRings.length
      if (freqPos < 0.3) intensity = bassLevel.value * 3 + 0.3
      else if (freqPos < 0.6) intensity = midLevel.value * 3 + 0.3
      else intensity = trebleLevel.value * 3 + 0.3
    }

    const scale = 1 + intensity * 0.8
    ring.scale.set(scale, scale, 1)

    const wave = Math.sin(time * 2 + ring.userData.phaseOffset) * intensity * 8
    ring.position.y = ring.userData.baseY + wave

    ring.rotation.z += (0.003 + intensity * 0.02) * animationSpeed

    const hue = (ring.userData.hue + intensity * 100 + time * 30) % 360
    ring.material.color.setHSL(hue / 360, 1, 0.5)
    ring.material.emissive.setHSL(hue / 360, 1, 0.4)
    ring.material.emissiveIntensity = 1.0 + intensity * 0.8
  })
}

const updateThemeColors = () => {
  if (!props.theme) return

  const themeColor = new THREE.Color(props.theme.primary)

  scene.traverse((object) => {
    if (object.material && object.material.emissive) {
      // Blend with theme color
      const currentColor = object.material.color.getHSL({})
      object.material.emissive.setHSL(currentColor.h, currentColor.s, currentColor.l * 0.7)
    }
  })
}

const onWindowResize = () => {
  camera.aspect = canvas.value.clientWidth / canvas.value.clientHeight
  camera.updateProjectionMatrix()
  renderer.setSize(canvas.value.clientWidth, canvas.value.clientHeight)
}
</script>

<style scoped>
.glass-panel {
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
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
</style>
