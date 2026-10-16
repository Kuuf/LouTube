<template>
  <nav
    ref="nav"
    class="channelNav"
    :aria-label="$t('Channels.Channels')"
  >
    <div class="header">
      <slot />
    </div>
    <!-- The channels, with the side nav's focus highlight that holds still in
         the middle while they scroll (TvScrollList) -->
    <TvScrollList
      zone-id="subscriptions-channels"
      is-chrome
      :items="entries"
      :item-key="entry => entry.id ?? 'all'"
      :edges="EDGES"
      :leading-cells="headerButtons"
      :land-on="selectedEntry"
      scroller-class="list"
      highlight-class="focusHighlight"
      @select="entry => entry?.click()"
    >
      <template #item="{ item: entry, itemAttrs }">
        <button
          v-bind="itemAttrs"
          class="entry"
          :class="{ selected: entry.id === selectedSubscriptionsChannelId }"
          type="button"
          :title="entry.name"
          :aria-pressed="entry.id === selectedSubscriptionsChannelId"
          @click="selectedSubscriptionsChannelId = entry.id"
        >
          <span
            v-if="entry.id === null"
            class="avatar allChannels"
          >
            <FontAwesomeIcon :icon="['fas', 'users']" />
          </span>
          <img
            v-else
            class="avatar"
            :src="entry.thumbnail"
            alt=""
          >
          <span
            class="name"
            dir="auto"
          >
            {{ entry.name }}
          </span>
        </button>
      </template>
    </TvScrollList>
  </nav>
</template>

<script setup>
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { computed, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'

import TvScrollList from '../TvScrollList/TvScrollList.vue'

import store from '../../store/index'

import { selectedSubscriptionsChannelId } from '../../views/Subscriptions/subscriptionsChannel'

const { locale, t } = useI18n()

/** All channels first, then the subscribed ones by name */
const entries = computed(() => {
  const channels = store.getters.getActiveProfile.subscriptions
    .slice()
    .sort((a, b) => a.name?.toLowerCase().localeCompare(b.name?.toLowerCase(), locale.value))

  return [{ id: null, name: t('Profile.All Channels'), thumbnail: null }, ...channels]
})

// Remote control (spatial nav): between the side nav and the page. Enter
// picks the channel, the focus stays here. Held beside the page like the
// side nav, so a dead end doesn't scroll the page.
const EDGES = {
  left: 'sidebar',
  right: 'page-subscriptions',
}

const nav = useTemplateRef('nav')

/** The header's buttons (the tab's refresh button), over the list */
function headerButtons() {
  return [...(nav.value?.querySelectorAll('.header button') ?? [])]
}

/** Coming back into the list lands on the picked channel */
function selectedEntry() {
  return nav.value?.querySelector('.entry.selected') ?? null
}
</script>

<style scoped src="./SubscriptionsChannelNav.css" />
