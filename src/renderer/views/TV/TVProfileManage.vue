<template>
  <div ref="manager">
    <ProfileSettings
      :key="route.fullPath"
      :profile-id="profileId"
      :is-new="route.name === 'tvProfileNew'"
    />
  </div>
</template>

<script setup>
import { computed, useTemplateRef } from 'vue'
import { useRoute } from 'vue-router'

import ProfileSettings from '../ProfileSettings/ProfileSettings.vue'

import { useSpatialZone } from '../../composables/useSpatialZone'
import { focusableGrid } from '../../helpers/spatialNav/NavManager'

const route = useRoute()

/** The profile to open, from the profile switcher's edit button */
const profileId = computed(() => /** @type {string} */ (route.params.id ?? ''))

// Remote control (spatial nav): every control of the profile manager. Its
// layout changes as profiles are opened, so the grid is read from the page
// on each key press.
const manager = useTemplateRef('manager')

useSpatialZone('tv-profile-manager', () => focusableGrid(manager.value), {
  active: true,
  edges: {
    left: 'sidebar',
  },
})
</script>
