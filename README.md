# 🎵 Spotify Discovery Visualizer & Organic Recommender

A revolutionary music discovery platform combining cutting-edge 3D visualization with ML-powered recommendations that find hidden gems based purely on audio DNA—completely free from popularity bias.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Vue](https://img.shields.io/badge/Vue-3.4-green.svg)
![TensorFlow](https://img.shields.io/badge/TensorFlow.js-4.x-orange.svg)
![Three.js](https://img.shields.io/badge/Three.js-0.160-purple.svg)

## Introduction  
A music discovery and visualization platform that connects with the Spotify Web API to generate **personalized, audio-feature-based recommendations**. Combines 3D visualizations, machine-learning-driven recommendation engines, and interactive dashboards to help users uncover musical "hidden gems."

🌐 [Live Demo](https://spotify-recommender-visualizer.vercel.app/discover)  
📦 [GitHub Repository](https://github.com/ritvikv03/Spotify-Visualizer-Recommendation)

---

## Table of Contents  
- [Installation](#installation)  
- [Usage](#usage)  
- [Features](#features)  
- [Dependencies](#dependencies)  
- [Configuration](#configuration)  
- [Architecture & Tech Stack](#architecture--tech-stack)  
- [Screenshots](#screenshots)  
- [Examples](#examples)  
- [Troubleshooting](#troubleshooting)  
- [Contributing](#contributing)  
- [License](#license)  
- [Contact & Acknowledgments](#contact--acknowledgments)

---

## Installation

### Prerequisites  
- Node.js 16+  
- Spotify Developer Account  
- Modern browser (WebGL support required)

### Setup  
```bash
# Clone the repo
git clone https://github.com/ritvikv03/Spotify-Visualizer-Recommendation.git
cd Spotify-Visualizer-Recommendation

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env to include your Spotify Client ID and Redirect URI

# Start dev server
npm run dev
```
Navigate to `http://localhost:8888` in your browser.

---

## Usage

1. Click **Login with Spotify** to authenticate.  
2. Adjust the **Serendipity Slider** to set exploration level.  
3. Browse recommended tracks with visual badges and radar charts.  
4. Open the **Visualizer** tab to explore 3D audio-reactive visualizations.  
5. Explore the **Connection Graph** to see audio-similarity links between tracks.  
6. Review and reset your discovery journey in the **Learning Dashboard**.

---

## Features

- 🎯 **Serendipity Slider**: Tune how adventurous your recommendations are.
- 🔍 **Discovery Score Badges**: "Hidden Gem", "Undiscovered", "Emerging", etc.
- 📊 **Audio Similarity Radar**: Compare track audio features with your taste profile.
- 🌐 **Connection Graph**: Force-directed, radial, and hierarchical relationship graphs.
- 🧠 **ML-Powered Recommendations**: Learns from your "like" and "pass" feedback.
- 🖼 **3D Visualizations**: Built with Three.js, responsive and audio-reactive.
- 🔒 **Privacy-First**: No data is sent to external servers; local storage only.

---

## Dependencies

- Vue 3 (Composition API)  
- Vite  
- Tailwind CSS  
- Pinia  
- Three.js  
- Tone.js  
- D3.js  
- TensorFlow.js  
- Spotify Web API  
- IndexedDB (`idb`) and LocalStorage  

---

## Configuration

Create and edit your `.env` file:
```env
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_REDIRECT_URI=http://localhost:8888/callback
```

You can also configure recommendation parameters:
```js
const options = {
  serendipityLevel: 0.5,
  maxPopularity: 60,
  limit: 50,
  maxPerArtist: 2
};
```

---

## Architecture & Tech Stack

```
UI (Vue + Tailwind + Framer Motion)
  ↕
State Management (Pinia)
  ↕
Recommendation Engines (TF.js + Feedback Engine)
  ↕
Spotify Web API
  ↕
3D Visualizer (Three.js + Tone.js)
```

---

## Screenshots

> Add your images in the `assets/` folder and reference them here

![Discover Page](assets/discover-screenshot.png)  
*User Dashboard and Serendipity Controls*

![Visualizer](assets/visualizer-screenshot.png)  
*Audio Reactive Visualizer in Action*

![Graph](assets/graph-screenshot.png)  
*Track Connection Graph Visualization*

---

## Examples

- 🎵 Visualizing recommendations using the 3D Audio Visualizer  
- 🧭 Exploring new artists with high serendipity setting  
- 🧬 Viewing radar charts of your listening "DNA"  
- 🕸 Navigating the connection graph between your saved tracks and new finds

---

## Troubleshooting

- **WebGL issues** on Safari or Firefox: Use latest Chrome/Edge for best results.  
- **403 Spotify API errors**: Check if your Spotify app has correct scopes and redirect URI.  
- **Slow performance**: Lower visualization quality or turn off animations.

---

## Contributing

Contributions welcome!

```bash
# Fork the repository
# Create a new branch
git checkout -b feature/your-feature

# Make changes, commit and push
git commit -m "Add new feature"
git push origin feature/your-feature
```

Then open a Pull Request.

Please refer to [`CONTRIBUTING.md`](CONTRIBUTING.md) for guidelines.

---

## License

Licensed under the [MIT License](LICENSE).

---

## Contact & Acknowledgments

**Author**: [Ritvik Vasikarla](https://github.com/ritvikv03)

Thanks to:
- Spotify Web API  
- Open source libraries: Vue, Three.js, TensorFlow.js, Tone.js, D3.js  
- The creative coding community for inspiration

---


---

**Made with ❤️ and lots of ☕**

**Discover music the way it was meant to be discovered: by audio, not algorithms.**
