// The remote's Back button.
//
// On Android, MainActivity.onBack handles it: while an overlay is open
// ("prompt mode": a prompt, dropdown, actions panel...) it sends the page an
// `exit-prompt` event so the overlay closes, otherwise it goes back in the
// WebView history.
//
// On desktop (Electron, e.g. Linux on a TV) there is no Android shell, so this
// module does the same thing in the page. Remotes there send Back as the
// BrowserBack key (CEC, most IR and air-mouse remotes), Escape or Backspace.

import android from 'android'

let inPromptMode = false

/** An overlay opened: Back closes it (sends `exit-prompt`) */
export function enterPromptMode() {
  if (process.env.IS_ANDROID) {
    android.enterPromptMode()
  } else {
    inPromptMode = true
  }
}

/** The overlay closed: Back goes back a page again */
export function exitPromptMode() {
  if (process.env.IS_ANDROID) {
    android.exitPromptMode()
  } else {
    inPromptMode = false
  }
}

/**
 * @param {HTMLElement | null} element
 */
function isTextField(element) {
  if (element == null) { return false }
  if (element.isContentEditable) { return true }
  if (element.tagName === 'TEXTAREA') { return true }
  if (element.tagName !== 'INPUT') { return false }
  const type = /** @type {HTMLInputElement} */ (element).type
  return !['button', 'checkbox', 'radio', 'range', 'submit', 'reset', 'color', 'file', 'image'].includes(type)
}

/**
 * Desktop only: listens for the Back key. Runs in the capture phase on
 * `window`, before the overlays' own Escape handlers, so it sees whether an
 * overlay was open before the key closes it.
 * @param {import('vue-router').Router} router
 * @returns {() => void} removes the listener
 */
export function initDesktopBackButton(router) {
  if (process.env.IS_ANDROID) { return () => {} }

  /**
   * @param {KeyboardEvent} event
   */
  function onKeyDown(event) {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) { return }

    const key = event.key
    const isBrowserBack = key === 'BrowserBack' || key === 'GoBack'
    const isEscape = key === 'Escape'
    const isBackspace = key === 'Backspace' && !isTextField(/** @type {HTMLElement} */ (event.target))
    if (!isBrowserBack && !isEscape && !isBackspace) { return }

    // Escape first leaves the video's full screen
    if (isEscape && document.fullscreenElement != null) { return }

    const overlayOpen = inPromptMode || document.querySelector('.prompt') != null

    if (overlayOpen) {
      // The overlays close on Escape themselves. The other Back keys get
      // Android's behaviour: an `exit-prompt` event.
      if (!isEscape) {
        event.preventDefault()
        inPromptMode = false
        window.dispatchEvent(new Event('exit-prompt'))
      }
      return
    }

    event.preventDefault()
    if (window.history.state?.back) {
      router.back()
    }
  }

  window.addEventListener('keydown', onKeyDown, true)
  return () => window.removeEventListener('keydown', onKeyDown, true)
}
