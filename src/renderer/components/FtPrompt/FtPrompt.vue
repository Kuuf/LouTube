<template>
  <Teleport to=".app">
    <div
      class="prompt"
      tabindex="-1"
      :inert="inert"
      @click.self="hide"
      @keydown.enter.self="hide"
      @keydown.left.right.capture="handleArrowKeys"
      @keydown.up.down="handleVerticalKeys"
    >
      <FtCard
        ref="promptCard"
        class="promptCard"
        :class="{ autosize, [theme]: true, fullscreen, simple: isSimple }"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="id"
      >
        <slot
          name="label"
          :label-id="id"
        >
          <h2
            :id="id"
            class="center"
          >
            {{ label }}
          </h2>
        </slot>

        <slot>
          <p
            v-for="extraLabel in extraLabels"
            :key="extraLabel"
            class="center"
          >
            <strong>
              {{ extraLabel }}
            </strong>
          </p>
          <FtFlexBox class="options">
            <FtButton
              v-for="(option, index) in optionNames"
              :key="index"
              :label="option"
              :text-color="optionButtonTextColor(index)"
              :background-color="optionButtonBackgroundColor(index)"
              :icon="index === 0 && isFirstOptionDestructive ? ['fas', 'trash'] : null"
              @click="click(optionValues[index])"
            />
          </FtFlexBox>
        </slot>
      </FtCard>
    </div>
  </Teleport>
</template>

<script setup>
import { nextTick, onBeforeUnmount, onMounted, useId, useTemplateRef, computed, useSlots } from 'vue'
import android from 'android'

import store from '../../store/index'
import { focusableGrid } from '../../helpers/spatialNav/NavManager'

import FtCard from '../ft-card/ft-card.vue'
import FtFlexBox from '../ft-flex-box/ft-flex-box.vue'
import FtButton from '../FtButton/FtButton.vue'

const props = defineProps({
  label: {
    type: String,
    default: ''
  },
  extraLabels: {
    type: Array,
    default: () => []
  },
  optionNames: {
    type: Array,
    default: () => []
  },
  optionValues: {
    type: Array,
    default: () => []
  },
  autosize: {
    type: Boolean,
    default: false
  },
  isFirstOptionDestructive: {
    type: Boolean,
    default: false
  },
  theme: {
    type: String,
    default: 'base'
  },
  inert: {
    type: Boolean,
    default: false
  },
  fullscreen: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['click'])

// Just a question and its options (no content of its own): a medium sized
// dialog instead of one as wide as the screen
const slots = useSlots()
const isSimple = computed(() => !slots.default)

const id = useId()

const promptCard = useTemplateRef('promptCard')

let promptButtons = []
let lastActiveElement = null

function exitPrompt() {
  hide()
}

onMounted(() => {
  lastActiveElement = document.activeElement
  document.addEventListener('keydown', handleEscape, true)
  store.commit('addOpenPrompt', id)

  nextTick(() => {
    promptButtons = Array.from(promptCard.value.$el.querySelectorAll('.btn.ripple, .iconButton'))

    // Not on a destructive first option: a stray Enter then cancels
    focusItem(props.isFirstOptionDestructive ? promptButtons.length - 1 : 0)
  })
  if (process.env.IS_ANDROID) {
    android.enterPromptMode()
    window.addEventListener('exit-prompt', exitPrompt)
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleEscape, true)
  store.commit('removeOpenPrompt', id)
  nextTick(() => lastActiveElement?.focus())
  if (process.env.IS_ANDROID) {
    android.exitPromptMode()
    window.removeEventListener('exit-prompt', exitPrompt)
  }
})

/**
 * @param {number} index
 */
function optionButtonTextColor(index) {
  if (index === 0 && props.isFirstOptionDestructive) {
    return 'var(--destructive-text-color)'
  } else {
    return 'var(--primary-text-color)'
  }
}

/**
 * @param {number} index
 */
function optionButtonBackgroundColor(index) {
  if (index === 0 && props.isFirstOptionDestructive) {
    return 'var(--destructive-color)'
  } else {
    // A mild gray: the swapped colors are the focused option (FtPrompt.css)
    return 'color-mix(in srgb, var(--primary-text-color) 12%, transparent)'
  }
}

/**
 * @param {any} value
 */
function click(value) {
  emit('click', value)
}

function hide() {
  click(null)
}

/**
 * @param {number} index
 */
function focusItem(index) {
  if (index < 0) {
    index = promptButtons.length - 1
  } else if (index >= promptButtons.length) {
    index = 0
  }

  promptButtons[index].focus()
  store.dispatch('showOutlines')
}

/**
 * @param {KeyboardEvent} event
 */
function handleEscape(event) {
  if (event.key === 'Escape' && !props.inert) {
    event.preventDefault()
    hide()
  }
}

/**
 * @param {KeyboardEvent} event
 */
/**
 * Up/Down move the keyboard focus between the rows of what can be focused in
 * the dialog (fields, list rows, buttons): the remote's spatial nav stays
 * out of prompts (NavManager.js), so this is how a remote gets around them.
 * A prompt handling these keys itself (`preventDefault`) is left alone.
 * @param {KeyboardEvent} event
 */
function handleVerticalKeys(event) {
  const active = /** @type {HTMLElement} */ (document.activeElement)

  // Dropdowns and sliders use the keys themselves
  if (event.defaultPrevented || active instanceof HTMLSelectElement || /** @type {HTMLInputElement} */ (active).type === 'range') {
    return
  }

  const rows = focusableGrid(promptCard.value.$el, '.tooltip *, .ft-input-component button')
  if (rows.length === 0) { return }

  event.preventDefault()

  const down = event.key === 'ArrowDown'
  const row = rows.findIndex(cells => cells.some(cell => cell === active || cell.contains(active)))

  // From outside the rows (nothing focused yet): the first or the last one
  const targetRow = row === -1 ? rows.at(down ? 0 : -1) : rows[row + (down ? 1 : -1)]
  if (!targetRow) { return }

  const col = row === -1
    ? 0
    : rows[row].findIndex(cell => cell === active || cell.contains(active))

  const target = /** @type {HTMLElement} */ (targetRow[Math.min(col, targetRow.length - 1)])
  target.focus()
  store.dispatch('showOutlines')
}

function handleArrowKeys(event) {
  const currentIndex = promptButtons.indexOf(event.target)

  // Only react if a button was focused when the arrow key was pressed
  if (currentIndex === -1) {
    return
  }

  event.preventDefault()

  const direction = (event.key === 'ArrowLeft') ? -1 : 1
  focusItem(currentIndex + direction)
}
</script>

<style scoped src="./FtPrompt.css" />
<style src="./global.css" />
