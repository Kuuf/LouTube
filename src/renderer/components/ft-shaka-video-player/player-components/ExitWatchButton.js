import shaka from 'shaka-player'

import { PlayerIcons } from '../../../../constants'

/**
 * Leaves the full screen TV watch view (the player takes the place of the
 * regular fullscreen button, bottom right).
 */
export class ExitWatchButton extends shaka.ui.Element {
  /**
   * @param {EventTarget} events
   * @param {HTMLElement} parent
   * @param {shaka.ui.Controls} controls
   */
  constructor(events, parent, controls) {
    super(parent, controls)

    /** @private */
    this.button_ = document.createElement('button')
    this.button_.classList.add('exit-watch-button', 'shaka-tooltip')

    /** @private */
    this.icon_ = new shaka.ui.Icon(this.button_, PlayerIcons.CLOSE_FULLSCREEN_FILLED)

    this.parent.appendChild(this.button_)

    this.eventManager.listen(this.button_, 'click', () => {
      events.dispatchEvent(new CustomEvent('exitWatch'))
    })

    this.eventManager.listen(events, 'localeChanged', () => {
      this.updateLocalisedStrings_()
    })

    this.updateLocalisedStrings_()
  }

  /** @private */
  updateLocalisedStrings_() {
    this.button_.ariaLabel = this.localization.resolve('EXIT_FULL_SCREEN')
  }
}
