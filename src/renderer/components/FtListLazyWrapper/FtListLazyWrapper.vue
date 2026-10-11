<template>
  <!-- The clicks handled here only follow a long press of the mouse, whose keyboard twin is Enter held (NavManager.js) -->
  <!-- eslint-disable-next-line vuejs-accessibility/click-events-have-key-events -->
  <div
    v-if="showResult"
    v-observe-visibility="visible ? false : {
      callback: onVisibilityChanged
    }"
    :class="{
      grid: layout === 'grid',
      list: layout === 'list',
      draggable: isDraggable,
      draggedVideo: isVideoDragging && draggedVideo.videoId === data.videoId && draggedVideo.playlistItemId === data.playlistItemId,
      actionsOpen,
    }"
    :style="actionsOpen ? { '--actions-size': `${actionCount * 52 + 12}px` } : null"
    data-spatial-nav-item
    :data-spatial-nav-long-press="isVideo ? '' : null"
    :draggable="isDraggable"
    v-on="isDraggable ? draggableEventHandlers : {}"
    @spatial-nav-long-press="openActions"
    @pointerdown="handlePointerDown"
    @dragstart="handleDragStartDuringPress"
    @click.capture="handleClickCapture"
  >
    <template
      v-if="visible"
    >
      <FtListVideo
        v-if="finalDataType === 'video' || finalDataType === 'shortVideo'"
        ref="videoRef"
        :appearance="appearance"
        :data="data"
        :playlist-id="playlistId"
        :playlist-type="playlistType"
        :playlist-item-id="playlistItemId"
        :show-video-with-last-viewed-playlist="showVideoWithLastViewedPlaylist"
        :always-show-add-to-playlist-button="alwaysShowAddToPlaylistButton"
        :quick-bookmark-button-enabled="quickBookmarkButtonEnabled"
        :can-move-video-up="canMoveVideoUp"
        :can-move-video-down="canMoveVideoDown"
        :can-remove-from-playlist="canRemoveFromPlaylist"
        :layout="layout"
        :show-grab-bar="showGrabBar && layout === 'grid'"
        :grab-bar-enabled="isDraggable && layout === 'grid'"
        @move-video-up="moveVideoUp"
        @move-video-down="moveVideoDown"
        @move-video-to-the-top="moveVideoToTheTop"
        @move-video-to-the-bottom="moveVideoToTheBottom"
        @remove-from-playlist="removeFromPlaylist"
      />
      <FtListChannel
        v-else-if="finalDataType === 'channel'"
        :appearance="appearance"
        :data="data"
      />
      <FtListPlaylist
        v-else-if="finalDataType === 'playlist'"
        :appearance="appearance"
        :data="data"
        :search-query-text="searchQueryText"
      />
      <FtCommunityPost
        v-else-if="finalDataType === 'community'"
        :hide-forbidden-titles="hideForbiddenTitles"
        :appearance="appearance"
        :data="data"
      />
      <FtListHashtag
        v-else-if="data.type === 'hashtag'"
        :appearance="appearance"
        :data="data"
      />
      <!-- A long press on a video: its actions, under it -->
      <div
        v-if="actionsOpen"
        ref="actionsRef"
        class="itemActions"
      >
        <!-- In one of the user's playlists: taking the video out of it -->
        <button
          v-if="isRemovable"
          class="itemAction"
          type="button"
          @click="removeFromOpenPlaylist"
        >
          {{ t('User Playlists.Remove from Playlist') }}
        </button>
        <template v-else>
          <button
            v-if="videoRef?.showPlaylists"
            class="itemAction"
            type="button"
            @click="addToPlaylist"
          >
            {{ t('User Playlists.Add to Playlist') }}
          </button>
          <button
            class="itemAction"
            type="button"
            @click="toggleWatchLater"
          >
            {{ videoRef?.isInWatchLater ? t('Video.Remove from Watch Later') : t('Video.Add to Watch Later') }}
          </button>
        </template>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'

import { handleDragAndDrop } from '../../helpers/dragAndDrop'

import FtListVideo from '../FtListVideo/FtListVideo.vue'
import FtListChannel from '../FtListChannel/FtListChannel.vue'
import FtListPlaylist from '../FtListPlaylist/FtListPlaylist.vue'
import FtCommunityPost from '../FtCommunityPost/FtCommunityPost.vue'
import FtListHashtag from '../FtListHashtag/FtListHashtag.vue'

import store from '../../store/index'

import { activateZone, LONG_PRESS_MS, navState, registerZone, unregisterZone } from '../../helpers/spatialNav/NavManager'

import { openItemActions } from './openItemActions'

import android from 'android'

const { t } = useI18n()

const props = defineProps({
  data: {
    type: Object,
    required: true
  },
  dataType: {
    type: String,
    default: null,
  },
  appearance: {
    type: String,
    required: true
  },
  firstScreen: {
    type: Boolean,
    required: true
  },
  layout: {
    type: String,
    default: 'grid'
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
  playlistId: {
    type: String,
    default: null
  },
  playlistType: {
    type: String,
    default: null
  },
  playlistItemId: {
    type: String,
    default: null
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
})

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

const inUserPlaylist = props.playlistType === 'user'
const showGrabBar = computed(() => inUserPlaylist && props.videoDraggingPossible)
const isDraggable = computed(() => showGrabBar.value && (props.canMoveVideoUp || props.canMoveVideoDown))
const { dragVideo, moveDraggedVideo, afterDrag } = handleDragAndDrop(emit)
const draggableEventHandlers = {
  dragstart: onDragVideo,
  dragover: event => event.preventDefault(),
  dragenter: () => {
    if (props.isVideoDragging) {
      moveDraggedVideo(videoData, props.draggedVideo)
    }
  },
  dragend: afterDrag,
  drop: event => event.preventDefault(),
}

/** @type {import('vue').ComputedRef<'video' | 'shortVideo' | 'channel' | 'playlist' | 'community'>} */
const finalDataType = computed(() => {
  return props.data.type ?? props.dataType
})

/** @type {import('vue').ComputedRef<boolean>} */
const hideLiveStreams = computed(() => {
  return store.getters.getHideLiveStreams
})

/** @type {import('vue').ComputedRef<boolean>} */
const hideUpcomingPremieres = computed(() => {
  if (!props.useHideUpcomingPremieresPreference) { return false }

  return store.getters.getHideUpcomingPremieres
})

/** @type {import('vue').ComputedRef<{name : string, preferredName: string, icon: string}[]>} */
const channelsHidden = computed(() => {
  // Some component users like channel view will have this disabled
  if (!props.useChannelsHiddenPreference) { return [] }

  return JSON.parse(store.getters.getChannelsHidden).map((ch) => {
    // Legacy support
    if (typeof ch === 'string') {
      return { name: ch, preferredName: '', icon: '' }
    }
    return ch
  })
})

/** @type {string[]} */
const forbiddenTitles = computed(() => {
  if (!props.hideForbiddenTitles) { return [] }
  return JSON.parse(store.getters.getForbiddenTitles.toLowerCase())
})

const showResult = computed(() => {
  const dataType = finalDataType.value

  if (!dataType) {
    return false
  }

  if (dataType === 'video' || dataType === 'shortVideo') {
    if (hideLiveStreams.value && (props.data.liveNow || props.data.lengthSeconds == null)) {
      // hide livestreams
      return false
    }

    if (hideUpcomingPremieres.value &&
        // Observed for premieres in Local API Channels.
        (props.data.premiereDate != null ||
          // Invidious API
          // `premiereTimestamp` only available on premiered videos
          // https://docs.invidious.io/api/common_types/#videoobject
          props.data.premiereTimestamp != null ||
          // viewCount is our only method of detecting premieres in RSS
          // data without sending an additional request.
          // If we ever get a better flag, use it here instead.
          (props.data.isRSS && props.data.viewCount === '0'))) {
      // hide upcoming
      return false
    }

    const lowerCaseAuthor = props.data.author?.toLowerCase()

    if (channelsHidden.value.some(ch => ch.name === props.data.authorId) || channelsHidden.value.some(ch => ch.name === props.data.author) || (forbiddenTitles.value.some((text) => lowerCaseAuthor.includes(text)))) {
      // hide videos by author
      return false
    }

    const lowerCaseTitle = props.data.title?.toLowerCase()

    if (forbiddenTitles.value.some((text) => lowerCaseTitle.includes(text))) {
      return false
    }
  } else if (dataType === 'channel') {
    const attrsToCheck = [
      // Local API
      props.data.id,
      props.data.name,
      // Invidious API
      // https://docs.invidious.io/api/common_types/#channelobject
      props.data.author,
      props.data.authorId,
    ]

    const lowerCaseName = props.data.name?.toLowerCase()

    if ((attrsToCheck.some(a => a != null && channelsHidden.value.some(ch => ch.name === a))) ||
      (forbiddenTitles.value.some((text) => lowerCaseName.includes(text)))) {
      // hide channels by author
      return false
    }
  } else if (dataType === 'playlist') {
    const lowerCaseTitle = props.data.title?.toLowerCase()
    const lowerCaseChannelName = props.data.channelName?.toLowerCase()

    if ((forbiddenTitles.value.some((text) => lowerCaseTitle.includes(text))) ||
      (forbiddenTitles.value.some((text) => lowerCaseChannelName.includes(text)))) {
      return false
    }

    const attrsToCheck = [
      // Local API
      props.data.channelId,
      props.data.channelName,
      // Invidious API
      // https://docs.invidious.io/api/common_types/#playlistobject
      props.data.author,
      props.data.authorId,
    ]

    if (attrsToCheck.some(a => a != null && channelsHidden.value.some(ch => ch.name === a))) {
      // hide playlists by author
      return false
    }
  }
  return true
})

const visible = ref(props.firstScreen)

/**
 * @param {boolean} isVisible
 */
function onVisibilityChanged(isVisible) {
  if (isVisible) {
    visible.value = isVisible
  }
}

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

function onDragVideo(event) {
  // Only allow dragging via the drag bar
  if (!event.target.classList.contains('draggable')) { return }

  dragVideo(event, videoData)
}

// A long press on a video (Enter held on the remote, see NavManager.js, or
// the mouse button held): the item grows over its neighbours and shows its
// actions under it, adding it to a playlist or to Watch Later, or on the page
// of one of the user's playlists, removing it from that playlist. Like the
// channel cards of the channels list (SubscribedChannels.vue).
const isVideo = computed(() => finalDataType.value === 'video' || finalDataType.value === 'shortVideo')

/** On the page of one of the user's playlists, which the video can be taken out of */
const isRemovable = computed(() => inUserPlaylist && props.canRemoveFromPlaylist)

const videoRef = useTemplateRef('videoRef')
const actionsRef = useTemplateRef('actionsRef')

const actionsOpen = ref(false)

/** How many actions are shown, for the room they take (FtListLazyWrapper.css) */
const actionCount = computed(() => !isRemovable.value && videoRef.value?.showPlaylists ? 2 : 1)

// Remote control (spatial nav): while open, the actions are a zone of their
// own, one per row. Leaving them in any direction, Escape or the Back button
// close them, and focus returns to the item.
const ACTIONS_ZONE_ID = 'list-item-actions'

/** The zone with the remote's focus before the actions took it */
let returnZoneId = null

function actionsGrid() {
  return [...(actionsRef.value?.querySelectorAll('.itemAction') ?? [])].map(button => [button])
}

/**
 * @param {KeyboardEvent} event
 * @returns {boolean} handled here instead of by spatial nav
 */
function handleActionsKey(event) {
  const row = navState.lastPosition.get(ACTIONS_ZONE_ID)?.row ?? 0

  if (
    event.key === 'Escape' ||
    event.key === 'ArrowLeft' ||
    event.key === 'ArrowRight' ||
    (event.key === 'ArrowUp' && row === 0) ||
    (event.key === 'ArrowDown' && row >= actionsGrid().length - 1)
  ) {
    event.preventDefault()
    closeActions()
    return true
  }

  return false
}

/**
 * Clicking/tapping outside the item closes its actions
 * @param {PointerEvent} event
 */
function handleOutsidePointerDown(event) {
  if (!actionsRef.value?.parentElement.contains(/** @type {Node} */ (event.target))) {
    closeActions()
  }
}

async function openActions() {
  if (!isVideo.value || actionsOpen.value) { return }

  openItemActions.close?.()
  openItemActions.close = closeActions

  actionsOpen.value = true
  registerZone({ id: ACTIONS_ZONE_ID, getGrid: actionsGrid, onKeyDown: handleActionsKey })
  document.addEventListener('pointerdown', handleOutsidePointerDown, true)

  // Android's Back button closes the actions
  if (process.env.IS_ANDROID) {
    android.enterPromptMode()
    window.addEventListener('exit-prompt', closeActions)
  }

  // Only when the remote is in use (some zone has the focus)
  const activeZoneId = navState.activeZoneId
  if (activeZoneId === null) { return }

  returnZoneId = activeZoneId
  await nextTick()

  if (actionsOpen.value) {
    navState.lastPosition.set(ACTIONS_ZONE_ID, { row: 0, col: 0 })
    activateZone(ACTIONS_ZONE_ID)
  }
}

function closeActions() {
  if (!actionsOpen.value) { return }

  actionsOpen.value = false
  document.removeEventListener('pointerdown', handleOutsidePointerDown, true)

  if (process.env.IS_ANDROID) {
    android.exitPromptMode()
    window.removeEventListener('exit-prompt', closeActions)
  }

  if (openItemActions.close === closeActions) {
    openItemActions.close = null
  }

  // Back to the item, when the focus was in its actions
  const hadFocus = navState.activeZoneId === ACTIONS_ZONE_ID
  unregisterZone(ACTIONS_ZONE_ID)

  if (hadFocus && returnZoneId !== null) {
    activateZone(returnZoneId)
  }
  returnZoneId = null
}

function addToPlaylist() {
  const video = videoRef.value
  closeActions()
  video?.togglePlaylistPrompt()
}

function removeFromOpenPlaylist() {
  closeActions()
  removeFromPlaylist(props.data.videoId, props.playlistItemId)
}

function toggleWatchLater() {
  videoRef.value?.toggleWatchLater()
  closeActions()
}

// The mouse (or a finger) held on the item for as long as a long press of
// Enter. The click that ends it doesn't open the video.
let pointerLongPressTimeout = 0
let isPointerLongPressPending = false
let suppressNextClick = false

/** How far the pointer may wander while held (px): a hand is never quite still */
const POINTER_LONG_PRESS_SLOP = 12
let pointerDownX = 0
let pointerDownY = 0

/**
 * @param {PointerEvent} event
 */
function handlePointerDown(event) {
  suppressNextClick = false

  if (!isVideo.value || actionsOpen.value || event.button !== 0 || /** @type {Element} */ (event.target).closest('button, [role="button"]')) {
    return
  }

  cancelPointerLongPress()
  isPointerLongPressPending = true
  pointerDownX = event.clientX
  pointerDownY = event.clientY

  // Followed on the document: the press ends when the button is released or
  // the pointer really moves away, not when it merely shifts over the item
  document.addEventListener('pointermove', handlePointerMoveDuringPress, true)
  document.addEventListener('pointerup', cancelPointerLongPress, true)
  document.addEventListener('pointercancel', cancelPointerLongPress, true)

  pointerLongPressTimeout = setTimeout(() => {
    cancelPointerLongPress()
    suppressNextClick = true
    openActions()
  }, LONG_PRESS_MS)
}

/**
 * @param {PointerEvent} event
 */
function handlePointerMoveDuringPress(event) {
  if (Math.hypot(event.clientX - pointerDownX, event.clientY - pointerDownY) > POINTER_LONG_PRESS_SLOP) {
    cancelPointerLongPress()
  }
}

function cancelPointerLongPress() {
  isPointerLongPressPending = false
  clearTimeout(pointerLongPressTimeout)
  document.removeEventListener('pointermove', handlePointerMoveDuringPress, true)
  document.removeEventListener('pointerup', cancelPointerLongPress, true)
  document.removeEventListener('pointercancel', cancelPointerLongPress, true)
}

/**
 * A hand holding the mouse still moves it a little, which starts dragging the
 * thumbnail and would end the long press. Items that aren't meant to be
 * dragged (reordering a playlist) keep the press instead of the drag.
 * @param {DragEvent} event
 */
function handleDragStartDuringPress(event) {
  if (isPointerLongPressPending && !isDraggable.value) {
    event.preventDefault()
  } else {
    cancelPointerLongPress()
  }
}

/**
 * @param {MouseEvent} event
 */
function handleClickCapture(event) {
  if (suppressNextClick) {
    suppressNextClick = false
    event.preventDefault()
    event.stopPropagation()
  }
}

onBeforeUnmount(() => {
  cancelPointerLongPress()
  closeActions()
})

/** @import { VideoData } from '../../helpers/dragAndDrop' */

/** @type {VideoData} */
const videoData = {
  videoId: props.data.videoId,
  playlistItemId: props.playlistItemId,
}

</script>

<style scoped src="./FtListLazyWrapper.css" />
