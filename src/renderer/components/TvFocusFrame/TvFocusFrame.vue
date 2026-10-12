<template>
  <div
    class="focusFrame"
    :class="{ shown: focusFrame.shown, sliding: focusFrame.sliding }"
    :style="{
      translate: `${focusFrame.x}px ${focusFrame.y}px`,
      inlineSize: `${focusFrame.width}px`,
      blockSize: `${focusFrame.height}px`,
      '--frame-duration': `${focusFrame.duration}ms`,
    }"
  />
</template>

<script setup>
import { focusFrame } from '../../helpers/spatialNav/NavManager'
</script>

<style scoped src="./TvFocusFrame.css" />
