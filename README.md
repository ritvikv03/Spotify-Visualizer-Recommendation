# 🎵 Spotify Discovery Visualizer & Organic Recommender

A revolutionary music discovery platform combining cutting-edge 3D visualization with ML-powered recommendations that find hidden gems based purely on audio DNA—completely free from popularity bias.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Vue](https://img.shields.io/badge/Vue-3.4-green.svg)
![TensorFlow](https://img.shields.io/badge/TensorFlow.js-4.x-orange.svg)
![Three.js](https://img.shields.io/badge/Three.js-0.160-purple.svg)


## 🚀 Quick Start

### Prerequisites
- Node.js 16+ and npm
- Spotify Developer Account
- Modern browser with WebGL support

### Installation

```bash
# Clone the repository
git clone https://github.com/ritvikv03/Spotify-Visualizer-Recommendation.git
cd Spotify-Visualizer-Recommendation

# Install dependencies
npm install

# Configure Spotify API
cp .env.example .env
# Edit .env and add your Spotify Client ID

# Start development server
npm run dev
```

Visit `http://localhost:8888`

### Spotify App Setup

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create a new app
3. Add redirect URI: `http://localhost:8888/callback`
4. Copy Client ID to `.env` file
5. Request the following scopes:
   - `user-read-private`
   - `user-read-email`
   - `user-top-read`
   - `user-read-recently-played`
   - `user-library-read`
   - `user-read-playback-state`
   - `user-modify-playback-state`
   - `playlist-read-private`
   - `playlist-modify-public`
   - `playlist-modify-private`

## 📊 Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     User Interface                      │
│  (Vue 3 + Tailwind CSS + Framer Motion Animations)     │
└────────────┬───────────────────────────┬────────────────┘
             │                           │
    ┌────────▼─────────┐       ┌────────▼─────────┐
    │   Discovery UI   │       │  3D Visualizer   │
    │  Components (8)  │       │   (14 modes)     │
    └────────┬─────────┘       └────────┬─────────┘
             │                           │
    ┌────────▼──────────────────────────▼─────────┐
    │          State Management (Pinia)           │
    └────────┬────────────────────────────────────┘
             │
    ┌────────▼──────────────────────────────────┐
    │         Recommendation Engines            │
    │  ┌──────────────┐  ┌──────────────────┐  │
    │  │  ML Engine   │  │  Feedback Engine │  │
    │  │(TensorFlow.js│  │   (IndexedDB)    │  │
    │  └──────────────┘  └──────────────────┘  │
    └────────┬──────────────────────────────────┘
             │
    ┌────────▼────────┐
    │  Spotify API    │
    │   (OAuth 2.0)   │
    └─────────────────┘
```

### Technology Stack

**Frontend**
- Vue 3 (Composition API)
- Vite (Build tool)
- Tailwind CSS (Styling)
- Pinia (State management)

**3D Graphics**
- Three.js (WebGL rendering)
- Tone.js (Audio processing)
- D3.js (Data visualization)

**Machine Learning**
- TensorFlow.js (Neural networks)
- Natural (NLP)
- Sentiment (Lyric analysis)

**Data Storage**
- IndexedDB (via idb)
- LocalStorage (Session data)

**API**
- Spotify Web API
- Axios (HTTP client)

## 🎮 Usage Guide

### 1. Authentication
Click "Login with Spotify" to authorize the app with your account.

### 2. Discover Page
- Adjust the **Serendipity Slider** to control recommendation adventurousness
- Browse personalized recommendations with **Discovery Score** badges
- Click **Like** 💚 or **Pass** 👎 to teach the AI your preferences
- View **Audio Similarity Radar** to understand why tracks were recommended

### 3. Visualizer
- Select from 14 unique visualization modes
- Adjust quality settings for performance
- Enable auto-rotation and camera controls
- Play tracks to see real-time audio-reactive animations

### 4. Learning Dashboard
- View your **Musical DNA** (learned audio preferences)
- See which recommendation strategies work best
- Track listening statistics
- Reset learning data if needed

### 5. Connection Graph
- Explore audio DNA connections between tracks
- Switch between Force, Radial, and Hierarchical layouts
- Click nodes to see track details
- Drag and zoom for interaction

## 🔧 Configuration

### Recommendation Settings

```javascript
const options = {
  serendipityLevel: 0.3,    // 0 = safe, 1 = wild
  maxPopularity: 60,        // Max track popularity (0-100)
  limit: 50,                // Number of recommendations
  maxPerArtist: 2           // Artist diversity threshold
}
```

### Visualization Quality

```javascript
const quality = 'high'  // 'low' | 'medium' | 'high' | 'ultra'
```

### Learning Rate

```javascript
const learningRate = 0.1  // How fast AI adapts (0-1)
```

## 📁 Project Structure

```
spotify-discovery-visualizer/
├── src/
│   ├── components/
│   │   ├── Discovery/          # Discovery UI components
│   │   │   ├── AudioSimilarityRadar.vue
│   │   │   ├── ConnectionGraph.vue
│   │   │   ├── DiscoveryScoreBadge.vue
│   │   │   ├── FeedbackButtons.vue
│   │   │   ├── LearningDashboard.vue
│   │   │   └── SerendipitySlider.vue
│   │   └── Visualizer/         # 3D visualization components
│   │       ├── AdvancedVisualizer.vue (NEW)
│   │       ├── CosmicVisualizer.vue
│   │       └── MusicVisualizer.vue
│   ├── services/
│   │   ├── mlRecommendationEngine.js     # ML recommendation system
│   │   ├── feedbackLearningEngine.js     # Feedback learning & storage
│   │   ├── recommendationEngine.js       # Legacy recommendation system
│   │   └── spotify.js                    # Spotify API client
│   ├── stores/
│   │   └── auth.js                       # Authentication state
│   ├── views/
│   │   ├── Discover.vue                  # Main discovery page
│   │   ├── Visualizer.vue                # Visualizer page
│   │   └── Library.vue                   # User library
│   └── main.js                           # App entry point
├── public/                                # Static assets
├── docs/
│   ├── ALGORITHMS.md                     # Algorithm documentation
│   ├── INTEGRATION_GUIDE.md              # Integration guide
│   ├── CODEBASE_ANALYSIS.md              # Codebase overview
│   ├── DEVELOPER_SETUP.md                # Setup guide
│   └── TROUBLESHOOTING.md                # Troubleshooting
└── README.md                             # This file
```

## 🎯 Algorithms

### 1. Audio DNA Matching
Uses weighted Euclidean distance across 10 audio features:
```
similarity = 1 / (1 + √(Σ wᵢ(xᵢ - yᵢ)²))
```

### 2. Discovery Score
Inverse popularity metric with bonuses:
```
score = 100 - popularity + hiddenGemBonus + freshReleaseBonus
```

### 3. Multi-Strategy Orchestration
- **40%** Audio DNA Similarity (exploitation)
- **30%** Hidden Gems (smart exploitation)
- **30%** Exploratory (exploration)

Adjusted by serendipity level.

### 4. Feedback Learning
Exponential moving average with time-decay:
```
newPref = oldPref × (1 - α) + trackValue × α
weight = exp(-age / τ)
```

See [ALGORITHMS.md](./ALGORITHMS.md) for detailed explanations.

## 🎨 Features in Detail

### Serendipity Slider
Control recommendation adventurousness with 5 preset modes:
- 🏠 **Comfort Zone** (10%): Stick to what you know
- 🧭 **Gentle Explorer** (30%): Safe variations
- ⚖️ **Balanced** (50%): Mix of familiar and new
- 🤿 **Deep Diver** (70%): Venture into new territory
- 🗺️ **Treasure Hunter** (90%): Maximum exploration

### Discovery Score Badges
Visual indicators of how undiscovered each track is:
- 💎 **Hidden Gem** (80-100): Almost nobody knows
- ✨ **Undiscovered** (60-79): Flying under radar
- 🌟 **Emerging** (40-59): Gaining attention
- 🎵 **Known** (0-39): Well-established

### Audio Similarity Radar
Interactive radar chart showing:
- 8 audio feature comparisons
- User preference overlay
- Track feature overlay
- Feature match percentages
- Top 3 matching features
- Human-readable explanation

### Connection Graph
D3.js force-directed graph:
- **Nodes**: User tracks (blue) and recommendations (green)
- **Edges**: Audio DNA similarity (thickness = strength)
- **Layouts**: Force, Radial, Hierarchical
- **Interactive**: Drag, zoom, pan, click for details

## 🚀 Performance

### Optimizations
- **GPU Instancing**: Render thousands of objects efficiently
- **Level-of-Detail (LOD)**: Reduce complexity for distant objects
- **Frustum Culling**: Only render visible objects
- **Object Pooling**: Reuse objects instead of creating new ones
- **Lazy Loading**: Load recommendations incrementally
- **Web Workers**: Run ML computations in background
- **IndexedDB**: Fast local data storage

### Benchmarks
- **60 FPS** on high-end devices (RTX 3060+)
- **30-45 FPS** on mid-range devices (GTX 1660+)
- **20-30 FPS** on low-end devices (integrated graphics)
- **Mobile**: Adaptive quality settings

### Lighthouse Scores
- **Performance**: 90+
- **Accessibility**: 95+
- **Best Practices**: 95+
- **SEO**: 100

## 📱 Mobile Support

Fully responsive with mobile-specific optimizations:
- Touch controls for visualizer
- Reduced particle counts
- Lower quality settings
- Adaptive layouts
- Optimized API calls

## 🔐 Privacy & Security

- **No Data Collection**: We don't store or sell your data
- **Local Storage**: All learning happens in your browser
- **Spotify OAuth**: Secure authentication
- **HTTPS**: Encrypted connections
- **Open Source**: Transparent algorithms

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

See [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed guidelines.

## 🐛 Known Issues

### Spotify API Limitations
- **Development Mode**: Max 25 approved users
- **Deprecated Endpoints**: `/recommendations` returns 403
- **Fallback Active**: Uses library-based algorithm when API unavailable

### Browser Compatibility
- **Safari**: Limited WebGL support on iOS
- **Firefox**: Performance may vary
- **Chrome/Edge**: Recommended for best experience

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for solutions.

## 📚 Documentation

- **[ALGORITHMS.md](./ALGORITHMS.md)**: Detailed algorithm explanations
- **[INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md)**: How to integrate components
- **[DEVELOPER_SETUP.md](./DEVELOPER_SETUP.md)**: Development setup guide
- **[CODEBASE_ANALYSIS.md](./CODEBASE_ANALYSIS.md)**: Codebase overview
- **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)**: Common issues and solutions

## 🎓 Learn More

### Academic References
- [Music Information Retrieval](https://en.wikipedia.org/wiki/Music_information_retrieval)
- [Collaborative Filtering](https://en.wikipedia.org/wiki/Collaborative_filtering)
- [Content-Based Filtering](https://en.wikipedia.org/wiki/Recommender_system#Content-based_filtering)

### Technologies
- [Vue 3 Documentation](https://vuejs.org/)
- [Three.js Documentation](https://threejs.org/docs/)
- [TensorFlow.js Documentation](https://www.tensorflow.org/js)
- [Spotify Web API](https://developer.spotify.com/documentation/web-api/)
- [D3.js Documentation](https://d3js.org/)

## 🌟 Roadmap

### Phase 1: Core Features ✅
- [x] Spotify OAuth integration
- [x] Basic recommendation engine
- [x] 11 visualization modes
- [x] Responsive UI

### Phase 2: ML & Learning ✅
- [x] TensorFlow.js integration
- [x] Audio DNA matching
- [x] Feedback learning system
- [x] Serendipity slider
- [x] Discovery score

### Phase 3: Advanced Features (In Progress)
- [x] 3 new visualization modes
- [x] Connection graph
- [x] Learning dashboard
- [ ] Lyric analysis (NLP)
- [ ] Collaborative filtering
- [ ] AI music companion

### Phase 4: Enhancements (Planned)
- [ ] WebXR/VR mode
- [ ] Export visualizations as video
- [ ] Real-time collaborative viewing
- [ ] Generative AI album art
- [ ] Music theory analysis
- [ ] Podcast discovery

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Spotify** for the amazing Web API
- **Three.js** team for incredible 3D library
- **TensorFlow.js** team for bringing ML to the browser
- **Vue.js** team for the reactive framework
- **D3.js** team for data visualization tools
- **Open source community** for inspiration and support

## 📞 Contact

**Ritvik Vasikarla** - [@ritvikv03](https://github.com/ritvikv03)

Project Link: [https://github.com/ritvikv03/Spotify-Visualizer-Recommendation](https://github.com/ritvikv03/Spotify-Visualizer-Recommendation)

---

## 🎉 Star History

[![Star History Chart](https://api.star-history.com/svg?repos=ritvikv03/Spotify-Visualizer-Recommendation&type=Date)](https://star-history.com/#ritvikv03/Spotify-Visualizer-Recommendation&Date)

---

**Made with ❤️ and lots of ☕**

**Discover music the way it was meant to be discovered: by audio, not algorithms.**
