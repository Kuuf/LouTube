import { reactive } from 'vue'

/**
 * @typedef {object} ItemAction
 * @property {string} label
 * @property {() => void} onSelect - called once the panel has closed
 */

/**
 * @typedef {object} ItemActionsDetails
 * @property {symbol} owner - whoever opened the panel, to close it again
 *   when it goes away
 * @property {string} thumbnail
 * @property {boolean} blurThumbnail
 * @property {string} title
 * @property {string | null} channelName
 * @property {ItemAction[]} actions - top to bottom
 */

/**
 * The actions of a list item (a long press on a video), shown in a panel on
 * the right of the screen (TvItemActionsPanel.vue): one at a time, across
 * all the items of the app. The details stay when it closes, as it still
 * shows them on its way out.
 *
 * @type {ItemActionsDetails & { isOpen: boolean }}
 */
export const itemActions = reactive({
  isOpen: false,
  owner: null,
  thumbnail: '',
  blurThumbnail: false,
  title: '',
  channelName: null,
  actions: [],
})

/**
 * @param {ItemActionsDetails} details
 */
export function openItemActions(details) {
  Object.assign(itemActions, details, { isOpen: true })
}

export function closeItemActions() {
  itemActions.isOpen = false
}
