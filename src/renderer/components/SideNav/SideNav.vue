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
    <!-- The panel of entries, with the focus highlight that holds still in
         its middle while they scroll (TvScrollList) -->
    <TvScrollList
      ref="scrollList"
      zone-id="sidebar"
      is-chrome
      :items="entries"
      :item-key="entry => entry.key"
      :edges="edges"
      :land-on="routeLink"
      :scroller-class="['inner', applyHiddenLabels]"
      highlight-class="focusHighlight"
      @select="selectEntry"
    >
      <template #item="{ item: entry, itemAttrs }">
        <hr v-if="entry.kind === 'divider'">
        <SideNavMoreOptions v-else-if="entry.kind === 'more'" />
        <!-- The active profile: its avatar and name. Focused, it is inverted
             like the other entries. -->
        <router-link
          v-else-if="entry.kind === 'profile'"
          v-bind="itemAttrs"
          class="navOption mobileShow"
          role="button"
          to="/tv/profiles"
          :title="activeProfileName"
        >
          <div
            class="thumbnailContainer"
          >
            <div
              class="profileAvatar"
              :style="{ background: activeProfile.bgColor, '--avatar-text-color': activeProfile.textColor }"
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
        <a
          v-else-if="entry.kind === 'log'"
          v-bind="itemAttrs"
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
        <router-link
          v-else
          v-bind="itemAttrs"
          class="navOption"
          :class="entry.classes"
          role="button"
          :to="entry.to"
          :title="entry.title"
        >
          <div
            class="thumbnailContainer"
          >
            <FontAwesomeIcon
              :icon="entry.icon"
              class="navIcon"
              :class="applyNavIconExpand"
            />
          </div>
          <p
            class="navLabel"
          >
            {{ entry.label }}
          </p>
        </router-link>
      </template>
    </TvScrollList>
  </FtFlexBox>
</template>

<script setup>
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { computed, ref, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'

import FtFlexBox from '../ft-flex-box/ft-flex-box.vue'
import SideNavMoreOptions from '../SideNavMoreOptions/SideNavMoreOptions.vue'
import TvScrollList from '../TvScrollList/TvScrollList.vue'

import store from '../../store/index'

import { localizeAndAddKeyboardShortcutToActionTitle } from '../../helpers/utils'
import { KeyboardShortcuts, MAIN_PROFILE_ID } from '../../../constants'
import { getFirstCharacter } from '../../helpers/strings'
import { activateZone, navState } from '../../helpers/spatialNav/NavManager'

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

/**
 * The entries, in display order, those turned off by settings (Trending,
 * Popular, Playlists) left out
 */
const entries = computed(() => {
  const link = (key, to, icon, label, classes, title = label) => ({ kind: 'link', key, to, icon, label, classes, title })

  return [
    link('search', '/tv/search', ['fas', 'search'], t('Search Bar.Search'), 'topNavOption mobileShow'),
    link('subscriptions', '/subscriptions', ['fas', 'rss'], t('Subscriptions.Subscriptions'), 'mobileShow'),
    link('channels', '/subscribedchannels', ['fas', 'user-check'], t('Channels.Channels'), 'mobileHidden'),
    ...(SUPPORTS_LOCAL_API && !hideTrendingVideos.value && (backendFallback.value || backendPreference.value === 'local')
      ? [link('trending', '/trending', ['fas', 'fire'], t('Trending.Trending'), 'mobileHidden')]
      : []),
    ...(!hidePopularVideos.value && (backendFallback.value || backendPreference.value === 'invidious')
      ? [link('popular', '/popular', ['fas', 'users'], t('Most Popular'), 'mobileHidden')]
      : []),
    ...(!hidePlaylists.value
      ? [link('playlists', '/userplaylists', ['fas', 'bookmark'], t('Playlists'), 'mobileShow')]
      : []),
    { kind: 'more', key: 'more' },
    link('history', '/history', ['fas', 'history'], t('History.History'), 'mobileShow', historyTitle.value),
    { kind: 'divider', key: 'divider' },
    { kind: 'profile', key: 'profile' },
    link('settings', '/settings', ['fas', 'sliders-h'], t('Settings.Settings'), 'mobileShow smallMobileOnlyHidden', settingsTitle.value),
    link('about', '/about', ['fas', 'info-circle'], t('About.About'), 'mobileHidden'),
    ...(usingAndroid && !usingRelease ? [{ kind: 'log', key: 'log' }] : []),
  ]
})

// Spatial-nav (remote control) zone for the side nav (TvScrollList)
const scrollList = useTemplateRef('scrollList')

const isActive = computed(() => scrollList.value?.isActive ?? false)
const focusedPosition = computed(() => scrollList.value?.focusedPosition ?? null)

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

const edges = {
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
}

/**
 * Enter follows the focused link
 * @param {Element} link
 */
function selectEntry(link) {
  drawerOpen.value = false
  link?.click()
}

watch(isActive, (active) => {
  drawerOpen.value = active
})

// Row, not position: a dead-end key press re-sets the same position
watch(() => focusedPosition.value?.row, () => {
  if (isActive.value) {
    drawerOpen.value = true
  }
})

/**
 * Entering the side nav from a page lands on that page's link: the one with
 * the longest path matching the route
 * @returns {Element | null}
 */
function routeLink() {
  const path = route.path
  let best = null
  let bestLength = -1

  document.querySelectorAll('.sideNav [data-tv-scroll-item][href]').forEach((link) => {
    const linkPath = link.getAttribute('href')?.replace(/^#/, '')
    if (linkPath && (path === linkPath || path.startsWith(`${linkPath}/`)) && linkPath.length > bestLength) {
      best = link
      bestLength = linkPath.length
    }
  })

  return best
}

// The route may change while the focus is here (a page without a zone of
// its own): line up for the next entry
watch(() => route.path, () => scrollList.value?.syncPosition(), { flush: 'post' })
</script>

<style scoped src="./SideNav.css" />
