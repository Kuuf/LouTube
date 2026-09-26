<template>
  <div
    :class="{
      grid: grid,
      list: !grid
    }"
    :style="grid && columns ? { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` } : null"
  >
    <slot />
  </div>
</template>

<script setup>
defineProps({
  grid: {
    type: Boolean,
    required: true
  },
  columns: {
    // Fixed column count for grid mode. null (default) = as many as fit.
    type: Number,
    default: null
  }
})
</script>

<style scoped src="./FtAutoGrid.css" />
