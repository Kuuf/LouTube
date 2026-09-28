<template>
  <div
    ref="subscribeButton"
    class="ftSubscribeButton"
    @focusout="handleProfileDropdownFocusOut"
  >
    <div
      class="buttonList"
    >
      <FtButton
        :label="subscribedText"
        :no-border="true"
        class="subscribeButton"
        :class="{
          hasProfileDropdownToggle: isProfileDropdownEnabled,
          dropdownOpened: isProfileDropdownOpen
        }"
        background-color="var(--primary-color)"
        text-color="var(--text-with-main-color)"
        @click="handleSubscription(activeProfile)"
      />
      <FtPrompt
        v-if="showUnsubscribePopupForProfile !== null"
        :label="$t('Channels.Unsubscribe Prompt', { channelName: channelName })"
        :option-names="[$t('Yes'), $t('No')]"
        :option-values="['yes', 'no']"
        :autosize="true"
        @click="handleUnsubscribeConfirmation"
      />
      <FtButton
        v-if="isProfileDropdownEnabled"
        :no-border="true"
        :title="isProfileDropdownOpen ? $t('Profile.Close Profile Dropdown') : $t('Profile.Open Profile Dropdown')"
        class="profileDropdownToggle"
        :class="{ dropdownOpened: isProfileDropdownOpen}"
        background-color="var(--primary-color)"
        text-color="var(--text-with-main-color)"
        :aria-expanded="isProfileDropdownOpen"
        @click="toggleProfileDropdown"
      >
        <FontAwesomeIcon
          :icon="['fas', 'angle-down']"
          class="dropdownChevron"
        />
      </FtButton>
    </div>
    <Transition
      name="profileDropdown"
      @after-leave="handleDropdownClosed"
    >
      <div
        v-if="isProfileDropdownOpen"
        ref="profileDropdown"
        tabindex="-1"
        class="profileDropdown"
      >
        <p class="profileDropdownHeading">
          {{ $t('Profile.Subscribe in profiles') }}
        </p>
        <ul
          class="profileList"
        >
          <li
            v-for="(profile, index) in profileDisplayList"
            :key="profile._id"
            class="profile"
            :class="{
              subscribed: isProfileSubscribed(profile)
            }"
            :data-index="index"
            :style="{ '--index': index }"
            data-spatial-nav-visual
            :aria-labelledby="id + '-' + index"
            :aria-selected="isActiveProfile(profile)"
            :aria-checked="isProfileSubscribed(profile)"
            tabindex="0"
            role="checkbox"
            @click.stop.prevent="handleSubscription(profile)"
            @keydown.enter.space.stop.prevent="handleSubscription(profile)"
          >
            <div
              class="colorOption"
              :style="{ background: profile.bgColor, color: profile.textColor }"
            >
              <div
                class="initial"
                dir="auto"
              >
                {{ profileInitials[profile._id] }}
              </div>
            </div>
            <div class="profileText">
              <p
                :id="id + '-' + index"
                class="profileName"
                dir="auto"
              >
                {{ profileName(profile) }}
              </p>
              <p
                v-if="isProfileSubscribed(profile)"
                class="profileStatus"
              >
                {{ $t('Profile.Subscribed') }}
              </p>
            </div>
            <span
              class="checkIndicator"
              aria-hidden="true"
            >
              <FontAwesomeIcon
                :icon="['fas', 'check']"
                class="checkIcon"
              />
            </span>
          </li>
        </ul>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { computed, nextTick, onBeforeUnmount, ref, shallowRef, useId, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import android from 'android'

import FtButton from '../FtButton/FtButton.vue'
import FtPrompt from '../FtPrompt/FtPrompt.vue'

import store from '../../store/index'

import { MAIN_PROFILE_ID } from '../../../constants'
import { showToast } from '../../helpers/utils'
import { getFirstCharacter } from '../../helpers/strings'
import { useSpatialZone } from '../../composables/useSpatialZone'
import { activateZone, navState } from '../../helpers/spatialNav/NavManager'

const { locale, t } = useI18n()

const props = defineProps({
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
  hideProfileDropdownToggle: {
    type: Boolean,
    default: false
  },
  openDropdownOnSubscribe: {
    type: Boolean,
    default: true
  },
  subscriptionCountText: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['subscribed'])

const id = useId()

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

/** @type {import('vue').ComputedRef<Profile[]>} */
const profileList = computed(() => {
  return store.getters.getProfileList
})

/** @type {import('vue').ComputedRef<Profile>} */
const activeProfile = computed(() => {
  return store.getters.getActiveProfile
})

// A stable order (not moving profiles around when (un)subscribed), so the
// remote's focus stays on the profile just toggled
const profileDisplayList = computed(() => [
  profileList.value[0],
  ...(activeProfile.value._id !== MAIN_PROFILE_ID ? [activeProfile.value] : []),
  ...profileList.value.filter((profile, i) => i !== 0 && !isActiveProfile(profile))
])

/**
 * The main profile's name is translated, as elsewhere
 * @param {Profile} profile
 */
function profileName(profile) {
  return profile._id === MAIN_PROFILE_ID ? t('Profile.All Channels') : profile.name
}

const profileInitials = computed(() => {
  const locale_ = locale.value

  return profileList.value.reduce((accumulator, profile) => {
    const name = profileName(profile)
    accumulator[profile._id] = name
      ? getFirstCharacter(name, locale_)
      : ''

    return accumulator
  }, {})
})

/** @type {import('vue').ComputedRef<boolean>} */
const hideChannelSubscriptions = computed(() => {
  return store.getters.getHideChannelSubscriptions
})

const subscribedText = computed(() => {
  let subscribedValue = (isProfileSubscribed(activeProfile.value) ? t('Channel.Unsubscribe') : t('Channel.Subscribe'))
  if (props.subscriptionCountText !== '' && !hideChannelSubscriptions.value) {
    subscribedValue += ' ' + props.subscriptionCountText
  }
  return subscribedValue
})

const isProfileDropdownEnabled = computed(() => {
  return !props.hideProfileDropdownToggle && profileList.value.length > 1
})

const isProfileDropdownOpen = ref(false)
/** @type {import('vue').ShallowRef<Profile | null>} */
const showUnsubscribePopupForProfile = shallowRef(null)

/**
 * @param {Profile} profile
 */
function handleSubscription(profile) {
  if (props.channelId === '') {
    return
  }

  if (isProfileSubscribed(profile)) {
    if (store.getters.getUnsubscriptionPopupStatus) {
      showUnsubscribePopupForProfile.value = profile
    } else {
      handleUnsubscription(profile)
    }
  } else {
    const profileIds = [profile._id]

    if (profile._id !== MAIN_PROFILE_ID) {
      const primaryProfile = profileList.value.find(prof => {
        return prof._id === MAIN_PROFILE_ID
      })

      if (!isProfileSubscribed(primaryProfile)) {
        profileIds.push(MAIN_PROFILE_ID)
      }
    }

    store.dispatch('addChannelToProfiles', {
      channel: {
        id: props.channelId,
        name: props.channelName,
        thumbnail: props.channelThumbnail
      },
      profileIds
    })

    showToast(t('Channel.Added channel to your subscriptions'))
    emit('subscribed')
  }

  if (isProfileDropdownEnabled.value && props.openDropdownOnSubscribe && !isProfileDropdownOpen.value) {
    toggleProfileDropdown()
  }
}

const subscribeButton = useTemplateRef('subscribeButton')
const profileDropdown = useTemplateRef('profileDropdown')

/**
 * Keyboard focus moving elsewhere closes the dropdown. Focus simply being
 * dropped (no new target, e.g. released by the remote's spatial nav) doesn't.
 * @param {FocusEvent} event
 */
function handleProfileDropdownFocusOut(event) {
  const target = event.relatedTarget
  if (target instanceof Node && subscribeButton.value && !subscribeButton.value.contains(target)) {
    isProfileDropdownOpen.value = false
  }
}

/**
 * Clicking/tapping outside closes the dropdown
 * @param {PointerEvent} event
 */
function handleOutsidePointerDown(event) {
  if (subscribeButton.value && !subscribeButton.value.contains(/** @type {Node} */ (event.target))) {
    isProfileDropdownOpen.value = false
  }
}

function toggleProfileDropdown() {
  isProfileDropdownOpen.value = !isProfileDropdownOpen.value
}

// Remote control (spatial nav): while open, the dropdown is a zone of its
// own, one profile per row. Enter toggles the focused profile, Left, Up from
// the first profile, Escape or the Back button close it, and focus goes back
// to where it was (the subscribe button or the dropdown toggle).
const profileZoneId = `subscribe-profiles-${id}`

/** The zone with the remote's focus before the dropdown took it */
let returnZoneId = null

// Every profile is always shown, one per row. Not `gridFromElements`: it skips
// transparent elements, which the profiles are while they animate in, and the
// zone activates as the dropdown opens (the focus would land nowhere, e.g.
// behind the unsubscribe prompt, and stay there)
const profileZone = useSpatialZone(profileZoneId, () => [...(profileDropdown.value?.querySelectorAll('.profile') ?? [])].map(profile => [profile]), {
  onKeyDown: handleProfileZoneKey,
  onSelect: (_position, cell) => {
    const profile = profileDisplayList.value[Number(cell?.dataset.index)]
    if (profile) {
      handleSubscription(profile)
    }
  },
})

/**
 * @param {KeyboardEvent} event
 * @returns {boolean} handled here instead of by spatial nav
 */
function handleProfileZoneKey(event) {
  // Closing (fading out): the focus returns once it's gone
  if (!isProfileDropdownOpen.value) {
    event.preventDefault()
    return true
  }

  const row = navState.lastPosition.get(profileZoneId)?.row ?? 0
  const lastRow = profileDisplayList.value.length - 1

  if (event.key === 'Escape' || event.key === 'ArrowLeft' || (event.key === 'ArrowUp' && row === 0)) {
    event.preventDefault()
    isProfileDropdownOpen.value = false
    return true
  }

  // Dead ends: nothing else to go to (not scrolling the page either)
  if (event.key === 'ArrowRight' || (event.key === 'ArrowDown' && row >= lastRow)) {
    event.preventDefault()
    return true
  }

  return false
}

function handleDropdownClosed() {
  if (returnZoneId !== null && profileZone.isActive.value) {
    activateZone(returnZoneId)
  }
  returnZoneId = null
}

/** Android's Back button closes the dropdown (not the unsubscribe prompt over it) */
function handleExitPrompt() {
  if (showUnsubscribePopupForProfile.value === null) {
    isProfileDropdownOpen.value = false
  }
}

watch(isProfileDropdownOpen, async (open) => {
  if (open) {
    document.addEventListener('pointerdown', handleOutsidePointerDown, true)
    if (process.env.IS_ANDROID) {
      android.enterPromptMode()
      window.addEventListener('exit-prompt', handleExitPrompt)
    }
  } else {
    document.removeEventListener('pointerdown', handleOutsidePointerDown, true)
    if (process.env.IS_ANDROID) {
      android.exitPromptMode()
      window.removeEventListener('exit-prompt', handleExitPrompt)
    }
  }

  // Only when the remote is in use (some zone has the focus)
  const activeZoneId = navState.activeZoneId
  if (!open || activeZoneId === null || activeZoneId === profileZoneId) { return }

  returnZoneId = activeZoneId
  await nextTick()

  // On the first profile not subscribed to yet, likely the one to add next
  const row = profileDisplayList.value.findIndex(profile => !isProfileSubscribed(profile))
  navState.lastPosition.set(profileZoneId, { row: Math.max(row, 0), col: 0 })
  profileZone.activate()
})

onBeforeUnmount(() => {
  if (isProfileDropdownOpen.value) {
    document.removeEventListener('pointerdown', handleOutsidePointerDown, true)
    if (process.env.IS_ANDROID) {
      android.exitPromptMode()
      window.removeEventListener('exit-prompt', handleExitPrompt)
    }
  }
})

/**
 * @param {'yes' | 'no' | null} value
 */
function handleUnsubscribeConfirmation(value) {
  const profile = showUnsubscribePopupForProfile.value
  showUnsubscribePopupForProfile.value = null

  // The prompt leaves Android's prompt mode when it closes, the dropdown
  // still needs it (Back closing the dropdown)
  if (process.env.IS_ANDROID) {
    nextTick(() => {
      if (isProfileDropdownOpen.value) {
        android.enterPromptMode()
      }
    })
  }

  if (value === 'yes') {
    handleUnsubscription(profile)
  }
}

/**
 * @param {Profile} profile
 */
function handleUnsubscription(profile) {
  const profileIds = [profile._id]

  if (profile._id === MAIN_PROFILE_ID) {
    // Check if a subscription exists in a different profile.
    // Remove from there as well.

    profileList.value.forEach((profileInList) => {
      if (profileInList._id === MAIN_PROFILE_ID) {
        return
      }

      if (isProfileSubscribed(profileInList)) {
        profileIds.push(profileInList._id)
      }
    })
  }

  store.dispatch('removeChannelFromProfiles', { channelId: props.channelId, profileIds })

  showToast(t('Channel.Channel has been removed from your subscriptions'))

  if (profile._id === MAIN_PROFILE_ID && profileIds.length > 1) {
    showToast(t('Channel.Removed subscription from {count} other channel(s)', { count: profileIds.length - 1 }))
  }
}

/**
 * @param {Profile} profile
 */
function isActiveProfile(profile) {
  return profile._id === activeProfile.value._id
}

/**
 * @param {Profile} profile
 */
function isProfileSubscribed(profile) {
  const channelId = props.channelId

  return profile.subscriptions.some((channel) => channel.id === channelId)
}
</script>

<style scoped src="./FtSubscribeButton.css" />
