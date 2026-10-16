<template>
  <!-- A wide button, its label saying what it refreshes, and when that was
       last done under it -->
  <div
    v-if="wide"
    class="wideRefreshSection"
  >
    <button
      class="wideRefreshButton"
      type="button"
      :disabled="disableRefresh"
      :title="refreshFeedButtonTitle"
      @click="click"
    >
      <FontAwesomeIcon :icon="['fas', 'sync']" />
      {{ t('Feed.Refresh Feed', { subscriptionName: title }) }}
    </button>
    <p
      v-if="lastRefreshTimestamp"
      class="lastRefreshTimestamp"
    >
      {{ t('Feed.Feed Last Updated', { feedName: title, date: lastRefreshTimestamp }) }}
    </p>
  </div>
  <div
    v-else
    class="floatingRefreshSection"
  >
    <p
      v-if="lastRefreshTimestamp"
      class="lastRefreshTimestamp"
    >
      {{ t('Feed.Feed Last Updated', { feedName: title, date: lastRefreshTimestamp }) }}
    </p>
    <FtIconButton
      :disabled="disableRefresh"
      :icon="['fas', 'sync']"
      class="refreshButton"
      :title="refreshFeedButtonTitle"
      :size="12"
      theme="primary"
      @click="click"
    />
  </div>
</template>

<script setup>
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import FtIconButton from '../FtIconButton/FtIconButton.vue'

import { KeyboardShortcuts } from '../../../constants'
import { addKeyboardShortcutToActionTitle } from '../../helpers/utils'

const props = defineProps({
  disableRefresh: {
    type: Boolean,
    default: false
  },
  lastRefreshTimestamp: {
    type: String,
    default: ''
  },
  title: {
    type: String,
    required: true
  },
  wide: {
    type: Boolean,
    default: false
  }
})

const { t } = useI18n()

const refreshFeedButtonTitle = computed(() => {
  return addKeyboardShortcutToActionTitle(
    t('Feed.Refresh Feed', { subscriptionName: props.title }),
    KeyboardShortcuts.APP.SITUATIONAL.REFRESH
  )
})

const emit = defineEmits(['click'])

function click() {
  emit('click')
}
</script>

<style scoped lang="scss" src="./FtRefreshWidget.scss" />
