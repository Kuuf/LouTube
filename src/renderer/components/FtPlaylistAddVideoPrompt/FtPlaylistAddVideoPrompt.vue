<template>
  <FtPrompt
    theme="medium"
    :label="t('User Playlists.AddVideoPrompt.Select Playlist')"
    @click="hide"
  >
    <!-- Arrow keys: Up/Down through the playlists and on to the buttons (Left/Right between those is FtPrompt's) -->
    <!-- eslint-disable-next-line vuejs-accessibility/no-static-element-interactions -->
    <div
      ref="content"
      @keydown.up.down="handleVerticalKeys"
    >
      <div
        class="playlists"
        role="radiogroup"
        :aria-label="t('User Playlists.AddVideoPrompt.Select Playlist')"
      >
        <button
          v-for="playlist in playlists"
          :key="playlist._id"
          class="playlist"
          :class="{ selected: playlist._id === selectedPlaylistId }"
          type="button"
          role="radio"
          :aria-checked="playlist._id === selectedPlaylistId"
          @click="selectedPlaylistId = playlist._id"
        >
          <span class="checkIndicator">
            <FontAwesomeIcon
              :icon="['fas', 'check']"
              class="checkIcon"
            />
          </span>
          <span class="playlistText">
            <span
              class="playlistName"
              dir="auto"
            >
              {{ playlist.playlistName }}
            </span>
            <span class="videoCount">
              {{ t('Global.Counts.Video Count', { count: playlist.videos.length }, playlist.videos.length) }}
            </span>
          </span>
          <img
            class="thumbnail"
            :src="thumbnailOf(playlist)"
            alt=""
          >
        </button>
      </div>
      <FtFlexBox class="actions">
        <FtButton
          :label="t('Confirm')"
          :background-color="BUTTON_COLOR"
          text-color="var(--primary-text-color)"
          @click="confirm"
        />
        <FtButton
          :label="t('User Playlists.Cancel')"
          :background-color="BUTTON_COLOR"
          text-color="var(--primary-text-color)"
          @click="hide"
        />
      </FtFlexBox>
    </div>
  </FtPrompt>
</template>

<script setup>
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { computed, nextTick, onMounted, ref, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'

import FtFlexBox from '../ft-flex-box/ft-flex-box.vue'
import FtPrompt from '../FtPrompt/FtPrompt.vue'
import FtButton from '../FtButton/FtButton.vue'

import store from '../../store/index'

import { showToast } from '../../helpers/utils'

import thumbnailPlaceholder from '../../assets/img/thumbnail_placeholder.svg'

const { t } = useI18n()

/** A mild gray: the swapped colors are the focused button (FtPrompt.css) */
const BUTTON_COLOR = 'color-mix(in srgb, var(--primary-text-color) 12%, transparent)'

// Picking one playlist for the video(s) handed to the prompt, then confirming
// or cancelling: nothing else.

/** The playlists, the most recently updated first */
const playlists = computed(() => {
  return store.getters.getAllPlaylists.toSorted((a, b) => (b.lastUpdatedAt ?? 0) - (a.lastUpdatedAt ?? 0))
})

/** @type {import('vue').Ref<string | null>} */
const selectedPlaylistId = ref(null)

/** @type {import('vue').ComputedRef<{ videoId: string, [key: string]: any }[]>} */
const videosToAdd = computed(() => store.getters.getToBeAddedToPlaylistVideoList)

/**
 * The playlist's first video stands for it
 * @param {{ videos: { videoId: string }[] }} playlist
 */
function thumbnailOf(playlist) {
  if (playlist.videos.length === 0) { return thumbnailPlaceholder }

  const origin = store.getters.getBackendPreference === 'invidious'
    ? store.getters.getCurrentInvidiousInstanceUrl
    : 'https://i.ytimg.com'

  return `${origin}/vi/${playlist.videos[0].videoId}/mqdefault.jpg`
}

function hide() {
  store.dispatch('hideAddToPlaylistPrompt')
}

function confirm() {
  const playlist = playlists.value.find(list => list._id === selectedPlaylistId.value)
  if (playlist == null) {
    showToast(t('User Playlists.AddVideoPrompt.Toast["You haven\'t selected any playlist yet."]'))
    return
  }

  // Videos the playlist has already aren't added twice
  const playlistVideoIds = new Set(playlist.videos.map(video => video.videoId))

  store.dispatch('addVideos', {
    _id: playlist._id,
    videos: videosToAdd.value.filter(video => !playlistVideoIds.has(video.videoId)),
  })

  showToast(t('User Playlists.AddVideoPrompt.Toast.Video(s) added to {playlistCount} playlists', { playlistCount: 1 }, 1))

  hide()
}

// The prompt keeps the keyboard focus on its buttons (FtPrompt.vue), and the
// remote's spatial nav stays out of prompts: the focus starts on the first
// playlist, and Up/Down walk the playlists and then the buttons.
const content = useTemplateRef('content')

onMounted(() => {
  // After FtPrompt has focused its first button
  nextTick(() => {
    content.value?.querySelector('.playlist')?.focus()
  })
})

/**
 * @param {KeyboardEvent} event
 */
function handleVerticalKeys(event) {
  const rows = [...content.value.querySelectorAll('.playlist')]
  const buttons = [...content.value.querySelectorAll('.btn')]
  const target = /** @type {HTMLElement} */ (event.target)

  const row = rows.indexOf(target)
  const onButton = buttons.includes(target)
  if (row === -1 && !onButton) { return }

  event.preventDefault()

  if (event.key === 'ArrowDown') {
    if (row !== -1) {
      // The next playlist, or the buttons under the last one
      (rows[row + 1] ?? buttons[0])?.focus()
    }
  } else if (onButton) {
    // Back up to the selected playlist, or the last one
    (rows.find(playlist => playlist.classList.contains('selected')) ?? rows.at(-1))?.focus()
  } else {
    rows[row - 1]?.focus()
  }
}
</script>

<style scoped src="./FtPlaylistAddVideoPrompt.css" />
