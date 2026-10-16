<template>
  <div class="subscriptionsLayout">
    <!-- The page's heading, and under it the videos' refresh button
         (SubscriptionsTabUi), over the channel list -->
    <SubscriptionsChannelNav>
      <h2 class="pageTitle">
        <FontAwesomeIcon
          :icon="['fas', 'rss']"
          class="subscriptionIcon"
        />
        {{ $t("Subscriptions.Subscriptions") }}
      </h2>
      <div id="subscriptionsHeaderActions" />
    </SubscriptionsChannelNav>
    <div
      ref="tvPageRoot"
      class="subscriptionsContent"
    >
      <!-- Only the videos of the subscriptions: no tabs for shorts, live
           streams or posts -->
      <FtCard class="card">
        <SubscriptionsVideos id="subscriptionsPanel" />
        <!-- A channel picked in the list: the way to its page, under its videos -->
        <router-link
          v-if="selectedChannel"
          class="goToChannel"
          :to="`/channel/${selectedChannel.id}`"
        >
          <img
            class="goToChannelAvatar"
            :src="selectedChannel.thumbnail"
            alt=""
          >
          {{ $t('Channels.Go To Channel') }}
        </router-link>
      </FtCard>
    </div>
  </div>
</template>

<script setup>
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { computed, watch } from 'vue'

import FtCard from '../../components/ft-card/ft-card.vue'
import SubscriptionsVideos from '../../components/SubscriptionsVideos.vue'
import SubscriptionsChannelNav from '../../components/SubscriptionsChannelNav/SubscriptionsChannelNav.vue'

import store from '../../store/index'
import { useTvPage } from '../../composables/useTvPage'
import { navState } from '../../helpers/spatialNav/NavManager'
import { selectedSubscriptionsChannelId } from './subscriptionsChannel'

const PAGE_ZONE_ID = 'page-subscriptions'

/** The channel picked in the list, null for all channels */
const selectedChannel = computed(() => {
  const id = selectedSubscriptionsChannelId.value
  return id === null ? null : store.getters.getActiveProfile.subscriptions.find(channel => channel.id === id) ?? null
})

// Left from the page goes to its channel list, and from there to the side nav
useTvPage(PAGE_ZONE_ID, { topOnFirstRow: true, left: 'subscriptions-channels' })

// Another channel picked in the list: its videos from the top, and the
// focus goes to the first of them when it comes back to the page, not to
// where it was in the last channel's
watch(selectedSubscriptionsChannelId, () => {
  document.scrollingElement.scrollTop = 0
  navState.lastPosition.delete(PAGE_ZONE_ID)
})
</script>

<style scoped src="./Subscriptions.css" />
