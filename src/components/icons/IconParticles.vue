<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="2" :fill="color" opacity="0.9">
      <animate attributeName="r" values="2;3;2" dur="1.5s" repeatCount="indefinite" />
    </circle>
    <circle cx="6" cy="6" r="1.5" :fill="color" opacity="0.7">
      <animate attributeName="cx" values="6;5;6" dur="2s" repeatCount="indefinite" />
      <animate attributeName="cy" values="6;5;6" dur="2s" repeatCount="indefinite" />
    </circle>
    <circle cx="18" cy="6" r="1.5" :fill="color" opacity="0.7">
      <animate attributeName="cx" values="18;19;18" dur="2.2s" repeatCount="indefinite" />
      <animate attributeName="cy" values="6;5;6" dur="2.2s" repeatCount="indefinite" />
    </circle>
    <circle cx="6" cy="18" r="1.5" :fill="color" opacity="0.7">
      <animate attributeName="cx" values="6;5;6" dur="1.8s" repeatCount="indefinite" />
      <animate attributeName="cy" values="18;19;18" dur="1.8s" repeatCount="indefinite" />
    </circle>
    <circle cx="18" cy="18" r="1.5" :fill="color" opacity="0.7">
      <animate attributeName="cx" values="18;19;18" dur="2.4s" repeatCount="indefinite" />
      <animate attributeName="cy" values="18;19;18" dur="2.4s" repeatCount="indefinite" />
    </circle>
    <line x1="12" y1="12" x2="6" y2="6" :stroke="color" stroke-width="0.5" opacity="0.3" />
    <line x1="12" y1="12" x2="18" y2="6" :stroke="color" stroke-width="0.5" opacity="0.3" />
    <line x1="12" y1="12" x2="6" y2="18" :stroke="color" stroke-width="0.5" opacity="0.3" />
    <line x1="12" y1="12" x2="18" y2="18" :stroke="color" stroke-width="0.5" opacity="0.3" />
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
