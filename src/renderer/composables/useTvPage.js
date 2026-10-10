import { onBeforeUnmount, onMounted, useTemplateRef, watch } from 'vue'

import { useSpatialZone } from './useSpatialZone'
import { ITEM_ATTRIBUTE, navState, pageGrid, scrollPageToTopAnimated } from '../helpers/spatialNav/NavManager'

/**
 * Not worth a stop on a remote: tooltip buttons, and a text input's own
 * clear/search buttons (Enter in the input searches)
 */
const DEFAULT_EXCLUDE = '.tooltip *, .ft-input-component button'

/** How long to wait for list items before focusing the first control */
const ITEM_WAIT_MS = 2000

/**
 * Remote control (spatial nav) for a whole page as one zone: every control
 * (tabs, inputs, selects, buttons, links) and list item (videos, channels,
 * playlists) on it, grouped into rows by position. Left from the leftmost
 * column goes to the side nav.
 *
 * Content usually loads after the page, so the initial focus is placed once
 * there is something to focus: on the first list item (`startOn: 'item'`),
 * or on the first control/item (`startOn: 'first'`). While waiting for list
 * items, the first control is focused after a moment (e.g. an empty feed),
 * and focus still moves on to the first item if one shows up before the
 * remote is used.
 *
 * Tabs (`role="tab"`) are selected as soon as they are focused.
 *
 * Template ref to bind: `tvPageRoot` (the page's root element).
 *
 * @param {string} zoneId
 * @param {object} [options]
 * @param {'item' | 'first'} [options.startOn]
 * @param {string} [options.exclude] - more controls to skip, on top of
 *   DEFAULT_EXCLUDE
 * @param {boolean} [options.topOnFirstRow] - focusing a list item of the
 *   first row scrolls the page back to its very top (heading and tabs in
 *   view again), instead of just far enough to show the item
 */
export function useTvPage(zoneId, { startOn = 'item', exclude, topOnFirstRow = false } = {}) {
  const root = useTemplateRef('tvPageRoot')
  const excludeSelector = exclude ? `${DEFAULT_EXCLUDE}, ${exclude}` : DEFAULT_EXCLUDE

  function grid() {
    return pageGrid(root.value, excludeSelector)
  }

  let usedRemote = false

  const zone = useSpatialZone(zoneId, grid, {
    active: true,
    edges: {
      left: 'sidebar',
    },
    onKeyDown: () => {
      usedRemote = true
      return false
    },
  })

  // Focusing a tab selects it, no Enter needed, like the channel page's tabs
  // (useTvChannel.js). The tabs mark the selected one with `.selectedTab`.
  watch(zone.focusedPosition, (position) => {
    if (position == null) { return }

    const cells = grid()
    const cell = cells[position.row]?.[position.col]
    if (!(cell instanceof HTMLElement)) { return }

    if (cell.matches('[role="tab"]:not(.selectedTab)')) {
      cell.click()
      return
    }

    // Back on the first row of list items: the page returns to its top, as
    // long as the item still fits on screen there. The focus stays on it.
    if (topOnFirstRow && cell.matches(`[${ITEM_ATTRIBUTE}]`)) {
      const firstItemRow = cells.findIndex(row => row.some(rowCell => rowCell.matches(`[${ITEM_ATTRIBUTE}]`)))
      const bottomAtTop = cell.getBoundingClientRect().bottom + document.scrollingElement.scrollTop

      if (position.row === firstItemRow && bottomAtTop <= window.innerHeight) {
        scrollPageToTopAnimated()
      }
    }
  })

  let startedOnItem = false
  let itemWaitOver = startOn === 'first'
  let itemWaitTimeout = null

  function focusWhenReady() {
    if (!zone.isActive.value) { return }

    const cells = grid()
    if (cells.length === 0) { return }

    const focused = document.querySelector('[data-spatial-nav-focused]')
    const placingInitialFocus = !usedRemote && !startedOnItem

    if (placingInitialFocus) {
      const itemRow = startOn === 'item'
        ? cells.findIndex(row => row.some(cell => cell.matches(`[${ITEM_ATTRIBUTE}]`)))
        : -1

      if (itemRow !== -1) {
        startedOnItem = true
        navState.lastPosition.set(zoneId, { row: itemRow, col: cells[itemRow].findIndex(cell => cell.matches(`[${ITEM_ATTRIBUTE}]`)) })
      } else if (itemWaitOver && !focused) {
        navState.lastPosition.set(zoneId, { row: 0, col: 0 })
      } else {
        return
      }
    } else if (focused) {
      return
    }

    // Also restores the focus after its element was re-rendered away
    zone.activate()
  }

  const observer = new MutationObserver(focusWhenReady)

  onMounted(() => {
    observer.observe(root.value, { childList: true, subtree: true })

    if (!itemWaitOver) {
      itemWaitTimeout = setTimeout(() => {
        itemWaitOver = true
        focusWhenReady()
      }, ITEM_WAIT_MS)
    }

    focusWhenReady()
  })

  onBeforeUnmount(() => {
    observer.disconnect()
    clearTimeout(itemWaitTimeout)
  })
}
