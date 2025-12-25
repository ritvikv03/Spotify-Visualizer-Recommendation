# Contributing to Spotify Discovery Platform

Thank you for your interest in contributing to the Spotify Discovery Platform! This document provides guidelines and instructions for contributing to this project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Standards](#code-standards)
- [Testing Requirements](#testing-requirements)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Project Structure](#project-structure)
- [Reporting Issues](#reporting-issues)

---

## Code of Conduct

This project adheres to a Code of Conduct that all contributors are expected to follow. Please read [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) before contributing.

**TL;DR:** Be respectful, inclusive, and constructive. We're building something great together.

---

## Getting Started

### Prerequisites

- **Node.js** 18+ (LTS recommended)
- **npm** 9+ or **pnpm** 8+
- **Git** 2.x
- **Spotify Developer Account** (for testing)
- **Modern browser** (Chrome/Edge recommended for development)

### Fork and Clone

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/Spotify-Visualizer-Recommendation.git
   cd Spotify-Visualizer-Recommendation
   ```

3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/ritvikv03/Spotify-Visualizer-Recommendation.git
   ```

4. **Install dependencies**:
   ```bash
   npm install
   ```

5. **Set up environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your Spotify credentials
   ```

6. **Start development server**:
   ```bash
   npm run dev
   ```

### Spotify API Setup

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create a new application
3. Add redirect URI: `http://localhost:8888/callback`
4. Copy **Client ID** to `.env` file
5. Add your Spotify account to the app's user allowlist

---

## Development Workflow

### 1. Sync with Upstream

Before starting work, ensure your fork is up to date:

```bash
git checkout main
git fetch upstream
git merge upstream/main
git push origin main
```

### 2. Create Feature Branch

Use descriptive branch names following this convention:

```bash
# Features
git checkout -b feature/add-playlist-collaboration

# Bug fixes
git checkout -b fix/auth-token-refresh

# Documentation
git checkout -b docs/update-api-reference

# Refactoring
git checkout -b refactor/optimize-ml-inference
```

### 3. Make Changes

- Write clean, readable code following our [Code Standards](#code-standards)
- Add tests for new functionality
- Update documentation as needed
- Test thoroughly in development environment

### 4. Test Your Changes

```bash
# Run all tests
npm run test

# Run specific test suites
npm run test:unit
npm run test:e2e

# Check code quality
npm run lint
npm run format

# Build to ensure no errors
npm run build
```

### 5. Commit Changes

Follow our [Commit Guidelines](#commit-guidelines):

```bash
git add .
git commit -m "feat: add playlist collaboration feature"
```

### 6. Push and Create PR

```bash
git push origin feature/add-playlist-collaboration
```

Then create a Pull Request on GitHub following our [PR Process](#pull-request-process).

---

## Code Standards

### JavaScript/Vue Style Guide

We follow a modified **Airbnb JavaScript Style Guide** with Vue-specific conventions:

#### General Principles

1. **Clarity over cleverness** - Code should be self-documenting
2. **Consistency** - Follow existing patterns in the codebase
3. **Performance-conscious** - Avoid unnecessary re-renders and computations
4. **Error handling** - Always handle errors gracefully with user-friendly messages

#### Vue Component Standards

**Single File Component Structure:**
```vue
<script setup>
// 1. Imports (external, then internal)
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import spotifyService from '@/services/spotify'

// 2. Props and emits
const props = defineProps({
  trackId: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['update', 'error'])

// 3. Reactive state
const isLoading = ref(false)
const track = ref(null)

// 4. Computed properties
const trackDuration = computed(() => {
  return track.value ? formatDuration(track.value.duration_ms) : '0:00'
})

// 5. Methods
async function fetchTrack() {
  isLoading.value = true
  try {
    track.value = await spotifyService.getTrack(props.trackId)
    emit('update', track.value)
  } catch (error) {
    console.error('Failed to fetch track:', error)
    emit('error', error)
  } finally {
    isLoading.value = false
  }
}

// 6. Lifecycle hooks
onMounted(() => {
  fetchTrack()
})
</script>

<template>
  <!-- Clean, semantic HTML -->
  <div class="track-card">
    <div v-if="isLoading" class="loading-skeleton" />
    <div v-else-if="track" class="track-content">
      <img :src="track.album.images[0]?.url" :alt="track.name" loading="lazy">
      <h3>{{ track.name }}</h3>
      <p>{{ track.artists.map(a => a.name).join(', ') }}</p>
      <span>{{ trackDuration }}</span>
    </div>
    <div v-else class="error-state">
      Track not found
    </div>
  </div>
</template>

<style scoped>
/* Tailwind + custom styles */
.track-card {
  @apply rounded-lg shadow-md p-4 bg-white dark:bg-gray-800;
}

.loading-skeleton {
  @apply animate-pulse bg-gray-200 dark:bg-gray-700 h-48 rounded;
}
</style>
```

#### Service Layer Standards

**Service modules should:**
- Export a single class or singleton instance
- Handle errors internally with try/catch
- Return consistent data structures
- Include JSDoc comments for public methods

**Example:**
```javascript
/**
 * Spotify API client for recommendation operations
 * Handles authentication, rate limiting, and error recovery
 */
export class SpotifyService {
  /**
   * Fetch user's top tracks for a given time range
   *
   * @param {string} timeRange - 'short_term', 'medium_term', or 'long_term'
   * @param {number} limit - Number of tracks to fetch (max 50)
   * @returns {Promise<Object>} Response with items array
   * @throws {Error} When authentication fails or API is unavailable
   */
  async getUserTopTracks(timeRange = 'medium_term', limit = 20) {
    try {
      const response = await this.api.get('/me/top/tracks', {
        params: { time_range: timeRange, limit }
      })
      return response.data
    } catch (error) {
      console.error('Failed to fetch top tracks:', error)
      throw new Error('Unable to load your top tracks. Please try again.')
    }
  }
}
```

### Code Quality Checks

All code must pass the following checks before merging:

```bash
# ESLint (no errors, warnings acceptable with justification)
npm run lint

# Prettier formatting
npm run format

# Type safety (if using TypeScript in the future)
npm run type-check

# Build verification
npm run build
```

---

## Testing Requirements

### Testing Philosophy

- **Write tests that provide value** - Don't test framework code
- **Focus on behavior, not implementation** - Tests should survive refactoring
- **Test at the appropriate level** - Unit tests for logic, E2E for user flows
- **Keep tests fast** - Mock external dependencies

### Test Coverage Requirements

For new code contributions:

- **Critical services**: 80%+ coverage (recommendation engines, auth, API clients)
- **UI components**: 60%+ coverage (user interactions, computed properties)
- **Utility functions**: 90%+ coverage (pure functions, data transformations)

### Writing Unit Tests

**Example: Testing a service function**
```javascript
// src/services/__tests__/mlRecommendationEngine.test.js
import { describe, it, expect, beforeEach } from 'vitest'
import mlRecommendationEngine from '../mlRecommendationEngine'

describe('MLRecommendationEngine', () => {
  beforeEach(() => {
    // Reset state before each test
  })

  describe('calculateDiscoveryScore', () => {
    it('should return high score for low-popularity tracks', () => {
      const track = { popularity: 10 }
      const score = mlRecommendationEngine.calculateDiscoveryScore(track)
      expect(score).toBeGreaterThan(80)
    })

    it('should add bonus for recent releases by unknown artists', () => {
      const recentTrack = {
        popularity: 20,
        album: { release_date: '2024-12-01' }
      }
      const oldTrack = {
        popularity: 20,
        album: { release_date: '2010-01-01' }
      }

      const recentScore = mlRecommendationEngine.calculateDiscoveryScore(recentTrack)
      const oldScore = mlRecommendationEngine.calculateDiscoveryScore(oldTrack)

      expect(recentScore).toBeGreaterThan(oldScore)
    })
  })
})
```

### Writing Component Tests

**Example: Testing a Vue component**
```javascript
// src/components/__tests__/SerendipitySlider.test.js
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SerendipitySlider from '../SerendipitySlider.vue'

describe('SerendipitySlider', () => {
  it('should render with default value', () => {
    const wrapper = mount(SerendipitySlider, {
      props: { modelValue: 50 }
    })

    expect(wrapper.find('input[type="range"]').element.value).toBe('50')
  })

  it('should emit update event on slider change', async () => {
    const wrapper = mount(SerendipitySlider, {
      props: { modelValue: 50 }
    })

    const slider = wrapper.find('input[type="range"]')
    await slider.setValue(75)

    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')[0]).toEqual([75])
  })
})
```

---

## Commit Guidelines

We follow **Conventional Commits** specification for clear, semantic commit history.

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- **feat**: New feature for the user
- **fix**: Bug fix for the user
- **docs**: Documentation changes
- **style**: Code style changes (formatting, missing semi-colons, etc.)
- **refactor**: Code refactoring without feature changes
- **perf**: Performance improvements
- **test**: Adding or updating tests
- **build**: Changes to build system or dependencies
- **ci**: Changes to CI/CD configuration
- **chore**: Other changes that don't modify src or test files

### Scopes

Common scopes in this project:

- **auth**: Authentication/authorization
- **recommendations**: Recommendation engines
- **visualizer**: 3D visualization components
- **ui**: User interface components
- **api**: Spotify API integration
- **ml**: Machine learning features
- **storage**: IndexedDB/LocalStorage
- **pwa**: Progressive Web App features

### Examples

**Good commits:**
```bash
feat(recommendations): add collaborative filtering algorithm

Implements user-user collaborative filtering to complement
existing content-based recommendations. Uses cosine similarity
on user taste profiles.

Closes #42

---

fix(auth): handle token refresh race condition

Prevents multiple simultaneous refresh requests by queuing
token refresh operations.

Fixes #58

---

perf(visualizer): optimize Three.js scene disposal

Reduces memory leaks by properly disposing geometries,
materials, and textures on component unmount.

---

docs(api): add JSDoc comments to spotify service

Improves developer experience with comprehensive API
documentation including parameter types and examples.
```

**Bad commits:**
```bash
# ❌ Too vague
fix: bug fix

# ❌ Not descriptive enough
feat: new feature

# ❌ Multiple unrelated changes
feat: add dark mode, fix auth bug, update readme

# ❌ Imperative mood violated
fixed the authentication bug
```

---

## Pull Request Process

### PR Checklist

Before submitting a PR, ensure:

- [ ] Code follows project style guidelines
- [ ] All tests pass (`npm run test`)
- [ ] Code is linted and formatted (`npm run lint && npm run format`)
- [ ] Documentation is updated (README, JSDoc comments)
- [ ] Commit messages follow conventional commits
- [ ] PR description clearly explains changes
- [ ] Screenshots/videos included for UI changes
- [ ] Breaking changes are documented

### PR Template

When creating a PR, use this template:

```markdown
## Description
Brief description of what this PR does.

## Type of Change
- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Related Issues
Closes #(issue number)

## Changes Made
- Change 1
- Change 2
- Change 3

## Testing
Describe the tests you ran and how to reproduce:
1. Step 1
2. Step 2
3. Expected result

## Screenshots (if applicable)
[Add screenshots or videos of UI changes]

## Checklist
- [ ] My code follows the project's style guidelines
- [ ] I have performed a self-review of my code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have updated the documentation accordingly
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix/feature works
- [ ] New and existing tests pass locally
```

### Review Process

1. **Automated Checks**: CI/CD pipeline runs tests, linting, build
2. **Code Review**: Maintainer reviews code quality, logic, tests
3. **Feedback**: Address any requested changes
4. **Approval**: Once approved, PR will be merged

**Review criteria:**
- Code quality and readability
- Test coverage and quality
- Performance implications
- Security considerations
- Documentation completeness

---

## Project Structure

Understanding the project structure helps you navigate the codebase:

```
src/
├── main.js                     # Application entry point
├── App.vue                     # Root component
├── router/                     # Vue Router configuration
│   └── index.js               # Route definitions
├── stores/                     # Pinia state management
│   ├── auth.js                # Authentication store
│   └── theme.js               # Theme store
├── services/                   # Business logic layer
│   ├── spotify.js             # Spotify API client
│   ├── recommendationEngine.js        # Traditional recommendations
│   ├── mlRecommendationEngine.js      # ML-based recommendations
│   ├── youtubeMusicInspiredEngine.js  # Contextual recommendations
│   ├── feedbackLearningEngine.js      # Learning from feedback
│   └── recommendationOrchestrator.js  # Multi-armed bandit orchestrator
├── utils/                      # Utility functions
│   ├── trackPlayability.js    # Track validation utilities
│   └── recommendationCache.js # Caching utilities
├── components/                 # Reusable Vue components
│   ├── Discovery/             # Discovery feature components
│   │   ├── SerendipitySlider.vue
│   │   ├── DiscoveryScoreBadge.vue
│   │   ├── AudioSimilarityRadar.vue
│   │   ├── ConnectionGraph.vue
│   │   └── ...
│   └── Visualizer/            # 3D visualization components
│       ├── MusicVisualizer.vue
│       ├── CosmicVisualizer.vue
│       └── ...
└── views/                      # Route-level components
    ├── Home.vue               # Landing page
    ├── Callback.vue           # OAuth callback
    └── Discover.vue           # Main discovery view
```

### Key Architectural Patterns

1. **Service Layer Pattern**: Business logic isolated from UI
2. **Strategy Pattern**: Multiple recommendation algorithms
3. **Observer Pattern**: Pinia stores for reactive state
4. **Facade Pattern**: Orchestrator simplifies multi-engine coordination
5. **Singleton Pattern**: Service instances shared across app

---

## Reporting Issues

### Bug Reports

When reporting bugs, include:

1. **Clear title**: Summarize the issue
2. **Description**: What happened vs. what should happen
3. **Steps to reproduce**: Detailed steps (numbered list)
4. **Expected behavior**: What you expected to see
5. **Actual behavior**: What actually happened
6. **Environment**:
   - Browser and version
   - Operating system
   - Node.js version
   - Any relevant console errors
7. **Screenshots/Videos**: If applicable

**Example bug report:**
```markdown
**Browser:** Chrome 120.0.6099.129
**OS:** macOS 14.2
**Node.js:** v18.18.0

**Steps to Reproduce:**
1. Navigate to /discover
2. Click "Generate Recommendations"
3. Observe error in console

**Expected:** Recommendations should load
**Actual:** Console shows "Cannot read property 'id' of undefined"

**Console Error:**
```
TypeError: Cannot read property 'id' of undefined
  at mlRecommendationEngine.js:342
```

**Screenshot:** [attach screenshot]
```

### Feature Requests

When requesting features:

1. **Use case**: Describe the problem you're trying to solve
2. **Proposed solution**: How you envision it working
3. **Alternatives**: Other approaches you've considered
4. **Additional context**: Mockups, examples from other apps

---

## Development Best Practices

### Performance Considerations

- **Lazy load** heavy dependencies (Three.js, TensorFlow.js)
- **Memoize** expensive computations with `computed` or `useMemo`
- **Debounce** user input handlers (search, sliders)
- **Paginate** or virtualize long lists
- **Dispose** Three.js resources on component unmount

### Security Best Practices

- **Never commit** API keys, tokens, or secrets
- **Validate** all user input before processing
- **Sanitize** data before rendering (prevent XSS)
- **Use** OAuth PKCE flow (no client secrets in frontend)
- **Set** appropriate CSP headers

### Accessibility

- **Use semantic HTML** (`<button>`, `<nav>`, `<main>`)
- **Add ARIA labels** for screen readers
- **Ensure keyboard navigation** works
- **Maintain color contrast** ratios (WCAG AA minimum)
- **Provide text alternatives** for visual content

---

## Community

- **GitHub Discussions**: Ask questions, share ideas
- **Issues**: Report bugs, request features
- **Pull Requests**: Contribute code improvements

We appreciate your contributions and look forward to collaborating with you!

---

**Thank you for contributing to the Spotify Discovery Platform!**
