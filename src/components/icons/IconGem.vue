<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M6 3h12l4 6-10 12L2 9l4-6z" :stroke="color" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M6 3L2 9h20L18 3M2 9l10 12L22 9" :stroke="color" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
</template>

<script setup>
defineProps({
  size: {
    type: [String, Number],
    default: 24
  },
  color: {
    type: String,
    default: 'currentColor'
  }
})
</script>
