<template>
  <div
    class="relative w-full h-full bg-black overflow-hidden"
    @mousemove="handleMouseMove"
  >
    <canvas ref="canvas" class="w-full h-full"></canvas>

    <!-- Now Playing Card & Controls (Bottom Right - appears on mouse move) -->
    <transition name="slide-fade">
      <div
        v-if="currentTrack && showNowPlaying"
        class="absolute bottom-6 right-6 z-20 glass-panel p-4 w-80"
      >
        <div class="flex items-start gap-3 mb-4">
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

        <!-- Playback Controls -->
        <div class="flex items-center justify-center gap-3">
          <button @click="$emit('previous')" class="control-btn-small">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
            </svg>
          </button>

          <button @click="$emit('toggle-play')" class="control-btn-large">
            <svg v-if="!isPlaying" class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
            <svg v-else class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 4h4v16H6zm8 0h4v16h-4z"/>
            </svg>
          </button>

          <button @click="$emit('next')" class="control-btn-small">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
            </svg>
          </button>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as THREE from 'three'
import spotifyService from '../../services/spotify'

const props = defineProps({
  isPlaying: Boolean,
  currentTrack: Object,
  visualizationMode: {
    type: String,
    default: 'kaleidosync'
  },
  audioFeatures: Object,
  theme: Object
})

const emit = defineEmits(['toggle-play', 'next', 'previous'])

const canvas = ref(null)
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
let beatIntensity = 0

// Visualization objects
let visualElements = []

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
  if (renderer) {
    renderer.dispose()
    renderer.forceContextLoss()
  }
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
      await spotifyService.getAudioAnalysis(track.id)
    } catch (error) {
      console.error('Error loading audio analysis:', error)
    }
  }
})

watch(() => props.visualizationMode, (newMode) => {
  clearScene()
  initMode(newMode)
})

watch(() => props.theme, (theme) => {
  if (theme) {
    updateThemeColors(theme)
  }
}, { deep: true, immediate: true })

const initThreeJS = () => {
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x000000)

  const aspect = canvas.value.clientWidth / canvas.value.clientHeight
  camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 3000)
  camera.position.z = 300
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

  updateThemeColors(props.theme)
  initMode(props.visualizationMode)

  window.addEventListener('resize', onWindowResize)
}

const initAudio = async () => {
  try {
    audioContext = new (window.AudioContext || window.webkitAudioContext)()
    analyser = audioContext.createAnalyser()
    analyser.fftSize = 2048
    analyser.smoothingTimeConstant = 0.75
    bufferLength = analyser.frequencyBinCount
    dataArray = new Uint8Array(bufferLength)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const source = audioContext.createMediaStreamSource(stream)
      source.connect(analyser)
    } catch (e) {
      console.log('Using procedural visualization')
    }
  } catch (error) {
    console.error('Audio init error:', error)
  }
}

const updateThemeColors = (theme) => {
  if (!theme) return

  primaryColor = new THREE.Color(theme.primary || '#8B5CF6')
  secondaryColor = new THREE.Color(theme.accent || '#06B6D4')
  accentColor = new THREE.Color(theme.textSecondary || '#EF4444')

  // Remove old lights
  const lights = scene.children.filter(obj => obj.isLight)
  lights.forEach(light => scene.remove(light))

  // Add new lights with theme colors
  const ambientLight = new THREE.AmbientLight(0x111111, 2.0)
  scene.add(ambientLight)

  const pointLight1 = new THREE.PointLight(primaryColor.getHex(), 5, 800)
  pointLight1.position.set(200, 200, 200)
  scene.add(pointLight1)

  const pointLight2 = new THREE.PointLight(secondaryColor.getHex(), 5, 800)
  pointLight2.position.set(-200, -200, 200)
  scene.add(pointLight2)

  const pointLight3 = new THREE.PointLight(accentColor.getHex(), 4, 700)
  pointLight3.position.set(0, 0, -200)
  scene.add(pointLight3)

  // Update materials in scene
  visualElements.forEach(element => {
    if (element.material && element.userData.colorIndex !== undefined) {
      updateElementColor(element)
    }
  })
}

const updateElementColor = (element) => {
  const colorIndex = element.userData.colorIndex
  let color

  if (colorIndex < 0.33) {
    color = primaryColor.clone()
  } else if (colorIndex < 0.67) {
    color = new THREE.Color().lerpColors(primaryColor, secondaryColor, (colorIndex - 0.33) / 0.34)
  } else {
    color = new THREE.Color().lerpColors(secondaryColor, accentColor, (colorIndex - 0.67) / 0.33)
  }

  element.material.color.copy(color)
  element.material.emissive.copy(color).multiplyScalar(0.5)
  element.userData.baseColor = color.clone()
}

const clearScene = () => {
  visualElements.forEach(element => {
    if (element.geometry) element.geometry.dispose()
    if (element.material) {
      if (Array.isArray(element.material)) {
        element.material.forEach(mat => mat.dispose())
      } else {
        element.material.dispose()
      }
    }
    scene.remove(element)
  })

  visualElements = []
  updateThemeColors(props.theme)
}

const initMode = (mode) => {
  switch(mode) {
    case 'kaleidosync':
      createKaleidosync()
      break
    case 'flower':
      createFlowerPattern()
      break
    case 'bars':
      createRadialBars()
      break
    case 'tunnel':
      createTunnel()
      break
    case 'waves':
      createWaves()
      break
  }
}

// KALEIDOSYNC - Full screen kaleidoscope
const createKaleidosync = () => {
  const symmetry = 12
  const segments = 40
  const layers = 6

  for (let layer = 0; layer < layers; layer++) {
    const baseRadius = 80 + layer * 60

    for (let sym = 0; sym < symmetry; sym++) {
      const symAngle = (sym / symmetry) * Math.PI * 2

      for (let seg = 0; seg < segments; seg++) {
        const segAngle = (seg / segments) * (Math.PI / symmetry)
        const angle = symAngle + segAngle
        const distance = baseRadius + (seg * 4)

        const width = 5
        const depth = 3 + layer
        const geometry = new THREE.BoxGeometry(width, 1, depth)

        const colorIndex = (seg / segments + layer * 0.15) % 1
        let color
        if (colorIndex < 0.33) {
          color = primaryColor.clone()
        } else if (colorIndex < 0.67) {
          color = new THREE.Color().lerpColors(primaryColor, secondaryColor, (colorIndex - 0.33) / 0.34)
        } else {
          color = new THREE.Color().lerpColors(secondaryColor, accentColor, (colorIndex - 0.67) / 0.33)
        }

        const material = new THREE.MeshPhongMaterial({
          color: color,
          emissive: color.clone().multiplyScalar(0.5),
          emissiveIntensity: 2.0,
          shininess: 100,
          transparent: true,
          opacity: 0.9
        })

        const bar = new THREE.Mesh(geometry, material)
        bar.position.x = Math.cos(angle) * distance
        bar.position.z = Math.sin(angle) * distance
        bar.rotation.y = -angle

        bar.userData = {
          baseAngle: angle,
          distance: distance,
          segment: seg,
          layer: layer,
          baseColor: color.clone(),
          frequencyIndex: Math.floor((seg / segments) * (bufferLength || 1024)),
          colorIndex: colorIndex
        }

        scene.add(bar)
        visualElements.push(bar)
      }
    }
  }
}

// FLOWER - Fixed implementation
const createFlowerPattern = () => {
  const petalCount = 8
  const layers = 25

  for (let layer = 0; layer < layers; layer++) {
    for (let p = 0; p < petalCount; p++) {
      const angle = (p / petalCount) * Math.PI * 2
      const radius = 50 + layer * 8

      const geometry = new THREE.ConeGeometry(5, 15, 8)

      const colorIndex = layer / layers
      let color
      if (colorIndex < 0.5) {
        color = new THREE.Color().lerpColors(primaryColor, secondaryColor, colorIndex * 2)
      } else {
        color = new THREE.Color().lerpColors(secondaryColor, accentColor, (colorIndex - 0.5) * 2)
      }

      const material = new THREE.MeshPhongMaterial({
        color: color,
        emissive: color.clone().multiplyScalar(0.6),
        emissiveIntensity: 2.0,
        transparent: true,
        opacity: 0.85,
        shininess: 100
      })

      const mesh = new THREE.Mesh(geometry, material)
      mesh.position.x = Math.cos(angle) * radius
      mesh.position.z = Math.sin(angle) * radius
      mesh.rotation.z = Math.PI / 2
      mesh.rotation.y = -angle

      mesh.userData = {
        angle,
        radius,
        layer,
        baseColor: color.clone(),
        frequencyIndex: Math.floor((layer / layers) * (bufferLength || 1024)),
        colorIndex: colorIndex
      }

      scene.add(mesh)
      visualElements.push(mesh)
    }
  }
}

// RADIAL BARS
const createRadialBars = () => {
  const barCount = 200
  const radius = 120

  for (let i = 0; i < barCount; i++) {
    const angle = (i / barCount) * Math.PI * 2
    const geometry = new THREE.BoxGeometry(3, 1, 5)

    const colorIndex = i / barCount
    let color
    if (colorIndex < 0.5) {
      color = new THREE.Color().lerpColors(primaryColor, secondaryColor, colorIndex * 2)
    } else {
      color = new THREE.Color().lerpColors(secondaryColor, accentColor, (colorIndex - 0.5) * 2)
    }

    const material = new THREE.MeshPhongMaterial({
      color: color,
      emissive: color.clone().multiplyScalar(0.5),
      emissiveIntensity: 1.8,
      shininess: 120
    })

    const bar = new THREE.Mesh(geometry, material)
    bar.position.x = Math.cos(angle) * radius
    bar.position.z = Math.sin(angle) * radius
    bar.rotation.y = -angle

    bar.userData = {
      angle,
      baseColor: color.clone(),
      frequencyIndex: Math.floor((i / barCount) * (bufferLength || 1024)),
      colorIndex: colorIndex
    }

    scene.add(bar)
    visualElements.push(bar)
  }
}

// TUNNEL
const createTunnel = () => {
  const rings = 40
  const segments = 64

  for (let ring = 0; ring < rings; ring++) {
    for (let seg = 0; seg < segments; seg++) {
      const angle = (seg / segments) * Math.PI * 2
      const radius = 70 - ring * 0.8
      const z = -ring * 20

      const geometry = new THREE.BoxGeometry(4, 4, 4)

      const colorIndex = ring / rings
      let color
      if (colorIndex < 0.5) {
        color = new THREE.Color().lerpColors(primaryColor, secondaryColor, colorIndex * 2)
      } else {
        color = new THREE.Color().lerpColors(secondaryColor, accentColor, (colorIndex - 0.5) * 2)
      }

      const material = new THREE.MeshPhongMaterial({
        color: color,
        emissive: color.clone().multiplyScalar(0.7),
        emissiveIntensity: 2.0,
        transparent: true,
        opacity: 0.8 - colorIndex * 0.3
      })

      const box = new THREE.Mesh(geometry, material)
      box.position.x = Math.cos(angle) * radius
      box.position.y = Math.sin(angle) * radius
      box.position.z = z

      box.userData = {
        ring,
        angle,
        baseColor: color.clone(),
        frequencyIndex: Math.floor((seg / segments) * (bufferLength || 1024)),
        colorIndex: colorIndex
      }

      scene.add(box)
      visualElements.push(box)
    }
  }
}

// WAVES - Slower and smoother
const createWaves = () => {
  const waveCount = 50
  const points = 120

  for (let w = 0; w < waveCount; w++) {
    const pts = []
    const radius = 40 + w * 3

    for (let i = 0; i <= points; i++) {
      const angle = (i / points) * Math.PI * 2
      pts.push(new THREE.Vector3(
        Math.cos(angle) * radius,
        0,
        Math.sin(angle) * radius
      ))
    }

    const curve = new THREE.CatmullRomCurve3(pts)
    curve.closed = true
    const tubeGeometry = new THREE.TubeGeometry(curve, points, 1.5, 8, true)

    const colorIndex = w / waveCount
    let color
    if (colorIndex < 0.5) {
      color = new THREE.Color().lerpColors(primaryColor, secondaryColor, colorIndex * 2)
    } else {
      color = new THREE.Color().lerpColors(secondaryColor, accentColor, (colorIndex - 0.5) * 2)
    }

    const material = new THREE.MeshPhongMaterial({
      color: color,
      emissive: color.clone().multiplyScalar(0.6),
      emissiveIntensity: 2.0,
      transparent: true,
      opacity: 0.9
    })

    const tube = new THREE.Mesh(tubeGeometry, material)
    tube.rotation.x = Math.PI / 2

    tube.userData = {
      wave: w,
      baseY: (w - waveCount / 2) * 4,
      baseColor: color.clone(),
      frequencyIndex: Math.floor((w / waveCount) * (bufferLength || 1024)),
      phaseOffset: w * 0.15,
      colorIndex: colorIndex
    }

    tube.position.y = tube.userData.baseY

    scene.add(tube)
    visualElements.push(tube)
  }
}

const getAudioData = () => {
  if (!analyser || !dataArray || !props.isPlaying) {
    const time = Date.now() * animationSpeed * 0.001
    if (Math.random() < 0.01 * animationSpeed) {
      beatIntensity = 1.0
    }
    beatIntensity *= 0.94
    return null
  }

  analyser.getByteFrequencyData(dataArray)

  const bass = dataArray.slice(0, Math.floor(bufferLength * 0.1))
  const bassLevel = bass.reduce((a, b) => a + b, 0) / bass.length / 255

  if (bassLevel > 0.7 && beatIntensity < 0.5) {
    beatIntensity = 1.0
  }
  beatIntensity *= 0.94

  return dataArray
}

const animate = () => {
  animationId = requestAnimationFrame(animate)

  const audioData = getAudioData()
  const time = Date.now() * 0.0002 * animationSpeed

  switch(props.visualizationMode) {
    case 'kaleidosync':
      updateKaleidosync(audioData, time)
      break
    case 'flower':
      updateFlowerPattern(audioData, time)
      break
    case 'bars':
      updateRadialBars(audioData, time)
      break
    case 'tunnel':
      updateTunnel(audioData, time)
      break
    case 'waves':
      updateWaves(audioData, time)
      break
  }

  renderer.render(scene, camera)
}

const updateKaleidosync = (audioData, time) => {
  visualElements.forEach((bar) => {
    let intensity = 0.5

    if (audioData) {
      const freqValue = audioData[bar.userData.frequencyIndex] / 255
      intensity = freqValue * 3 + 0.3
    } else {
      intensity = Math.abs(Math.sin(time * 2 + bar.userData.segment * 0.5)) + 0.3
    }

    intensity += beatIntensity * 1.5

    const targetHeight = intensity * 40
    bar.scale.y = THREE.MathUtils.lerp(bar.scale.y || 1, targetHeight, 0.2)
    bar.position.y = (bar.scale.y - 1) / 2

    bar.rotation.y = -bar.userData.baseAngle + time * 0.15

    const hsl = {}
    bar.userData.baseColor.getHSL(hsl)
    hsl.l = 0.45 + intensity * 0.25
    bar.material.color.setHSL(hsl.h, hsl.s, hsl.l)
    bar.material.emissive.setHSL(hsl.h, hsl.s, hsl.l * 0.6)
    bar.material.emissiveIntensity = 1.8 + intensity
  })

  camera.rotation.z = Math.sin(time * 0.3) * 0.02
}

const updateFlowerPattern = (audioData, time) => {
  visualElements.forEach((petal) => {
    let intensity = 0.5

    if (audioData) {
      const freqValue = audioData[petal.userData.frequencyIndex] / 255
      intensity = freqValue * 2.5 + 0.3
    } else {
      intensity = Math.abs(Math.sin(time * 1.5 + petal.userData.layer * 0.3)) + 0.3
    }

    intensity += beatIntensity * 1.2

    const scale = 1 + intensity * 0.8
    petal.scale.set(scale, scale, scale)

    petal.rotation.y = -petal.userData.angle + time * 0.25

    const hsl = {}
    petal.userData.baseColor.getHSL(hsl)
    hsl.l = 0.5 + intensity * 0.2
    petal.material.color.setHSL(hsl.h, hsl.s, hsl.l)
    petal.material.emissive.setHSL(hsl.h, hsl.s, 0.6)
    petal.material.emissiveIntensity = 2.0 + intensity * 0.7
  })

  camera.position.y = Math.sin(time * 0.4) * 20
  camera.lookAt(0, 0, 0)
}

const updateRadialBars = (audioData, time) => {
  visualElements.forEach((bar) => {
    let intensity = 0.5

    if (audioData) {
      const freqValue = audioData[bar.userData.frequencyIndex] / 255
      intensity = freqValue * 4 + 0.3
    } else {
      intensity = Math.abs(Math.sin(time * 2 + bar.userData.angle * 10)) + 0.3
    }

    intensity += beatIntensity * 2

    const targetHeight = intensity * 50
    bar.scale.y = THREE.MathUtils.lerp(bar.scale.y || 1, targetHeight, 0.2)
    bar.position.y = (bar.scale.y - 1) / 2

    const hsl = {}
    bar.userData.baseColor.getHSL(hsl)
    hsl.l = 0.5 + intensity * 0.2
    bar.material.color.setHSL(hsl.h, hsl.s, hsl.l)
    bar.material.emissive.setHSL(hsl.h, hsl.s, 0.5)
    bar.material.emissiveIntensity = 1.5 + intensity
  })
}

const updateTunnel = (audioData, time) => {
  visualElements.forEach((box) => {
    let intensity = 0.5

    if (audioData) {
      const freqValue = audioData[box.userData.frequencyIndex] / 255
      intensity = freqValue * 2 + 0.3
    } else {
      intensity = Math.abs(Math.sin(time * 1.5 + box.userData.ring * 0.5)) + 0.3
    }

    intensity += beatIntensity * 1.3

    const scale = 1 + intensity * 0.6
    box.scale.set(scale, scale, scale)

    box.rotation.z += 0.008 * (1 + intensity)

    const hsl = {}
    box.userData.baseColor.getHSL(hsl)
    hsl.l = 0.4 + intensity * 0.3
    box.material.color.setHSL(hsl.h, hsl.s, hsl.l)
    box.material.emissive.setHSL(hsl.h, hsl.s, 0.6)
    box.material.emissiveIntensity = 2.0 + intensity
  })

  camera.position.z = 300 + Math.sin(time * 0.5) * 30
}

const updateWaves = (audioData, time) => {
  visualElements.forEach((tube) => {
    let intensity = 0.5

    if (audioData) {
      const freqValue = audioData[tube.userData.frequencyIndex] / 255
      intensity = freqValue * 3 + 0.2
    } else {
      intensity = Math.abs(Math.sin(time * 1.2 + tube.userData.wave * 0.2)) + 0.2
    }

    intensity += beatIntensity * 1.5

    const scale = 1 + intensity * 0.5
    tube.scale.set(scale, scale, 1)

    // SLOWER wave motion
    const wave = Math.sin(time * 1.2 + tube.userData.phaseOffset) * intensity * 10
    tube.position.y = tube.userData.baseY + wave

    // SLOWER rotation
    tube.rotation.z += 0.002 * (0.5 + intensity * 0.3)

    const hsl = {}
    tube.userData.baseColor.getHSL(hsl)
    hsl.l = 0.4 + intensity * 0.3
    tube.material.color.setHSL(hsl.h, hsl.s, hsl.l)
    tube.material.emissive.setHSL(hsl.h, hsl.s, 0.6)
    tube.material.emissiveIntensity = 1.8 + intensity * 0.9
  })

  camera.position.z = 300 + Math.sin(time * 0.5) * 25
}

const onWindowResize = () => {
  const width = canvas.value.clientWidth
  const height = canvas.value.clientHeight

  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height)
}
</script>

<style scoped>
.glass-panel {
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}

.control-btn-small {
  @apply w-10 h-10 rounded-full bg-white bg-opacity-10 hover:bg-opacity-20
         flex items-center justify-center transition-all duration-200
         hover:scale-110 text-white;
}

.control-btn-large {
  @apply w-14 h-14 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30
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
