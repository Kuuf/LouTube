import { onBeforeUnmount, onMounted, useTemplateRef } from 'vue'

import { useSpatialZone } from '../../composables/useSpatialZone'
import { focusableGrid, gridFromElements, ITEM_ATTRIBUTE, navState } from '../../helpers/spatialNav/NavManager'

/** Items card controls: the unavailable videos alert, sort, videos, load more */
const ITEM_CONTROLS = [
  '.alertButton',
  '.sortSelect select',
  `[${ITEM_ATTRIBUTE}]`,
  'button.btn',
].join(', ')

/**
 * Remote control (spatial nav) for the playlist page: its header (thumbnail,
 * which plays the playlist, channel, buttons, edit and search inputs) and the
 * videos below it. Focus starts on the first video once the playlist has
 * loaded, Up goes to the header, Left to the side nav.
 *
 * Template refs to bind: `playlistRoot` (the page's root element),
 * `playlistHeader` (the PlaylistInfo container) and `playlistItemsCard` (the
 * videos' FtCard).
 */
export function useTvPlaylist() {
  const playlistRoot = useTemplateRef('playlistRoot')
  const playlistHeader = useTemplateRef('playlistHeader')
  const playlistItemsCard = useTemplateRef('playlistItemsCard')

  // The thumbnail (play all) is its own row above the channel and buttons:
  // grouped by position it would merge with them (it spans their height), and
  // the channel would only be reachable sideways from it. So Up from the
  // videos lands on the channel row, Up again on the thumbnail.
  function headerGrid() {
    const thumbnail = playlistHeader.value?.querySelector('.playlistThumbnail a[href]')
    const rows = focusableGrid(playlistHeader.value)
      .map(cells => cells.filter(cell => cell !== thumbnail))
      .filter(cells => cells.length > 0)

    return thumbnail?.checkVisibility() ? [[thumbnail], ...rows] : rows
  }

  useSpatialZone('playlist-header', headerGrid, {
    edges: {
      down: 'playlist-items',
      left: 'sidebar',
    },
  })

  function itemsGrid() {
    return gridFromElements(playlistItemsCard.value?.$el.querySelectorAll(ITEM_CONTROLS) ?? [])
  }

  const itemsZone = useSpatialZone('playlist-items', itemsGrid, {
    active: true,
    edges: {
      // Coming up into the header the first time lands on its bottom row (the
      // channel), later on wherever it was left
      up: () => {
        if (!navState.lastPosition.has('playlist-header')) {
          navState.lastPosition.set('playlist-header', { row: Math.max(headerGrid().length - 1, 0), col: 0 })
        }
        return 'playlist-header'
      },
      left: 'sidebar',
    },
  })

  // The playlist loads after the page: focus its first video once it is there
  // (not the controls above it, like the unavailable videos alert)
  let awaitingItems = true

  const itemsObserver = new MutationObserver(() => {
    if (!itemsZone.isActive.value || document.querySelector('[data-spatial-nav-focused]')) { return }

    const grid = itemsGrid()
    const firstVideoRow = grid.findIndex(cells => cells[0].matches(`[${ITEM_ATTRIBUTE}]`))
    if (firstVideoRow === -1) { return }

    if (awaitingItems) {
      awaitingItems = false
      navState.lastPosition.set('playlist-items', { row: firstVideoRow, col: 0 })
    }

    itemsZone.activate()
  })

  onMounted(() => {
    itemsObserver.observe(playlistRoot.value, { childList: true, subtree: true })
  })

  onBeforeUnmount(() => {
    itemsObserver.disconnect()
  })
}
