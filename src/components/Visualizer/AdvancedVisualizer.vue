<template>
  <div class="advanced-visualizer" ref="container">
    <canvas ref="canvas" :width="width" :height="height"></canvas>

    <div class="visualizer-controls">
      <div class="mode-selector">
        <button
          v-for="mode in modes"
          :key="mode.id"
          @click="currentMode = mode.id"
          :class="['mode-btn', { active: currentMode === mode.id }]"
        >
          <span class="mode-icon">{{ mode.icon }}</span>
          <span class="mode-name">{{ mode.name }}</span>
        </button>
      </div>

      <div class="quality-controls">
        <label>
          <span>Quality:</span>
          <select v-model="quality" @change="updateQuality">
            <option value="low">Low (Mobile)</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="ultra">Ultra</option>
          </select>
        </label>
      </div>
    </div>
  </div>
</template>

<script>
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'

export default {
  name: 'AdvancedVisualizer',
  props: {
    audioData: {
      type: Object,
      default: () => ({ frequencies: [], timeDomain: [], energy: 0 })
    },
    trackFeatures: {
      type: Object,
      default: () => ({})
    },
    isPlaying: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      width: 0,
      height: 0,
      currentMode: 'fractal',
      quality: 'high',
      modes: [
        { id: 'fractal', name: 'Fractal Soundscape', icon: '🌀' },
        { id: 'emotional', name: 'Emotional Sphere', icon: '💫' },
        { id: 'timetravel', name: 'Time-Travel', icon: '⏰' }
      ],
      scene: null,
      camera: null,
      renderer: null,
      controls: null,
      fractalObjects: [],
      emotionalSphere: null,
      timeTravelObjects: [],
      animationFrame: null,
      time: 0,
      historyBuffer: []
    }
  },
  mounted() {
    this.initThreeJS()
    this.startAnimation()
    window.addEventListener('resize', this.handleResize)
  },
  beforeUnmount() {
    this.cleanup()
    window.removeEventListener('resize', this.handleResize)
  },
  watch: {
    currentMode() {
      this.switchMode()
    },
    audioData: {
      handler() {
        this.updateVisualization()
      },
      deep: true
    }
  },
  methods: {
    initThreeJS() {
      const container = this.$refs.container
      this.width = container.clientWidth
      this.height = container.clientHeight

      // Scene
      this.scene = new THREE.Scene()
      this.scene.fog = new THREE.FogExp2(0x000000, 0.002)

      // Camera
      this.camera = new THREE.PerspectiveCamera(
        75,
        this.width / this.height,
        0.1,
        2000
      )
      this.camera.position.z = 100

      // Renderer
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.$refs.canvas,
        antialias: this.quality !== 'low',
        alpha: true
      })
      this.renderer.setSize(this.width, this.height)
      this.renderer.setPixelRatio(this.getPixelRatio())

      // Controls
      this.controls = new OrbitControls(this.camera, this.renderer.domElement)
      this.controls.enableDamping = true
      this.controls.dampingFactor = 0.05
      this.controls.autoRotate = true
      this.controls.autoRotateSpeed = 0.5

      // Lights
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
      this.scene.add(ambientLight)

      const pointLight = new THREE.PointLight(0xffffff, 1, 1000)
      pointLight.position.set(50, 50, 50)
      this.scene.add(pointLight)

      // Initialize first mode
      this.switchMode()
    },

    getPixelRatio() {
      switch (this.quality) {
        case 'low': return 0.5
        case 'medium': return 1
        case 'high': return Math.min(window.devicePixelRatio, 2)
        case 'ultra': return window.devicePixelRatio
        default: return 1
      }
    },

    updateQuality() {
      this.renderer.setPixelRatio(this.getPixelRatio())
      this.controls.enabled = this.quality !== 'low'
    },

    switchMode() {
      // Clear existing objects
      this.clearScene()

      // Initialize new mode
      switch (this.currentMode) {
        case 'fractal':
          this.initFractalMode()
          break
        case 'emotional':
          this.initEmotionalMode()
          break
        case 'timetravel':
          this.initTimeTravelMode()
          break
      }
    },

    clearScene() {
      // Remove all meshes from scene
      const objectsToRemove = []
      this.scene.traverse((object) => {
        if (object.isMesh) {
          objectsToRemove.push(object)
        }
      })

      objectsToRemove.forEach((object) => {
        this.scene.remove(object)
        if (object.geometry) object.geometry.dispose()
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach(mat => mat.dispose())
          } else {
            object.material.dispose()
          }
        }
      })

      this.fractalObjects = []
      this.emotionalSphere = null
      this.timeTravelObjects = []
    },

    // ==========================================
    // FRACTAL SOUNDSCAPE MODE
    // ==========================================
    initFractalMode() {
      console.log('🌀 Initializing Fractal Soundscape mode')

      // Create recursive fractal geometry
      const levels = this.quality === 'low' ? 3 : this.quality === 'ultra' ? 6 : 4
      this.createFractalStructure(0, 0, 0, 50, levels)

      this.camera.position.set(0, 0, 150)
      this.controls.autoRotate = true
      this.controls.autoRotateSpeed = 1
    },

    createFractalStructure(x, y, z, size, level) {
      if (level <= 0) return

      // Create octahedron at this position
      const geometry = new THREE.OctahedronGeometry(size / 10, 0)
      const material = new THREE.MeshPhongMaterial({
        color: new THREE.Color().setHSL(level / 6, 0.8, 0.5),
        wireframe: level % 2 === 0,
        transparent: true,
        opacity: 0.8
      })

      const mesh = new THREE.Mesh(geometry, material)
      mesh.position.set(x, y, z)
      this.scene.add(mesh)
      this.fractalObjects.push({ mesh, level, initialSize: size })

      // Recursively create children
      if (level > 1) {
        const newSize = size * 0.5
        const offset = size * 0.6

        // Create 8 children (corners of a cube)
        const positions = [
          [offset, offset, offset],
          [offset, offset, -offset],
          [offset, -offset, offset],
          [offset, -offset, -offset],
          [-offset, offset, offset],
          [-offset, offset, -offset],
          [-offset, -offset, offset],
          [-offset, -offset, -offset]
        ]

        positions.forEach(([dx, dy, dz]) => {
          this.createFractalStructure(x + dx, y + dy, z + dz, newSize, level - 1)
        })
      }
    },

    updateFractalMode() {
      const { frequencies = [], energy = 0 } = this.audioData

      this.fractalObjects.forEach((obj, index) => {
        const { mesh, level, initialSize } = obj

        // Rotate based on audio
        const rotationSpeed = energy * 0.05 * (level + 1)
        mesh.rotation.x += rotationSpeed
        mesh.rotation.y += rotationSpeed * 0.7

        // Scale based on frequency
        const freqIndex = Math.floor(index % frequencies.length)
        const freqValue = frequencies[freqIndex] || 0
        const scale = 1 + freqValue * 0.5
        mesh.scale.setScalar(scale)

        // Color shift based on audio
        const hue = (this.time * 0.01 + level / 6) % 1
        mesh.material.color.setHSL(hue, 0.8, 0.5 + energy * 0.3)

        // Opacity pulsing
        mesh.material.opacity = 0.6 + energy * 0.4
      })

      // Camera movement
      this.camera.position.z = 150 - energy * 50
    },

    // ==========================================
    // EMOTIONAL SPECTRUM SPHERE MODE
    // ==========================================
    initEmotionalMode() {
      console.log('💫 Initializing Emotional Spectrum Sphere mode')

      // Create main sphere with gradient material
      const geometry = new THREE.SphereGeometry(50, 64, 64)

      // Create gradient based on valence (happiness) and energy
      const valence = this.trackFeatures.valence || 0.5
      const energy = this.trackFeatures.energy || 0.5

      const material = new THREE.MeshPhongMaterial({
        color: this.getEmotionalColor(valence, energy),
        transparent: true,
        opacity: 0.7,
        wireframe: false
      })

      this.emotionalSphere = new THREE.Mesh(geometry, material)
      this.scene.add(this.emotionalSphere)

      // Create particle system for emotions
      const particleCount = this.quality === 'low' ? 500 : this.quality === 'ultra' ? 5000 : 2000
      const particlesGeometry = new THREE.BufferGeometry()
      const positions = new Float32Array(particleCount * 3)
      const colors = new Float32Array(particleCount * 3)

      for (let i = 0; i < particleCount; i++) {
        // Random position on sphere surface
        const theta = Math.random() * Math.PI * 2
        const phi = Math.acos(2 * Math.random() - 1)
        const radius = 55 + Math.random() * 20

        positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
        positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
        positions[i * 3 + 2] = radius * Math.cos(phi)

        // Color based on position (emotional spectrum)
        const color = this.getEmotionalColor(
          (theta / (Math.PI * 2)),
          (phi / Math.PI)
        )
        colors[i * 3] = color.r
        colors[i * 3 + 1] = color.g
        colors[i * 3 + 2] = color.b
      }

      particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
      particlesGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

      const particlesMaterial = new THREE.PointsMaterial({
        size: 2,
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending
      })

      const particles = new THREE.Points(particlesGeometry, particlesMaterial)
      this.scene.add(particles)
      this.emotionalSphere.particles = particles

      this.camera.position.set(0, 0, 150)
      this.controls.autoRotate = true
      this.controls.autoRotateSpeed = 0.3
    },

    getEmotionalColor(valence, energy) {
      // Map emotions to colors
      // valence: 0 (sad) -> 1 (happy)
      // energy: 0 (calm) -> 1 (energetic)

      let hue, saturation, lightness

      if (energy > 0.6) {
        // High energy
        if (valence > 0.6) {
          // Happy & Energetic (Yellow/Orange)
          hue = 0.15
          saturation = 0.9
          lightness = 0.6
        } else {
          // Angry/Tense (Red)
          hue = 0
          saturation = 0.9
          lightness = 0.5
        }
      } else {
        // Low energy
        if (valence > 0.6) {
          // Happy & Calm (Green)
          hue = 0.3
          saturation = 0.7
          lightness = 0.5
        } else {
          // Sad & Calm (Blue/Purple)
          hue = 0.6
          saturation = 0.8
          lightness = 0.4
        }
      }

      return new THREE.Color().setHSL(hue, saturation, lightness)
    },

    updateEmotionalMode() {
      if (!this.emotionalSphere) return

      const { frequencies = [], energy = 0 } = this.audioData
      const valence = this.trackFeatures.valence || 0.5
      const trackEnergy = this.trackFeatures.energy || 0.5

      // Update sphere color based on current audio
      const dynamicValence = valence + (energy - 0.5) * 0.2
      const dynamicEnergy = trackEnergy + energy * 0.3

      const color = this.getEmotionalColor(
        Math.max(0, Math.min(1, dynamicValence)),
        Math.max(0, Math.min(1, dynamicEnergy))
      )

      this.emotionalSphere.material.color.copy(color)

      // Pulsate sphere
      const scale = 1 + energy * 0.3
      this.emotionalSphere.scale.setScalar(scale)

      // Rotate sphere
      this.emotionalSphere.rotation.y += 0.005
      this.emotionalSphere.rotation.x += 0.002

      // Update particles
      if (this.emotionalSphere.particles) {
        const particles = this.emotionalSphere.particles
        particles.rotation.y -= 0.001
        particles.rotation.x += 0.0005

        // Pulsate particles based on frequencies
        const positions = particles.geometry.attributes.position.array
        for (let i = 0; i < positions.length; i += 3) {
          const freqIndex = Math.floor((i / 3) % frequencies.length)
          const freqValue = frequencies[freqIndex] || 0

          const radius = 55 + Math.random() * 20 + freqValue * 20
          const theta = Math.atan2(positions[i + 1], positions[i])
          const phi = Math.acos(positions[i + 2] / Math.sqrt(
            positions[i] * positions[i] +
            positions[i + 1] * positions[i + 1] +
            positions[i + 2] * positions[i + 2]
          ))

          positions[i] = radius * Math.sin(phi) * Math.cos(theta)
          positions[i + 1] = radius * Math.sin(phi) * Math.sin(theta)
          positions[i + 2] = radius * Math.cos(phi)
        }

        particles.geometry.attributes.position.needsUpdate = true
      }
    },

    // ==========================================
    // TIME-TRAVEL WAVEFORM MODE
    // ==========================================
    initTimeTravelMode() {
      console.log('⏰ Initializing Time-Travel Waveform mode')

      // Create timeline visualization
      // Z-axis represents time, showing evolution of listening
      this.historyBuffer = []

      // Create time markers
      const timelineLength = 200
      const segments = this.quality === 'low' ? 20 : this.quality === 'ultra' ? 100 : 50

      for (let i = 0; i < segments; i++) {
        const z = -timelineLength / 2 + (i / segments) * timelineLength

        // Create ring for this time segment
        const geometry = new THREE.TorusGeometry(10, 0.5, 8, 32)
        const material = new THREE.MeshPhongMaterial({
          color: new THREE.Color().setHSL(i / segments, 0.7, 0.5),
          transparent: true,
          opacity: 0.5
        })

        const ring = new THREE.Mesh(geometry, material)
        ring.position.z = z
        ring.rotation.x = Math.PI / 2
        this.scene.add(ring)
        this.timeTravelObjects.push({ mesh: ring, index: i, z })
      }

      // Create waveform path
      const pathGeometry = new THREE.BufferGeometry()
      const pathMaterial = new THREE.LineBasicMaterial({
        color: 0x00ff00,
        linewidth: 2
      })
      const pathLine = new THREE.Line(pathGeometry, pathMaterial)
      this.scene.add(pathLine)
      this.timeTravelObjects.push({ mesh: pathLine, isPath: true })

      this.camera.position.set(50, 30, 50)
      this.camera.lookAt(0, 0, 0)
      this.controls.autoRotate = false
    },

    updateTimeTravelMode() {
      const { timeDomain = [], energy = 0 } = this.audioData

      // Add current audio snapshot to history
      if (this.time % 2 === 0) { // Sample every 2 frames
        this.historyBuffer.push({
          time: this.time,
          energy: energy,
          waveform: [...timeDomain]
        })

        // Keep last 50 snapshots
        if (this.historyBuffer.length > 50) {
          this.historyBuffer.shift()
        }
      }

      // Update time rings
      this.timeTravelObjects.forEach((obj) => {
        if (obj.isPath) return

        const { mesh, index } = obj

        // Pulse rings based on current audio
        const scale = 1 + energy * 0.5 * Math.sin(this.time * 0.1 + index * 0.1)
        mesh.scale.set(scale, scale, 1)

        // Move rings through time (flowing effect)
        mesh.position.z += 0.5
        if (mesh.position.z > 100) {
          mesh.position.z = -100
        }

        // Update color
        const hue = (index / this.timeTravelObjects.length + this.time * 0.001) % 1
        mesh.material.color.setHSL(hue, 0.7, 0.5)
      })

      // Update waveform path
      const pathObj = this.timeTravelObjects.find(obj => obj.isPath)
      if (pathObj && this.historyBuffer.length > 1) {
        const points = []
        this.historyBuffer.forEach((snapshot, i) => {
          const z = -100 + (i / this.historyBuffer.length) * 200
          const waveAvg = snapshot.waveform.reduce((a, b) => a + b, 0) / snapshot.waveform.length
          const x = waveAvg * 50 - 25
          const y = snapshot.energy * 30
          points.push(new THREE.Vector3(x, y, z))
        })

        const geometry = new THREE.BufferGeometry().setFromPoints(points)
        pathObj.mesh.geometry.dispose()
        pathObj.mesh.geometry = geometry
      }

      // Camera movement
      this.camera.position.z = 50 + Math.sin(this.time * 0.01) * 20
    },

    // ==========================================
    // ANIMATION LOOP
    // ==========================================
    updateVisualization() {
      if (!this.isPlaying) return

      switch (this.currentMode) {
        case 'fractal':
          this.updateFractalMode()
          break
        case 'emotional':
          this.updateEmotionalMode()
          break
        case 'timetravel':
          this.updateTimeTravelMode()
          break
      }
    },

    startAnimation() {
      const animate = () => {
        this.animationFrame = requestAnimationFrame(animate)

        this.time++
        this.updateVisualization()

        if (this.controls) {
          this.controls.update()
        }

        if (this.renderer && this.scene && this.camera) {
          this.renderer.render(this.scene, this.camera)
        }
      }

      animate()
    },

    handleResize() {
      const container = this.$refs.container
      if (!container) return

      this.width = container.clientWidth
      this.height = container.clientHeight

      if (this.camera) {
        this.camera.aspect = this.width / this.height
        this.camera.updateProjectionMatrix()
      }

      if (this.renderer) {
        this.renderer.setSize(this.width, this.height)
      }
    },

    cleanup() {
      if (this.animationFrame) {
        cancelAnimationFrame(this.animationFrame)
      }

      if (this.controls) {
        this.controls.dispose()
      }

      if (this.renderer) {
        this.renderer.dispose()
      }

      this.clearScene()
    }
  }
}
</script>

<style scoped>
.advanced-visualizer {
  position: relative;
  width: 100%;
  height: 100%;
  background: #000;
  overflow: hidden;
}

canvas {
  display: block;
  width: 100%;
  height: 100%;
}

.visualizer-controls {
  position: absolute;
  top: 20px;
  left: 20px;
  right: 20px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
  z-index: 10;
  flex-wrap: wrap;
}

.mode-selector {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.mode-btn {
  padding: 12px 16px;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(10px);
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  min-width: 80px;
}

.mode-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.4);
  transform: translateY(-2px);
}

.mode-btn.active {
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  border-color: transparent;
}

.mode-icon {
  font-size: 24px;
}

.mode-name {
  font-size: 12px;
  font-weight: 600;
  text-align: center;
}

.quality-controls {
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(10px);
  padding: 12px 16px;
  border-radius: 12px;
  border: 2px solid rgba(255, 255, 255, 0.2);
}

.quality-controls label {
  display: flex;
  align-items: center;
  gap: 10px;
  color: white;
  font-size: 14px;
}

.quality-controls select {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  color: white;
  padding: 6px 10px;
  cursor: pointer;
}

@media (max-width: 768px) {
  .visualizer-controls {
    top: 10px;
    left: 10px;
    right: 10px;
  }

  .mode-btn {
    min-width: 60px;
    padding: 8px 12px;
  }

  .mode-icon {
    font-size: 20px;
  }

  .mode-name {
    font-size: 10px;
  }
}
</style>
