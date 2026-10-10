<template>
  <div class="profileManage">
    <nav
      ref="nav"
      class="manageNav"
    >
      <div class="navProfile">
        <span
          class="avatar"
          :style="{ background: profile?.bgColor, color: profile?.textColor }"
        >
          <span dir="auto">{{ profileInitial }}</span>
        </span>
        <span
          class="profileName"
          dir="auto"
        >
          {{ profileDisplayName }}
        </span>
      </div>
      <button
        v-for="item in navItems"
        :key="item.section"
        class="navItem"
        :class="{ active: item.section === section }"
        type="button"
        :data-section="item.section"
        :aria-current="item.section === section"
        @click="section = item.section"
      >
        <FontAwesomeIcon
          :icon="item.icon"
          class="navIcon"
          fixed-width
        />
        {{ item.label }}
      </button>
      <button
        class="navItem backItem"
        type="button"
        @click="backToSwitcher"
      >
        <FontAwesomeIcon
          :icon="['fas', 'arrow-left']"
          class="navIcon"
          fixed-width
        />
        {{ t('Profile.All Profiles') }}
      </button>
    </nav>
    <div
      v-if="profile"
      ref="content"
      :key="route.fullPath"
      class="manageContent"
    >
      <FtProfileChannelList
        v-if="section === 'subscriptions'"
        :profile="profile"
        :is-main-profile="isMainProfile"
      />
      <FtProfileFilterChannelsList
        v-else-if="section === 'add'"
        :profile="profile"
      />
      <FtProfileEdit
        v-else
        :profile="profile"
        :is-new="isNew"
        :is-main-profile="isMainProfile"
        @new-profile-created="backToSwitcher"
        @profile-deleted="backToSwitcher"
      />
    </div>
  </div>
</template>

<script setup>
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { computed, onMounted, ref, shallowRef, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'

import FtProfileEdit from '../../components/FtProfileEdit/FtProfileEdit.vue'
import FtProfileChannelList from '../../components/FtProfileChannelList/FtProfileChannelList.vue'
import FtProfileFilterChannelsList from '../../components/FtProfileFilterChannelsList/FtProfileFilterChannelsList.vue'

import store from '../../store/index'

import { calculateColorLuminance, profileColors } from '../../helpers/colors'
import { getFirstCharacter } from '../../helpers/strings'
import { MAIN_PROFILE_ID } from '../../../constants'
import { useSpatialZone } from '../../composables/useSpatialZone'
import { focusableGrid, navState } from '../../helpers/spatialNav/NavManager'

/**
 * @typedef {object} Profile
 * @property {string} [_id]
 * @property {string} name
 * @property {string} bgColor
 * @property {string} textColor
 * @property {object[]} subscriptions
 */

/** @typedef {'subscriptions' | 'add' | 'edit'} Section */

const { locale, t } = useI18n()
const route = useRoute()
const router = useRouter()

// One profile's settings, opened from the profile switcher (TVProfiles.vue):
// an existing profile by its id, or a new one to create
const isNew = computed(() => route.name === 'tvProfileNew')
const profileId = computed(() => /** @type {string} */ (route.params.id ?? ''))
const isMainProfile = computed(() => profileId.value === MAIN_PROFILE_ID)

function newProfile() {
  const bgColor = profileColors[Math.floor(Math.random() * profileColors.length)]

  return {
    name: '',
    bgColor,
    textColor: calculateColorLuminance(bgColor),
    subscriptions: []
  }
}

/** @type {import('vue').ShallowRef<Profile | null>} */
const profile = shallowRef(null)

/** @type {import('vue').Ref<Section>} */
const section = ref('subscriptions')

// The page's component is reused when the route changes to another profile
watch(() => route.fullPath, () => {
  profile.value = isNew.value ? newProfile() : store.getters.profileById(profileId.value) ?? null
  section.value = isNew.value ? 'edit' : 'subscriptions'
}, { immediate: true })

// Kept up to date as the sections change the profile, gone once deleted
watch(() => store.getters.getProfileList, () => {
  if (!isNew.value) {
    profile.value = store.getters.profileById(profileId.value) ?? null
  }
}, { deep: true })

const profileDisplayName = computed(() => {
  if (isNew.value) { return t('Profile.Create Profile') }

  return isMainProfile.value ? t('Profile.All Channels') : (profile.value?.name ?? '')
})

const profileInitial = computed(() => {
  return !isNew.value && profileDisplayName.value ? getFirstCharacter(profileDisplayName.value, locale.value) : ''
})

/** The mini nav: a new profile only has its details to fill in, the main profile has every channel already */
const navItems = computed(() => {
  /** @type {{ section: Section, label: string, icon: string[] }[]} */
  const items = []

  if (!isNew.value) {
    items.push({ section: 'subscriptions', label: t('Subscriptions.Subscriptions'), icon: ['fas', 'rss'] })

    if (!isMainProfile.value) {
      items.push({ section: 'add', label: t('Profile.Add Channels'), icon: ['fas', 'plus'] })
    }
  }

  items.push({ section: 'edit', label: isNew.value ? t('Profile.Create Profile') : t('Profile.Edit Profile'), icon: ['fas', 'pen'] })

  return items
})

function backToSwitcher() {
  router.replace('/tv/profiles')
}

// Remote control (spatial nav): the mini nav, one item per row, and the
// current section's controls beside it (read from the page on each key
// press, as they change with the section). Focusing a nav item shows its
// section right away, like the channel page's tabs.
const NAV_ZONE_ID = 'tv-profile-nav'
const CONTENT_ZONE_ID = 'tv-profile-manager'

const nav = useTemplateRef('nav')
const content = useTemplateRef('content')

function navGrid() {
  return [...(nav.value?.querySelectorAll('.navItem') ?? [])].map(item => [item])
}

function contentGrid() {
  return focusableGrid(content.value)
}

function currentSectionRow() {
  return Math.max(navItems.value.findIndex(item => item.section === section.value), 0)
}

// A profile that doesn't exist (anymore): nothing to manage
watch(profile, (value) => {
  if (value == null) {
    backToSwitcher()
  }
}, { immediate: true })

// Registered before the zone's own mounted hook, which activates it
onMounted(() => {
  navState.lastPosition.set(NAV_ZONE_ID, { row: currentSectionRow(), col: 0 })
})

const navZone = useSpatialZone(NAV_ZONE_ID, navGrid, {
  active: true,
  edges: {
    left: 'sidebar',
    // Nothing to move to in an empty section (e.g. no subscriptions)
    right: () => contentGrid().length > 0 ? CONTENT_ZONE_ID : null,
  },
})

watch(navZone.focusedPosition, (position) => {
  if (position == null) { return }

  const itemSection = navGrid()[position.row]?.[0]?.dataset.section
  if (itemSection) {
    section.value = /** @type {Section} */ (itemSection)
  }
})

useSpatialZone(CONTENT_ZONE_ID, contentGrid, {
  edges: {
    // Back to the mini nav, on the section that is open
    left: () => {
      navState.lastPosition.set(NAV_ZONE_ID, { row: currentSectionRow(), col: 0 })
      return NAV_ZONE_ID
    },
  },
})
</script>

<style scoped src="./TVProfileManage.css" />
