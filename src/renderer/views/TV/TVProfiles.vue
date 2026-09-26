<template>
  <div>
    <FtCard
      ref="selectCard"
      class="card"
    >
      <h2>{{ t('Profile.Profile Select') }}</h2>
      <FtFlexBox class="profileList">
        <FtProfileBubble
          v-for="profile in profileList"
          :key="profile._id"
          :is-main-profile="profile._id === MAIN_PROFILE_ID"
          :profile-name="profile.name"
          :background-color="profile.bgColor"
          :text-color="profile.textColor"
          :class="{ activeProfile: profile._id === activeProfile._id }"
          @click="setActiveProfile(profile)"
        />
      </FtFlexBox>
    </FtCard>
    <div ref="manager">
      <ProfileSettings />
    </div>
  </div>
</template>

<script setup>
import { computed, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'

import FtCard from '../../components/ft-card/ft-card.vue'
import FtFlexBox from '../../components/ft-flex-box/ft-flex-box.vue'
import FtProfileBubble from '../../components/FtProfileBubble/FtProfileBubble.vue'
import ProfileSettings from '../ProfileSettings/ProfileSettings.vue'

import store from '../../store/index'

import { showToast } from '../../helpers/utils'
import { MAIN_PROFILE_ID } from '../../../constants'
import { useSpatialZone } from '../../composables/useSpatialZone'
import { focusableGrid } from '../../helpers/spatialNav/NavManager'

/**
 * @typedef {object} Profile
 * @property {string} _id
 * @property {string} name
 * @property {string} bgColor
 * @property {string} textColor
 */

const { t } = useI18n()

/** @type {import('vue').ComputedRef<Profile[]>} */
const profileList = computed(() => store.getters.getProfileList)

/** @type {import('vue').ComputedRef<Profile>} */
const activeProfile = computed(() => store.getters.getActiveProfile)

const selectCard = useTemplateRef('selectCard')
const manager = useTemplateRef('manager')

// Two spatial-nav zones: the profile select row on top, and every control of
// the profile manager below it (its layout changes as profiles are opened,
// so the grid is read from the page on each key press).
useSpatialZone('tv-profile-select', () => focusableGrid(selectCard.value?.$el), {
  active: true,
  edges: {
    left: 'sidebar',
    down: 'tv-profile-manager',
  },
})

useSpatialZone('tv-profile-manager', () => focusableGrid(manager.value), {
  edges: {
    left: 'sidebar',
    up: 'tv-profile-select',
  },
})

/**
 * @param {Profile} profile
 */
function setActiveProfile(profile) {
  if (profile._id === activeProfile.value._id) { return }

  store.commit('setActiveProfile', profile._id)

  const profileName = profile._id === MAIN_PROFILE_ID ? t('Profile.All Channels') : profile.name
  showToast(t('Profile.{profile} is now the active profile', { profile: profileName }))
}
</script>

<style scoped src="./TVProfiles.css" />
