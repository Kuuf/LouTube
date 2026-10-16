import { onBeforeUnmount, onMounted, useTemplateRef, watch } from 'vue'
import { useRoute } from 'vue-router'

import { useSpatialZone } from '../../composables/useSpatialZone'
import { gridFromElements, ITEM_ATTRIBUTE, navState, scrollToViewTopAnimated } from '../../helpers/spatialNav/NavManager'

/** Header controls: subscribe (+ profile toggle), the tabs and the channel search */
const HEADER_CONTROLS = 'button:not([disabled]), [role="tab"], input'
/** Not worth a stop on a remote: the search input's own buttons */
const HEADER_EXCLUDED = '.channelSearch button'

/**
 * Content controls: the sort buttons, Home shelves' "View Playlist", the list
 * items, About links, fetch more
 */
const CONTENT_CONTROLS = [
  '.sortTab',
  '.playAllLink',
  `[${ITEM_ATTRIBUTE}]`,
  '#aboutPanel a[href]',
  '#aboutPanel button',
  '.getNextPage',
].join(', ')

/** Space above the tabs when they are scrolled to the top of the screen (px) */
const TAB_BAR_TOP_PADDING = 16

/**
 * Remote control (spatial nav) for the channel page: the header (subscribe,
 * tabs, channel search) and the current tab's content below it. Focus starts
 * on the selected tab once the channel has loaded. Focusing a tab or a sort
 * order selects it. Left from either leaves to
 * the side nav.
 *
 * Template refs to bind: `channelRoot` (the page's root element),
 * `channelHeader` (ChannelDetails) and `channelContent` (the content FtCard).
 */
export function useTvChannel() {
  const channelRoot = useTemplateRef('channelRoot')
  const channelHeader = useTemplateRef('channelHeader')
  const channelContent = useTemplateRef('channelContent')
  const route = useRoute()

  // A channel starts at its top: positions remembered from the last channel
  // visited (the zones are the same for every channel) would send the focus
  // down into the new one's content
  navState.lastPosition.delete('channel-header')
  navState.lastPosition.delete('channel-content')

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

  function contentGrid() {
    return gridFromElements(channelContent.value?.$el.querySelectorAll(CONTENT_CONTROLS) ?? [])
  }

  const contentZone = useSpatialZone('channel-content', contentGrid, {
    edges: {
      up: 'channel-header',
      left: 'sidebar',
    },
    onKeyDown: handleContentKey,
  })

  /**
   * Between the sort buttons and the list under them, the column isn't
   * kept: Down from any sort button goes to the first item of the row below,
   * and Up into the sort buttons goes to the selected one (focusing another
   * would select it, see below).
   * @param {KeyboardEvent} event
   * @returns {boolean} handled here instead of by spatial nav
   */
  function handleContentKey(event) {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') { return false }

    const position = navState.lastPosition.get('channel-content')
    if (!position) { return false }

    const grid = contentGrid()
    const cell = grid[position.row]?.[position.col]
    if (!(cell instanceof Element)) { return false }

    let target = null

    if (event.key === 'ArrowDown' && cell.matches('.sortTab') && grid[position.row + 1]) {
      target = { row: position.row + 1, col: 0 }
    } else if (event.key === 'ArrowUp' && !cell.matches('.sortTab') && position.row > 0) {
      const col = grid[position.row - 1].findIndex(above => above.matches('.selectedSortTab'))
      if (col !== -1) {
        target = { row: position.row - 1, col }
      }
    }

    if (!target) { return false }

    event.preventDefault()
    navState.lastPosition.set('channel-content', target)
    contentZone.activate()
    return true
  }

  // On a list item (video, playlist, ...) of the content's first rows, the
  // tab bar goes to the top of the screen (past the banner and channel info)
  // as long as the item still fits under it. Further down, and on the sort
  // buttons, the focus scroll's "nearest" applies.
  watch(contentZone.focusedPosition, (position, previousPosition) => {
    if (position == null) { return }

    const grid = contentGrid()
    const cell = grid[position.row]?.[position.col]

    // Like the tabs, focusing a sort order selects it. Entering the content
    // on another one than the selected (the position remembered from another
    // tab) moves the focus to the selected one instead of changing the order.
    if (cell instanceof Element && cell.matches('.sortTab:not(.selectedSortTab)')) {
      const selected = cell.parentElement.querySelector('.selectedSortTab')
      const col = grid[position.row].indexOf(selected)

      if (previousPosition == null && col !== -1) {
        navState.lastPosition.set('channel-content', { row: position.row, col })
        contentZone.activate()
        return
      }

      cell.click()
    }

    // A tab rather than their row, which has padding of its own
    const tabBar = channelHeader.value?.$el.querySelector('.tab')
    if (!(cell instanceof Element) || !cell.matches(`[${ITEM_ATTRIBUTE}]`) || !tabBar) { return }

    const tabBarTop = tabBar.getBoundingClientRect().top - TAB_BAR_TOP_PADDING
    if (cell.getBoundingClientRect().bottom - tabBarTop <= window.innerHeight - TAB_BAR_TOP_PADDING) {
      scrollToViewTopAnimated(tabBar, TAB_BAR_TOP_PADDING)
    }
  })

  // Focusing a tab opens it, no Enter needed
  watch(headerZone.focusedPosition, (position) => {
    if (position == null) { return }

    const cell = headerGrid()[position.row]?.[position.col]
    if (cell?.matches('[role="tab"]:not(.selectedTab)')) {
      cell.click()
    }
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

  // Going from one channel to another (a featured channel) keeps the page:
  // start over at the top of the new channel, on its selected tab once its
  // header is there
  watch(() => route.params.id, (channelId, previousChannelId) => {
    if (channelId === previousChannelId) { return }

    navState.lastPosition.delete('channel-header')
    navState.lastPosition.delete('channel-content')
    awaitingHeader = true
    document.scrollingElement.scrollTop = 0
    headerZone.activate({ resetPosition: true })
  })

  onMounted(() => {
    headerObserver.observe(channelRoot.value, { childList: true, subtree: true })
  })

  onBeforeUnmount(() => {
    headerObserver.disconnect()
  })
}
