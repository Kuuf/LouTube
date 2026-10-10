<template>
  <div
    ref="root"
    class="switcher"
  >
    <h1 class="heading">
      {{ t('Profile.Who is Watching') }}
    </h1>
    <ul class="profiles">
      <li
        v-for="profile in profiles"
        :key="profile._id"
        class="profile"
      >
        <button
          class="profileTile"
          :class="{ active: profile.isActive }"
          type="button"
          data-spatial-nav-visual
          :aria-current="profile.isActive"
          @click="selectProfile(profile)"
        >
          <span
            class="avatar"
            :style="{ background: profile.bgColor, color: profile.textColor }"
          >
            <span
              class="initial"
              dir="auto"
            >
              {{ profile.initial }}
            </span>
            <span
              v-if="profile.isActive"
              class="activeBadge"
            >
              <FontAwesomeIcon :icon="['fas', 'check']" />
            </span>
          </span>
          <span
            class="name"
            dir="auto"
          >
            {{ profile.displayName }}
          </span>
        </button>
        <button
          class="editButton"
          type="button"
          :title="t('Profile.Edit Profile')"
          :aria-label="`${t('Profile.Edit Profile')}: ${profile.displayName}`"
          @click="editProfile(profile)"
        >
          <FontAwesomeIcon :icon="['fas', 'pen']" />
        </button>
      </li>
      <li class="profile">
        <button
          class="profileTile"
          type="button"
          data-spatial-nav-visual
          @click="addProfile"
        >
          <span class="avatar addAvatar">
            <FontAwesomeIcon :icon="['fas', 'plus']" />
          </span>
          <span class="name">
            {{ t('Profile.Create New Profile') }}
          </span>
        </button>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { computed, onMounted, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import store from '../../store/index'

import { showToast } from '../../helpers/utils'
import { getFirstCharacter } from '../../helpers/strings'
import { MAIN_PROFILE_ID } from '../../../constants'
import { useSpatialZone } from '../../composables/useSpatialZone'
import { navState } from '../../helpers/spatialNav/NavManager'

/**
 * @typedef {object} Profile
 * @property {string} _id
 * @property {string} name
 * @property {string} bgColor
 * @property {string} textColor
 */

const { locale, t } = useI18n()
const router = useRouter()

/** @type {import('vue').ComputedRef<Profile>} */
const activeProfile = computed(() => store.getters.getActiveProfile)

/** The profiles with what their tile shows (the main profile's name is translated, as elsewhere) */
const profiles = computed(() => {
  /** @type {Profile[]} */
  const profileList = store.getters.getProfileList

  return profileList.map(profile => {
    const displayName = profile._id === MAIN_PROFILE_ID ? t('Profile.All Channels') : profile.name

    return {
      ...profile,
      displayName,
      initial: displayName ? getFirstCharacter(displayName, locale.value) : '',
      isActive: profile._id === activeProfile.value._id,
    }
  })
})

// Remote control (spatial nav): the tiles are one row, the edit buttons
// under them the next. Focus starts on the active profile.
const ZONE_ID = 'tv-profile-select'
const root = useTemplateRef('root')

// Registered before the zone's own mounted hook, which activates it
onMounted(() => {
  const col = profiles.value.findIndex(profile => profile.isActive)
  navState.lastPosition.set(ZONE_ID, { row: 0, col: Math.max(col, 0) })
})

/** One column per profile: its tile, and its edit button (none for "new profile") below */
function switcherGrid() {
  const columns = [...(root.value?.querySelectorAll('.profile') ?? [])]

  return [
    columns.map(column => column.querySelector('.profileTile')),
    columns.map(column => column.querySelector('.editButton')),
  ]
}

useSpatialZone(ZONE_ID, switcherGrid, {
  active: true,
  edges: {
    left: 'sidebar',
  },
})

/**
 * Switches to the profile and moves on to its subscriptions
 * @param {Profile & { displayName: string }} profile
 */
function selectProfile(profile) {
  if (profile._id !== activeProfile.value._id) {
    store.commit('setActiveProfile', profile._id)
    showToast(t('Profile.{profile} is now the active profile', { profile: profile.displayName }))
  }

  router.push('/subscriptions')
}

/**
 * @param {Profile} profile
 */
function editProfile(profile) {
  router.push(`/tv/profiles/edit/${profile._id}`)
}

function addProfile() {
  router.push('/tv/profiles/new')
}
</script>

<style scoped src="./TVProfiles.css" />
