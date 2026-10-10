<template>
  <div>
    <div class="header">
      <h2 class="heading">
        {{ $t("Profile.Other Channels") }}
      </h2>
      <p
        v-if="showUnsubscribeButton && channels.length > 0"
        class="selectedCount"
      >
        {{ selectedText }}
      </p>
    </div>
    <div class="actions">
      <template v-if="showUnsubscribeButton && channels.length > 0">
        <FtButton
          :label="$t('Profile.Select All')"
          :background-color="NEUTRAL_BUTTON_COLOR"
          text-color="var(--primary-text-color)"
          @click="selectAll"
        />
        <FtButton
          :label="$t('Profile.Select None')"
          :background-color="NEUTRAL_BUTTON_COLOR"
          text-color="var(--primary-text-color)"
          @click="selectNone"
        />
        <FtButton
          :label="$t('Profile.Add Selected To Profile')"
          :background-color="NEUTRAL_BUTTON_COLOR"
          text-color="var(--primary-text-color)"
          @click="addChannelsToProfile"
        />
      </template>
    </div>
    <div
      v-if="channels.length > 0"
      class="channels"
    >
      <FtProfileChannelTile
        v-for="channel in channels"
        :key="channel.id"
        :channel-id="channel.id"
        :channel-name="channel.name"
        :channel-thumbnail="channel.thumbnail"
        :selectable="showUnsubscribeButton"
        :selected="selected.has(channel.id)"
        @change="handleChannelToggle(channel.id)"
      />
    </div>
    <p
      v-else
      class="message"
    >
      {{ $t("Profile.No other channels to add") }}
    </p>
  </div>
</template>

<script setup>
import { computed, reactive, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import FtProfileChannelTile from '../FtProfileChannelTile/FtProfileChannelTile.vue'
import FtButton from '../FtButton/FtButton.vue'

import store from '../../store/index'

import { deepCopy, showToast } from '../../helpers/utils'
import { youtubeImageUrlToInvidious } from '../../helpers/api/invidious'
import { MAIN_PROFILE_ID } from '../../../constants'

/**
 * @typedef {object} Profile
 * @property {string} _id
 * @property {string} name
 * @property {string} bgColor
 * @property {string} textColor
 * @property {object[]} subscriptions
 * @property {string} subscriptions[].id
 * @property {string|undefined} subscriptions[].name
 * @property {string|undefined} subscriptions[].thumbnail
 */

const { locale, t } = useI18n()

/** Every action is a mild gray: the swapped colors are the remote focus */
const NEUTRAL_BUTTON_COLOR = 'color-mix(in srgb, var(--primary-text-color) 12%, transparent)'

const props = defineProps({
  profile: {
    type: Object,
    required: true
  }
})

/** @type {import('vue').ComputedRef<Profile[]>} */
const profileList = computed(() => {
  return store.getters.getProfileList
})

/** @type {import('vue').ComputedRef<'local' | 'invidious'>} */
const backendPreference = computed(() => {
  return store.getters.getBackendPreference
})

/** @type {import('vue').ComputedRef<string>} */
const currentInvidiousInstanceUrl = computed(() => {
  return store.getters.getCurrentInvidiousInstanceUrl
})

const intlCollator = computed(() => {
  return new Intl.Collator([locale.value, 'en'], { sensitivity: 'base' })
})

/** @type {import('vue').ComputedRef<boolean>} */
const showUnsubscribeButton = computed(() => {
  return !store.getters.getHideUnsubscribeButton
})

/** @type {import('vue').ShallowRef<Profile['subscriptions']>} */
const channels = shallowRef([])

function loadChannels() {
  // The main profile has every subscribed channel
  const profile = profileList.value.find((profile) => profile._id === MAIN_PROFILE_ID)

  /** @type {Profile['subscriptions']} */
  let channels_ = deepCopy(profile.subscriptions)

  channels_ = channels_.filter((channel) => {
    return !props.profile.subscriptions.some((sub) => sub.id === channel.id)
  })

  const collator = intlCollator.value

  channels_.sort((a, b) => collator.compare(a.name, b.name))

  if (backendPreference.value === 'invidious') {
    const instanceUrl = currentInvidiousInstanceUrl.value

    channels_.forEach((channel) => {
      channel.thumbnail = youtubeImageUrlToInvidious(channel.thumbnail, instanceUrl)
    })
  }

  channels.value = channels_
}

if (typeof props.profile.subscriptions !== 'undefined') {
  loadChannels()
}

watch(() => props.profile, () => {
  loadChannels()
  selectNone()
}, { deep: true })

watch(profileList, loadChannels, { deep: true })

/** @type {import('vue').Reactive<Set<string>>} */
const selected = reactive(new Set())

const selectedText = computed(() => {
  return t('Profile.{number} selected', { number: selected.size })
})

function selectAll() {
  channels.value.forEach(channel => {
    return selected.add(channel.id)
  })
}

function selectNone() {
  selected.clear()
}

/**
 * @param {string} channelId
 */
function handleChannelToggle(channelId) {
  if (selected.has(channelId)) {
    selected.delete(channelId)
  } else {
    selected.add(channelId)
  }
}

function addChannelsToProfile() {
  if (selected.size === 0) {
    showToast(t('Profile.No channel(s) have been selected'))
  } else {
    const subscriptions = profileList.value
      .find((profile) => profile._id === MAIN_PROFILE_ID)
      .subscriptions
      .filter((channel) => selected.has(channel.id))

    const profile = deepCopy(props.profile)
    profile.subscriptions.push(...deepCopy(subscriptions))

    store.dispatch('updateProfile', profile)
    showToast(t('Profile.Profile has been updated'))
    selectNone()
  }
}
</script>

<style scoped src="./FtProfileFilterChannelsList.css" />
