<template>
  <div>
    <div
      v-for="(shelf, index) in filteredShelves"
      :key="index"
      class="shelfContainer"
    >
      <div class="shelfHeader">
        <h2
          class="shelfTitle"
          dir="auto"
        >
          {{ shelf.title }}
        </h2>
        <router-link
          v-if="shelf.playlistId"
          class="playAllLink"
          :to="{
            path: `/playlist/${shelf.playlistId}`
          }"
        >
          <FontAwesomeIcon
            :icon="['fas', 'list']"
          />
          {{ $t('Channel.Home.View Playlist') }}
        </router-link>
      </div>
      <p
        v-if="shelf.subtitle"
        class="shelfSubtitle"
        dir="auto"
      >
        {{ shelf.subtitle }}
      </p>
      <FtElementList
        :data="shelf.content"
        :use-channels-hidden-preference="false"
        :display="shelf.isCommunity ? 'list' : ''"
        :render-all-items-lazily="index > 2"
      />
    </div>
  </div>
</template>

<script setup>
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { computed } from 'vue'
import FtElementList from '../FtElementList/FtElementList.vue'
import store from '../../store/index'

const props = defineProps({
  shelves: {
    type: Array,
    default: () => []
  }
})

/** @type {import('vue').ComputedRef<bool>} */
const hideFeaturedChannels = computed(() => {
  return store.getters.getHideFeaturedChannels
})

const filteredShelves = computed(() => {
  let shelves = props.shelves
  if (hideFeaturedChannels.value) {
    shelves = shelves.filter(shelf => shelf.content[0].type !== 'channel')
  }

  return shelves.filter(shelf => shelf.content.length > 0)
})
</script>

<style scoped src="./ChannelHome.css" />
