<template>
  <FtInput
    ref="input"
    class="ftSearchInput"
    :placeholder="placeholder"
    :value="value"
    :maxlength="maxlength"
    :show-clear-text-button="true"
    :show-action-button="false"
    @input="emit('input', $event)"
    @clear="emit('clear')"
    @click="(query) => emit('search', query)"
  />
</template>

<script setup>
import { useTemplateRef } from 'vue'

import FtInput from '../FtInput/FtInput.vue'

// The app's search field: every search bar is this one, with its own
// placeholder. A magnifying glass, then the text: no clear and no search
// button. It filters as you type (`input`), or searches on Enter (`search`),
// whichever the page listens to. With the remote, it is ready to type into
// as soon as it has the focus (text fields are, see NavManager.js).
defineProps({
  placeholder: {
    type: String,
    required: true
  },
  value: {
    type: String,
    default: ''
  },
  maxlength: {
    type: Number,
    default: 255
  }
})

const emit = defineEmits(['input', 'clear', 'search'])

const input = useTemplateRef('input')

defineExpose({
  focus: () => input.value?.focus(),
  blur: () => input.value?.blur(),
  select: () => input.value?.select(),
})
</script>

<style scoped src="./FtSearchInput.css" />
