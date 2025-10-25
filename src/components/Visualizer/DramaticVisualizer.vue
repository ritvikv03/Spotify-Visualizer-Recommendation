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

// Audio analysis data (from Spotify API)
let audioAnalysis = null
let playbackInterval = null
let currentProgress = 0
let currentBeat = null
let currentBar = null
let currentSection = null

// Theme colors - will be gradients
let primaryColor = new THREE.Color(0x8B5CF6)
let secondaryColor = new THREE.Color(0x06B6D4)
let accentColor = new THREE.Color(0xEF4444)
let gradientColors = []

// Generate gradient palette from a base color
const generateGradientPalette = (baseColor, steps = 5) => {
  const palette = []
  const color = new THREE.Color(baseColor)

  // Get HSL values
  const hsl = { h: 0, s: 0, l: 0 }
  color.getHSL(hsl)

  // Generate gradient from dark to light
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1)
    // Vary lightness from 0.2 (dark) to 0.8 (light)
    const lightness = 0.2 + t * 0.6
    // Slightly vary saturation for richness
    const saturation = hsl.s * (0.85 + t * 0.15)

    const gradColor = new THREE.Color()
    gradColor.setHSL(hsl.h, saturation, lightness)
    palette.push(gradColor)
  }

  return palette
}

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
  uniform float uBeatIntensity;
  uniform float uBarProgress;
  uniform float uSectionProgress;

  varying vec2 vUv;

  #define PI 3.14159265359
  #define TWO_PI 6.28318530718
  #define SEGMENTS 12.0
  #define LAYERS 4

  // Rotation matrix
  mat2 rotate2D(float angle) {
    float s = sin(angle);
    float c = cos(angle);
    return mat2(c, -s, s, c);
  }

  // Hash function for pseudo-random values
  float hash(float n) {
    return fract(sin(n) * 43758.5453123);
  }

  // Multi-layered kaleidoscope pattern
  float kaleidoscopeLayer(vec2 uv, float time, float layer, float beatPulse) {
    float angle = atan(uv.y, uv.x);
    float radius = length(uv);

    // Kaleidoscope mirror effect
    float segment = TWO_PI / SEGMENTS;
    angle = mod(angle + time * 0.1 * layer, segment);
    angle = abs(angle - segment * 0.5);

    // Reconstruct position with mirrored angle
    vec2 p = vec2(cos(angle), sin(angle)) * radius;

    // Layer-specific rotation with beat sync
    p = rotate2D(time * 0.2 * layer + uBarProgress * TWO_PI) * p;

    // Complex pattern combining multiple frequencies
    float pattern = 0.0;

    // Primary pattern - scales with beats
    pattern += sin(p.x * (10.0 + layer * 5.0) * beatPulse + time) * 0.5;
    pattern += cos(p.y * (15.0 + layer * 3.0) * beatPulse - time * 1.5) * 0.5;

    // Secondary pattern - creates depth
    pattern += sin((p.x + p.y) * (20.0 + layer * 7.0) + time * 2.0) * 0.3;
    pattern += cos((p.x - p.y) * (12.0 + layer * 4.0) - time * 1.3) * 0.3;

    // Radial pattern - pulses from center
    pattern += sin(radius * (30.0 + layer * 10.0) * beatPulse - time * 3.0) * 0.4;

    // Angular pattern - creates star-like shapes
    pattern += cos(angle * (16.0 + layer * 4.0) + time + radius * 10.0) * 0.3;

    return pattern;
  }

  void main() {
    vec2 uv = (vUv * 2.0 - 1.0);
    uv.x *= uResolution.x / uResolution.y;

    float radius = length(uv);

    // Get audio data
    float audioSample = texture2D(uAudioData, vec2(radius * 0.5, 0.5)).r;

    // Beat-reactive scaling
    float beatPulse = 1.0 + uBeatIntensity * 0.8;
    float beatZoom = 1.0 + uBeatIntensity * 0.15;
    uv /= beatZoom;

    // Accumulate multiple layers
    float pattern = 0.0;
    float totalWeight = 0.0;

    for (int i = 0; i < LAYERS; i++) {
      float layer = float(i);
      float weight = 1.0 - (layer / float(LAYERS)) * 0.3;

      pattern += kaleidoscopeLayer(uv, uTime * (0.5 + layer * 0.1), layer, beatPulse) * weight;
      totalWeight += weight;
    }

    pattern /= totalWeight;
    pattern = pattern * 0.5 + 0.5; // Normalize to 0-1

    // Audio reactivity
    pattern *= (1.0 + audioSample * uVolume * 1.5 + uBeatIntensity * 0.5);

    // Multi-color gradient based on pattern
    vec3 color1 = mix(uColor1, uColor2, pattern);
    vec3 color2 = mix(uColor2, uColor3, sin(uTime * 0.3 + uSectionProgress * TWO_PI) * 0.5 + 0.5);
    vec3 color3 = mix(uColor1, uColor3, cos(uTime * 0.4 - radius * 2.0) * 0.5 + 0.5);

    // Complex color mixing
    vec3 finalColor = mix(color1, color2, uBass * 0.6 + uBeatIntensity * 0.4);
    finalColor = mix(finalColor, color3, uMid * 0.3);

    // Beat-reactive glow
    float glow = pow(pattern, 2.0) * (1.0 + uVolume * 2.0 + uBeatIntensity);
    finalColor += glow * 0.4;

    // Add highlights on beats
    finalColor += vec3(1.0) * uBeatIntensity * 0.3 * pattern;

    // Vignette for focus
    float vignette = 1.0 - smoothstep(0.6, 1.4, radius);
    finalColor *= vignette * 0.7 + 0.3;

    gl_FragColor = vec4(finalColor, 1.0);
  }
`

const vortexFragmentShader = `
  uniform float uTime;
  uniform vec2 uResolution;
  uniform sampler2D uAudioData;
  uniform vec3 uColor1;
  uniform vec3 uColor2;
  uniform vec3 uColor3;
  uniform float uVolume;
  uniform float uBass;
  uniform float uBeatIntensity;
  uniform float uBarProgress;
  uniform float uSectionProgress;

  varying vec2 vUv;

  #define PI 3.14159265359
  #define TWO_PI 6.28318530718

  void main() {
    vec2 uv = vUv * 2.0 - 1.0;
    uv.x *= uResolution.x / uResolution.y;

    float angle = atan(uv.y, uv.x);
    float radius = length(uv);

    // Beat-reactive zoom into vortex
    float beatZoom = 1.0 + uBeatIntensity * 0.2;
    float depth = 1.0 / (radius * beatZoom + 0.1);

    // Spiral rotation based on depth and time
    float spiralSpeed = uTime * (0.3 + uBass * 0.3);
    float spiral = angle + depth * 0.5 + spiralSpeed + uBarProgress * TWO_PI;

    // Multiple layered spirals
    float vortex = 0.0;

    // Primary spiral arms
    vortex += sin(spiral * 3.0 - depth * 8.0 + uTime) * 0.5 + 0.5;
    vortex += sin(spiral * 5.0 + depth * 12.0 - uTime * 1.3) * 0.3 + 0.5;

    // Secondary details
    vortex += cos(spiral * 8.0 - depth * 16.0 + uTime * 0.7) * 0.2 + 0.5;

    // Audio reactivity
    float audioSample = texture2D(uAudioData, vec2(fract(depth * 0.1), 0.5)).r;
    vortex *= (1.0 + audioSample * uVolume * 1.5 + uBeatIntensity * 0.7);

    // Depth rings - pulse on beats
    float rings = sin(depth * (6.0 + uBeatIntensity * 3.0) - uTime * 2.0) * 0.5 + 0.5;
    vortex *= (0.7 + rings * 0.3);

    // Complex color transitions through the vortex
    float depthGradient = fract(depth * 0.2 + uSectionProgress);
    vec3 color1 = mix(uColor1, uColor2, depthGradient);
    vec3 color2 = mix(uColor2, uColor3, sin(spiral * 0.5) * 0.5 + 0.5);
    vec3 finalColor = mix(color1, color2, vortex);

    // Beat-reactive energy at center
    float centerGlow = exp(-radius * (3.0 - uBeatIntensity * 2.0)) * (1.0 + uBeatIntensity * 2.0);
    finalColor += centerGlow * uColor2;

    // Outer glow on beats
    finalColor += vec3(1.0) * uBeatIntensity * 0.4 * vortex;

    // Depth fog for atmosphere
    float fog = smoothstep(0.0, 2.0, depth) * 0.8;
    finalColor *= (1.0 - fog) + fog * (0.2 + uBeatIntensity * 0.3);

    gl_FragColor = vec4(finalColor, 1.0);
  }
`

const starFieldFragmentShader = `
  uniform float uTime;
  uniform vec2 uResolution;
  uniform sampler2D uAudioData;
  uniform vec3 uColor1;
  uniform vec3 uColor2;
  uniform vec3 uColor3;
  uniform float uVolume;
  uniform float uBass;
  uniform float uTreble;
  uniform float uBeatIntensity;
  uniform float uBarProgress;
  uniform float uSectionProgress;

  varying vec2 vUv;

  #define PI 3.14159265359
  #define LAYERS 5
  #define STARS_PER_LAYER 50.0

  // Hash function for pseudo-random
  vec2 hash22(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return fract(sin(p) * 43758.5453123);
  }

  // Noise function
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = dot(hash22(i + vec2(0.0, 0.0)), f - vec2(0.0, 0.0));
    float b = dot(hash22(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0));
    float c = dot(hash22(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0));
    float d = dot(hash22(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  // Star layer
  float starLayer(vec2 uv, float layer, float time, float beatPulse) {
    float speed = 0.5 + layer * 0.3;
    vec2 offset = vec2(time * speed * 0.1, time * speed * 0.05);
    vec2 p = (uv + offset) * (2.0 + layer * 3.0);

    vec2 cellId = floor(p);
    vec2 cellUv = fract(p);

    float stars = 0.0;

    // Check neighboring cells for stars
    for(float x = -1.0; x <= 1.0; x++) {
      for(float y = -1.0; y <= 1.0; y++) {
        vec2 neighborCell = cellId + vec2(x, y);
        vec2 randomPos = hash22(neighborCell);

        // Star position within cell
        vec2 starPos = vec2(x, y) + randomPos - cellUv;
        float dist = length(starPos);

        // Star size varies with beat
        float starSize = 0.02 + randomPos.x * 0.03;
        starSize *= (1.0 + beatPulse * randomPos.y * 0.5);

        // Star brightness pulses
        float pulse = sin(time * (1.0 + randomPos.x * 2.0) + randomPos.y * 10.0) * 0.5 + 0.5;
        pulse *= (1.0 + beatPulse * randomPos.x);

        // Create star glow
        float star = smoothstep(starSize, 0.0, dist) * pulse;

        // Add sparkle on beats
        star += exp(-dist * 20.0) * beatPulse * randomPos.y * 0.5;

        stars += star;
      }
    }

    return stars;
  }

  void main() {
    vec2 uv = (vUv * 2.0 - 1.0);
    uv.x *= uResolution.x / uResolution.y;

    // Audio reactivity
    float audioSample = texture2D(uAudioData, vec2(length(uv) * 0.5, 0.5)).r;
    float beatPulse = uBeatIntensity;

    // Accumulate star layers
    float stars = 0.0;
    vec3 color = vec3(0.0);

    for(int i = 0; i < LAYERS; i++) {
      float layer = float(i);
      float layerDepth = layer / float(LAYERS);

      // Each layer has different speed and size
      float layerStars = starLayer(uv, layer, uTime + uBarProgress, beatPulse);

      // Color varies by layer depth
      vec3 layerColor = mix(
        mix(uColor1, uColor2, layerDepth),
        uColor3,
        sin(uTime * 0.3 + layerDepth * PI + uSectionProgress * PI) * 0.5 + 0.5
      );

      // Layer intensity
      float intensity = (1.0 - layerDepth * 0.5) * (1.0 + audioSample * uVolume);

      color += layerStars * layerColor * intensity;
      stars += layerStars;
    }

    // Nebula background
    float nebula = noise(uv * 2.0 + uTime * 0.1) * 0.5 + 0.5;
    nebula *= noise(uv * 3.0 - uTime * 0.07) * 0.5 + 0.5;
    nebula = pow(nebula, 2.0);

    vec3 nebulaColor = mix(uColor1, uColor2, nebula);
    nebulaColor = mix(nebulaColor, uColor3, uBass);

    color += nebulaColor * nebula * 0.3 * (1.0 + beatPulse * 0.3);

    // Add overall glow on beats
    color += vec3(1.0) * beatPulse * 0.2 * stars;

    // Vignette
    float vignette = 1.0 - smoothstep(0.5, 1.5, length(uv));
    color *= vignette * 0.8 + 0.2;

    gl_FragColor = vec4(color, 1.0);
  }
`

const fractalMandalaFragmentShader = `
  uniform float uTime;
  uniform vec2 uResolution;
  uniform sampler2D uAudioData;
  uniform vec3 uColor1;
  uniform vec3 uColor2;
  uniform vec3 uColor3;
  uniform float uVolume;
  uniform float uMid;
  uniform float uTreble;
  uniform float uBeatIntensity;
  uniform float uBarProgress;
  uniform float uSectionProgress;

  varying vec2 vUv;

  #define PI 3.14159265359
  #define TWO_PI 6.28318530718
  #define ITERATIONS 6

  // Rotation matrix
  mat2 rotate2D(float angle) {
    return mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
  }

  // Fractal function
  float fractalPattern(vec2 p, float time, float beatPulse) {
    float pattern = 0.0;
    float scale = 1.0;

    for(int i = 0; i < ITERATIONS; i++) {
      float iter = float(i);

      // Rotate and scale
      p = rotate2D(time * 0.1 + iter * 0.5 + uBarProgress * PI) * p;
      p *= 1.3 + beatPulse * 0.1;

      // Create symmetric patterns
      p = abs(fract(p) - 0.5);

      // Mandala symmetry
      float angle = atan(p.y, p.x);
      float segments = 8.0 + iter * 2.0;
      float seg = TWO_PI / segments;
      angle = mod(angle, seg);
      angle = abs(angle - seg * 0.5);

      p = vec2(cos(angle), sin(angle)) * length(p);

      // Add to pattern
      float val = sin(p.x * (5.0 + iter * 3.0) + time) * cos(p.y * (7.0 + iter * 2.0) - time * 0.7);
      pattern += val / scale;

      scale *= 2.0;
    }

    return pattern;
  }

  void main() {
    vec2 uv = (vUv * 2.0 - 1.0);
    uv.x *= uResolution.x / uResolution.y;

    float radius = length(uv);
    float angle = atan(uv.y, uv.x);

    // Audio reactivity
    float audioSample = texture2D(uAudioData, vec2(radius * 0.5, 0.5)).r;

    // Beat pulse
    float beatPulse = uBeatIntensity;
    float beatZoom = 1.0 + beatPulse * 0.12;

    // Zoom on beats
    vec2 p = uv / beatZoom;

    // Generate fractal mandala
    float fractal = fractalPattern(p * 2.0, uTime * 0.3, beatPulse);
    fractal = fractal * 0.5 + 0.5;

    // Audio enhancement
    fractal *= (1.0 + audioSample * uVolume * 1.2 + beatPulse * 0.6);

    // Radial gradient
    float radialPattern = sin(radius * (20.0 + beatPulse * 5.0) - uTime * 2.0 + uSectionProgress * TWO_PI) * 0.5 + 0.5;

    // Angular pattern for extra detail
    float angularPattern = sin(angle * (12.0 + beatPulse * 3.0) + uTime) * 0.5 + 0.5;

    // Combine patterns
    float combined = fractal * (0.7 + radialPattern * 0.3) * (0.8 + angularPattern * 0.2);

    // Multi-layered colors
    vec3 color1 = mix(uColor1, uColor2, combined);
    vec3 color2 = mix(uColor2, uColor3, radialPattern);
    vec3 color3 = mix(uColor1, uColor3, sin(uTime * 0.3 + uSectionProgress * PI) * 0.5 + 0.5);

    vec3 finalColor = mix(color1, color2, uMid * 0.5 + beatPulse * 0.3);
    finalColor = mix(finalColor, color3, uTreble * 0.3);

    // Center glow on beats
    float centerGlow = exp(-radius * (4.0 - beatPulse * 2.0)) * (1.0 + beatPulse * 1.5);
    finalColor += centerGlow * uColor2 * 0.6;

    // Beat flash
    finalColor += vec3(1.0) * beatPulse * 0.25 * combined;

    // Edge fade
    float fade = 1.0 - smoothstep(0.7, 1.3, radius);
    finalColor *= fade * 0.6 + 0.4;

    // Subtle vignette
    float vignette = 1.0 - radius * 0.3;
    finalColor *= vignette;

    gl_FragColor = vec4(finalColor, 1.0);
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
  uniform float uBeatIntensity;
  uniform float uBarProgress;

  varying vec2 vUv;

  #define PI 3.14159265359
  #define BARS 64.0

  void main() {
    vec2 uv = vUv * 2.0 - 1.0;
    uv.x *= uResolution.x / uResolution.y;

    // Beat-synchronized rotation
    float rotation = uTime * 0.1 + uBarProgress * 0.3;
    float c = cos(rotation);
    float s = sin(rotation);
    uv = mat2(c, -s, s, c) * uv;

    float angle = atan(uv.y, uv.x) + PI;
    float radius = length(uv);

    // Bar index
    float barIndex = floor(angle / (PI * 2.0) * BARS);
    float barPos = barIndex / BARS;

    // Audio data for this bar
    float audioSample = texture2D(uAudioData, vec2(barPos, 0.5)).r;

    // Beat-reactive bar height
    float barHeight = audioSample * uVolume * (0.8 + uBeatIntensity * 0.3) + 0.2;
    barHeight *= (1.0 + uBeatIntensity * 0.4);

    // Create bar
    float bar = step(radius, barHeight * 0.5);
    bar *= 1.0 - step(radius, 0.1);

    // Beat-synchronized color
    vec3 color = mix(uColor1, uColor2, barPos + uBeatIntensity * 0.2);
    color = mix(color, uColor3, audioSample + uBeatIntensity * 0.3);
    color *= bar;

    // Beat-enhanced glow
    float glow = exp(-radius * 2.0) * audioSample * (1.0 + uBeatIntensity);
    color += glow * uColor2 * 0.5;

    gl_FragColor = vec4(color, 1.0);
  }
`

const shaders = {
  kaleidosync: kaleidoscopeFragmentShader,
  vortex: vortexFragmentShader,
  starfield: starFieldFragmentShader,
  mandala: fractalMandalaFragmentShader,
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
  stopPlaybackSync()
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

watch(() => props.currentTrack, async (track) => {
  if (track && track.id) {
    try {
      // Fetch audio analysis from Spotify
      audioAnalysis = await spotifyService.getAudioAnalysis(track.id)

      if (audioAnalysis && audioAnalysis.beats && audioAnalysis.bars && audioAnalysis.sections) {
        console.log('✓ Audio analysis loaded:', {
          beats: audioAnalysis.beats.length,
          bars: audioAnalysis.bars.length,
          sections: audioAnalysis.sections.length,
          duration: audioAnalysis.track?.duration || 0
        })

        // Start playback position polling
        startPlaybackSync()
      } else {
        console.warn('Audio analysis incomplete, using procedural fallback')
        audioAnalysis = null
      }
    } catch (error) {
      console.error('❌ Error loading audio analysis:', error.message || error)
      audioAnalysis = null
      // Continue with procedural visualization
    }
  } else {
    audioAnalysis = null
    stopPlaybackSync()
  }
})

// Sync playback position with Spotify
const startPlaybackSync = () => {
  stopPlaybackSync()

  // Poll playback position every 100ms for tight sync
  playbackInterval = setInterval(async () => {
    try {
      const playback = await spotifyService.getCurrentPlayback()
      if (playback && playback.item && playback.progress_ms !== undefined) {
        currentProgress = playback.progress_ms / 1000 // Convert to seconds
        updateAudioAnalysisData()
      }
    } catch (error) {
      // Silently fail - might be paused or no active device
    }
  }, 100)
}

const stopPlaybackSync = () => {
  if (playbackInterval) {
    clearInterval(playbackInterval)
    playbackInterval = null
  }
}

// Update current beat, bar, and section based on playback position
const updateAudioAnalysisData = () => {
  if (!audioAnalysis || !audioAnalysis.beats || !audioAnalysis.bars) return

  // Find current beat
  currentBeat = findCurrentInterval(audioAnalysis.beats, currentProgress)

  // Find current bar
  currentBar = findCurrentInterval(audioAnalysis.bars, currentProgress)

  // Find current section
  if (audioAnalysis.sections) {
    currentSection = findCurrentInterval(audioAnalysis.sections, currentProgress)
  }
}

// Find the current interval (beat, bar, or section) based on time
const findCurrentInterval = (intervals, time) => {
  if (!intervals || intervals.length === 0) return null

  for (let i = 0; i < intervals.length; i++) {
    const interval = intervals[i]
    const start = interval.start
    const end = start + interval.duration

    if (time >= start && time < end) {
      // Calculate progress through this interval (0 to 1)
      const progress = (time - start) / interval.duration
      return { ...interval, progress }
    }
  }

  return intervals[intervals.length - 1]
}

// Calculate beat intensity (higher at beat start, decays over time)
const getBeatIntensity = () => {
  if (!currentBeat) return 0

  // Exponential decay from 1.0 at beat start to 0 at beat end
  const progress = currentBeat.progress || 0
  return Math.exp(-progress * 4) // Fast decay
}

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
      uTreble: { value: 0 },
      uBeatIntensity: { value: 0 },
      uBarProgress: { value: 0 },
      uSectionProgress: { value: 0 }
    }
  })

  if (plane) {
    plane.material.dispose()
    plane.material = shaderMaterial
  }
}

const updateThemeColors = (theme) => {
  // Use default color if no theme provided
  const baseColor = theme?.primary || '#8B5CF6'

  // Generate full gradient palettes from theme colors
  gradientColors = generateGradientPalette(baseColor, 7)

  // Set initial colors from gradient
  primaryColor = gradientColors[0].clone()
  secondaryColor = gradientColors[3].clone()
  accentColor = gradientColors[5].clone()

  if (shaderMaterial) {
    shaderMaterial.uniforms.uColor1.value = primaryColor
    shaderMaterial.uniforms.uColor2.value = secondaryColor
    shaderMaterial.uniforms.uColor3.value = accentColor
  }

  console.log('✓ Theme colors updated:', { baseColor, gradientSteps: gradientColors.length })
}

// Cycle through gradient colors dynamically
const updateGradientCycle = (time) => {
  if (gradientColors.length === 0) return

  // Cycle through gradient based on time and music
  const cycleSpeed = 0.15
  const t = (time * cycleSpeed) % 1.0

  // Use section progress to influence color selection
  const sectionInfluence = currentSection ? currentSection.progress * 0.3 : 0
  const combinedT = (t + sectionInfluence) % 1.0

  // Get indices for color interpolation
  const index1 = Math.floor(combinedT * (gradientColors.length - 1))
  const index2 = (index1 + 1) % gradientColors.length
  const index3 = (index1 + 3) % gradientColors.length

  const localT = (combinedT * (gradientColors.length - 1)) % 1.0

  // Smoothly interpolate between gradient colors
  primaryColor.copy(gradientColors[index1]).lerp(gradientColors[index2], localT)
  secondaryColor.copy(gradientColors[index2]).lerp(gradientColors[index3], localT)
  accentColor.copy(gradientColors[index3]).lerp(gradientColors[index1], localT)

  // Apply to shader
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

    // Update beat/bar/section sync uniforms
    if (props.isPlaying && audioAnalysis) {
      const beatIntensity = getBeatIntensity()
      const barProgress = currentBar ? currentBar.progress : 0
      const sectionProgress = currentSection ? currentSection.progress : 0

      shaderMaterial.uniforms.uBeatIntensity.value = beatIntensity
      shaderMaterial.uniforms.uBarProgress.value = barProgress
      shaderMaterial.uniforms.uSectionProgress.value = sectionProgress
    } else {
      // Fallback to procedural beat simulation
      const t = time * 0.5
      shaderMaterial.uniforms.uBeatIntensity.value = Math.abs(Math.sin(t * 2)) * 0.5
      shaderMaterial.uniforms.uBarProgress.value = (t % 2.0) / 2.0
      shaderMaterial.uniforms.uSectionProgress.value = (t % 8.0) / 8.0
    }

    // Update gradient color cycling for dynamic theme experience
    updateGradientCycle(time)
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
