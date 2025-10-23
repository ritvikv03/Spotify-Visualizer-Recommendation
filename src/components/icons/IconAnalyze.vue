<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="3" :stroke="color" stroke-width="2"/>
    <path d="M12 2v4m0 12v4M2 12h4m12 0h4" :stroke="color" stroke-width="2" stroke-linecap="round"/>
    <path d="M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" :stroke="color" stroke-width="2" stroke-linecap="round" opacity="0.5"/>
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
