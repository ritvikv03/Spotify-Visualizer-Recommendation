<template>
  <div class="bg-spotify-dark p-3 sm:p-4 rounded-lg animate-pulse">
    <div class="flex items-start gap-3 mb-2">
      <!-- Album art skeleton -->
      <div class="w-14 h-14 sm:w-12 sm:h-12 bg-gray-700 rounded flex-shrink-0"></div>

      <!-- Track info skeleton -->
      <div class="flex-1 min-w-0 space-y-2">
        <!-- Track name -->
        <div class="h-4 bg-gray-700 rounded w-3/4"></div>
        <!-- Artist name -->
        <div class="h-3 bg-gray-700 rounded w-1/2"></div>
      </div>

      <!-- Action buttons skeleton -->
      <div class="flex gap-2">
        <div class="w-8 h-8 bg-gray-700 rounded-full"></div>
        <div class="w-8 h-8 bg-gray-700 rounded-full"></div>
      </div>
    </div>

    <!-- Badges skeleton -->
    <div class="mt-2 flex items-center gap-1.5">
      <div class="h-6 bg-gray-700 rounded w-20"></div>
      <div class="h-6 bg-gray-700 rounded w-16"></div>
    </div>
  </div>
</template>

<script setup>
// No props or logic needed for skeleton
</script>
