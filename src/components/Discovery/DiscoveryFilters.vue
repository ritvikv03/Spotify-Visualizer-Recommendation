<template>
  <div class="card">
    <h3 class="text-xl font-semibold mb-4 flex items-center gap-2">
       Discovery Filters
      <button @click="resetFilters" class="text-xs text-gray-400 hover:text-white ml-auto">
        Reset All
      </button>
    </h3>
    
    <div class="space-y-4">
      <!-- Popularity Range -->
      <div>
        <label class="text-sm text-gray-400 flex justify-between mb-2">
          <span>Max Popularity</span>
          <span class="text-spotify-green">{{ filters.maxPopularity }}%</span>
        </label>
        <input 
          type="range" 
          v-model="filters.maxPopularity" 
          min="0" 
          max="100" 
          class="w-full accent-spotify-green"
          @input="emitFilters"
        />
        <p class="text-xs text-gray-500 mt-1">Lower = more hidden gems</p>
      </div>

      <!-- Energy Level -->
      <div>
        <label class="text-sm text-gray-400 flex justify-between mb-2">
          <span>Energy Level</span>
          <span class="text-spotify-green">{{ (filters.targetEnergy * 100).toFixed(0) }}%</span>
        </label>
        <input 
          type="range" 
          v-model="filters.targetEnergy" 
          min="0" 
          max="1" 
          step="0.01"
          class="w-full accent-spotify-green"
          @input="emitFilters"
        />
        <div class="flex justify-between text-xs text-gray-500 mt-1">
          <span>Calm</span>
          <span>Energetic</span>
        </div>
      </div>

      <!-- Danceability -->
      <div>
        <label class="text-sm text-gray-400 flex justify-between mb-2">
          <span>Danceability</span>
          <span class="text-spotify-green">{{ (filters.targetDanceability * 100).toFixed(0) }}%</span>
        </label>
        <input 
          type="range" 
          v-model="filters.targetDanceability" 
          min="0" 
          max="1" 
          step="0.01"
          class="w-full accent-spotify-green"
          @input="emitFilters"
        />
        <div class="flex justify-between text-xs text-gray-500 mt-1">
          <span>Chill</span>
          <span>Groovy</span>
        </div>
      </div>

      <!-- Valence (Mood) -->
      <div>
        <label class="text-sm text-gray-400 flex justify-between mb-2">
          <span>Mood</span>
          <span class="text-spotify-green">{{ (filters.targetValence * 100).toFixed(0) }}%</span>
        </label>
        <input 
          type="range" 
          v-model="filters.targetValence" 
          min="0" 
          max="1" 
          step="0.01"
          class="w-full accent-spotify-green"
          @input="emitFilters"
        />
        <div class="flex justify-between text-xs text-gray-500 mt-1">
          <span>Sad</span>
          <span>Happy</span>
        </div>
      </div>

      <!-- Year Range -->
      <div>
        <label class="text-sm text-gray-400 flex justify-between mb-2">
          <span>Year Range</span>
          <span class="text-spotify-green">{{ filters.minYear }} - {{ filters.maxYear }}</span>
        </label>
        <div class="flex gap-2">
          <input 
            type="number" 
            v-model="filters.minYear" 
            min="1950" 
            :max="filters.maxYear"
            class="w-1/2 bg-spotify-dark px-3 py-2 rounded text-sm"
            @input="emitFilters"
          />
          <input 
            type="number" 
            v-model="filters.maxYear" 
            :min="filters.minYear"
            max="2025"
            class="w-1/2 bg-spotify-dark px-3 py-2 rounded text-sm"
            @input="emitFilters"
          />
        </div>
      </div>

      <!-- Genre Selection -->
      <div>
        <label class="text-sm text-gray-400 mb-2 block">Genre Focus</label>
        <select 
          v-model="filters.genre" 
          class="w-full bg-spotify-dark px-3 py-2 rounded text-sm"
          @change="emitFilters"
        >
          <option value="">All Genres</option>
          <option value="indie">Indie</option>
          <option value="rock">Rock</option>
          <option value="electronic">Electronic</option>
          <option value="hip-hop">Hip Hop</option>
          <option value="pop">Pop</option>
          <option value="jazz">Jazz</option>
          <option value="classical">Classical</option>
          <option value="folk">Folk</option>
          <option value="metal">Metal</option>
          <option value="r-n-b">R&B</option>
        </select>
      </div>

      <!-- Acousticness -->
      <div>
        <label class="text-sm text-gray-400 mb-2 flex items-center gap-2">
          <input 
            type="checkbox" 
            v-model="filters.useAcousticness"
            class="accent-spotify-green"
            @change="emitFilters"
          />
          <span>Acoustic Filter</span>
        </label>
        <input 
          v-if="filters.useAcousticness"
          type="range" 
          v-model="filters.targetAcousticness" 
          min="0" 
          max="1" 
          step="0.01"
          class="w-full accent-spotify-green"
          @input="emitFilters"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive } from 'vue'

const emit = defineEmits(['update'])

const filters = reactive({
  maxPopularity: 100,
  targetEnergy: 0.5,
  targetDanceability: 0.5,
  targetValence: 0.5,
  minYear: 1980,
  maxYear: 2025,
  genre: '',
  useAcousticness: false,
  targetAcousticness: 0.5
})

const emitFilters = () => {
  emit('update', { ...filters })
}

const resetFilters = () => {
  filters.maxPopularity = 100
  filters.targetEnergy = 0.5
  filters.targetDanceability = 0.5
  filters.targetValence = 0.5
  filters.minYear = 1980
  filters.maxYear = 2025
  filters.genre = ''
  filters.useAcousticness = false
  filters.targetAcousticness = 0.5
  emitFilters()
}
</script>

<style scoped>
input[type="range"] {
  height: 6px;
  border-radius: 3px;
  background: #282828;
  outline: none;
}

input[type="range"]::-webkit-slider-thumb {
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #1DB954;
  cursor: pointer;
}

input[type="range"]::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #1DB954;
  cursor: pointer;
  border: none;
}
</style>