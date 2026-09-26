<template>
  <FtAutoGrid
    :grid="displayValue !== 'list'"
    :columns="columns"
  >
    <FtListLazyWrapper
      v-for="(result, index) in data"
      :ref="(item) => setItemInstance(index, item)"
      :key="`${dataType || result.type}-${result.videoId || result.playlistId || result.postId || result.id || result._id || result.authorId || result.title}-${result.playlistItemId || index}-${result.lastUpdatedAt || 0}`"
      appearance="result"
      :data="result"
      :data-type="dataType || result.type"
      :first-screen="!renderAllItemsLazily && index < 16"
      :is-focused="index === focusedIndex"
      :layout="displayValue"
      :show-video-with-last-viewed-playlist="showVideoWithLastViewedPlaylist"
      :use-channels-hidden-preference="useChannelsHiddenPreference"
      :use-hide-upcoming-premieres-preference="useHideUpcomingPremieresPreference"
      :hide-forbidden-titles="hideForbiddenTitles"
      :always-show-add-to-playlist-button="alwaysShowAddToPlaylistButton"
      :quick-bookmark-button-enabled="quickBookmarkButtonEnabled"
      :can-move-video-up="canMoveVideoUp && index > 0"
      :can-move-video-down="canMoveVideoDown && index < playlistItemsLength - 1"
      :can-remove-from-playlist="canRemoveFromPlaylist"
      :search-query-text="searchQueryText"
      :playlist-id="playlistId"
      :playlist-type="playlistType"
      :playlist-item-id="result.playlistItemId"
      :dragged-video="draggedVideo"
      :is-video-dragging="isVideoDragging"
      :video-dragging-possible="videoDraggingPossible"
      @drag-video="dragVideo"
      @move-dragged-video="moveDraggedVideo"
      @drag-video-end="afterDrag"
      @move-video-up="moveVideoUp"
      @move-video-down="moveVideoDown"
      @move-video-to-the-top="moveVideoToTheTop"
      @move-video-to-the-bottom="moveVideoToTheBottom"
      @remove-from-playlist="removeFromPlaylist"
    />
  </FtAutoGrid>
</template>

<script setup>
import { computed } from 'vue'

import FtAutoGrid from '../FtAutoGrid/FtAutoGrid.vue'
import FtListLazyWrapper from '../FtListLazyWrapper/FtListLazyWrapper.vue'

import store from '../../store/index'

const props = defineProps({
  data: {
    type: Array,
    required: true
  },
  dataType: {
    type: String,
    default: null,
  },
  renderAllItemsLazily: {
    type: Boolean,
    default: false
  },
  display: {
    type: String,
    required: false,
    default: ''
  },
  showVideoWithLastViewedPlaylist: {
    type: Boolean,
    default: false
  },
  useChannelsHiddenPreference: {
    type: Boolean,
    default: true,
  },
  useHideUpcomingPremieresPreference: {
    type: Boolean,
    default: true,
  },
  hideForbiddenTitles: {
    type: Boolean,
    default: true
  },
  searchQueryText: {
    type: String,
    required: false,
    default: '',
  },
  alwaysShowAddToPlaylistButton: {
    type: Boolean,
    default: false,
  },
  quickBookmarkButtonEnabled: {
    type: Boolean,
    default: true,
  },
  canMoveVideoUp: {
    type: Boolean,
    default: false,
  },
  canMoveVideoDown: {
    type: Boolean,
    default: false,
  },
  canRemoveFromPlaylist: {
    type: Boolean,
    default: false,
  },
  playlistItemsLength: {
    type: Number,
    default: 0
  },
  playlistId: {
    type: String,
    default: null
  },
  playlistType: {
    type: String,
    default: null
  },
  draggedVideo: {
    type: Object,
    default: () => ({ videoId: null, playlistItemId: null }),
  },
  isVideoDragging: {
    type: Boolean,
    default: false,
  },
  videoDraggingPossible: {
    type: Boolean,
    default: false,
  },
  columns: {
    // Fixed column count in grid mode, see FtAutoGrid. null = as many as fit.
    type: Number,
    default: null,
  },
  focusedIndex: {
    // Index in `data` to highlight as the spatial-nav focus target, e.g.
    // from `useSpatialZone`'s `focusedPosition.row`. -1 (default) = none.
    type: Number,
    default: -1,
  },
})

defineExpose({ getItemElement })

const emit = defineEmits([
  'move-dragged-video',
  'move-video-down',
  'move-video-up',
  'move-video-to-the-top',
  'move-video-to-the-bottom',
  'remove-from-playlist',
  'drag-video',
  'drag-video-end'
])

/** @type {import('vue').ComponentPublicInstance[]} */
const itemInstances = []

/**
 * @param {number} index
 * @param {import('vue').ComponentPublicInstance | null} item
 */
function setItemInstance(index, item) {
  itemInstances[index] = item
}

/**
 * Root element of the item at `index` in `data`, e.g. for spatial-nav grid
 * cells so the focused item can be scrolled into view. Resolved on each call,
 * as items hidden by preferences render no element.
 * @param {number} index
 * @returns {HTMLElement | null}
 */
function getItemElement(index) {
  const el = itemInstances[index]?.$el
  return el instanceof HTMLElement ? el : null
}

/** @type {import('vue').ComputedRef<'grid' | 'list'>} */
const listType = computed(() => {
  return store.getters.getListType
})

/** @type {import('vue').ComputedRef<'grid' | 'list'>} */
const displayValue = computed(() => {
  return props.display === '' ? listType.value : props.display
})

/**
 * @param {string} videoId
 * @param {string} playlistItemId
 */
function moveVideoUp(videoId, playlistItemId) {
  emit('move-video-up', videoId, playlistItemId)
}

/**
 * @param {string} videoId
 * @param {string} playlistItemId
 */
function moveVideoDown(videoId, playlistItemId) {
  emit('move-video-down', videoId, playlistItemId)
}

/**
 * @param {string} videoId
 * @param {string} playlistItemId
 */
function moveVideoToTheTop(videoId, playlistItemId) {
  emit('move-video-to-the-top', videoId, playlistItemId)
}

/**
 * @param {string} videoId
 * @param {string} playlistItemId
 */
function moveVideoToTheBottom(videoId, playlistItemId) {
  emit('move-video-to-the-bottom', videoId, playlistItemId)
}

/**
 * @param {string} videoId
 * @param {string} playlistItemId
 */
function removeFromPlaylist(videoId, playlistItemId) {
  emit('remove-from-playlist', videoId, playlistItemId)
}

/** @import { VideoData } from '../../helpers/dragAndDrop' */

/**
 * @param {VideoData} video
 */
function dragVideo(video) {
  emit('drag-video', video)
}

/**
 * @param {VideoData} video
 * @param {VideoData} draggedVideo
 */
function moveDraggedVideo(video, draggedVideo) {
  emit('move-dragged-video', video, draggedVideo)
}

function afterDrag() {
  emit('drag-video-end')
}

</script>

<style scoped src="./FtElementList.css" />
