<template>
  <div
    class="itemActionsPanel"
    :class="{ open: itemActions.isOpen }"
  >
    <!-- Dims the page behind the open panel, click it to close the panel -->
    <!-- eslint-disable-next-line vuejs-accessibility/click-events-have-key-events, vuejs-accessibility/no-static-element-interactions -->
    <div
      class="scrim"
      @click="closeItemActions"
    />
    <div class="background" />
    <div
      class="panel"
      role="dialog"
      :aria-label="itemActions.title"
      :inert="!itemActions.isOpen"
    >
      <div
        v-if="itemActions.thumbnail"
        class="thumbnail"
      >
        <img
          class="thumbnailImage"
          :class="{ blur: itemActions.blurThumbnail }"
          :src="itemActions.thumbnail"
          alt=""
        >
      </div>
      <p
        class="title"
        dir="auto"
      >
        {{ itemActions.title }}
      </p>
      <p
        v-if="itemActions.channelName"
        class="channelName"
        dir="auto"
      >
        {{ itemActions.channelName }}
      </p>
      <div
        ref="actions"
        class="actions"
      >
        <button
          v-for="action in itemActions.actions"
          :key="action.label"
          class="action"
          type="button"
          @click="select(action)"
        >
          {{ action.label }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { nextTick, onBeforeUnmount, useTemplateRef, watch } from 'vue'

import { activateZone, gridFromElements, navState, registerZone, unregisterZone } from '../../helpers/spatialNav/NavManager'

import { closeItemActions, itemActions } from './itemActions'

import android from 'android'

/** @import { ItemAction } from './itemActions' */

// Remote control (spatial nav): while open, the panel is a zone of its own,
// one button per row. Left from it, Escape or the Back button close it, and
// the focus returns to where it was.
const ZONE_ID = 'item-actions'

const actions = useTemplateRef('actions')

/** The zone with the remote's focus before the panel took it */
let returnZoneId = null

function actionsGrid() {
  return gridFromElements(actions.value?.querySelectorAll('.action') ?? [])
}

/**
 * @param {KeyboardEvent} event
 * @returns {boolean} handled here instead of by spatial nav
 */
function handleKey(event) {
  if (event.key === 'Escape' || event.key === 'ArrowLeft') {
    event.preventDefault()
    closeItemActions()
    return true
  }

  return false
}

/**
 * @param {ItemAction} action
 */
function select(action) {
  // Closed first: the focus is back where it was by the time the action
  // moves it on (a prompt, another page)
  closeItemActions()
  action.onSelect()
}

async function onOpen() {
  // Over the page, like the side nav: nothing behind it scrolls
  registerZone({ id: ZONE_ID, getGrid: actionsGrid, onKeyDown: handleKey, isChrome: true })

  // Android's Back button closes the panel
  if (process.env.IS_ANDROID) {
    android.enterPromptMode()
    window.addEventListener('exit-prompt', closeItemActions)
  }

  // Only when the remote is in use (some zone has the focus)
  const activeZoneId = navState.activeZoneId
  if (activeZoneId === null || activeZoneId === ZONE_ID) { return }

  returnZoneId = activeZoneId
  await nextTick()

  if (itemActions.isOpen) {
    navState.lastPosition.set(ZONE_ID, { row: 0, col: 0 })
    activateZone(ZONE_ID)
  }
}

function onClose() {
  if (process.env.IS_ANDROID) {
    android.exitPromptMode()
    window.removeEventListener('exit-prompt', closeItemActions)
  }

  const hadFocus = navState.activeZoneId === ZONE_ID
  const zoneId = returnZoneId
  unregisterZone(ZONE_ID)
  returnZoneId = null

  if (hadFocus && zoneId !== null && navState.zones.has(zoneId)) {
    activateZone(zoneId)
  }
}

// At once: see `select`
watch(() => itemActions.isOpen, (isOpen) => {
  if (isOpen) {
    onOpen()
  } else {
    onClose()
  }
}, { flush: 'sync' })

onBeforeUnmount(closeItemActions)
</script>

<style scoped src="./TvItemActionsPanel.css" />
