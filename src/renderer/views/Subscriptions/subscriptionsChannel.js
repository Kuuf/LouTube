import { ref } from 'vue'

/**
 * The channel picked in the subscriptions page's channel list
 * (SubscriptionsChannelNav.vue): only its videos, shorts, live streams and
 * posts are shown (SubscriptionsTabUi.vue). null for all channels.
 *
 * @type {import('vue').Ref<string | null>}
 */
export const selectedSubscriptionsChannelId = ref(null)
