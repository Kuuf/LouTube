import shaka from 'shaka-player'

import { PlayerIcons } from '../../../../constants'

/**
 * Opens the channel of the current video: its avatar and name in the control
 * bar, so the channel can be reached with the remote from the full screen TV
 * watch view.
 */
export class ChannelButton extends shaka.ui.Element {
  /**
   * @param {string} channelName
   * @param {string} channelThumbnail
   * @param {EventTarget} events
   * @param {HTMLElement} parent
   * @param {shaka.ui.Controls} controls
   */
  constructor(channelName, channelThumbnail, events, parent, controls) {
    super(parent, controls)

    /** @private */
    this.button_ = document.createElement('button')
    this.button_.classList.add('ft-channel-button')
    this.button_.ariaLabel = channelName

    if (channelThumbnail) {
      const avatar = document.createElement('img')
      avatar.classList.add('ft-channel-button-avatar')
      avatar.src = channelThumbnail
      avatar.alt = ''
      avatar.referrerPolicy = 'no-referrer'
      this.button_.appendChild(avatar)
    } else {
      /** @private */
      this.icon_ = new shaka.ui.Icon(this.button_, PlayerIcons.ACCOUNT_CIRCLE_FILLED)
    }

    if (channelName) {
      const name = document.createElement('span')
      name.classList.add('ft-channel-button-name')
      name.textContent = channelName
      this.button_.appendChild(name)
    }

    this.parent.appendChild(this.button_)

    this.eventManager.listen(this.button_, 'click', () => {
      events.dispatchEvent(new CustomEvent('goToChannel'))
    })
  }
}
