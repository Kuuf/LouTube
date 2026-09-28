import { onBeforeUnmount, onMounted, useTemplateRef } from 'vue'

import { useSpatialZone } from './useSpatialZone'
import { ITEM_ATTRIBUTE, navState, pageGrid } from '../helpers/spatialNav/NavManager'

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
 * Template ref to bind: `tvPageRoot` (the page's root element).
 *
 * @param {string} zoneId
 * @param {object} [options]
 * @param {'item' | 'first'} [options.startOn]
 * @param {string} [options.exclude] - more controls to skip, on top of
 *   DEFAULT_EXCLUDE
 */
export function useTvPage(zoneId, { startOn = 'item', exclude } = {}) {
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
