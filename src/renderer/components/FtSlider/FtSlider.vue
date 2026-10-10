<template>
  <div
    class="ftSlider"
    :class="{ disabled }"
    :style="{ '--fill': `${fillPercent}%` }"
  >
    <div class="header">
      <label
        class="label"
        :for="id"
      >
        {{ label }}
      </label>
      <span
        class="value"
        aria-hidden="true"
      >
        {{ displayLabel }}
      </span>
    </div>
    <input
      :id="id"
      v-model.number="currentValue"
      class="input"
      :disabled="disabled"
      type="range"
      :min="minValue"
      :max="maxValue"
      :step="step"
      @change="change"
    >
  </div>
</template>

<script setup>
import { computed, ref, useId, watch } from 'vue'

const props = defineProps({
  label: {
    type: String,
    required: true
  },
  defaultValue: {
    type: Number,
    required: true
  },
  minValue: {
    type: Number,
    required: true
  },
  maxValue: {
    type: Number,
    required: true
  },
  step: {
    type: Number,
    required: true
  },
  valueExtension: {
    type: String,
    default: null
  },
  disabled: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['change'])

const id = useId()
const currentValue = ref(props.defaultValue)

watch(() => props.defaultValue, (value) => {
  if (currentValue.value !== value) {
    currentValue.value = value
  }
})

/** How far along the track the value is, for the filled part of the track */
const fillPercent = computed(() => {
  const range = props.maxValue - props.minValue
  if (range <= 0) { return 0 }

  return Math.min(Math.max((currentValue.value - props.minValue) / range, 0), 1) * 100
})

const displayLabel = computed(() => {
  if (props.valueExtension === null) {
    return currentValue.value
  } else {
    return `${currentValue.value}${props.valueExtension}`
  }
})

function change() {
  emit('change', currentValue.value)
}

</script>
<style scoped src="./FtSlider.css" />
