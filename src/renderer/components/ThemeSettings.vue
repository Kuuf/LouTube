<template>
  <FtSettingsSection
    :title="$t('Settings.Theme Settings.Theme Settings')"
  >
    <div class="switchColumnGrid">
      <div class="switchColumn">
        <FtToggleSwitch
          :label="$t('Settings.Theme Settings.Match Top Bar with Main Color')"
          compact
          :default-value="barColor"
          @change="updateBarColor"
        />
        <FtToggleSwitch
          :label="$t('Settings.Theme Settings.Expand Side Bar by Default')"
          compact
          :default-value="expandSideBar"
          @change="handleExpandSideBar"
        />
        <FtToggleSwitch
          v-if="usingElectron"
          :label="$t('Settings.Theme Settings.Disable Smooth Scrolling')"
          compact
          :default-value="disableSmoothScrollingToggleValue"
          @change="handleRestartPrompt"
        />
      </div>
      <div class="switchColumn">
        <FtToggleSwitch
          :label="$t('Settings.Theme Settings.Hide Side Bar Labels')"
          compact
          :default-value="hideLabelsSideBar"
          @change="updateHideLabelsSideBar"
        />
        <FtToggleSwitch
          :label="$t('Settings.Theme Settings.Hide FreeTube Header Logo')"
          compact
          :default-value="hideHeaderLogo"
          @change="updateHideHeaderLogo"
        />
        <FtToggleSwitch
          v-if="usingAndroid"
          :label="$t('Theme Settings.Enable Ui Scale')"
          compact
          :default-value="useUiScale"
          @change="updateUseUiScale"
        />
      </div>
    </div>
    <template v-if="usingElectron || usingAndroid">
      <FtFlexBox>
        <FtSlider
          :label="$t('Settings.Theme Settings.UI Scale')"
          :default-value="uiScale"
          :min-value="25"
          :max-value="300"
          :step="5"
          value-extension="%"
          @change="updateUiScale"
        />
      </FtFlexBox>
    </template>
    <FtPrompt
      v-if="showRestartPrompt"
      :label="$t('Settings[\'The app needs to restart for changes to take effect. Restart and apply change?\']')"
      :option-names="restartPromptNames"
      :option-values="RESTART_PROMPT_VALUES"
      @click="handleSmoothScrolling"
    />
  </FtSettingsSection>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import FtSettingsSection from './FtSettingsSection/FtSettingsSection.vue'
import FtToggleSwitch from './FtToggleSwitch/FtToggleSwitch.vue'
import FtSlider from './FtSlider/FtSlider.vue'
import FtFlexBox from './ft-flex-box/ft-flex-box.vue'
import FtPrompt from './FtPrompt/FtPrompt.vue'

import store from '../store/index'

const { t } = useI18n()

/** @type {import('vue').ComputedRef<boolean>} */
const barColor = computed(() => {
  return store.getters.getBarColor
})

/**
 * @param {boolean} value
 */
function updateBarColor(value) {
  store.dispatch('updateBarColor', value)
}

/** @type {import('vue').ComputedRef<boolean>} */
const expandSideBar = computed(() => {
  return store.getters.getExpandSideBar
})

/** @type {import('vue').ComputedRef<boolean>} */
const isSideNavOpen = computed(() => {
  return store.getters.getIsSideNavOpen
})

/**
 * @param {boolean} value
 */
function handleExpandSideBar(value) {
  if (isSideNavOpen.value !== value) {
    store.commit('toggleSideNav')
  }

  store.dispatch('updateExpandSideBar', value)
}

/** @type {import('vue').ComputedRef<boolean>} */
const hideLabelsSideBar = computed(() => {
  return store.getters.getHideLabelsSideBar
})

/**
 * @param {boolean} value
 */
function updateHideLabelsSideBar(value) {
  store.dispatch('updateHideLabelsSideBar', value)
}

/** @type {import('vue').ComputedRef<boolean>} */
const hideHeaderLogo = computed(() => {
  return store.getters.getHideHeaderLogo
})

/**
 * @param {boolean} value
 */
function updateHideHeaderLogo(value) {
  store.dispatch('updateHideHeaderLogo', value)
}

/** @type {import('vue').ComputedRef<number>} */
const uiScale = computed(() => {
  if (process.env.IS_ANDROID) {
    return store.getters.getUiScaleAndroid
  } else {
    return store.getters.getUiScale
  }
})

/**
 * @param {number} value
 */
function updateUiScale(value) {
  if (process.env.IS_ANDROID) {
    store.dispatch('updateUiScaleAndroid', value)
  } else {
    store.dispatch('updateUiScale', value)
  }
}

const useUiScale = computed(() => store.getters.getUseUiScale)

function updateUseUiScale(value) {
  store.dispatch('updateUseUiScale', value)
}

/** @type {boolean} */
const usingElectron = process.env.IS_ELECTRON
const usingAndroid = process.env.IS_ANDROID

const RESTART_PROMPT_VALUES = [
  'restart',
  'cancel'
]

const restartPromptNames = computed(() => [
  t('Yes, Restart'),
  t('Cancel')
])

/** @type {import('vue').Ref<boolean>} */
const disableSmoothScrollingToggleValue = ref(store.getters.getDisableSmoothScrolling)
const showRestartPrompt = ref(false)

/**
 * @param {boolean} value
 */
function handleRestartPrompt(value) {
  disableSmoothScrollingToggleValue.value = value
  showRestartPrompt.value = true
}

/**
 * @param {'restart' | 'cancel' | null} value
 */
function handleSmoothScrolling(value) {
  showRestartPrompt.value = false

  if (value === null || value === 'cancel') {
    disableSmoothScrollingToggleValue.value = !disableSmoothScrollingToggleValue.value
    return
  }

  if (process.env.IS_ELECTRON) {
    store.dispatch('updateDisableSmoothScrolling',
      disableSmoothScrollingToggleValue.value
    ).then(() => {
      window.ftElectron.relaunch()
    })
  }
}
</script>
