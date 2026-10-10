<template>
  <div
    ref="root"
    class="select"
    :class="{ disabled, open: isOpen }"
  >
    <div class="selectHeader">
      <span
        :id="labelId"
        class="selectLabel"
      >
        <FontAwesomeIcon
          :icon="icon"
          class="selectIcon"
          :color="iconColor"
        />
        {{ placeholder }}
      </span>
      <FtTooltip
        v-if="tooltip !== ''"
        class="selectTooltip"
        :tooltip="tooltip"
      />
    </div>
    <button
      :id="id"
      class="selectTrigger"
      type="button"
      :disabled="disabled"
      aria-haspopup="listbox"
      :aria-expanded="isOpen"
      :aria-labelledby="`${labelId} ${id}`"
      :aria-describedby="describeById"
      @click="toggle"
    >
      <span
        class="selectValue"
        :dir="isLocaleSelector ? 'auto' : null"
      >
        {{ selectedName }}
      </span>
      <FontAwesomeIcon
        :icon="['fas', 'angle-down']"
        class="selectChevron"
      />
    </button>
    <Transition
      name="selectDropdown"
      @after-leave="handleDropdownClosed"
    >
      <ul
        v-if="isOpen"
        ref="dropdown"
        class="selectDropdown"
        role="listbox"
        tabindex="-1"
        :aria-labelledby="labelId"
      >
        <li
          v-for="(name, index) in selectNames"
          :key="selectValues[index]"
          class="selectOption"
          :class="{ selected: selectValues[index] === value }"
          role="option"
          :aria-selected="selectValues[index] === value"
          :data-index="index"
          data-spatial-nav-visual
          :dir="isLocaleSelector ? 'auto' : null"
          :lang="isLocaleSelector && selectValues[index] !== 'system' ? selectValues[index] : null"
          tabindex="-1"
          @click.stop.prevent="choose(index)"
          @keydown.enter.space.stop.prevent="choose(index)"
        >
          <span class="optionName">{{ name }}</span>
          <span
            class="checkIndicator"
            aria-hidden="true"
          >
            <FontAwesomeIcon
              :icon="['fas', 'check']"
              class="checkIcon"
            />
          </span>
        </li>
      </ul>
    </Transition>
  </div>
</template>

<script setup>
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { computed, nextTick, onBeforeUnmount, ref, useId, useTemplateRef, watch } from 'vue'

import FtTooltip from '../FtTooltip/FtTooltip.vue'

import store from '../../store/index'

import { useSpatialZone } from '../../composables/useSpatialZone'
import { activateZone, navState } from '../../helpers/spatialNav/NavManager'

import android from 'android'

const props = defineProps({
  placeholder: {
    type: String,
    required: true
  },
  value: {
    type: String,
    required: true
  },
  selectNames: {
    type: Array,
    required: true
  },
  selectValues: {
    type: Array,
    required: true
  },
  tooltip: {
    type: String,
    default: ''
  },
  disabled: {
    type: Boolean,
    default: false
  },
  describeById: {
    type: String,
    default: null
  },
  icon: {
    type: Array,
    required: true
  },
  iconColor: {
    type: String,
    default: null
  },
  isLocaleSelector: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['change'])

const id = useId()
const labelId = `${id}-label`

const selectedName = computed(() => {
  const index = props.selectValues.indexOf(props.value)
  return index === -1 ? '' : props.selectNames[index]
})

// A dropdown of our own instead of the system's `<select>` list, like the
// subscribe button's profile dropdown (FtSubscribeButton.vue): a card under
// the button, the options as rows, the chosen one with a check.
const isOpen = ref(false)

const root = useTemplateRef('root')
const dropdown = useTemplateRef('dropdown')

function toggle() {
  isOpen.value = !isOpen.value
}

/**
 * @param {number} index
 */
function choose(index) {
  const newValue = props.selectValues[index]
  isOpen.value = false

  if (newValue !== undefined && newValue !== props.value) {
    emit('change', newValue)
  }
}

/**
 * Clicking/tapping outside closes the dropdown
 * @param {PointerEvent} event
 */
function handleOutsidePointerDown(event) {
  if (root.value && !root.value.contains(/** @type {Node} */ (event.target))) {
    isOpen.value = false
  }
}

/**
 * @param {KeyboardEvent} event
 */
function handleEscape(event) {
  if (event.key === 'Escape') {
    isOpen.value = false
  }
}

// Remote control (spatial nav): while open, the dropdown is a zone of its
// own, one option per row. Enter chooses the focused option, Left, Escape or
// the Back button close it, and focus goes back to the button.
const zoneId = `select-${id}`

/** The zone with the remote's focus before the dropdown took it */
let returnZoneId = null

// Android's Back button closes the dropdown. Not when it opens inside a
// prompt, which has its own prompt mode (and would lose it when this closes).
let usesPromptMode = false

// Not `gridFromElements`: it skips transparent elements, which the options
// are while the dropdown fades in, and the zone activates as it opens
const zone = useSpatialZone(zoneId, () => [...(dropdown.value?.querySelectorAll('.selectOption') ?? [])].map(option => [option]), {
  onKeyDown: handleZoneKey,
  onSelect: (_position, cell) => {
    choose(Number(cell?.dataset.index))
  },
})

/**
 * @param {KeyboardEvent} event
 * @returns {boolean} handled here instead of by spatial nav
 */
function handleZoneKey(event) {
  // Closing (fading out): the focus returns once it's gone
  if (!isOpen.value) {
    event.preventDefault()
    return true
  }

  const row = navState.lastPosition.get(zoneId)?.row ?? 0
  const lastRow = props.selectValues.length - 1

  if (event.key === 'Escape' || event.key === 'ArrowLeft') {
    event.preventDefault()
    isOpen.value = false
    return true
  }

  // Dead ends: nothing else to go to (not scrolling the page either)
  if (event.key === 'ArrowRight' || (event.key === 'ArrowUp' && row === 0) || (event.key === 'ArrowDown' && row >= lastRow)) {
    event.preventDefault()
    return true
  }

  return false
}

function handleDropdownClosed() {
  if (returnZoneId !== null && zone.isActive.value) {
    activateZone(returnZoneId)
  }
  returnZoneId = null
}

function closeDropdown() {
  isOpen.value = false
}

function removeOpenListeners() {
  document.removeEventListener('pointerdown', handleOutsidePointerDown, true)
  document.removeEventListener('keydown', handleEscape)

  if (usesPromptMode) {
    usesPromptMode = false
    android.exitPromptMode()
    window.removeEventListener('exit-prompt', closeDropdown)
  }
}

watch(isOpen, async (open) => {
  if (open) {
    document.addEventListener('pointerdown', handleOutsidePointerDown, true)
    document.addEventListener('keydown', handleEscape)

    if (process.env.IS_ANDROID && !store.getters.isAnyPromptOpen) {
      usesPromptMode = true
      android.enterPromptMode()
      window.addEventListener('exit-prompt', closeDropdown)
    }
  } else {
    removeOpenListeners()
  }

  if (!open) { return }

  const activeZoneId = navState.activeZoneId
  const remoteInUse = activeZoneId !== null && activeZoneId !== zoneId
  if (remoteInUse) {
    returnZoneId = activeZoneId
  }

  await nextTick()

  // Wholly on screen, with the chosen option in view
  dropdown.value?.scrollIntoView({ block: 'nearest' })
  dropdown.value?.querySelector('.selected')?.scrollIntoView({ block: 'nearest' })

  // Only when the remote is in use (some zone has the focus): on the chosen option
  if (remoteInUse) {
    navState.lastPosition.set(zoneId, { row: Math.max(props.selectValues.indexOf(props.value), 0), col: 0 })
    zone.activate()
  }
})

onBeforeUnmount(() => {
  if (isOpen.value) {
    removeOpenListeners()
  }
})
</script>

<style scoped src="./FtSelect.css" />
