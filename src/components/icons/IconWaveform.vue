<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M2 12 Q 6 8, 12 12 T 22 12" :stroke="color" stroke-width="2" fill="none" opacity="0.8">
      <animate attributeName="d"
        values="M2 12 Q 6 8, 12 12 T 22 12;M2 12 Q 6 16, 12 12 T 22 12;M2 12 Q 6 8, 12 12 T 22 12"
        dur="2s"
        repeatCount="indefinite" />
    </path>
    <path d="M2 12 Q 6 10, 12 12 T 22 12" :stroke="color" stroke-width="2" fill="none" opacity="0.5">
      <animate attributeName="d"
        values="M2 12 Q 6 10, 12 12 T 22 12;M2 12 Q 6 14, 12 12 T 22 12;M2 12 Q 6 10, 12 12 T 22 12"
        dur="1.5s"
        repeatCount="indefinite" />
    </path>
    <circle cx="12" cy="12" r="3" :stroke="color" stroke-width="1.5" fill="none" opacity="0.6">
      <animate attributeName="r" values="3;5;3" dur="2s" repeatCount="indefinite" />
      <animate attributeName="opacity" values="0.6;0.3;0.6" dur="2s" repeatCount="indefinite" />
    </circle>
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
