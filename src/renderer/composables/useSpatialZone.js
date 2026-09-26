import { computed, onBeforeUnmount, onMounted, unref } from 'vue'

import { activateZone, isZoneActive, navState, registerZone, unregisterZone } from '../helpers/spatialNav/NavManager'

/** @import { Ref } from 'vue' */
/** @import { Direction, GridPosition } from '../helpers/spatialNav/NavManager' */

/**
 * Registers a spatial-navigation zone for the lifetime of the calling
 * component, and gives back everything the template needs to render the
 * focus highlight.
 *
 * @param {string} zoneId
 * @param {Ref<(unknown | null)[][]> | (() => (unknown | null)[][])} grid
 *   The zone's current items, as rows of columns, top to bottom / left to
 *   right. A ref (read live) or a plain getter function.
 * @param {object} [options]
 * @param {Partial<Record<Direction, import('../helpers/spatialNav/NavManager').EdgeTarget>>} [options.edges]
 * @param {boolean} [options.isChrome] - persistent UI (e.g. the side nav), see NavManager.
 * @param {boolean} [options.active] - activate this zone as soon as it mounts.
 * @param {(event: KeyboardEvent) => boolean} [options.onKeyDown]
 *   Sees key presses first, see NavManager.
 * @param {(position: GridPosition, cell: unknown) => void} [options.onSelect]
 *   Enter on the focused cell, see NavManager. Defaults to clicking the
 *   cell's first link/button when cells are DOM elements.
 */
export function useSpatialZone(zoneId, grid, options = {}) {
  const { edges = {}, isChrome = false, active = false, onKeyDown, onSelect } = options

  const getGrid = () => (typeof grid === 'function' ? grid() : unref(grid)) ?? []

  onMounted(() => {
    registerZone({ id: zoneId, getGrid, edges, isChrome, onKeyDown, onSelect })
    if (active) {
      activateZone(zoneId)
    }
  })

  onBeforeUnmount(() => {
    unregisterZone(zoneId)
  })

  const isActive = computed(() => isZoneActive(zoneId))

  /** @type {import('vue').ComputedRef<GridPosition | null>} */
  const focusedPosition = computed(() => {
    if (!isActive.value) { return null }
    return navState.lastPosition.get(zoneId) ?? null
  })

  /**
   * @param {number} row
   * @param {number} col
   */
  function isFocused(row, col) {
    const pos = focusedPosition.value
    return pos != null && pos.row === row && pos.col === col
  }

  return {
    isActive,
    focusedPosition,
    isFocused,
    /** @param {{ resetPosition?: boolean }} [opts] */
    activate: (opts) => activateZone(zoneId, opts),
  }
}
