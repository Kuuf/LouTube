import { onBeforeUnmount, onMounted, useTemplateRef } from 'vue'

import { useSpatialZone } from '../../composables/useSpatialZone'
import { gridFromElements, ITEM_ATTRIBUTE, navState } from '../../helpers/spatialNav/NavManager'

/** Header controls: subscribe (+ profile toggle), the tabs and the channel search */
const HEADER_CONTROLS = 'button:not([disabled]), [role="tab"], input'
/** Not worth a stop on a remote: sharing, and the search input's own buttons */
const HEADER_EXCLUDED = '.shareIcon *, .channelSearch button'

/**
 * Content controls: sort/"view all", Home shelves' "View Playlist", the list
 * items, About links, fetch more
 */
const CONTENT_CONTROLS = [
  '.select-container button',
  '.select-container select',
  '.playAllLink',
  `[${ITEM_ATTRIBUTE}]`,
  '#aboutPanel a[href]',
  '#aboutPanel button',
  '.getNextPage',
].join(', ')

/**
 * Remote control (spatial nav) for the channel page: the header (subscribe,
 * tabs, channel search) and the current tab's content below it. Focus starts
 * on the selected tab once the channel has loaded. Left from either leaves to
 * the side nav.
 *
 * Template refs to bind: `channelRoot` (the page's root element),
 * `channelHeader` (ChannelDetails) and `channelContent` (the content FtCard).
 */
export function useTvChannel() {
  const channelRoot = useTemplateRef('channelRoot')
  const channelHeader = useTemplateRef('channelHeader')
  const channelContent = useTemplateRef('channelContent')

  function headerGrid() {
    const controls = [...(channelHeader.value?.$el.querySelectorAll(HEADER_CONTROLS) ?? [])]
    return gridFromElements(controls.filter(control => !control.matches(HEADER_EXCLUDED)))
  }

  const headerZone = useSpatialZone('channel-header', headerGrid, {
    active: true,
    edges: {
      down: 'channel-content',
      left: 'sidebar',
    },
  })

  useSpatialZone('channel-content', () => gridFromElements(channelContent.value?.$el.querySelectorAll(CONTENT_CONTROLS) ?? []), {
    edges: {
      up: 'channel-header',
      left: 'sidebar',
    },
  })

  // The channel loads after the page: focus the header once it is there, on
  // the selected tab the first time
  let awaitingHeader = true

  const headerObserver = new MutationObserver(() => {
    if (!headerZone.isActive.value || document.querySelector('[data-spatial-nav-focused]')) { return }

    const grid = headerGrid()
    if (grid.length === 0) { return }

    if (awaitingHeader) {
      awaitingHeader = false

      const selectedTab = channelHeader.value.$el.querySelector('.selectedTab')
      const row = grid.findIndex(cells => cells.includes(selectedTab))
      if (row !== -1) {
        navState.lastPosition.set('channel-header', { row, col: grid[row].indexOf(selectedTab) })
      }
    }

    headerZone.activate()
  })

  onMounted(() => {
    headerObserver.observe(channelRoot.value, { childList: true, subtree: true })
  })

  onBeforeUnmount(() => {
    headerObserver.disconnect()
  })
}
