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
 *   over. A cell that is a DOM `Element` is scrolled into view when it gains
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
    cell.scrollIntoView({ block: 'nearest', inline: 'nearest' })
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
  if (!grid || grid.length === 0) { return false }

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

const SELECT_TARGET_SELECTOR = 'a[href], button'

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

  if (cell instanceof Element) {
    const target = cell.matches(SELECT_TARGET_SELECTOR) ? cell : cell.querySelector(SELECT_TARGET_SELECTOR)
    if (target instanceof HTMLElement) {
      target.click()
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
 * @param {EventTarget | null} target
 */
function isTypingTarget(target) {
  const tagName = /** @type {HTMLElement} */ (target)?.tagName
  return tagName === 'INPUT' || tagName === 'TEXTAREA' || /** @type {HTMLElement} */ (target)?.isContentEditable === true
}

/**
 * @param {KeyboardEvent} event
 */
function onKeyDown(event) {
  if (navState.activeZoneId == null) { return }
  if (isTypingTarget(event.target)) { return }

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
