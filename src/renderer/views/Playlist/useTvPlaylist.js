import { nextTick, onBeforeUnmount, onMounted, useTemplateRef, watch } from 'vue'

import { useSpatialZone } from '../../composables/useSpatialZone'
import { activateZone, focusableGrid, gridFromElements, ITEM_ATTRIBUTE, navState } from '../../helpers/spatialNav/NavManager'

/** Items card controls: the unavailable videos alert, sort, videos, load more */
const ITEM_CONTROLS = [
  '.alertButton',
  '.sortSelect .selectTrigger',
  `[${ITEM_ATTRIBUTE}]`,
  'button.btn',
].join(', ')

/**
 * Remote control (spatial nav) for the playlist page: its header (thumbnail,
 * which plays the playlist, channel, buttons, edit and search inputs) and the
 * videos below it. Focus starts on the first video once the playlist has
 * loaded, Up goes to the header, Left to the side nav.
 *
 * Editing the playlist's info moves the focus to the name field, and back to
 * where it was once that is saved or cancelled.
 *
 * Template refs to bind: `playlistRoot` (the page's root element),
 * `playlistHeader` (the PlaylistInfo container) and `playlistItemsCard` (the
 * videos' FtCard).
 *
 * @param {import('vue').Ref<boolean>} playlistInEditMode
 */
export function useTvPlaylist(playlistInEditMode) {
  const playlistRoot = useTemplateRef('playlistRoot')
  const playlistHeader = useTemplateRef('playlistHeader')
  const playlistItemsCard = useTemplateRef('playlistItemsCard')

  const THUMBNAIL_SELECTOR = '.playlistThumbnail a[href]'

  // The thumbnail (play all) is its own row above the channel, fields and
  // buttons: grouped by position it would pull all of them into its row (it
  // spans their height). So Up from the videos lands on the bottom row, Up
  // from the top one on the thumbnail. Sideways it is next to every row, see
  // `handleHeaderKey`.
  function headerGrid() {
    const thumbnail = playlistHeader.value?.querySelector(THUMBNAIL_SELECTOR)
    const rows = focusableGrid(playlistHeader.value, THUMBNAIL_SELECTOR)

    return thumbnail?.checkVisibility() ? [[thumbnail], ...rows] : rows
  }

  /**
   * The thumbnail sits to the left of the rest of the header: Right from it
   * goes to the top row beside it, Left from the start of a row back to it.
   * @param {KeyboardEvent} event
   */
  function handleHeaderKey(event) {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') { return false }

    const position = navState.lastPosition.get('playlist-header')
    const grid = headerGrid()
    if (!position || grid.length < 2 || !grid[0][0].matches(THUMBNAIL_SELECTOR)) { return false }

    const onThumbnail = position.row === 0
    if (event.key === 'ArrowRight' ? !onThumbnail : (onThumbnail || position.col !== 0)) { return false }

    event.preventDefault()
    navState.lastPosition.set('playlist-header', { row: onThumbnail ? 1 : 0, col: 0 })
    activateZone('playlist-header')
    return true
  }

  useSpatialZone('playlist-header', headerGrid, {
    edges: {
      down: 'playlist-items',
      left: 'sidebar',
    },
    onKeyDown: handleHeaderKey,
  })

  // Editing swaps the header's controls: the focus goes to the name field,
  // and afterwards back to where it was (the edit button)
  let positionBeforeEditing = null

  watch(playlistInEditMode, async (editing) => {
    if (editing) {
      positionBeforeEditing = navState.activeZoneId === 'playlist-header'
        ? navState.lastPosition.get('playlist-header')
        : null
    }

    await nextTick()

    const grid = headerGrid()
    let position = positionBeforeEditing

    if (editing || !position) {
      const selector = editing ? '.playlistStats input' : '.playlistOptions button'
      const row = grid.findIndex(cells => cells.some(cell => cell.matches(selector)))
      if (row === -1) { return }

      position = { row, col: grid[row].findIndex(cell => cell.matches(selector)) }
    }

    navState.lastPosition.set('playlist-header', position)
    activateZone('playlist-header')
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
