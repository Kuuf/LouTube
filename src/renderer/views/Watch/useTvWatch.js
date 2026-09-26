import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { useSpatialZone } from '../../composables/useSpatialZone'
import { focusableGrid, gridFromElements, ITEM_ATTRIBUTE, navState } from '../../helpers/spatialNav/NavManager'

const DIRECTION_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'])

const BIG_PLAY_BUTTON = '.shaka-big-buttons-container .shaka-play-button'
const BAR_PLAY_BUTTON = '.shaka-controls-button-panel .shaka-play-button'

/** The settings (gear) menu and its submenus (quality, speed, captions, ...) */
const SETTINGS_MENUS = '.shaka-overflow-menu, .shaka-settings-menu'

/**
 * TV watch view: the watch page is a full screen layer, the video filling the
 * screen with the Up Next videos below it. It is left with the player's exit
 * button (bottom right) or the Back button (browser history back, which is
 * what the Android back button does).
 *
 * Remote control:
 * - Player controls hidden (playing): Enter plays/pauses, Left/Right seek
 *   (the player's own keyboard shortcuts), Up/Down show the controls.
 * - Player controls shown: spatial nav between them. Focus starts on the big
 *   play/pause button over the video, where Left/Right seek too. Down goes
 *   to the control bar (Left/Right between its buttons), Down again scrolls
 *   to the Up Next videos, Up from their first row comes back.
 * - Settings (gear) menu: its own zone while open, one list. Up/Down between
 *   its items, Enter on one expands its options (focus on the chosen one),
 *   Enter on an option picks it. Left collapses the options, or closes the
 *   menu (back on the gear).
 * - Enter on an Up Next video replaces the current one, so Back still leaves
 *   the watch view instead of stepping through the videos watched in it.
 *
 * Refs to bind in the template: `watchRoot` (the layer), `player` (the
 * ft-shaka-video-player) and `upNext` (the Up Next list).
 */
export function useTvWatch() {
  const router = useRouter()

  /** @type {import('vue').Ref<HTMLElement | null>} */
  const watchRoot = ref(null)
  const player = ref(null)
  const upNext = ref(null)

  // The player loads after the page, is rebuilt for every video, and shaka
  // rebuilds its controls when reconfigured (first with its default layout,
  // then FreeTube's, which adds the big play button row above the bar).
  // Whenever the player zone has no focused element on screen,
  // playerObserver focuses one: the big play/pause button until the remote
  // is used in the player, the last position after that.
  let awaitingPlayer = true

  function playerGrid() {
    // Sliders (seeking is Left/Right while the controls are hidden) and the
    // time/ad labels aren't worth a stop. The big play button over the video
    // is the row above the control bar (Up from the bar). The settings menus
    // are a zone of their own.
    return focusableGrid(player.value?.$el, `.tooltip *, input[type="range"], .shaka-current-time, .shaka-ad-info, :is(${SETTINGS_MENUS}) *`)
  }

  const playerZone = useSpatialZone('watch-player', playerGrid, {
    active: true,
    edges: {
      down: 'watch-up-next',
    },
    onKeyDown: handlePlayerKey,
    onSelect: (_position, control) => {
      control?.click()
      // The gear opens the settings menu
      requestAnimationFrame(focusOpenMenu)
    },
  })

  /** @returns {HTMLElement | undefined} the settings menu, if open */
  function openMenu() {
    return [...(player.value?.$el.querySelectorAll(SETTINGS_MENUS) ?? [])]
      .find(menu => !menu.classList.contains('shaka-hidden') && menu.checkVisibility())
  }

  // The settings menu is one list: its items (Captions, Resolution, ...)
  // each followed by a sub menu of options, expanded in place when chosen
  function menuButtons() {
    return [...(openMenu()?.querySelectorAll('button') ?? [])]
      .filter(button => !button.classList.contains('shaka-hidden') && button.checkVisibility())
  }

  const menuZone = useSpatialZone('watch-player-menu', () => menuButtons().map(button => [button]), {
    onKeyDown: (event) => {
      player.value?.showControls()

      if (!openMenu()) {
        // Closed by the player itself
        playerZone.activate()
        event.preventDefault()
        return true
      }

      if (event.key === 'ArrowLeft') {
        closeMenuLevel()
        event.preventDefault()
        return true
      }

      // Everything else is spatial nav in the menu, not player shortcuts
      if (DIRECTION_KEYS.has(event.key)) {
        event.preventDefault()
      }
      return false
    },
    onSelect: (_position, button) => {
      const subMenu = button.closest('.shaka-sub-menu')
      button.click()

      requestAnimationFrame(() => {
        if (!openMenu()) {
          playerZone.activate()
        } else if (subMenu && !subMenu.checkVisibility()) {
          // Picked an option, its sub menu closed: back on its item
          focusMenuButton(subMenu.previousElementSibling)
        } else if (!subMenu && button.nextElementSibling?.classList.contains('shaka-sub-menu')) {
          // Opened a sub menu: on its chosen option
          focusSubMenu(button.nextElementSibling)
        } else {
          focusMenuButton(button)
        }
      })
    },
  })

  /**
   * @param {Element | null} button
   */
  function focusMenuButton(button) {
    const row = menuButtons().indexOf(/** @type {HTMLButtonElement} */ (button))
    navState.lastPosition.set('watch-player-menu', { row: Math.max(row, 0), col: 0 })
    menuZone.activate()
  }

  /**
   * @param {Element} subMenu
   */
  function focusSubMenu(subMenu) {
    const options = menuButtons().filter(button => subMenu.contains(button) && !button.classList.contains('shaka-back-to-overflow-button'))
    focusMenuButton(options.find(button => button.querySelector('.shaka-chosen-item')) ?? options[0] ?? null)
  }

  /** After the gear: focuses the settings menu if it opened */
  function focusOpenMenu() {
    if (openMenu()) {
      focusMenuButton(menuButtons()[0])
    }
  }

  function closeMenuLevel() {
    const subMenu = document.querySelector('[data-spatial-nav-focused]')?.closest('.shaka-sub-menu')

    if (subMenu) {
      // Collapse the sub menu with its (hidden in this layout) back button,
      // back on its item
      const item = subMenu.previousElementSibling
      const backButton = /** @type {HTMLElement | null} */ (subMenu.querySelector('.shaka-back-to-overflow-button'))
      backButton?.click()
      requestAnimationFrame(() => {
        if (openMenu()) {
          focusMenuButton(item)
        } else {
          playerZone.activate()
        }
      })
    } else {
      player.value?.closeMenus()
      playerZone.activate()
    }
  }

  useSpatialZone('watch-up-next', () => gridFromElements(upNext.value?.$el.querySelectorAll(`[${ITEM_ATTRIBUTE}]`) ?? []), {
    edges: {
      up: 'watch-player',
    },
    onSelect: (_position, item) => {
      const href = item?.querySelector('a[href]')?.getAttribute('href')
      if (href) {
        router.replace(href.replace(/^#/, ''))

        // Back to the top, on the new video's controls once they load
        awaitingPlayer = true
        playerZone.activate({ resetPosition: true })
      }
    },
  })

  /**
   * @param {KeyboardEvent} event
   * @returns {boolean} handled here instead of by spatial nav
   */
  function handlePlayerKey(event) {
    const player_ = player.value
    if (!player_ || (event.key !== 'Enter' && !DIRECTION_KEYS.has(event.key))) {
      return false
    }

    awaitingPlayer = false

    if (player_.areControlsShown()) {
      // Keep them up while the remote is in use
      player_.showControls()

      // On the big play/pause button, Left/Right seek (the player's shortcuts)
      if ((event.key === 'ArrowLeft' || event.key === 'ArrowRight') &&
        document.querySelector('[data-spatial-nav-focused]')?.matches(BIG_PLAY_BUTTON)) {
        return true
      }

      // Otherwise arrow keys are spatial nav only, also at a dead end (not
      // the player's seek/volume shortcuts)
      if (event.key !== 'Enter') {
        event.preventDefault()
      }
      return false
    }

    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      // Seek, left to the player's keyboard shortcuts
      player_.showControls()
      return true
    }

    event.preventDefault()

    if (event.key === 'Enter') {
      player_.togglePlayback()
    }

    player_.showControls()
    return true
  }

  const playerObserver = new MutationObserver(() => {
    // (no player while the next video loads)
    if (!player.value || !playerZone.isActive.value || document.querySelector('[data-spatial-nav-focused]')) { return }

    // Wait for FreeTube's layout, with both the big play button and the
    // control bar: shaka first builds its default one (bar only), and
    // focusing then would store a position that points elsewhere after
    const grid = playerGrid()
    const bigPlay = player.value.$el.querySelector(BIG_PLAY_BUTTON)
    const row = grid.findIndex(cells => cells.includes(bigPlay))
    if (row === -1 || !grid.some(cells => cells.includes(player.value.$el.querySelector(BAR_PLAY_BUTTON)))) { return }

    if (awaitingPlayer) {
      navState.lastPosition.set('watch-player', { row, col: grid[row].indexOf(bigPlay) })
    }

    playerZone.activate()
  })

  onMounted(() => {
    playerObserver.observe(watchRoot.value, { childList: true, subtree: true })
  })

  onBeforeUnmount(() => {
    playerObserver.disconnect()
  })

  function exitWatch() {
    if (window.history.state?.back) {
      router.back()
    } else {
      router.push('/')
    }
  }

  return { watchRoot, player, upNext, exitWatch }
}
