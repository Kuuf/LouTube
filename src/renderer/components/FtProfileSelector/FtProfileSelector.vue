<template>
  <div>
    <RouterLink
      class="colorOption"
      :title="$t('Profile.Profile Select')"
      :style="{ background: activeProfile.bgColor, color: activeProfile.textColor }"
      :to="{ name: 'tvProfiles' }"
    >
      <div
        class="initial"
        dir="auto"
      >
        {{ activeProfileInitial }}
      </div>
    </RouterLink>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import store from '../../store/index'

import { MAIN_PROFILE_ID } from '../../../constants'
import { getFirstCharacter } from '../../helpers/strings'

/**
 * @typedef {object} Profile
 * @property {string} _id
 * @property {string} name
 * @property {string} bgColor
 * @property {string} textColor
 */

const { locale, t } = useI18n()

/** @type {import('vue').ComputedRef<Profile>} */
const activeProfile = computed(() => store.getters.getActiveProfile)

const activeProfileInitial = computed(() => {
  if (!activeProfile.value?.name) { return '' }

  const name = activeProfile.value._id === MAIN_PROFILE_ID ? t('Profile.All Channels') : activeProfile.value.name
  return getFirstCharacter(name, locale.value)
})
</script>

<style scoped src="./FtProfileSelector.css" />
