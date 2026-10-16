<template>
  <!-- A channel (search results, a channel's featured channels): its avatar,
       its name and a Go to Channel button, no subscribing from here -->
  <div
    class="ft-list-channel ft-list-item"
    :class="{
      list: listType === 'list',
      grid: listType === 'grid',
      [appearance]: true
    }"
  >
    <div class="channelThumbnail">
      <component
        :is="enableChannelLinks ? 'router-link' : 'div'"
        :to="`/channel/${id}`"
        class="channelThumbnailLink"
        tabindex="-1"
        aria-hidden="true"
      >
        <img
          :src="thumbnail"
          :class="!isGame ? 'channelImage' : 'gameImage'"
          alt=""
        >
      </component>
    </div>
    <div class="infoAndButton">
      <div class="info">
        <component
          :is="enableChannelLinks ? 'router-link' : 'span'"
          class="title"
          :to="`/channel/${id}`"
        >
          <h3
            class="h3Title"
            dir="auto"
          >
            {{ name }}
          </h3>
        </component>
      </div>
      <!-- Not a stop of its own on the remote: with the card focused it
           takes the focus look, and Enter opens the channel -->
      <router-link
        v-if="enableChannelLinks"
        class="goToChannel"
        :to="`/channel/${id}`"
        tabindex="-1"
      >
        {{ $t('Channels.Go To Channel') }}
      </router-link>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

import store from '../../store/index'

import { youtubeImageUrlToInvidious } from '../../helpers/api/invidious'

const props = defineProps({
  data: {
    type: Object,
    required: true
  },
  appearance: {
    type: String,
    required: true
  }
})

/** @type {import('vue').ComputedRef<string>} */
const currentInvidiousInstanceUrl = computed(() => {
  return store.getters.getCurrentInvidiousInstanceUrl
})

/** @type {import('vue').ComputedRef<'grid' | 'list'>} */
const listType = computed(() => {
  return store.getters.getListType
})

const enableChannelLinks = computed(() => !store.getters.getDisableChannelLinks)

let id = ''
let thumbnail = ''
let name = ''
let isGame = null

if (process.env.SUPPORTS_LOCAL_API && props.data.dataSource === 'local') {
  thumbnail = props.data.thumbnail
  name = props.data.name
  id = props.data.id
  isGame = props.data.isGame
} else {
  // Can be prefixed with `https://` or `//` (protocol relative)
  /** @type {string} */
  const thumbnailUrl = props.data.authorThumbnails[2].url

  thumbnail = youtubeImageUrlToInvidious(thumbnailUrl, currentInvidiousInstanceUrl.value)
  name = props.data.author
  id = props.data.authorId
}
</script>

<style scoped lang="scss" src="./FtListChannel.scss" />
