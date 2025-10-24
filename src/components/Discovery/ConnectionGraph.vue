<template>
  <div class="connection-graph-container">
    <div class="graph-header">
      <h3 class="graph-title">Audio DNA Connections</h3>
      <div class="graph-controls">
        <button
          v-for="layout in layouts"
          :key="layout"
          @click="currentLayout = layout"
          :class="['layout-btn', { active: currentLayout === layout }]"
        >
          {{ layout }}
        </button>
      </div>
    </div>

    <div class="graph-canvas" ref="graphContainer"></div>

    <div class="graph-legend">
      <div class="legend-item">
        <div class="legend-dot" style="background: #3b82f6;"></div>
        <span>Your Taste</span>
      </div>
      <div class="legend-item">
        <div class="legend-dot" style="background: #10b981;"></div>
        <span>Recommendation</span>
      </div>
      <div class="legend-item">
        <div class="legend-line"></div>
        <span>Similarity (thickness = strength)</span>
      </div>
    </div>

    <div class="selected-track-info" v-if="selectedTrack">
      <div class="info-header">
        <img
          v-if="selectedTrack.album?.images?.[0]"
          :src="selectedTrack.album.images[0].url"
          :alt="selectedTrack.name"
          class="track-image"
        />
        <div class="track-details">
          <div class="track-name">{{ selectedTrack.name }}</div>
          <div class="track-artist">
            {{ selectedTrack.artists?.map(a => a.name).join(', ') }}
          </div>
        </div>
        <button @click="selectedTrack = null" class="close-btn">×</button>
      </div>
      <div class="connection-details">
        <div class="detail-row">
          <span>Similarity:</span>
          <span class="value">{{ Math.round(selectedTrack.similarity * 100) }}%</span>
        </div>
        <div class="detail-row">
          <span>Discovery Score:</span>
          <span class="value">{{ Math.round(selectedTrack.discoveryScore) }}</span>
        </div>
        <div class="detail-row">
          <span>Connections:</span>
          <span class="value">{{ selectedTrack.connections || 0 }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import * as d3 from 'd3'

export default {
  name: 'ConnectionGraph',
  props: {
    userTracks: {
      type: Array,
      default: () => []
    },
    recommendations: {
      type: Array,
      default: () => []
    },
    width: {
      type: Number,
      default: 800
    },
    height: {
      type: Number,
      default: 600
    }
  },
  data() {
    return {
      currentLayout: 'Force',
      layouts: ['Force', 'Radial', 'Hierarchical'],
      selectedTrack: null,
      simulation: null,
      svg: null,
      nodes: [],
      links: []
    }
  },
  mounted() {
    this.initializeGraph()
    window.addEventListener('resize', this.handleResize)
  },
  beforeUnmount() {
    if (this.simulation) {
      this.simulation.stop()
    }
    window.removeEventListener('resize', this.handleResize)
  },
  watch: {
    recommendations: {
      handler() {
        this.updateGraph()
      },
      deep: true
    },
    currentLayout() {
      this.updateLayout()
    }
  },
  methods: {
    initializeGraph() {
      const container = this.$refs.graphContainer
      if (!container) return

      const width = container.clientWidth
      const height = container.clientHeight || 600

      // Create SVG
      this.svg = d3.select(container)
        .append('svg')
        .attr('width', '100%')
        .attr('height', height)
        .attr('viewBox', [0, 0, width, height])

      // Add zoom behavior
      const zoom = d3.zoom()
        .scaleExtent([0.5, 3])
        .on('zoom', (event) => {
          this.svg.select('g').attr('transform', event.transform)
        })

      this.svg.call(zoom)

      // Create main group
      const g = this.svg.append('g')

      // Create link group
      g.append('g').attr('class', 'links')

      // Create node group
      g.append('g').attr('class', 'nodes')

      this.updateGraph()
    },

    updateGraph() {
      if (!this.svg) return

      // Prepare data
      this.prepareGraphData()

      // Update visualization
      this.renderGraph()
    },

    prepareGraphData() {
      const nodes = []
      const links = []

      // Add user's top tracks as central nodes
      const centralTracks = this.userTracks.slice(0, 5)
      centralTracks.forEach((track, index) => {
        nodes.push({
          id: track.id,
          name: track.name,
          artist: track.artists?.[0]?.name || 'Unknown',
          type: 'user',
          popularity: track.popularity || 50,
          image: track.album?.images?.[2]?.url,
          group: 0,
          x: null,
          y: null
        })
      })

      // Add recommendations
      this.recommendations.forEach((rec, index) => {
        const track = rec.track || rec

        nodes.push({
          id: track.id,
          name: track.name,
          artist: track.artists?.[0]?.name || 'Unknown',
          type: 'recommendation',
          popularity: track.popularity || 0,
          similarity: rec.similarity || 0,
          discoveryScore: rec.discoveryScore || 0,
          image: track.album?.images?.[2]?.url,
          group: 1,
          x: null,
          y: null
        })

        // Create links based on similarity
        // Connect to most similar user tracks
        centralTracks.forEach((userTrack, uIndex) => {
          // Simulate similarity (in real app, calculate from audio features)
          const similarity = rec.similarity || Math.random() * 0.5 + 0.3

          if (similarity > 0.4) {
            links.push({
              source: userTrack.id,
              target: track.id,
              similarity: similarity,
              strength: similarity
            })
          }
        })
      })

      // Also create some links between recommendations with high similarity
      for (let i = 0; i < this.recommendations.length; i++) {
        for (let j = i + 1; j < this.recommendations.length; j++) {
          const rec1 = this.recommendations[i]
          const rec2 = this.recommendations[j]

          // Simulate similarity between recommendations
          const similarity = Math.random()
          if (similarity > 0.7) {
            const track1 = rec1.track || rec1
            const track2 = rec2.track || rec2

            links.push({
              source: track1.id,
              target: track2.id,
              similarity: similarity,
              strength: similarity * 0.5
            })
          }
        }
      }

      this.nodes = nodes
      this.links = links
    },

    renderGraph() {
      const width = this.$refs.graphContainer?.clientWidth || 800
      const height = this.$refs.graphContainer?.clientHeight || 600

      // Create force simulation
      this.simulation = d3.forceSimulation(this.nodes)
        .force('link', d3.forceLink(this.links)
          .id(d => d.id)
          .distance(d => 150 - d.similarity * 50)
          .strength(d => d.strength))
        .force('charge', d3.forceManyBody().strength(-300))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide().radius(30))

      // Render links
      const linkElements = this.svg.select('.links')
        .selectAll('line')
        .data(this.links)
        .join('line')
        .attr('stroke', '#ffffff30')
        .attr('stroke-width', d => d.similarity * 4)
        .attr('stroke-opacity', 0.6)

      // Render nodes
      const nodeElements = this.svg.select('.nodes')
        .selectAll('g')
        .data(this.nodes)
        .join('g')
        .call(this.drag(this.simulation))

      // Add circles
      nodeElements.selectAll('circle').remove()
      nodeElements.append('circle')
        .attr('r', d => d.type === 'user' ? 20 : 15)
        .attr('fill', d => d.type === 'user' ? '#3b82f6' : '#10b981')
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 2)
        .style('cursor', 'pointer')

      // Add images (if available)
      nodeElements.selectAll('image').remove()
      nodeElements.filter(d => d.image)
        .append('image')
        .attr('xlink:href', d => d.image)
        .attr('x', d => d.type === 'user' ? -18 : -13)
        .attr('y', d => d.type === 'user' ? -18 : -13)
        .attr('width', d => d.type === 'user' ? 36 : 26)
        .attr('height', d => d.type === 'user' ? 36 : 26)
        .attr('clip-path', 'circle()')
        .style('cursor', 'pointer')

      // Add labels on hover
      nodeElements.on('mouseenter', (event, d) => {
        d3.select(event.currentTarget)
          .append('text')
          .attr('class', 'node-label')
          .attr('y', -25)
          .attr('text-anchor', 'middle')
          .attr('fill', 'white')
          .attr('font-size', '12px')
          .attr('font-weight', 'bold')
          .text(d.name.length > 20 ? d.name.substring(0, 20) + '...' : d.name)
      })

      nodeElements.on('mouseleave', (event) => {
        d3.select(event.currentTarget).select('.node-label').remove()
      })

      // Add click handler
      nodeElements.on('click', (event, d) => {
        this.selectedTrack = {
          ...d,
          connections: this.links.filter(l => l.source.id === d.id || l.target.id === d.id).length
        }
      })

      // Update positions on simulation tick
      this.simulation.on('tick', () => {
        linkElements
          .attr('x1', d => d.source.x)
          .attr('y1', d => d.source.y)
          .attr('x2', d => d.target.x)
          .attr('y2', d => d.target.y)

        nodeElements.attr('transform', d => `translate(${d.x},${d.y})`)
      })
    },

    updateLayout() {
      if (!this.simulation) return

      const width = this.$refs.graphContainer?.clientWidth || 800
      const height = this.$refs.graphContainer?.clientHeight || 600

      // Stop current simulation
      this.simulation.stop()

      // Apply new layout
      switch (this.currentLayout) {
        case 'Radial':
          this.applyRadialLayout(width, height)
          break
        case 'Hierarchical':
          this.applyHierarchicalLayout(width, height)
          break
        default:
          this.applyForceLayout(width, height)
      }
    },

    applyForceLayout(width, height) {
      this.simulation
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('charge', d3.forceManyBody().strength(-300))
        .alpha(1)
        .restart()
    },

    applyRadialLayout(width, height) {
      const centerX = width / 2
      const centerY = height / 2
      const radius = Math.min(width, height) / 3

      // Position user tracks in center
      this.nodes.forEach((node, i) => {
        if (node.type === 'user') {
          const angle = (i / this.nodes.filter(n => n.type === 'user').length) * 2 * Math.PI
          node.fx = centerX + Math.cos(angle) * 50
          node.fy = centerY + Math.sin(angle) * 50
        } else {
          const recIndex = this.nodes.filter(n => n.type === 'recommendation').indexOf(node)
          const totalRecs = this.nodes.filter(n => n.type === 'recommendation').length
          const angle = (recIndex / totalRecs) * 2 * Math.PI
          node.fx = centerX + Math.cos(angle) * radius
          node.fy = centerY + Math.sin(angle) * radius
        }
      })

      this.simulation
        .force('charge', null)
        .alpha(0.3)
        .restart()

      // Release fixed positions after animation
      setTimeout(() => {
        this.nodes.forEach(node => {
          node.fx = null
          node.fy = null
        })
      }, 2000)
    },

    applyHierarchicalLayout(width, height) {
      const userNodes = this.nodes.filter(n => n.type === 'user')
      const recNodes = this.nodes.filter(n => n.type === 'recommendation')

      // Position user tracks at top
      userNodes.forEach((node, i) => {
        node.fx = (width / (userNodes.length + 1)) * (i + 1)
        node.fy = height * 0.2
      })

      // Position recommendations below
      recNodes.forEach((node, i) => {
        node.fx = (width / (recNodes.length + 1)) * (i + 1)
        node.fy = height * 0.6
      })

      this.simulation
        .force('charge', d3.forceManyBody().strength(-100))
        .alpha(0.3)
        .restart()

      setTimeout(() => {
        this.nodes.forEach(node => {
          node.fx = null
          node.fy = null
        })
      }, 2000)
    },

    drag(simulation) {
      function dragstarted(event) {
        if (!event.active) simulation.alphaTarget(0.3).restart()
        event.subject.fx = event.subject.x
        event.subject.fy = event.subject.y
      }

      function dragged(event) {
        event.subject.fx = event.x
        event.subject.fy = event.y
      }

      function dragended(event) {
        if (!event.active) simulation.alphaTarget(0)
        event.subject.fx = null
        event.subject.fy = null
      }

      return d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended)
    },

    handleResize() {
      if (this.svg) {
        const width = this.$refs.graphContainer?.clientWidth || 800
        const height = this.$refs.graphContainer?.clientHeight || 600
        this.svg.attr('viewBox', [0, 0, width, height])
        this.updateLayout()
      }
    }
  }
}
</script>

<style scoped>
.connection-graph-container {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 16px;
  padding: 20px;
  backdrop-filter: blur(10px);
  height: 100%;
  display: flex;
  flex-direction: column;
}

.graph-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.graph-title {
  font-size: 18px;
  font-weight: 600;
  color: white;
  margin: 0;
}

.graph-controls {
  display: flex;
  gap: 8px;
}

.layout-btn {
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  color: white;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.layout-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.layout-btn.active {
  background: #3b82f6;
  border-color: #3b82f6;
}

.graph-canvas {
  flex: 1;
  min-height: 400px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 12px;
  overflow: hidden;
  position: relative;
}

.graph-legend {
  display: flex;
  gap: 20px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
}

.legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid white;
}

.legend-line {
  width: 30px;
  height: 3px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 2px;
}

.selected-track-info {
  margin-top: 16px;
  padding: 16px;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.info-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.track-image {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  object-fit: cover;
}

.track-details {
  flex: 1;
}

.track-name {
  font-size: 14px;
  font-weight: 600;
  color: white;
  margin-bottom: 4px;
}

.track-artist {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
}

.close-btn {
  background: none;
  border: none;
  color: white;
  font-size: 24px;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background 0.3s ease;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.connection-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.8);
}

.detail-row .value {
  font-weight: 600;
  color: #10b981;
}

@media (max-width: 768px) {
  .graph-header {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }

  .graph-legend {
    flex-direction: column;
    gap: 8px;
  }

  .layout-btn {
    font-size: 11px;
    padding: 5px 10px;
  }
}
</style>
