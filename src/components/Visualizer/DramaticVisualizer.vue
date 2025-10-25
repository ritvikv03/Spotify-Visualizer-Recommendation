<template>
  <div
    class="relative w-full h-full bg-black overflow-hidden"
    @mousemove="handleMouseMove"
  >
    <canvas ref="canvas" class="w-full h-full"></canvas>

    <!-- Now Playing Card & Controls (Bottom Right) -->
    <transition name="slide-fade">
      <div
        v-if="currentTrack && showNowPlaying"
        class="absolute bottom-6 right-6 z-20 glass-panel p-4 w-80"
      >
        <div class="flex items-start gap-3 mb-4">
          <img
            v-if="currentTrack.album?.images?.[0]?.url"
            :src="currentTrack.album.images[0].url"
            alt="Album art"
            class="w-16 h-16 rounded-lg shadow-2xl flex-shrink-0"
          />
          <div class="flex-1 min-w-0">
            <h3 class="text-sm font-bold truncate text-white">{{ currentTrack.name }}</h3>
            <p class="text-xs text-gray-300 truncate">{{ currentTrack.artists?.map(a => a.name).join(', ') }}</p>
            <p v-if="currentTrack.album?.name" class="text-xs text-gray-400 truncate mt-1">{{ currentTrack.album.name }}</p>
          </div>
        </div>

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

let scene, camera, renderer, shaderMaterial, plane
let animationId = null
let audioContext, analyser, dataArray, bufferLength
let animationSpeed = 1.0
let audioTexture = null

// Theme colors
let primaryColor = new THREE.Color(0x8B5CF6)
let secondaryColor = new THREE.Color(0x06B6D4)
let accentColor = new THREE.Color(0xEF4444)

// Kaleidoscope shader
const kaleidoscopeVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const kaleidoscopeFragmentShader = `
  uniform float uTime;
  uniform vec2 uResolution;
  uniform sampler2D uAudioData;
  uniform vec3 uColor1;
  uniform vec3 uColor2;
  uniform vec3 uColor3;
  uniform float uVolume;
  uniform float uBass;
  uniform float uMid;
  uniform float uTreble;

  varying vec2 vUv;

  #define PI 3.14159265359
  #define SEGMENTS 12.0

  float pattern(vec2 uv, float time) {
    vec2 center = vec2(0.5);
    vec2 pos = uv - center;

    float angle = atan(pos.y, pos.x);
    float radius = length(pos);

    // Mirror effect for kaleidoscope
    float segment = PI * 2.0 / SEGMENTS;
    angle = mod(angle, segment);
    angle = abs(angle - segment * 0.5);

    // Audio reactivity
    float audioSample = texture2D(uAudioData, vec2(radius, 0.5)).r;

    // Create patterns
    float pattern1 = sin(angle * 8.0 + time + radius * 20.0) * 0.5 + 0.5;
    float pattern2 = cos(radius * 30.0 - time * 2.0) * 0.5 + 0.5;
    float pattern3 = sin(angle * 16.0 - radius * 15.0 + time) * 0.5 + 0.5;

    // Combine with audio
    float value = pattern1 * pattern2 * pattern3;
    value *= (1.0 + audioSample * uVolume * 2.0);

    return value;
  }

  void main() {
    vec2 uv = vUv;
    uv = uv * 2.0 - 1.0;
    uv.x *= uResolution.x / uResolution.y;

    float pat = pattern(uv * 0.5 + 0.5, uTime * 0.3);

    // Color mixing based on position and audio
    vec3 color1 = mix(uColor1, uColor2, pat);
    vec3 color2 = mix(uColor2, uColor3, sin(uTime * 0.5) * 0.5 + 0.5);
    vec3 finalColor = mix(color1, color2, uBass * 0.5);

    // Add glow
    float glow = pat * (1.0 + uVolume);
    finalColor += glow * 0.3;

    gl_FragColor = vec4(finalColor, 1.0);
  }
`

const tunnelFragmentShader = `
  uniform float uTime;
  uniform vec2 uResolution;
  uniform sampler2D uAudioData;
  uniform vec3 uColor1;
  uniform vec3 uColor2;
  uniform vec3 uColor3;
  uniform float uVolume;

  varying vec2 vUv;

  #define PI 3.14159265359

  void main() {
    vec2 uv = vUv * 2.0 - 1.0;
    uv.x *= uResolution.x / uResolution.y;

    float angle = atan(uv.y, uv.x);
    float radius = length(uv);

    // Tunnel effect
    float tunnel = 1.0 / radius;
    tunnel -= uTime * 0.5;

    // Audio reactivity
    float audioSample = texture2D(uAudioData, vec2(fract(tunnel), 0.5)).r;

    // Rings
    float rings = sin(tunnel * 10.0 + angle * 8.0) * 0.5 + 0.5;
    rings *= (1.0 + audioSample * uVolume);

    // Color
    vec3 color = mix(uColor1, uColor2, rings);
    color = mix(color, uColor3, sin(uTime + tunnel) * 0.5 + 0.5);

    // Vignette
    float vignette = 1.0 - radius * 0.5;
    color *= vignette;

    gl_FragColor = vec4(color, 1.0);
  }
`

const waveFragmentShader = `
  uniform float uTime;
  uniform vec2 uResolution;
  uniform sampler2D uAudioData;
  uniform vec3 uColor1;
  uniform vec3 uColor2;
  uniform vec3 uColor3;
  uniform float uVolume;
  uniform float uBass;

  varying vec2 vUv;

  #define PI 3.14159265359

  void main() {
    vec2 uv = vUv;

    // Create waves
    float wave1 = sin(uv.x * 10.0 + uTime * 0.5) * 0.1;
    float wave2 = sin(uv.x * 15.0 - uTime * 0.7) * 0.08;
    float wave3 = sin(uv.x * 20.0 + uTime * 0.3) * 0.06;

    // Audio reactivity
    float audioSample = texture2D(uAudioData, vec2(uv.x, 0.5)).r;

    // Combine waves
    float y = uv.y + wave1 + wave2 + wave3;
    y += audioSample * uBass * 0.3;

    // Create bands
    float bands = abs(fract(y * 8.0) - 0.5) * 2.0;
    bands = smoothstep(0.0, 0.1, bands);

    // Color
    vec3 color = mix(uColor1, uColor2, uv.x);
    color = mix(color, uColor3, sin(uTime * 0.5 + uv.y * PI) * 0.5 + 0.5);
    color *= (1.0 - bands) * (1.0 + uVolume * 0.5);

    gl_FragColor = vec4(color, 1.0);
  }
`

const flowerFragmentShader = `
  uniform float uTime;
  uniform vec2 uResolution;
  uniform sampler2D uAudioData;
  uniform vec3 uColor1;
  uniform vec3 uColor2;
  uniform vec3 uColor3;
  uniform float uVolume;
  uniform float uMid;

  varying vec2 vUv;

  #define PI 3.14159265359
  #define PETALS 8.0

  void main() {
    vec2 uv = vUv * 2.0 - 1.0;
    uv.x *= uResolution.x / uResolution.y;

    float angle = atan(uv.y, uv.x);
    float radius = length(uv);

    // Petal shape
    float petal = abs(sin(angle * PETALS * 0.5)) * 0.5 + 0.5;
    petal = pow(petal, 2.0);

    // Audio reactivity
    float audioSample = texture2D(uAudioData, vec2(radius, 0.5)).r;

    // Layers
    float layers = sin(radius * 15.0 - uTime) * 0.5 + 0.5;
    layers *= petal;
    layers *= (1.0 + audioSample * uMid * 2.0);

    // Rotate
    float rotation = uTime * 0.2;

    // Color
    vec3 color = mix(uColor1, uColor2, layers);
    color = mix(color, uColor3, radius);
    color *= (1.0 + uVolume * 0.3);

    // Fade edges
    float fade = 1.0 - smoothstep(0.5, 1.0, radius);
    color *= fade;

    gl_FragColor = vec4(color, 1.0);
  }
`

const barsFragmentShader = `
  uniform float uTime;
  uniform vec2 uResolution;
  uniform sampler2D uAudioData;
  uniform vec3 uColor1;
  uniform vec3 uColor2;
  uniform vec3 uColor3;
  uniform float uVolume;

  varying vec2 vUv;

  #define PI 3.14159265359
  #define BARS 64.0

  void main() {
    vec2 uv = vUv * 2.0 - 1.0;
    uv.x *= uResolution.x / uResolution.y;

    float angle = atan(uv.y, uv.x) + PI;
    float radius = length(uv);

    // Bar index
    float barIndex = floor(angle / (PI * 2.0) * BARS);
    float barPos = barIndex / BARS;

    // Audio data for this bar
    float audioSample = texture2D(uAudioData, vec2(barPos, 0.5)).r;
    float barHeight = audioSample * uVolume * 0.8 + 0.2;

    // Create bar
    float bar = step(radius, barHeight * 0.5);
    bar *= 1.0 - step(radius, 0.1);

    // Color based on position
    vec3 color = mix(uColor1, uColor2, barPos);
    color = mix(color, uColor3, audioSample);
    color *= bar;

    // Add glow
    float glow = exp(-radius * 2.0) * audioSample;
    color += glow * uColor2 * 0.5;

    gl_FragColor = vec4(color, 1.0);
  }
`

const shaders = {
  kaleidosync: kaleidoscopeFragmentShader,
  tunnel: tunnelFragmentShader,
  waves: waveFragmentShader,
  flower: flowerFragmentShader,
  bars: barsFragmentShader
}

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
  if (audioTexture) audioTexture.dispose()
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

watch(() => props.visualizationMode, (newMode) => {
  updateShader(newMode)
})

watch(() => props.theme, (theme) => {
  if (theme && shaderMaterial) {
    updateThemeColors(theme)
  }
}, { deep: true, immediate: true })

const initThreeJS = () => {
  scene = new THREE.Scene()

  const aspect = canvas.value.clientWidth / canvas.value.clientHeight
  camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)

  renderer = new THREE.WebGLRenderer({
    canvas: canvas.value,
    antialias: false,
    alpha: false,
    powerPreference: 'high-performance'
  })
  renderer.setSize(canvas.value.clientWidth, canvas.value.clientHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

  // Create audio texture
  audioTexture = new THREE.DataTexture(
    new Uint8Array(512 * 1),
    512,
    1,
    THREE.RedFormat
  )
  audioTexture.needsUpdate = true

  // Create shader material
  updateShader(props.visualizationMode)
  updateThemeColors(props.theme)

  // Create plane
  const geometry = new THREE.PlaneGeometry(2, 2)
  plane = new THREE.Mesh(geometry, shaderMaterial)
  scene.add(plane)

  window.addEventListener('resize', onWindowResize)
}

const updateShader = (mode) => {
  const fragmentShader = shaders[mode] || shaders.kaleidosync

  shaderMaterial = new THREE.ShaderMaterial({
    vertexShader: kaleidoscopeVertexShader,
    fragmentShader: fragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(canvas.value.clientWidth, canvas.value.clientHeight) },
      uAudioData: { value: audioTexture },
      uColor1: { value: primaryColor },
      uColor2: { value: secondaryColor },
      uColor3: { value: accentColor },
      uVolume: { value: 0 },
      uBass: { value: 0 },
      uMid: { value: 0 },
      uTreble: { value: 0 }
    }
  })

  if (plane) {
    plane.material.dispose()
    plane.material = shaderMaterial
  }
}

const updateThemeColors = (theme) => {
  if (!theme) return

  primaryColor = new THREE.Color(theme.primary || '#8B5CF6')
  secondaryColor = new THREE.Color(theme.accent || '#06B6D4')
  accentColor = new THREE.Color(theme.textSecondary || '#EF4444')

  if (shaderMaterial) {
    shaderMaterial.uniforms.uColor1.value = primaryColor
    shaderMaterial.uniforms.uColor2.value = secondaryColor
    shaderMaterial.uniforms.uColor3.value = accentColor
  }
}

const initAudio = async () => {
  try {
    audioContext = new (window.AudioContext || window.webkitAudioContext)()
    analyser = audioContext.createAnalyser()
    analyser.fftSize = 1024
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

const animate = () => {
  animationId = requestAnimationFrame(animate)

  const time = performance.now() * 0.001 * animationSpeed

  if (shaderMaterial) {
    shaderMaterial.uniforms.uTime.value = time

    if (analyser && dataArray && props.isPlaying) {
      analyser.getByteFrequencyData(dataArray)

      // Update audio texture
      const audioData = new Uint8Array(512)
      for (let i = 0; i < 512; i++) {
        const index = Math.floor((i / 512) * bufferLength)
        audioData[i] = dataArray[index]
      }
      audioTexture.image.data = audioData
      audioTexture.needsUpdate = true

      // Calculate audio levels
      const bass = dataArray.slice(0, Math.floor(bufferLength * 0.15))
      const mid = dataArray.slice(Math.floor(bufferLength * 0.15), Math.floor(bufferLength * 0.5))
      const treble = dataArray.slice(Math.floor(bufferLength * 0.5), bufferLength)

      const bassLevel = bass.reduce((a, b) => a + b, 0) / bass.length / 255
      const midLevel = mid.reduce((a, b) => a + b, 0) / mid.length / 255
      const trebleLevel = treble.reduce((a, b) => a + b, 0) / treble.length / 255
      const volume = (bassLevel + midLevel + trebleLevel) / 3

      shaderMaterial.uniforms.uVolume.value = volume
      shaderMaterial.uniforms.uBass.value = bassLevel
      shaderMaterial.uniforms.uMid.value = midLevel
      shaderMaterial.uniforms.uTreble.value = trebleLevel
    } else {
      // Procedural fallback
      const t = time * 0.5
      shaderMaterial.uniforms.uVolume.value = Math.abs(Math.sin(t)) * 0.5 + 0.3
      shaderMaterial.uniforms.uBass.value = Math.abs(Math.sin(t * 1.3)) * 0.5 + 0.3
      shaderMaterial.uniforms.uMid.value = Math.abs(Math.sin(t * 1.7)) * 0.5 + 0.3
      shaderMaterial.uniforms.uTreble.value = Math.abs(Math.sin(t * 2.1)) * 0.5 + 0.3
    }
  }

  renderer.render(scene, camera)
}

const onWindowResize = () => {
  const width = canvas.value.clientWidth
  const height = canvas.value.clientHeight

  renderer.setSize(width, height)

  if (shaderMaterial) {
    shaderMaterial.uniforms.uResolution.value.set(width, height)
  }
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
