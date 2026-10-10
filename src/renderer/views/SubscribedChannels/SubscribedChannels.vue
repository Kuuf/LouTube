<template>
  <div ref="tvPageRoot">
    <ft-card class="card">
      <h2>
        <FontAwesomeIcon
          :icon="['fas', 'user-check']"
          class="headingIcon"
        />
        {{ $t('Channels.Title') }}
      </h2>
      <ft-input
        v-show="subscribedChannels.length > 1"
        ref="searchBarChannels"
        :placeholder="$t('Channels.Search bar placeholder')"
        :value="query"
        :show-clear-text-button="true"
        :show-action-button="false"
        :maxlength="255"
        @input="handleQueryChange"
        @clear="() => handleQueryChange('')"
      />
      <ft-flex-box
        v-if="activeSubscriptionList.length === 0"
      >
        <p class="message">
          {{ $t('Channels.Empty') }}
        </p>
      </ft-flex-box>
      <template v-else>
        <ft-flex-box
          ref="channelsRef"
          class="channels"
        >
          <div
            v-for="channel in channelList"
            :key="channel.id"
            class="channel"
            :class="{ expanded: expandedChannelId === channel.id }"
            :style="{ '--action-count': actionCount }"
            data-spatial-nav-item
          >
            <button
              class="channelMain"
              type="button"
              :aria-expanded="expandedChannelId === channel.id"
              :aria-label="channel.name"
              @click="toggleExpanded(channel.id)"
            >
              <img
                v-if="channel.thumbnail != null"
                class="channelThumbnail"
                :src="thumbnailURL(channel.thumbnail)"
                alt=""
                @error.once="updateThumbnail(channel)"
              >
              <font-awesome-icon
                v-else
                class="channelThumbnail"
                :icon="['fas', 'circle-user']"
              />
            </button>
            <span
              class="channelName"
              dir="auto"
              :title="channel.name"
            >
              {{ channel.name }}
            </span>
            <div
              v-if="expandedChannelId === channel.id"
              class="channelActions"
            >
              <FtButton
                v-if="enableChannelLinks"
                :label="$t('Channels.Go To Channel')"
                :background-color="ACTION_BUTTON_COLOR"
                text-color="var(--primary-text-color)"
                @click="goToChannel(channel.id)"
              />
              <ft-subscribe-button
                v-if="!hideUnsubscribeButton"
                :channel-id="channel.id"
                :channel-name="channel.name"
                :channel-thumbnail="channel.thumbnail"
                :hide-profile-dropdown-toggle="true"
                :open-dropdown-on-subscribe="false"
              />
            </div>
          </div>
        </ft-flex-box>
      </template>
    </ft-card>
  </div>
</template>

<script setup>
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { computed, nextTick, onMounted, onBeforeUnmount, ref, watch, useTemplateRef } from 'vue'
import { isNavigationFailure, NavigationFailureType, useRoute, useRouter } from 'vue-router'
import FtCard from '../../components/ft-card/ft-card.vue'
import FtFlexBox from '../../components/ft-flex-box/ft-flex-box.vue'
import FtButton from '../../components/FtButton/FtButton.vue'
import FtInput from '../../components/FtInput/FtInput.vue'
import FtSubscribeButton from '../../components/FtSubscribeButton/FtSubscribeButton.vue'
import { invidiousGetChannelInfo, youtubeImageUrlToInvidious, invidiousImageUrlToInvidious } from '../../helpers/api/invidious'
import { getLocalChannel, parseLocalChannelHeader } from '../../helpers/api/local'
import { ctrlFHandler, debounce } from '../../helpers/utils'
import { useI18n } from 'vue-i18n'
import store from '../../store/index'
import { useTvPage } from '../../composables/useTvPage'
import { useSpatialZone } from '../../composables/useSpatialZone'
import { activateZone, navState } from '../../helpers/spatialNav/NavManager'

import android from 'android'

// One stop per channel: its card (a list item). Pressing it expands the
// card, which then shows its actions, see below.
const PAGE_ZONE_ID = 'page-subscribed-channels'

// Starts on the first channel, not on the search field above them, which
// takes the keyboard as soon as it is focused
useTvPage(PAGE_ZONE_ID)

const route = useRoute()
const router = useRouter()
const { locale } = useI18n()

const re = {
  url: /(.+=\w)\d+(.+)/,
  ivToYt: /^.+ggpht\/(.+)/
}
const ytBaseURL = 'https://yt3.ggpht.com'
const thumbnailSize = 176
let errorCount = 0

const query = ref('')
const subscribedChannels = ref([])
const filteredChannels = ref([])

const searchBarChannels = useTemplateRef('searchBarChannels')

/** @type {import('vue').ComputedRef<object>} */
const activeProfile = computed(() => {
  return store.getters.getActiveProfile
})

/** @type {import('vue').ComputedRef<string>} */
const activeProfileId = computed(() => {
  return activeProfile.value._id
})

/** @type {import('vue').ComputedRef<Array>} */
const activeSubscriptionList = computed(() => {
  return activeProfile.value.subscriptions
})

/** @type {import('vue').ComputedRef<Array>} */
const channelList = computed(() => {
  if (query.value !== '') {
    return filteredChannels.value
  } else {
    return subscribedChannels.value
  }
})

/** @type {import('vue').ComputedRef<boolean>} */
const hideUnsubscribeButton = computed(() => {
  return store.getters.getHideUnsubscribeButton
})

/** @type {import('vue').ComputedRef<'local' | 'invidious'>} */
const backendPreference = computed(() => {
  return store.getters.getBackendPreference
})

/** @type {import('vue').ComputedRef<string>} */
const currentInvidiousInstanceUrl = computed(() => {
  return store.getters.getCurrentInvidiousInstanceUrl
})

function getSubscription() {
  subscribedChannels.value = activeSubscriptionList.value.slice().sort((a, b) => {
    return a.name?.toLowerCase().localeCompare(b.name?.toLowerCase(), locale.value)
  })
}

function filterChannels() {
  if (query.value === '') {
    filteredChannels.value = []
    return
  }

  const escapedQuery = query.value.replaceAll(/[$()*+.?[\\\]^{|}]/g, '\\$&')
  const re = new RegExp(escapedQuery, 'i')
  filteredChannels.value = subscribedChannels.value.filter(channel => {
    return re.test(channel.name)
  })
}

const filterChannelsDebounce = debounce(filterChannels, 500)

function thumbnailURL(originalURL) {
  if (originalURL == null) { return null }
  let newURL = originalURL
  // Sometimes relative protocol URLs are passed in
  if (originalURL.startsWith('//')) {
    newURL = `https:${originalURL}`
  }
  const hostname = new URL(newURL).hostname
  if (hostname === 'yt3.ggpht.com' || hostname === 'yt3.googleusercontent.com') {
    if (backendPreference.value === 'invidious') { // YT to IV
      newURL = youtubeImageUrlToInvidious(newURL, currentInvidiousInstanceUrl.value)
    }
  } else {
    if (backendPreference.value === 'local') { // IV to YT
      newURL = newURL.replace(re.ivToYt, `${ytBaseURL}/$1`)
    } else { // IV to IV
      newURL = invidiousImageUrlToInvidious(newURL, currentInvidiousInstanceUrl.value)
    }
  }

  return newURL.replace(re.url, `$1${thumbnailSize}$2`)
}

function updateThumbnail(channel) {
  errorCount += 1
  if (backendPreference.value === 'local') {
    // avoid too many concurrent requests
    setTimeout(() => {
      getLocalChannel(channel.id).then(response => {
        if (!response.alert) {
          store.dispatch('updateSubscriptionDetails', {
            channelThumbnailUrl: thumbnailURL(parseLocalChannelHeader(response).thumbnailUrl),
            channelName: channel.name,
            channelId: channel.id
          })
        }
      })
    }, errorCount * 500)
  } else {
    setTimeout(() => {
      invidiousGetChannelInfo(channel.id).then(response => {
        store.dispatch('updateSubscriptionDetails', {
          channelThumbnailUrl: thumbnailURL(response.authorThumbnails[0].url),
          channelName: channel.name,
          channelId: channel.id
        })
      })
    }, errorCount * 500)
  }
}

function handleQueryChange(val, filterNow = false) {
  query.value = val

  saveStateInRouter(val)

  filterNow ? filterChannels() : filterChannelsDebounce()
}

async function saveStateInRouter(query) {
  if (query.value === '') {
    await router.replace({ name: 'subscribedChannels' }).catch(failure => {
      if (isNavigationFailure(failure, NavigationFailureType.duplicated)) {
        return
      }

      throw failure
    })
    return
  }

  await router.replace({
    name: 'subscribedChannels',
    query: { searchQueryText: query },
  }).catch(failure => {
    if (isNavigationFailure(failure, NavigationFailureType.duplicated)) {
      return
    }

    throw failure
  })
}

function keyboardShortcutHandler(event) {
  ctrlFHandler(event, searchBarChannels.value)
}

watch(activeProfileId, () => {
  query.value = ''
  getSubscription()
})

watch(activeSubscriptionList, () => {
  getSubscription()
  filterChannels()
})

// region created

getSubscription()

const oldQuery = route.query.searchQueryText ?? ''
if (oldQuery !== null && oldQuery !== '') {
  // `handleQueryChange` must be called after `filterHistoryDebounce` assigned
  handleQueryChange(oldQuery, true)
}

// endregion created

onMounted(() => {
  document.addEventListener('keydown', keyboardShortcutHandler)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', keyboardShortcutHandler)
})

const enableChannelLinks = computed(() => !store.getters.getDisableChannelLinks)

// A pressed channel card grows over its neighbours and shows its actions
// under its name: going to the channel, and unsubscribing.
const ACTION_BUTTON_COLOR = 'color-mix(in srgb, var(--primary-text-color) 14%, transparent)'

/** @type {import('vue').Ref<string | null>} */
const expandedChannelId = ref(null)

/** How many actions a card shows, for the room they take (SubscribedChannels.css) */
const actionCount = computed(() => (enableChannelLinks.value ? 1 : 0) + (hideUnsubscribeButton.value ? 0 : 1))

/**
 * @param {string} channelId
 */
function toggleExpanded(channelId) {
  expandedChannelId.value = expandedChannelId.value === channelId || actionCount.value === 0 ? null : channelId
}

function collapse() {
  expandedChannelId.value = null
}

/**
 * @param {string} channelId
 */
function goToChannel(channelId) {
  router.push(`/channel/${channelId}`)
}

// Remote control (spatial nav): while a card is expanded, its actions are a
// zone of their own, one per row. Left, Right, Up from the first action,
// Down from the last one, Escape or the Back button collapse the card, and
// focus returns to it.
const ACTIONS_ZONE_ID = 'subscribed-channel-actions'
const channelsRef = useTemplateRef('channelsRef')

/** @returns {Element | null} */
function expandedCard() {
  return channelsRef.value?.$el.querySelector('.channel.expanded') ?? null
}

function actionsGrid() {
  return [...(expandedCard()?.querySelectorAll('.channelActions .btn') ?? [])].map(button => [button])
}

const actionsZone = useSpatialZone(ACTIONS_ZONE_ID, actionsGrid, {
  onKeyDown: (event) => {
    // The unsubscribe prompt over the card handles its own keys
    if (store.getters.isAnyPromptOpen) { return true }

    const row = navState.lastPosition.get(ACTIONS_ZONE_ID)?.row ?? 0

    // Leaving the actions in any direction (or Escape): back on the card
    if (
      event.key === 'Escape' ||
      event.key === 'ArrowLeft' ||
      event.key === 'ArrowRight' ||
      (event.key === 'ArrowUp' && row === 0) ||
      (event.key === 'ArrowDown' && row >= actionsGrid().length - 1)
    ) {
      event.preventDefault()
      collapse()
      return true
    }

    return false
  },
})

/**
 * Clicking/tapping outside the expanded card collapses it
 * @param {PointerEvent} event
 */
function handleOutsidePointerDown(event) {
  const card = expandedCard()
  if (card && !card.contains(/** @type {Node} */ (event.target)) && !store.getters.isAnyPromptOpen) {
    collapse()
  }
}

function removeExpandedListeners() {
  document.removeEventListener('pointerdown', handleOutsidePointerDown, true)

  if (process.env.IS_ANDROID) {
    android.exitPromptMode()
    window.removeEventListener('exit-prompt', collapse)
  }
}

watch(expandedChannelId, async (channelId, previousChannelId) => {
  if (channelId != null && previousChannelId == null) {
    document.addEventListener('pointerdown', handleOutsidePointerDown, true)

    // Android's Back button collapses the card
    if (process.env.IS_ANDROID) {
      android.enterPromptMode()
      window.addEventListener('exit-prompt', collapse)
    }
  } else if (channelId == null) {
    removeExpandedListeners()
  }

  // Only when the remote is in use (some zone has the focus)
  if (navState.activeZoneId === null) { return }

  await nextTick()

  if (channelId != null) {
    navState.lastPosition.set(ACTIONS_ZONE_ID, { row: 0, col: 0 })
    actionsZone.activate()
  } else if (actionsZone.isActive.value) {
    activateZone(PAGE_ZONE_ID)
  }
})

// The expanded channel is gone (unsubscribed, or filtered out by a search)
watch(channelList, (channels) => {
  if (expandedChannelId.value != null && !channels.some(channel => channel.id === expandedChannelId.value)) {
    collapse()
  }
})

onBeforeUnmount(() => {
  if (expandedChannelId.value != null) {
    removeExpandedListeners()
  }
})

</script>
<style scoped src="./SubscribedChannels.css" />
