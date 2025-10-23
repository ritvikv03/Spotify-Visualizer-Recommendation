<template>
  <div class="relative w-full bg-black rounded-lg overflow-hidden shadow-2xl" style="height: 600px;">
    <!-- Three.js Canvas -->
    <canvas ref="canvas" class="w-full h-full"></canvas>
    
    <!-- Controls Overlay -->
    <div class="absolute top-4 left-4 z-10 space-y-2">
      <div class="glass-effect px-4 py-2 rounded-lg">
        <h3 class="text-sm font-bold mb-2 text-spotify-green">🌌 Cosmic Mode</h3>
        <div class="flex flex-col gap-2">
          <button 
            v-for="mode in visualizerModes" 
            :key="mode.id"
            @click="currentMode = mode.id"
            :class="currentMode === mode.id ? 'bg-spotify-green text-black' : 'bg-spotify-gray text-white'"
            class="px-3 py-1 rounded text-xs font-semibold hover:scale-105 transition-transform"
          >
            {{ mode.icon }} {{ mode.name }}
          </button>
        </div>
      </div>
      
      <div v-if="isPlaying" class="glass-effect px-4 py-2 rounded-lg">
        <div class="text-xs space-y-1">
          <div class="flex justify-between">
            <span class="text-gray-400">Bass</span>
            <div class="w-20 h-2 bg-spotify-dark rounded-full overflow-hidden">
              <div class="h-full bg-red-500" :style="`width: ${bassLevel * 100}%`"></div>
            </div>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-400">Mid</span>
            <div class="w-20 h-2 bg-spotify-dark rounded-full overflow-hidden">
              <div class="h-full bg-green-500" :style="`width: ${midLevel * 100}%`"></div>
            </div>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-400">Treble</span>
            <div class="w-20 h-2 bg-spotify-dark rounded-full overflow-hidden">
              <div class="h-full bg-blue-500" :style="`width: ${trebleLevel * 100}%`"></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Info Overlay -->
    <div v-if="!isPlaying" class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm pointer-events-none">
      <div class="text-center">
        <div class="text-6xl mb-4 animate-pulse">🌌</div>
        <p class="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-cyan-500">
          Enter The Music Cosmos
        </p>
        <p class="text-sm text-gray-400 mt-2">Play a track to unlock the universe</p>
      </div>
    </div>

    <!-- Artist Info Tooltip -->
    <div v-if="hoveredArtist" class="absolute bottom-4 left-1/2 transform -translate-x-1/2 glass-effect px-6 py-3 rounded-lg">
      <p class="text-sm font-bold">{{ hoveredArtist.name }}</p>
      <p class="text-xs text-gray-400">{{ hoveredArtist.genre }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as THREE from 'three'

const props = defineProps({
  isPlaying: Boolean,
  tracks: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['play-track'])

const canvas = ref(null)
const currentMode = ref('galaxy')
const hoveredArtist = ref(null)
const bassLevel = ref(0)
const midLevel = ref(0)
const trebleLevel = ref(0)

const visualizerModes = [
  { id: 'galaxy', name: 'Galaxy', icon: '🌌' },
  { id: 'dna', name: 'DNA Helix', icon: '🧬' },
  { id: 'quantum', name: 'Quantum', icon: '⚛️' },
  { id: 'tunnel', name: 'Time Tunnel', icon: '🕰️' },
  { id: 'chaos', name: 'CHAOS', icon: '🌀' }
]

let scene, camera, renderer, raycaster, mouse
let animationId = null
let audioContext, analyser, dataArray, bufferLength

// Scene objects
let galaxyStars = []
let dnaHelix = { strand1: [], strand2: [], connections: [] }
let quantumParticles = []
let tunnelRings = []

// Mouse handling
raycaster = new THREE.Raycaster()
mouse = new THREE.Vector2()

onMounted(() => {
  initThreeJS()
  initAudio()
  animate()
  
  // Add mouse events
  canvas.value.addEventListener('mousemove', onMouseMove)
  canvas.value.addEventListener('click', onMouseClick)
})

onUnmounted(() => {
  if (animationId) cancelAnimationFrame(animationId)
  if (renderer) renderer.dispose()
  if (audioContext) audioContext.close()
  
  // Remove mouse events
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

watch(currentMode, (newMode) => {
  clearScene()
  initMode(newMode)
})

const initThreeJS = () => {
  // Scene
  scene = new THREE.Scene()
  scene.fog = new THREE.FogExp2(0x000000, 0.0008)
  
  // Camera
  camera = new THREE.PerspectiveCamera(
    75,
    canvas.value.clientWidth / canvas.value.clientHeight,
    0.1,
    2000
  )
  camera.position.z = 100
  
  // Renderer
  renderer = new THREE.WebGLRenderer({ 
    canvas: canvas.value, 
    antialias: true,
    alpha: true 
  })
  renderer.setSize(canvas.value.clientWidth, canvas.value.clientHeight)
  renderer.setPixelRatio(window.devicePixelRatio)
  
  // Lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
  scene.add(ambientLight)
  
  const pointLight = new THREE.PointLight(0xffffff, 1)
  pointLight.position.set(50, 50, 50)
  scene.add(pointLight)
  
  // Initialize first mode
  initMode('galaxy')
  
  // Handle resize
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
    
    // Try to get microphone for real audio
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
  // Remove all objects
  while(scene.children.length > 0) { 
    const object = scene.children[0]
    if (object.geometry) object.geometry.dispose()
    if (object.material) object.material.dispose()
    scene.remove(object)
  }
  
  // Re-add lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
  scene.add(ambientLight)
  const pointLight = new THREE.PointLight(0xffffff, 1)
  pointLight.position.set(50, 50, 50)
  scene.add(pointLight)
  
  galaxyStars = []
  quantumParticles = []
  tunnelRings = []
}

const initMode = (mode) => {
  switch(mode) {
    case 'galaxy':
      createGalaxy()
      break
    case 'dna':
      createDNAHelix()
      break
    case 'quantum':
      createQuantumField()
      break
    case 'tunnel':
      createTimeTunnel()
      break
    case 'chaos':
      createGalaxy()
      createDNAHelix()
      createQuantumField()
      break
  }
}

const createGalaxy = () => {
  const starCount = Math.min(props.tracks.length * 3, 1000)
  
  for (let i = 0; i < starCount; i++) {
    const geometry = new THREE.SphereGeometry(Math.random() * 2 + 0.5, 8, 8)
    const hue = Math.random() * 360
    const color = new THREE.Color(`hsl(${hue}, 100%, 60%)`)
    const material = new THREE.MeshBasicMaterial({ 
      color,
      transparent: true,
      opacity: 0.8
    })
    
    const star = new THREE.Mesh(geometry, material)
    
    // Spiral galaxy distribution
    const angle = Math.random() * Math.PI * 2
    const radius = Math.random() * 150 + 20
    const armOffset = (i % 3) * (Math.PI * 2 / 3)
    
    star.position.x = Math.cos(angle + armOffset) * radius
    star.position.y = (Math.random() - 0.5) * 40
    star.position.z = Math.sin(angle + armOffset) * radius
    
    // Assign track data to some stars
    const trackIndex = i % props.tracks.length
    star.userData = {
      originalY: star.position.y,
      speed: Math.random() * 0.01 + 0.001,
      hue: hue,
      track: props.tracks[trackIndex],
      clickable: i < props.tracks.length, // Only first N stars are clickable
      isHovered: false
    }
    
    scene.add(star)
    galaxyStars.push(star)
  }
}

const createDNAHelix = () => {
  const segments = 50
  const radius = 20
  const height = 100
  
  for (let i = 0; i < segments; i++) {
    const t = i / segments
    const angle = t * Math.PI * 8
    const y = (t - 0.5) * height
    
    // Strand 1
    const geometry1 = new THREE.SphereGeometry(1.5, 8, 8)
    const material1 = new THREE.MeshPhongMaterial({ 
      color: 0x00ff88,
      emissive: 0x00ff88,
      emissiveIntensity: 0.5
    })
    const sphere1 = new THREE.Mesh(geometry1, material1)
    sphere1.position.set(
      Math.cos(angle) * radius,
      y,
      Math.sin(angle) * radius
    )
    scene.add(sphere1)
    dnaHelix.strand1.push(sphere1)
    
    // Strand 2
    const geometry2 = new THREE.SphereGeometry(1.5, 8, 8)
    const material2 = new THREE.MeshPhongMaterial({ 
      color: 0xff0088,
      emissive: 0xff0088,
      emissiveIntensity: 0.5
    })
    const sphere2 = new THREE.Mesh(geometry2, material2)
    sphere2.position.set(
      Math.cos(angle + Math.PI) * radius,
      y,
      Math.sin(angle + Math.PI) * radius
    )
    scene.add(sphere2)
    dnaHelix.strand2.push(sphere2)
    
    // Connection
    if (i % 3 === 0) {
      const points = [sphere1.position, sphere2.position]
      const lineGeometry = new THREE.BufferGeometry().setFromPoints(points)
      const lineMaterial = new THREE.LineBasicMaterial({ 
        color: 0x4488ff,
        transparent: true,
        opacity: 0.6
      })
      const line = new THREE.Line(lineGeometry, lineMaterial)
      scene.add(line)
      dnaHelix.connections.push({ line, p1: sphere1, p2: sphere2 })
    }
  }
}

const createQuantumField = () => {
  for (let i = 0; i < 500; i++) {
    const geometry = new THREE.SphereGeometry(0.5, 6, 6)
    const hue = Math.random() * 360
    const material = new THREE.MeshBasicMaterial({ 
      color: new THREE.Color(`hsl(${hue}, 100%, 60%)`),
      transparent: true,
      opacity: 0.8
    })
    
    const particle = new THREE.Mesh(geometry, material)
    particle.position.set(
      (Math.random() - 0.5) * 200,
      (Math.random() - 0.5) * 200,
      (Math.random() - 0.5) * 200
    )
    
    particle.userData = {
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.5
      ),
      acceleration: new THREE.Vector3(),
      mass: Math.random() * 2 + 1
    }
    
    scene.add(particle)
    quantumParticles.push(particle)
  }
}

const createTimeTunnel = () => {
  for (let i = 0; i < 30; i++) {
    const geometry = new THREE.TorusGeometry(50 + i * 5, 2, 16, 100)
    const hue = (i * 12) % 360
    const material = new THREE.MeshBasicMaterial({ 
      color: new THREE.Color(`hsl(${hue}, 100%, 50%)`),
      wireframe: true,
      transparent: true,
      opacity: 0.3
    })
    
    const ring = new THREE.Mesh(geometry, material)
    ring.position.z = -i * 20
    ring.userData = { initialZ: ring.position.z }
    
    scene.add(ring)
    tunnelRings.push(ring)
  }
}

const updateAudioLevels = () => {
  if (!analyser || !dataArray) {
    // Procedural fallback
    bassLevel.value = Math.abs(Math.sin(Date.now() / 400)) * 0.6 + 0.4
    midLevel.value = Math.abs(Math.sin(Date.now() / 300)) * 0.5 + 0.5
    trebleLevel.value = Math.abs(Math.sin(Date.now() / 500)) * 0.4 + 0.6
    return
  }
  
  analyser.getByteFrequencyData(dataArray)
  
  const bassRange = dataArray.slice(0, Math.floor(bufferLength * 0.1))
  const midRange = dataArray.slice(Math.floor(bufferLength * 0.1), Math.floor(bufferLength * 0.4))
  const trebleRange = dataArray.slice(Math.floor(bufferLength * 0.4), Math.floor(bufferLength * 0.8))
  
  bassLevel.value = bassRange.reduce((a, b) => a + b, 0) / bassRange.length / 255
  midLevel.value = midRange.reduce((a, b) => a + b, 0) / midRange.length / 255
  trebleLevel.value = trebleRange.reduce((a, b) => a + b, 0) / trebleRange.length / 255
}

const animate = () => {
  animationId = requestAnimationFrame(animate)
  
  if (props.isPlaying) {
    updateAudioLevels()
  }
  
  const time = Date.now() * 0.0005
  
  // Update based on mode
  switch(currentMode.value) {
    case 'galaxy':
      updateGalaxy(time)
      break
    case 'dna':
      updateDNA(time)
      break
    case 'quantum':
      updateQuantum(time)
      break
    case 'tunnel':
      updateTunnel(time)
      break
    case 'chaos':
      updateGalaxy(time)
      updateDNA(time)
      updateQuantum(time)
      break
  }
  
  // Rotate camera
  camera.position.x = Math.cos(time * 0.2) * 100
  camera.position.z = Math.sin(time * 0.2) * 100
  camera.lookAt(0, 0, 0)
  
  renderer.render(scene, camera)
}

const updateGalaxy = (time) => {
  galaxyStars.forEach((star, i) => {
    // Rotate galaxy
    star.rotation.y += star.userData.speed
    
    // Pulse with music
    if (props.isPlaying) {
      const scale = 1 + bassLevel.value * 0.5
      star.scale.set(scale, scale, scale)
      
      // Change color with music
      const hue = (star.userData.hue + midLevel.value * 60) % 360
      star.material.color.setHSL(hue / 360, 1, 0.6)
    }
    
    // Spiral motion
    const radius = Math.sqrt(star.position.x ** 2 + star.position.z ** 2)
    const angle = Math.atan2(star.position.z, star.position.x) + 0.001
    star.position.x = Math.cos(angle) * radius
    star.position.z = Math.sin(angle) * radius
  })
}

const updateDNA = (time) => {
  // Rotate helix
  dnaHelix.strand1.forEach((sphere, i) => {
    const t = i / dnaHelix.strand1.length
    const angle = t * Math.PI * 8 + time * 2
    const radius = 20 + bassLevel.value * 10
    
    sphere.position.x = Math.cos(angle) * radius
    sphere.position.z = Math.sin(angle) * radius
    
    // Pulse
    const scale = 1 + trebleLevel.value * 0.5
    sphere.scale.set(scale, scale, scale)
  })
  
  dnaHelix.strand2.forEach((sphere, i) => {
    const t = i / dnaHelix.strand2.length
    const angle = t * Math.PI * 8 + time * 2 + Math.PI
    const radius = 20 + bassLevel.value * 10
    
    sphere.position.x = Math.cos(angle) * radius
    sphere.position.z = Math.sin(angle) * radius
    
    const scale = 1 + trebleLevel.value * 0.5
    sphere.scale.set(scale, scale, scale)
  })
  
  // Update connections
  dnaHelix.connections.forEach(({ line, p1, p2 }) => {
    const points = [p1.position.clone(), p2.position.clone()]
    line.geometry.setFromPoints(points)
  })
}

const updateQuantum = (time) => {
  // Particle physics with music
  quantumParticles.forEach((particle, i) => {
    // Apply gravity toward center (black hole effect with bass)
    const toCenter = new THREE.Vector3(0, 0, 0).sub(particle.position)
    const distance = toCenter.length()
    const gravityStrength = bassLevel.value * 0.5
    const force = toCenter.normalize().multiplyScalar(gravityStrength / (distance * 0.1))
    
    particle.userData.acceleration.add(force)
    
    // Treble creates repulsion
    if (trebleLevel.value > 0.7) {
      const repulsion = particle.position.clone().normalize().multiplyScalar(0.2)
      particle.userData.acceleration.add(repulsion)
    }
    
    // Update velocity and position
    particle.userData.velocity.add(particle.userData.acceleration)
    particle.userData.velocity.multiplyScalar(0.98) // Damping
    particle.position.add(particle.userData.velocity)
    
    // Reset acceleration
    particle.userData.acceleration.set(0, 0, 0)
    
    // Boundary
    if (particle.position.length() > 150) {
      particle.position.normalize().multiplyScalar(150)
      particle.userData.velocity.multiplyScalar(-0.5)
    }
    
    // Pulse size
    const scale = 1 + midLevel.value
    particle.scale.set(scale, scale, scale)
  })
}

const updateTunnel = (time) => {
  tunnelRings.forEach((ring, i) => {
    // Move forward
    ring.position.z += 2 + bassLevel.value * 3
    
    // Reset when too close
    if (ring.position.z > 50) {
      ring.position.z = ring.userData.initialZ
    }
    
    // Rotate
    ring.rotation.z += 0.01 + midLevel.value * 0.05
    
    // Scale with music
    const scale = 1 + trebleLevel.value * 0.3
    ring.scale.set(scale, scale, 1)
  })
}

const onWindowResize = () => {
  camera.aspect = canvas.value.clientWidth / canvas.value.clientHeight
  camera.updateProjectionMatrix()
  renderer.setSize(canvas.value.clientWidth, canvas.value.clientHeight)
}

const onMouseMove = (event) => {
  const rect = canvas.value.getBoundingClientRect()
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
  
  // Only check for hovers in galaxy mode
  if (currentMode.value === 'galaxy' || currentMode.value === 'chaos') {
    raycaster.setFromCamera(mouse, camera)
    const intersects = raycaster.intersectObjects(galaxyStars)
    
    // Reset all hovers
    galaxyStars.forEach(star => {
      if (star.userData.clickable) {
        star.userData.isHovered = false
        star.scale.set(1, 1, 1)
      }
    })
    
    // Highlight hovered star
    if (intersects.length > 0) {
      const hoveredStar = intersects[0].object
      if (hoveredStar.userData.clickable && hoveredStar.userData.track) {
        hoveredStar.userData.isHovered = true
        hoveredStar.scale.set(2, 2, 2)
        hoveredArtist.value = {
          name: hoveredStar.userData.track.name,
          genre: hoveredStar.userData.track.artists?.map(a => a.name).join(', ') || 'Unknown'
        }
        canvas.value.style.cursor = 'pointer'
        return
      }
    }
    
    hoveredArtist.value = null
    canvas.value.style.cursor = 'default'
  }
}

const onMouseClick = (event) => {
  if (currentMode.value !== 'galaxy' && currentMode.value !== 'chaos') return
  
  const rect = canvas.value.getBoundingClientRect()
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
  
  raycaster.setFromCamera(mouse, camera)
  const intersects = raycaster.intersectObjects(galaxyStars)
  
  if (intersects.length > 0) {
    const clickedStar = intersects[0].object
    if (clickedStar.userData.clickable && clickedStar.userData.track) {
      emit('play-track', clickedStar.userData.track)
      
      // Visual feedback - explosion effect
      const explosionParticles = []
      for (let i = 0; i < 20; i++) {
        const geo = new THREE.SphereGeometry(0.3, 4, 4)
        const mat = new THREE.MeshBasicMaterial({ color: clickedStar.material.color })
        const particle = new THREE.Mesh(geo, mat)
        particle.position.copy(clickedStar.position)
        particle.userData.velocity = new THREE.Vector3(
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2
        )
        scene.add(particle)
        explosionParticles.push(particle)
        
        // Remove after 1 second
        setTimeout(() => {
          scene.remove(particle)
          particle.geometry.dispose()
          particle.material.dispose()
        }, 1000)
      }
    }
  }
}
</script>

<style scoped>
.glass-effect {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}
</style>
