<template>
  <router-link
    v-if="!selectable"
    class="tile"
    :aria-labelledby="id"
    :to="`/channel/${channelId}`"
  >
    <img
      v-if="channelThumbnail != null"
      class="thumbnail"
      :src="channelThumbnail"
      alt=""
    >
    <FontAwesomeIcon
      v-else
      :icon="['fas', 'circle-user']"
      class="thumbnail"
    />
    <span
      :id="id"
      class="channelName"
      dir="auto"
    >
      {{ channelName }}
    </span>
  </router-link>
  <button
    v-else
    class="tile"
    :class="{ selected }"
    type="button"
    role="checkbox"
    :aria-checked="selected"
    :aria-labelledby="id"
    @click="emit('change', !selected)"
  >
    <img
      v-if="channelThumbnail != null"
      class="thumbnail"
      :src="channelThumbnail"
      alt=""
    >
    <FontAwesomeIcon
      v-else
      :icon="['fas', 'circle-user']"
      class="thumbnail"
    />
    <span
      v-if="selected"
      class="checkBadge"
    >
      <FontAwesomeIcon :icon="['fas', 'check']" />
    </span>
    <span
      :id="id"
      class="channelName"
      dir="auto"
    >
      {{ channelName }}
    </span>
  </button>
</template>

<script setup>
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { useId } from 'vue'

defineProps({
  channelId: {
    type: String,
    required: true
  },
  channelName: {
    type: String,
    required: true
  },
  channelThumbnail: {
    type: String,
    default: null
  },
  selectable: {
    type: Boolean,
    default: false
  },
  selected: {
    type: Boolean,
    default: false
  }
})

const id = useId()

const emit = defineEmits(['change'])
</script>

<style scoped src="./FtProfileChannelTile.css" />
