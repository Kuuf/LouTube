<template>
  <div class="settingsPage">
    <template v-if="unlocked">
      <nav
        ref="menuRef"
        class="settingsNav"
      >
        <h2 class="navHeader">
          <FontAwesomeIcon
            :icon="['fas', 'sliders-h']"
            class="headerIcon"
          />
          {{ t('Settings.Settings') }}
        </h2>
        <!-- The sections, scrolling like the side nav (TvScrollList) -->
        <TvScrollList
          ref="menuList"
          :zone-id="MENU_ZONE_ID"
          activate-on-mount
          :items="settingsSectionComponents"
          :item-key="section => section.type"
          :edges="MENU_EDGES"
          :land-on="activeNavItem"
          scroller-class="navList"
          highlight-class="navHighlight"
        >
          <template #item="{ item: section, itemAttrs }">
            <button
              v-bind="itemAttrs"
              class="navItem"
              :class="{ active: section.type === activeSection }"
              type="button"
              :data-section="section.type"
              :aria-current="section.type === activeSection"
              @click="activeSection = section.type"
            >
              <FontAwesomeIcon
                :icon="section.icon"
                class="navIcon"
                fixed-width
              />
              <span class="navLabel">{{ section.title }}</span>
            </button>
          </template>
        </TvScrollList>
      </nav>
      <div
        ref="contentRef"
        class="settingsContent"
      >
        <component
          :is="activeSectionEntry.component"
          :key="activeSectionEntry.type"
          class="section"
          :data-section="activeSectionEntry.type"
        />
      </div>
    </template>
    <PasswordDialog
      v-else
      @unlocked="handleUnlock"
    />
  </div>
</template>

<script setup>
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import GeneralSettings from '../../components/GeneralSettings/GeneralSettings.vue'
import ThemeSettings from '../../components/ThemeSettings.vue'
import PlayerSettings from '../../components/PlayerSettings/PlayerSettings.vue'
import ExternalPlayerSettings from '../../components/ExternalPlayerSettings.vue'
import SubscriptionSettings from '../../components/SubscriptionSettings/SubscriptionSettings.vue'
import PrivacySettings from '../../components/PrivacySettings.vue'
import DataSettings from '../../components/DataSettings/DataSettings.vue'
import DistractionSettings from '../../components/DistractionSettings/DistractionSettings.vue'
import ProxySettings from '../../components/ProxySettings/ProxySettings.vue'
import SponsorBlockSettings from '../../components/SponsorBlockSettings.vue'
import ParentalControlSettings from '../../components/ParentalControlSettings.vue'
import ExperimentalSettings from '../../components/ExperimentalSettings/ExperimentalSettings.vue'
import PasswordSettings from '../../components/PasswordSettings/PasswordSettings.vue'
import PasswordDialog from '../../components/PasswordDialog/PasswordDialog.vue'
import TvScrollList from '../../components/TvScrollList/TvScrollList.vue'

import store from '../../store/index'
import { useSpatialZone } from '../../composables/useSpatialZone'
import { focusableGrid } from '../../helpers/spatialNav/NavManager'

const { locale, t } = useI18n()

// The section shown beside the nav, one at a time
const activeSection = ref('general')

/** @type {import('vue').ComputedRef<boolean>} */
const settingsSectionSortEnabled = computed(() => store.getters.getSettingsSectionSortEnabled)

const settingsComponentsData = computed(() => {
  return [
    {
      type: 'theme',
      title: t('Settings.Theme Settings.Theme Settings'),
      icon: ['fas', 'display'],
      component: ThemeSettings
    },
    {
      type: 'player',
      title: t('Settings.Player Settings.Player Settings'),
      icon: ['fas', 'circle-play'],
      component: PlayerSettings
    },
    ...(process.env.IS_ELECTRON
      ? [{
          type: 'external-player',
          title: t('Settings.External Player Settings.External Player Settings'),
          icon: ['fas', 'clapperboard'],
          component: ExternalPlayerSettings
        }]
      : []),
    {
      type: 'subscription',
      title: t('Settings.Subscription Settings.Subscription Settings'),
      icon: ['fas', 'play'],
      component: SubscriptionSettings
    },
    {
      type: 'distraction',
      title: t('Settings.Distraction Free Settings.Distraction Free Settings'),
      icon: ['fas', 'eye-slash'],
      component: DistractionSettings
    },
    {
      type: 'parental-control',
      title: t('Settings.Parental Control Settings.Parental Control Settings'),
      icon: ['fas', 'user-lock'],
      component: ParentalControlSettings
    },
    {
      type: 'privacy',
      title: t('Settings.Privacy Settings.Privacy Settings'),
      icon: ['fas', 'lock'],
      component: PrivacySettings
    },
    {
      type: 'data',
      title: t('Settings.Data Settings.Data Settings'),
      icon: ['fas', 'database'],
      component: DataSettings
    },
    ...(process.env.IS_ELECTRON
      ? [
          {
            type: 'proxy',
            title: t('Settings.Proxy Settings.Proxy Settings'),
            icon: ['fas', 'network-wired'],
            component: ProxySettings
          }
        ]
      : []),
    {
      type: 'sponsor-block',
      title: t('Settings.SponsorBlock Settings.SponsorBlock Settings'),
      // TODO: replace with SponsorBlock icon
      icon: ['fas', 'shield'],
      component: SponsorBlockSettings
    },
    {
      type: 'password',
      title: t('Settings.Password Settings.Password Settings'),
      icon: ['fas', 'key'],
      component: PasswordSettings
    },
    ...(process.env.IS_ELECTRON
      ? [{
          type: 'experimental',
          title: t('Settings.Experimental Settings.Experimental Settings'),
          icon: ['fas', 'flask'],
          component: ExperimentalSettings
        }]
      : []),
  ]
})

const collator = computed(() => {
  return new Intl.Collator([locale.value, 'en'], { sensitivity: 'base' })
})

const settingsSectionComponents = computed(() => {
  let settingsSections = settingsComponentsData.value

  if (settingsSectionSortEnabled.value) {
    const collator_ = collator.value

    settingsSections = settingsSections.toSorted((a, b) => {
      return collator_.compare(a.title, b.title)
    })
  }

  // ensure General Settings is placed first regardless of sorting
  const generalSettingsEntry = {
    type: 'general',
    title: t('Settings.General Settings.General Settings'),
    icon: ['fas', 'border-all'],
    component: GeneralSettings
  }

  return [generalSettingsEntry, ...settingsSections]
})

const activeSectionEntry = computed(() => {
  return settingsSectionComponents.value.find(section => section.type === activeSection.value) ?? settingsSectionComponents.value[0]
})

// Each section starts from its top
watch(activeSection, () => {
  document.scrollingElement.scrollTop = 0
})

const unlocked = ref(store.getters.getSettingsPassword === '')

function handleUnlock() {
  unlocked.value = true

  // The nav only exists once unlocked
  nextTick(() => {
    menuList.value?.activate()
  })
}

// Spatial-nav (remote control): the section nav on the left, one item per
// row (TvScrollList), and every control of the open section beside it.
// Focusing a nav item opens its section right away, like the profile
// manager's nav (TVProfileManage.vue). Tooltip buttons are skipped, they
// would add a stop to most rows.
const MENU_ZONE_ID = 'settings-menu'
const CONTENT_ZONE_ID = 'settings-content'

const menuRef = useTemplateRef('menuRef')
const menuList = useTemplateRef('menuList')
const contentRef = useTemplateRef('contentRef')

function contentGrid() {
  return focusableGrid(contentRef.value, '.tooltip *')
}

/** The nav's entry for the open section: where the focus comes back to */
function activeNavItem() {
  return menuRef.value?.querySelector('.navItem.active') ?? null
}

const MENU_EDGES = {
  left: 'sidebar',
  // Nothing to move to in a section without controls
  right: () => contentGrid().length > 0 ? CONTENT_ZONE_ID : null,
}

watch(() => menuList.value?.focusedPosition, () => {
  const sectionType = menuRef.value?.querySelector('.navItem[data-spatial-nav-focused]')?.dataset.section
  if (sectionType) {
    activeSection.value = sectionType
  }
}, { flush: 'post' })

useSpatialZone(CONTENT_ZONE_ID, contentGrid, {
  edges: {
    // Back to the nav, on the section that is open (TvScrollList's landOn)
    left: MENU_ZONE_ID,
  },
})
</script>

<style scoped src="./Settings.css" />
