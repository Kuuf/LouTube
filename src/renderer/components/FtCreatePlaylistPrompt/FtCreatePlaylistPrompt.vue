<template>
  <FtPrompt
    theme="medium"
    :label="title"
    @click="hideCreatePlaylistPrompt"
  >
    <FtFlexBox>
      <FtInput
        ref="playlistNameInput"
        :placeholder="$t('User Playlists.Playlist Name')"
        :show-action-button="false"
        :show-label="false"
        :value="playlistName"
        :maxlength="255"
        class="playlistNameInput"
        @input="handlePlaylistNameInput"
        @click="createNewPlaylist"
      />
    </FtFlexBox>
    <FtFlexBox v-if="playlistNameBlank">
      <p class="message">
        {{ $t('User Playlists.SinglePlaylistView.Toast["Playlist name cannot be empty. Please input a name."]') }}
      </p>
    </FtFlexBox>
    <FtFlexBox v-if="playlistWithNameExists">
      <p class="message">
        {{ $t('User Playlists.CreatePlaylistPrompt.Toast["There is already a playlist with this name. Please pick a different name."]') }}
      </p>
    </FtFlexBox>
    <FtFlexBox class="actions">
      <FtButton
        :label="$t('User Playlists.CreatePlaylistPrompt.Create')"
        :disabled="playlistPersistenceDisabled"
        :background-color="BUTTON_COLOR"
        text-color="var(--primary-text-color)"
        @click="createNewPlaylist"
      />
      <FtButton
        :label="$t('User Playlists.Cancel')"
        :background-color="BUTTON_COLOR"
        text-color="var(--primary-text-color)"
        @click="hideCreatePlaylistPrompt"
      />
    </FtFlexBox>
  </FtPrompt>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'

import FtButton from '../FtButton/FtButton.vue'
import FtFlexBox from '../ft-flex-box/ft-flex-box.vue'
import FtInput from '../FtInput/FtInput.vue'
import FtPrompt from '../FtPrompt/FtPrompt.vue'

import store from '../../store/index'

import { showToast } from '../../helpers/utils'

const { t } = useI18n()

/** A mild gray: the swapped colors are the focused button (FtPrompt.css) */
const BUTTON_COLOR = 'color-mix(in srgb, var(--primary-text-color) 12%, transparent)'

const title = computed(() => t('User Playlists.CreatePlaylistPrompt.New Playlist Name'))

/** @type {import('vue').ComputedRef<object[]>} */
const allPlaylists = computed(() => store.getters.getAllPlaylists)

/** @type {import('vue').Ref<string>} */
const playlistName = ref(store.getters.getNewPlaylistVideoObject.title)

const playlistNameBlank = computed(() => {
  return playlistName.value !== '' && playlistName.value.trim() === ''
})

const playlistWithNameExists = computed(() => {
  const playlistName_ = playlistName.value

  if (playlistName_ === '') {
    return false
  }

  return allPlaylists.value.some((playlist) => playlist.playlistName === playlistName_)
})

const playlistPersistenceDisabled = computed(() => {
  return playlistName.value === '' || playlistNameBlank.value || playlistWithNameExists.value
})

const playlistNameInput = useTemplateRef('playlistNameInput')

onMounted(() => {
  // Faster to input required playlist name
  nextTick(() => playlistNameInput.value?.focus())
})

/**
 * @param {string} input
 */
function handlePlaylistNameInput(input) {
  const trimmed = input.trim()

  // Need to show message for blank input
  playlistName.value = trimmed === '' ? input : trimmed
}

async function createNewPlaylist() {
  // It is still possible to attempt to create via pressing enter
  if (playlistPersistenceDisabled.value) { return }

  const playlistObject = {
    playlistName: playlistName.value,
    protected: false,
    description: '',
    videos: [],
  }

  try {
    await store.dispatch('addPlaylist', playlistObject)
    showToast(t('User Playlists.CreatePlaylistPrompt.Toast["Playlist {playlistName} has been successfully created."]', {
      playlistName: playlistName.value,
    }))
  } catch (e) {
    showToast(t('User Playlists.CreatePlaylistPrompt.Toast["There was an issue with creating the playlist."]'))
    console.error(e)
  } finally {
    hideCreatePlaylistPrompt()
  }
}

function hideCreatePlaylistPrompt() {
  store.commit('setShowCreatePlaylistPrompt', false)
}
</script>

<style scoped src="./FtCreatePlaylistPrompt.css" />
