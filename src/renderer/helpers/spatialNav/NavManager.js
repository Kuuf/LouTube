// Generic remote-control / arrow-key spatial navigation.
//
// A "zone" is any 2D grid of focusable items (a video list, a grid, a row of
// tabs, the side nav, ...). Exactly one zone is "active" at a time and owns
// the on-screen focus cursor. Pages register a zone on mount and describe,
// via `edges`, which neighbouring zone should take over when navigation
// runs off one of its sides (e.g. pressing Left in column 0 of a video grid
// hands focus to the side nav).
//
// This module is a singleton (not a composable) because the active zone and
// each zone's last-visited position must survive across component
// mount/unmount as the user navigates between pages.

import { reactive } from 'vue'

/** @typedef {'up' | 'down' | 'left' | 'right'} Direction */

/** @typedef {{ row: number, col: number }} GridPosition */

/**
 * @typedef {string | { id: string, resetPosition?: boolean } | (() => string | { id: string, resetPosition?: boolean } | null)} EdgeTarget
 */

/**
 * @typedef {object} SpatialNavZone
 * @property {string} id
 * @property {() => (unknown | null)[][]} getGrid
 *   Returns the current grid snapshot: rows of cells, top to bottom, each
 *   cell any truthy value or `null`/`undefined` for an empty slot to skip
 *   over. A cell that is a DOM `Element` gets the FOCUSED_ATTRIBUTE (styled
 *   globally in spatialNav.css) and is scrolled into view when it gains
 *   focus. Called fresh on every navigation step, so it can read live state.
 * @property {Partial<Record<Direction, EdgeTarget>>} [edges]
 *   Which zone to activate when a move would leave this zone in that
 *   direction. Omitted/null direction = do nothing at that edge.
 * @property {boolean} [isChrome]
 *   Persistent UI (e.g. the side nav) rather than a page's own content.
 *   Excluded from `lastContentZoneId` tracking, so chrome zones can send
 *   focus back to "whichever content zone was active before" via an
 *   `edges` function.
 * @property {(position: GridPosition | null) => void} [onFocusChange]
 * @property {(event: KeyboardEvent) => boolean} [onKeyDown]
 *   Sees every key press first while the zone is active (except in text
 *   fields). Returning true means the zone handled it (calling
 *   `preventDefault()` is then up to it), and spatial nav ignores it.
 * @property {(position: GridPosition, cell: unknown) => void} [onSelect]
 *   Called when Enter is pressed on the focused cell. Defaults to clicking
 *   the cell's first link/button when the cell is a DOM `Element`.
 */

/**
 * @type {{
 *   zones: Map<string, SpatialNavZone>,
 *   activeZoneId: string | null,
 *   lastContentZoneId: string | null,
 *   lastPosition: Map<string, GridPosition>,
 * }}
 */
const navState = reactive({
  zones: new Map(),
  activeZoneId: null,
  lastContentZoneId: null,
  lastPosition: new Map(),
})

export { navState }

/** Set on the focused cell when it is a DOM element, see spatialNav.css. */
const FOCUSED_ATTRIBUTE = 'data-spatial-nav-focused'

/** Mark list items with this so `gridFromElements` callers can find them. */
export const ITEM_ATTRIBUTE = 'data-spatial-nav-item'

/** @type {Element | null} */
let focusedElement = null

/**
 * @param {Element | null} element
 */
function markFocusedElement(element) {
  if (focusedElement === element) { return }

  focusedElement?.removeAttribute(FOCUSED_ATTRIBUTE)
  focusedElement = element
  focusedElement?.setAttribute(FOCUSED_ATTRIBUTE, '')
}

/**
 * Groups elements into grid rows by where they are rendered, so a zone's grid
 * always matches the on-screen layout (list, any grid width, or a whole form).
 * Elements that overlap vertically share a row, ordered left to right.
 * Hidden elements (not rendered, zero-size, invisible or transparent) are
 * skipped.
 *
 * @param {Iterable<Element>} elements - in document order
 * @returns {Element[][]}
 */
export function gridFromElements(elements) {
  /** @type {{ element: Element, left: number }[][]} */
  const rows = []
  let rowBottom = -Infinity

  for (const element of elements) {
    // Own opacity only: ancestors fade in on route changes while the zone activates
    if (!element.checkVisibility({ visibilityProperty: true }) || getComputedStyle(element).opacity === '0') { continue }

    const rect = element.getBoundingClientRect()
    if (rect.width === 0 && rect.height === 0) { continue }

    // Starts below the current row (1px tolerance for borders): new row
    if (rect.top >= rowBottom - 1) {
      rows.push([])
      rowBottom = rect.bottom
    } else {
      rowBottom = Math.max(rowBottom, rect.bottom)
    }

    rows.at(-1).push({ element, left: rect.left })
  }

  return rows.map(row => row.sort((a, b) => a.left - b.left).map(cell => cell.element))
}

/** Everything a user can act on, for zones built from a whole form/page. */
const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"], [role="tab"]'

/**
 * Grid of every visible focusable control in `container`, e.g. for a zone
 * covering a whole form or settings page. Only the innermost of nested
 * focusables is kept (a clickable card wrapping a button is one stop: the
 * button).
 *
 * @param {Element | null | undefined} container
 * @param {string} [excludeSelector] - skip focusables matching this (e.g.
 *   `.tooltip *` for controls not worth a stop on a remote)
 * @returns {Element[][]}
 */
export function focusableGrid(container, excludeSelector) {
  if (!container) { return [] }

  const focusables = [...container.querySelectorAll(FOCUSABLE_SELECTOR)]
    .filter(element => !element.querySelector(FOCUSABLE_SELECTOR) && !(excludeSelector && element.matches(excludeSelector)))

  return gridFromElements(focusables)
}

/**
 * Grid of a whole page: its list items (videos, channels, playlists) as one
 * stop each, plus every other visible focusable control outside of them
 * (tabs, inputs, selects, buttons, links), in document order and grouped
 * into rows by position. Only the innermost of nested controls is kept.
 *
 * @param {Element | null | undefined} container
 * @param {string} [excludeSelector] - skip controls matching this
 * @returns {Element[][]}
 */
export function pageGrid(container, excludeSelector) {
  if (!container) { return [] }

  const items = [...container.querySelectorAll(`[${ITEM_ATTRIBUTE}]`)]
  const controls = [...container.querySelectorAll(FOCUSABLE_SELECTOR)]
    .filter(element =>
      !element.closest(`[${ITEM_ATTRIBUTE}]`) &&
      !element.querySelector(FOCUSABLE_SELECTOR) &&
      !(excludeSelector && element.matches(excludeSelector))
    )

  const cells = [...items, ...controls]
    .sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) ? -1 : 1)

  return gridFromElements(cells)
}

/**
 * @param {SpatialNavZone} zone
 */
export function registerZone(zone) {
  navState.zones.set(zone.id, zone)
}

/**
 * @param {string} id
 */
export function unregisterZone(id) {
  navState.zones.delete(id)

  if (navState.activeZoneId === id) {
    navState.activeZoneId = null
    markFocusedElement(null)
  }

  // `lastPosition` is deliberately kept: re-registering the same zone id
  // later (e.g. navigating back to this page) restores the previous spot.
}

/**
 * @param {(unknown | null)[][]} grid
 * @param {GridPosition} pos
 * @returns {GridPosition}
 */
function clampToGrid(grid, pos) {
  const row = Math.min(Math.max(pos.row, 0), Math.max(grid.length - 1, 0))
  const rowArr = grid[row] ?? []
  const col = Math.min(Math.max(pos.col, 0), Math.max(rowArr.length - 1, 0))
  return { row, col }
}

/**
 * @param {(unknown | null)[][]} grid
 * @param {GridPosition} pos
 * @param {Direction} direction
 * @returns {GridPosition | null} null = would leave the grid
 */
function step(grid, pos, direction) {
  let { row, col } = pos

  if (direction === 'up' || direction === 'down') {
    row += direction === 'up' ? -1 : 1

    if (row < 0 || row >= grid.length) { return null }

    const rowArr = grid[row]
    if (rowArr.length === 0) { return null }

    // Ragged grids (e.g. a shorter last row): keep the closest column.
    col = Math.min(col, rowArr.length - 1)
  } else {
    col += direction === 'left' ? -1 : 1

    const rowArr = grid[row] ?? []
    if (col < 0 || col >= rowArr.length) { return null }
  }

  return { row, col }
}

/**
 * @param {(unknown | null)[][]} grid
 * @param {GridPosition} pos
 * @param {Direction} direction
 * @returns {GridPosition | null}
 */
function findNext(grid, pos, direction) {
  let candidate = step(grid, pos, direction)

  // Skip empty slots (null/undefined cells) rather than landing on them.
  while (candidate && grid[candidate.row]?.[candidate.col] == null) {
    candidate = step(grid, candidate, direction)
  }

  return candidate
}

const SCROLL_DURATION_MS = 180

/** @type {WeakMap<Element, number>} running scroll animation frame per scroller */
const scrollAnimations = new WeakMap()

/**
 * @param {Element} element
 * @returns {Element} nearest vertically scrollable ancestor, or the document
 */
function getScrollParent(element) {
  for (let parent = element.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
    const { overflowY } = getComputedStyle(parent)
    if ((overflowY === 'auto' || overflowY === 'scroll') && parent.scrollHeight > parent.clientHeight) {
      return parent
    }
  }

  return document.scrollingElement
}

/**
 * Vertical equivalent of `scrollIntoView({ block: 'nearest' })` (respecting
 * `scroll-margin`), but with a short ease-out animation. The browser's
 * `behavior: 'smooth'` is slower and not configurable. A new call while one
 * is running continues from the current position, so repeated key presses
 * chain into one smooth movement.
 *
 * @param {Element} element
 * @param {boolean} [isFollowUp] - see the end of the animation
 */
function scrollIntoViewAnimated(element, isFollowUp = false) {
  const scroller = getScrollParent(element)
  const isDocument = scroller === document.scrollingElement

  const rect = element.getBoundingClientRect()
  const style = getComputedStyle(element)
  const top = rect.top - parseFloat(style.scrollMarginTop)
  const bottom = rect.bottom + parseFloat(style.scrollMarginBottom)

  const viewTop = isDocument ? 0 : scroller.getBoundingClientRect().top
  const viewBottom = isDocument ? window.innerHeight : viewTop + scroller.clientHeight

  let delta = 0
  if (top < viewTop || bottom - top > viewBottom - viewTop) {
    // Above the view, or taller than it: align its top
    delta = top - viewTop
  } else if (bottom > viewBottom) {
    delta = bottom - viewBottom
  }

  if (Math.abs(delta) < 1) { return }

  const start = scroller.scrollTop
  const target = Math.min(Math.max(start + delta, 0), scroller.scrollHeight - scroller.clientHeight)
  if (Math.abs(target - start) < 1) { return }

  cancelAnimationFrame(scrollAnimations.get(scroller))

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    scroller.scrollTop = target
    return
  }

  const startTime = performance.now()

  const step = (now) => {
    const progress = Math.min((now - startTime) / SCROLL_DURATION_MS, 1)
    const eased = 1 - (1 - progress) ** 3 // ease-out cubic

    scroller.scrollTop = start + (target - start) * eased

    if (progress < 1) {
      scrollAnimations.set(scroller, requestAnimationFrame(step))
    } else {
      scrollAnimations.delete(scroller)

      // Lazily rendered list items grow once scrolled into view, which can
      // push the element back out of view: one short follow-up corrects it.
      if (!isFollowUp && element === focusedElement) {
        scrollIntoViewAnimated(element, true)
      }
    }
  }

  scrollAnimations.set(scroller, requestAnimationFrame(step))
}

/**
 * @param {string} zoneId
 * @param {(unknown | null)[][]} grid
 * @param {GridPosition} pos
 */
function setPosition(zoneId, grid, pos) {
  navState.lastPosition.set(zoneId, pos)
  navState.zones.get(zoneId)?.onFocusChange?.(pos)

  const cell = grid[pos.row]?.[pos.col]
  if (cell instanceof Element) {
    markFocusedElement(cell)
    releaseDomFocus(cell)
    scrollIntoViewAnimated(cell)
  } else {
    markFocusedElement(null)
  }
}

/**
 * @param {EdgeTarget | undefined | null} edge
 * @returns {{ id: string, resetPosition: boolean } | null}
 */
function resolveEdge(edge) {
  const resolved = typeof edge === 'function' ? edge() : edge

  if (resolved == null) { return null }
  if (typeof resolved === 'string') { return { id: resolved, resetPosition: false } }
  return { id: resolved.id, resetPosition: !!resolved.resetPosition }
}

/**
 * @param {string} id
 * @param {{ resetPosition?: boolean }} [options]
 * @returns {boolean}
 */
export function activateZone(id, { resetPosition = false } = {}) {
  const zone = navState.zones.get(id)
  if (!zone) { return false }

  const previousZoneId = navState.activeZoneId
  if (previousZoneId != null && previousZoneId !== id) {
    navState.zones.get(previousZoneId)?.onFocusChange?.(null)
  }

  navState.activeZoneId = id
  if (!zone.isChrome) {
    navState.lastContentZoneId = id
  }

  const grid = zone.getGrid()

  if (grid.length === 0) {
    // Content not rendered yet (e.g. still loading): keep the stored position
    // rather than clamping it to 0,0, the zone re-activates once it has items.
    if (resetPosition) {
      navState.lastPosition.set(id, { row: 0, col: 0 })
    }
    markFocusedElement(null)
    return true
  }

  const stored = navState.lastPosition.get(id)
  const pos = clampToGrid(grid, resetPosition || !stored ? { row: 0, col: 0 } : stored)

  setPosition(id, grid, pos)
  return true
}

/**
 * @param {string} id
 */
export function isZoneActive(id) {
  return navState.activeZoneId === id
}

/**
 * Moves the focus cursor one step within the active zone, or hands off to a
 * neighbouring zone if the move would leave it.
 *
 * @param {Direction} direction
 * @returns {boolean} whether the key press was consumed
 */
export function handleDirection(direction) {
  const zoneId = navState.activeZoneId
  if (zoneId == null) { return false }

  const zone = navState.zones.get(zoneId)
  if (!zone) { return false }

  const grid = zone.getGrid()
  if (!grid || grid.length === 0) {
    // Nothing (left) to focus in this zone, e.g. no results: its edges still
    // lead out of it, so focus can't get stuck here
    const edge = resolveEdge(zone.edges?.[direction])
    return edge ? activateZone(edge.id, { resetPosition: edge.resetPosition }) : false
  }

  const current = clampToGrid(grid, navState.lastPosition.get(zoneId) ?? { row: 0, col: 0 })
  const next = findNext(grid, current, direction)

  if (next) {
    setPosition(zoneId, grid, next)
    return true
  }

  const edge = resolveEdge(zone.edges?.[direction])
  if (!edge) {
    // Dead end: keep the (clamped) position, let the browser handle the key.
    setPosition(zoneId, grid, current)
    return false
  }

  return activateZone(edge.id, { resetPosition: edge.resetPosition })
}

/**
 * Clicking can remove the focused element (e.g. a button replaced by the
 * form it opens). Once the page has updated, focus whatever now sits at the
 * same position so the cursor doesn't vanish.
 *
 * @param {string} zoneId
 * @param {Element} cell
 */
function refocusIfRemoved(zoneId, cell) {
  requestAnimationFrame(() => {
    if (!cell.isConnected && navState.activeZoneId === zoneId) {
      activateZone(zoneId)
    }
  })
}

const CLICK_TARGET_SELECTOR = 'a[href], button, [role="button"], [role="option"], [role="tab"], input[type="checkbox"], input[type="radio"]'

/**
 * Activates the focused cell of the active zone, as if it was clicked.
 *
 * @returns {boolean} whether the key press was consumed
 */
export function handleSelect() {
  const zoneId = navState.activeZoneId
  if (zoneId == null) { return false }

  const zone = navState.zones.get(zoneId)
  const pos = navState.lastPosition.get(zoneId)
  if (!zone || !pos) { return false }

  const cell = zone.getGrid()[pos.row]?.[pos.col]

  if (zone.onSelect) {
    zone.onSelect(pos, cell)
    return true
  }

  if (cell instanceof HTMLElement) {
    // Text fields take DOM focus (opening the on-screen keyboard on
    // Android TV) and sliders too (Left/Right then adjust them), selects open
    // their option list, everything else is clicked.
    if (isEditableInput(cell)) {
      cell.focus()
      return true
    }

    if (cell instanceof HTMLSelectElement) {
      cell.focus()
      try {
        cell.showPicker()
      } catch {
        // Not supported, or not allowed right now: focused is the fallback
      }
      return true
    }

    const target = cell.matches(CLICK_TARGET_SELECTOR) ? cell : cell.querySelector(CLICK_TARGET_SELECTOR)
    if (target instanceof HTMLElement) {
      target.click()
      releaseDomFocus(cell)
      refocusIfRemoved(zoneId, cell)
      return true
    }
  }

  return false
}

const KEY_TO_DIRECTION = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
}

/**
 * Components may put DOM focus on elements themselves (e.g. a tab focusing
 * itself when chosen, for keyboard users). With the remote, that focus would
 * linger (with its native outline) while the focus cursor moves on, so it is
 * released. Kept: a text field, slider or select in the focused cell, which
 * has DOM focus on purpose (typing, adjusting, picking).
 *
 * @param {Element} cell
 */
function releaseDomFocus(cell) {
  const active = document.activeElement
  if (!(active instanceof HTMLElement) || active === document.body) { return }
  if (cell.contains(active) && (isTypingTarget(active) || active instanceof HTMLSelectElement)) { return }

  active.blur()
}

/**
 * @param {EventTarget | null} target
 */
function isTypingTarget(target) {
  return isEditableInput(target) || /** @type {HTMLElement} */ (target)?.tagName === 'TEXTAREA' || /** @type {HTMLElement} */ (target)?.isContentEditable === true
}

const EDITABLE_INPUT_TYPES = new Set(['text', 'search', 'email', 'url', 'password', 'number', 'tel', 'range'])

/**
 * Inputs edited with DOM focus, where Left/Right are the input's own (caret,
 * slider value) and Up/Down leave it: single-line text fields and sliders.
 * @param {EventTarget | null} target
 */
function isEditableInput(target) {
  return target instanceof HTMLInputElement && EDITABLE_INPUT_TYPES.has(target.type)
}

/**
 * @param {KeyboardEvent} event
 */
function onKeyDown(event) {
  if (navState.activeZoneId == null) { return }

  // Prompts (FtPrompt) handle the keys themselves: their buttons have DOM
  // focus, Left/Right move between them, Enter clicks, Escape/Back closes.
  // Spatial nav would otherwise also act on the page behind them.
  if (document.querySelector('.prompt')) { return }

  if (isTypingTarget(event.target)) {
    // Up/Down leave a text field (e.g. after closing the on-screen
    // keyboard) or slider and carry on navigating from its cell.
    if (isEditableInput(event.target) && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
      /** @type {HTMLElement} */ (event.target).blur()
      handleDirection(KEY_TO_DIRECTION[event.key])
      event.preventDefault()
    } else if (event.key === 'Enter' && /** @type {HTMLInputElement} */ (event.target).type === 'range') {
      // Enter confirms a slider value
      /** @type {HTMLElement} */ (event.target).blur()
      event.preventDefault()
    }
    return
  }

  if (navState.zones.get(navState.activeZoneId)?.onKeyDown?.(event)) { return }

  // Android TV remotes send the D-pad center button to the WebView as Enter.
  if (event.key === 'Enter') {
    if (handleSelect()) {
      event.preventDefault()
    }
    return
  }

  const direction = KEY_TO_DIRECTION[event.key]
  if (!direction) { return }

  if (handleDirection(direction)) {
    event.preventDefault()
  }
}

let listenerAttached = false

/** Registers the single document-level arrow-key listener. Call once, app-wide. */
export function initGlobalKeyListener() {
  if (listenerAttached) { return }
  document.addEventListener('keydown', onKeyDown)
  listenerAttached = true
}

export function teardownGlobalKeyListener() {
  document.removeEventListener('keydown', onKeyDown)
  listenerAttached = false
}
