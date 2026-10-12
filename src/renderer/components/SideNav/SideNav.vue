<template>
  <FtFlexBox
    class="sideNav"
    :class="[{opened: isOpen, drawerOpen}, applyHiddenLabels]"
    role="navigation"
  >
    <!-- Dims the page behind the open drawer, click it to close the drawer -->
    <!-- eslint-disable-next-line vuejs-accessibility/click-events-have-key-events, vuejs-accessibility/no-static-element-interactions -->
    <div
      class="drawerScrim"
      @click="closeDrawer"
    />
    <!-- Over the panel, not in it: it stays put and whole while the entries
         scroll and fade out under it -->
    <div class="brand">
      <img
        class="brandLogo"
        src="../../assets/img/loutube-logo.png"
        alt=""
      >
      <span class="brandName">{{ APP_NAME }}</span>
    </div>
    <!-- The focus highlight, under the entries and not in the panel: it
         holds still while they scroll under it -->
    <div
      class="focusHighlight"
      :class="{ shown: highlight.shown, sliding: highlight.sliding, visual: highlight.visual }"
      :style="{ translate: `0 ${highlight.top}px`, blockSize: `${highlight.height}px` }"
    />
    <div
      ref="inner"
      class="inner"
      :class="applyHiddenLabels"
      data-spatial-nav-scroll="center"
    >
      <router-link
        class="navOption topNavOption mobileShow"
        role="button"
        to="/tv/search"
        :title="$t('Search Bar.Search')"
      >
        <div
          class="thumbnailContainer"
        >
          <FontAwesomeIcon
            :icon="['fas', 'search']"
            class="navIcon"
            :class="applyNavIconExpand"
          />
        </div>
        <p
          class="navLabel"
        >
          {{ $t("Search Bar.Search") }}
        </p>
      </router-link>
      <router-link
        class="navOption mobileShow"
        role="button"
        to="/subscriptions"
        :title="$t('Subscriptions.Subscriptions')"
      >
        <div
          class="thumbnailContainer"
        >
          <FontAwesomeIcon
            :icon="['fas', 'rss']"
            class="navIcon"
            :class="applyNavIconExpand"
          />
        </div>
        <p
          class="navLabel"
        >
          {{ $t("Subscriptions.Subscriptions") }}
        </p>
      </router-link>
      <router-link
        class="navOption mobileHidden"
        role="button"
        to="/subscribedchannels"
        :title="$t('Channels.Channels')"
      >
        <div
          class="thumbnailContainer"
        >
          <FontAwesomeIcon
            :icon="['fas', 'user-check']"
            class="navIcon"
            :class="applyNavIconExpand"
          />
        </div>
        <p
          class="navLabel"
        >
          {{ $t("Channels.Channels") }}
        </p>
      </router-link>
      <router-link
        v-if="SUPPORTS_LOCAL_API && !hideTrendingVideos && (backendFallback || backendPreference === 'local')"
        class="navOption mobileHidden"
        role="button"
        to="/trending"
        :title="$t('Trending.Trending')"
      >
        <div
          class="thumbnailContainer"
        >
          <FontAwesomeIcon
            :icon="['fas', 'fire']"
            class="navIcon"
            :class="applyNavIconExpand"
          />
        </div>
        <p
          class="navLabel"
        >
          {{ $t("Trending.Trending") }}
        </p>
      </router-link>
      <router-link
        v-if="!hidePopularVideos && (backendFallback || backendPreference === 'invidious')"
        class="navOption mobileHidden"
        role="button"
        to="/popular"
        :title="$t('Most Popular')"
      >
        <div
          class="thumbnailContainer"
        >
          <FontAwesomeIcon
            :icon="['fas', 'users']"
            class="navIcon"
            :class="applyNavIconExpand"
          />
        </div>
        <p
          class="navLabel"
        >
          {{ $t("Most Popular") }}
        </p>
      </router-link>
      <router-link
        v-if="!hidePlaylists"
        class="navOption mobileShow"
        role="button"
        to="/userplaylists"
        :title="$t('Playlists')"
      >
        <div
          class="thumbnailContainer"
        >
          <FontAwesomeIcon
            :icon="['fas', 'bookmark']"
            class="navIcon"
            :class="applyNavIconExpand"
          />
        </div>
        <p
          class="navLabel"
        >
          {{ $t("Playlists") }}
        </p>
      </router-link>
      <SideNavMoreOptions />
      <router-link
        class="navOption mobileShow"
        role="button"
        to="/history"
        :title="historyTitle"
      >
        <div
          class="thumbnailContainer"
        >
          <FontAwesomeIcon
            :icon="['fas', 'history']"
            class="navIcon"
            :class="applyNavIconExpand"
          />
        </div>
        <p
          class="navLabel"
        >
          {{ $t("History.History") }}
        </p>
      </router-link>
      <hr>
      <!-- The active profile: its avatar and name -->
      <router-link
        class="navOption mobileShow"
        role="button"
        to="/tv/profiles"
        :title="activeProfileName"
        data-spatial-nav-visual
      >
        <div
          class="thumbnailContainer"
        >
          <div
            class="profileAvatar"
            :style="{ background: activeProfile.bgColor, color: activeProfile.textColor }"
            dir="auto"
          >
            {{ activeProfileInitial }}
          </div>
        </div>
        <p
          class="navLabel"
          dir="auto"
        >
          {{ activeProfileName }}
        </p>
      </router-link>
      <router-link
        class="navOption mobileShow smallMobileOnlyHidden"
        role="button"
        to="/settings"
        :title="settingsTitle"
      >
        <div
          class="thumbnailContainer"
        >
          <FontAwesomeIcon
            :icon="['fas', 'sliders-h']"
            class="navIcon"
            :class="applyNavIconExpand"
          />
        </div>
        <p
          class="navLabel"
        >
          {{ $t('Settings.Settings') }}
        </p>
      </router-link>
      <router-link
        class="navOption mobileHidden"
        role="button"
        to="/about"
        :title="$t('About.About')"
      >
        <div
          class="thumbnailContainer"
        >
          <FontAwesomeIcon
            :icon="['fas', 'info-circle']"
            class="navIcon"
            :class="applyNavIconExpand"
          />
        </div>
        <p
          class="navLabel"
        >
          {{ $t("About.About") }}
        </p>
      </router-link>
      <a
        v-if="usingAndroid && !usingRelease"
        class="navOption mobileHidden"
        :title="$t('Log Viewer.Console Log')"
        :aria-label="hideText ? $t('Log Viewer.Console Log') : null"
        @keydown="showLogViewer"
        @click="showLogViewer"
      >
        <div
          class="thumbnailContainer"
        >
          <font-awesome-icon
            :icon="['fas', 'terminal']"
            class="navIcon"
            :class="applyNavIconExpand"
            fixed-width
          />
        </div>
        <p
          v-if="!hideText"
          id="channelLabel"
          class="navLabel"
        >
          {{ $t("Log Viewer.Console Log") }}
        </p>
      </a>
    </div>
  </FtFlexBox>
</template>

<script setup>
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { computed, onBeforeUnmount, onMounted, reactive, ref, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'

import FtFlexBox from '../ft-flex-box/ft-flex-box.vue'
import SideNavMoreOptions from '../SideNavMoreOptions/SideNavMoreOptions.vue'

import store from '../../store/index'

import { localizeAndAddKeyboardShortcutToActionTitle } from '../../helpers/utils'
import { KeyboardShortcuts, MAIN_PROFILE_ID } from '../../../constants'
import { getFirstCharacter } from '../../helpers/strings'
import { useSpatialZone } from '../../composables/useSpatialZone'
import { activateZone, centeredScrollTop, gridFromElements, navState, scrollToCenterAnimated } from '../../helpers/spatialNav/NavManager'

const { locale, t } = useI18n()
const route = useRoute()

const SUPPORTS_LOCAL_API = process.env.SUPPORTS_LOCAL_API

// Brand name, not translated
const APP_NAME = 'LouTube'

/** @type {import('vue').ComputedRef<boolean>} */
const isOpen = computed(() => {
  return store.getters.getIsSideNavOpen
})

/** @type {import('vue').ComputedRef<boolean>} */
const backendFallback = computed(() => {
  return store.getters.getBackendFallback
})

/** @type {import('vue').ComputedRef<'local' | 'invidious'>} */
const backendPreference = computed(() => {
  return store.getters.getBackendPreference
})

/** @type {import('vue').ComputedRef<object>} */
const activeProfile = computed(() => {
  return store.getters.getActiveProfile
})

/** The main profile's name is translated, as elsewhere */
const activeProfileName = computed(() => {
  return activeProfile.value._id === MAIN_PROFILE_ID ? t('Profile.All Channels') : activeProfile.value.name
})

const activeProfileInitial = computed(() => {
  return activeProfileName.value ? getFirstCharacter(activeProfileName.value, locale.value) : ''
})

/** @type {import('vue').ComputedRef<boolean>} */
const hidePopularVideos = computed(() => {
  return store.getters.getHidePopularVideos
})

/** @type {import('vue').ComputedRef<boolean>} */
const hidePlaylists = computed(() => {
  return store.getters.getHidePlaylists
})

/** @type {import('vue').ComputedRef<boolean>} */
const hideTrendingVideos = computed(() => {
  return store.getters.getHideTrendingVideos
})

/** @type {import('vue').ComputedRef<boolean>} */
const hideText = computed(() => {
  return !isOpen.value && store.getters.getHideLabelsSideBar
})

const applyNavIconExpand = computed(() => {
  return {
    navIconExpand: hideText.value
  }
})

const applyHiddenLabels = computed(() => {
  return {
    hiddenLabels: hideText.value
  }
})

const historyTitle = computed(() => {
  const shortcut = process.platform === 'darwin'
    ? KeyboardShortcuts.APP.GENERAL.NAVIGATE_TO_HISTORY_MAC
    : KeyboardShortcuts.APP.GENERAL.NAVIGATE_TO_HISTORY

  return localizeAndAddKeyboardShortcutToActionTitle(
    t('History.History'),
    shortcut
  )
})

const settingsTitle = computed(() => {
  return localizeAndAddKeyboardShortcutToActionTitle(
    t('Settings.Settings'),
    KeyboardShortcuts.APP.GENERAL.NAVIGATE_TO_SETTINGS
  )
})

const usingAndroid = process.env.IS_ANDROID
const usingRelease = process.env.IS_RELEASE

const showLogViewer = () => {
  store.dispatch('showLogViewer')
}

// Spatial-nav (remote control) zone for the side nav: every rendered
// top-level link, in display order, so links shown or hidden by settings
// (Trending, Popular, Playlists, ...) are always in sync.
const inner = useTemplateRef('inner')

function sidebarGrid() {
  return gridFromElements(inner.value?.querySelectorAll(':scope > .navOption') ?? [])
}

// The side nav opens as a drawer (labels shown, page dimmed) while it has
// the remote focus. Pages without a spatial-nav zone of their own leave the
// focus here after Enter, so the drawer also closes on Enter/Right and
// reopens on the next Up/Down.
const drawerOpen = ref(false)

/** @returns {string | null} the content zone Right should return to, if any */
function contentZoneId() {
  const id = navState.lastContentZoneId
  return id != null && navState.zones.has(id) ? id : null
}

function closeDrawer() {
  drawerOpen.value = false

  const id = contentZoneId()
  if (id != null) {
    activateZone(id)
  }
}

const { isActive, focusedPosition } = useSpatialZone('sidebar', sidebarGrid, {
  isChrome: true,
  edges: {
    // Left while closed (focus left here by a page without a zone) reopens
    left: () => {
      drawerOpen.value = true
      return null
    },
    // Pressing Right hands focus back to whichever content zone (video
    // grid, etc.) was active before the user navigated into the side nav.
    right: () => {
      drawerOpen.value = false
      return contentZoneId()
    },
  },
  // Enter follows the focused link.
  onSelect: (_position, link) => {
    drawerOpen.value = false
    link?.click()
  },
})

watch(isActive, (active) => {
  drawerOpen.value = active

  // The route may have changed while focus was here (e.g. on a page
  // without a zone of its own), so line up for the next entry now.
  if (!active) {
    syncPositionToRoute()
  }
})

// Row, not position: a dead-end key press re-sets the same position
watch(() => focusedPosition.value?.row, () => {
  if (isActive.value) {
    drawerOpen.value = true
  }
})

// The focus highlight is an element of its own, placed where the focused
// entry comes to rest once the panel has scrolled it to the middle. From
// one entry to the next that place stays the same, so the highlight holds
// still while the entries scroll under it. It only moves where the panel
// has no further to scroll, towards the first and last entries. It slides
// there from one entry to the next only: when the focus comes back to the
// side nav, it shows up on its entry, not on its way from the last one.
const highlight = reactive({ shown: false, sliding: false, visual: false, top: 0, height: 0 })

function updateHighlight() {
  const position = focusedPosition.value
  const entry = position ? sidebarGrid()[position.row]?.[position.col] : null

  highlight.sliding = highlight.shown && entry != null
  highlight.shown = entry != null
  if (entry == null) { return }

  highlight.visual = entry.hasAttribute('data-spatial-nav-visual')
  highlight.top = entry.offsetTop - centeredScrollTop(inner.value, entry)
  highlight.height = entry.offsetHeight
}

watch(focusedPosition, updateHighlight, { flush: 'post' })

// A resize moves the middle: the panel follows at once, with the highlight
function onResize() {
  const position = focusedPosition.value
  const entry = position ? sidebarGrid()[position.row]?.[position.col] : null

  if (entry != null) {
    inner.value.scrollTop = centeredScrollTop(inner.value, entry)
  }

  updateHighlight()
}

onMounted(() => {
  window.addEventListener('resize', onResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
})

// Entering the side nav from a page lands on that page's link: the one
// with the longest path matching the route.
function syncPositionToRoute() {
  if (isActive.value) { return }

  const path = route.path
  let bestRow = -1
  let bestLength = -1

  sidebarGrid().forEach(([link], row) => {
    const linkPath = link.getAttribute('href')?.replace(/^#/, '')
    if (linkPath && (path === linkPath || path.startsWith(`${linkPath}/`)) && linkPath.length > bestLength) {
      bestRow = row
      bestLength = linkPath.length
    }
  })

  if (bestRow !== -1) {
    navState.lastPosition.set('sidebar', { row: bestRow, col: 0 })

    // The panel lines up as well, so the focus comes back to an entry that
    // is already in its place
    scrollToCenterAnimated(inner.value, sidebarGrid()[bestRow][0])
  }
}

watch(() => route.path, syncPositionToRoute, { flush: 'post' })
onMounted(syncPositionToRoute)
</script>

<style scoped src="./SideNav.css" />
