<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.3-.3-.4-.5-.8-.5-1.2 0-.8.7-1.5 1.5-1.5H16c3.3 0 6-2.7 6-6 0-4.9-4.5-8-10-8z" :stroke="color" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="6.5" cy="11.5" r="1.5" :fill="color"/>
    <circle cx="9.5" cy="7.5" r="1.5" :fill="color"/>
    <circle cx="14.5" cy="7.5" r="1.5" :fill="color"/>
    <circle cx="17.5" cy="11.5" r="1.5" :fill="color"/>
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
