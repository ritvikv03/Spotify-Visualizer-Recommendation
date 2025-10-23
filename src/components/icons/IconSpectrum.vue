<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="8" width="2" height="8" :fill="color" opacity="0.8">
      <animate attributeName="height" values="8;16;8" dur="0.6s" repeatCount="indefinite" />
      <animate attributeName="y" values="8;4;8" dur="0.6s" repeatCount="indefinite" />
    </rect>
    <rect x="6" y="6" width="2" height="12" :fill="color" opacity="0.9">
      <animate attributeName="height" values="12;18;12" dur="0.7s" repeatCount="indefinite" />
      <animate attributeName="y" values="6;3;6" dur="0.7s" repeatCount="indefinite" />
    </rect>
    <rect x="10" y="4" width="2" height="16" :fill="color">
      <animate attributeName="height" values="16;20;16" dur="0.5s" repeatCount="indefinite" />
      <animate attributeName="y" values="4;2;4" dur="0.5s" repeatCount="indefinite" />
    </rect>
    <rect x="14" y="7" width="2" height="10" :fill="color" opacity="0.9">
      <animate attributeName="height" values="10;16;10" dur="0.8s" repeatCount="indefinite" />
      <animate attributeName="y" values="7;4;7" dur="0.8s" repeatCount="indefinite" />
    </rect>
    <rect x="18" y="9" width="2" height="6" :fill="color" opacity="0.8">
      <animate attributeName="height" values="6;14;6" dur="0.6s" repeatCount="indefinite" />
      <animate attributeName="y" values="9;5;9" dur="0.6s" repeatCount="indefinite" />
    </rect>
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
