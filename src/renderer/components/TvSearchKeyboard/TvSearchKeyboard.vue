<template>
  <div class="tvSearchKeyboard">
    <button
      v-for="key in KEYS"
      :key="key"
      type="button"
      class="key"
      @click="emit('type', key)"
    >
      {{ key }}
    </button>
    <button
      type="button"
      class="key wide label"
      @click="emit('type', ' ')"
    >
      {{ t('Search Bar.Space') }}
    </button>
    <button
      type="button"
      class="key wide"
      :aria-label="t('Search Bar.Delete')"
      @click="emit('backspace')"
    >
      <FontAwesomeIcon :icon="['fas', 'delete-left']" />
    </button>
    <button
      type="button"
      class="key wide"
      :aria-label="t('Search Bar.Clear Input')"
      @click="emit('clear')"
    >
      <FontAwesomeIcon :icon="['fas', 'xmark']" />
    </button>
  </div>
</template>

<script setup>
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { useI18n } from 'vue-i18n'

// The search page's on-screen keyboard, for typing with the remote's D-pad:
// the letters and digits, then space, delete and clear. Each key is a
// button, so spatial nav moves between them and Enter presses them.
const KEYS = [...'abcdefghijklmnopqrstuvwxyz1234567890']

const { t } = useI18n()

const emit = defineEmits(['type', 'backspace', 'clear'])
</script>

<style scoped src="./TvSearchKeyboard.css" />
