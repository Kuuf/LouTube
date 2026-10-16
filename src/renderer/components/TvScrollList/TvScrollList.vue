<template>
  <!-- No box of its own: the highlight and the scroller are placed and sized
       against the consumer's container -->
  <div class="tvScrollList">
    <!-- The focus highlight, under the entries and not in the scroller: it
         holds still while they scroll under it -->
    <div
      class="tvScrollListHighlight"
      :class="[highlightClass, { shown: highlight.shown, sliding: highlight.sliding, visual: highlight.visual }]"
      :style="{ translate: `0 ${highlight.top}px`, blockSize: `${highlight.height}px` }"
    />
    <div
      ref="scroller"
      :class="scrollerClass"
      data-spatial-nav-scroll="center"
    >
      <template
        v-for="(item, index) in items"
        :key="itemKey(item, index)"
      >
        <slot
          name="item"
          :item="item"
          :index="index"
          :item-attrs="ITEM_ATTRS"
        />
      </template>
    </div>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, reactive, useTemplateRef, watch } from 'vue'

import { useSpatialZone } from '../../composables/useSpatialZone'
import { centeredScrollTop, navState, scrollToCenterAnimated } from '../../helpers/spatialNav/NavManager'

/*
  A vertical list for the remote (spatial nav), as in the side nav: the
  focused entry goes to the middle of the list, and the focus highlight, an
  element of its own, is placed where that entry comes to rest. From one
  entry to the next that place is the same, so the highlight holds still
  while the entries scroll under it; it only moves near the first and last
  entries, where the list has no further to scroll.

  The consumer renders the entries (slot `item`) and binds `itemAttrs` on
  each one the focus stops on; anything else (dividers) is skipped. It
  styles the scroller and the highlight through `scrollerClass` and
  `highlightClass`, with `:deep()`.
*/

/** Marks an entry the focus stops on */
const ITEM_ATTRIBUTE = 'data-tv-scroll-item'
const ITEM_ATTRS = { [ITEM_ATTRIBUTE]: '' }

const props = defineProps({
  zoneId: {
    type: String,
    required: true
  },
  items: {
    type: Array,
    required: true
  },
  /** (item, index) => key */
  itemKey: {
    type: Function,
    default: (_item, index) => index
  },
  /** Which zone each direction leaves to, see useSpatialZone */
  edges: {
    type: Object,
    default: () => ({})
  },
  /** Persistent UI beside the page, see NavManager */
  isChrome: {
    type: Boolean,
    default: false
  },
  /** Takes the remote's focus as soon as it is there, on the entry of `landOn` */
  activateOnMount: {
    type: Boolean,
    default: false
  },
  scrollerClass: {
    type: [String, Array, Object],
    default: null
  },
  highlightClass: {
    type: [String, Array, Object],
    default: null
  },
  /** () => Element[]: controls before the list (e.g. a button over it), a row each */
  leadingCells: {
    type: Function,
    default: () => []
  },
  /** () => Element | null: the entry the focus lands on when it comes back */
  landOn: {
    type: Function,
    default: () => null
  }
})

const emit = defineEmits(['select'])

const scroller = useTemplateRef('scroller')

/** One row per control and entry: never grouped by where they are on screen,
    as entries scroll up under the controls over the list */
function grid() {
  const entries = [...(scroller.value?.querySelectorAll(`:scope > [${ITEM_ATTRIBUTE}]`) ?? [])]
    .filter(entry => entry.checkVisibility())

  return [...props.leadingCells(), ...entries].map(cell => [cell])
}

/**
 * The next time the focus comes in, it lands on the entry of `landOn`, the
 * list scrolled to it already, so it is in its place
 */
function landOnEntry() {
  const entry = props.landOn()
  const row = entry ? grid().findIndex(([cell]) => cell === entry) : -1
  if (row === -1) { return }

  navState.lastPosition.set(props.zoneId, { row, col: 0 })
  scrollToCenterAnimated(scroller.value, entry)
}

// Before the zone's own mounted hook, which activates it with `activateOnMount`
onMounted(landOnEntry)

const { isActive, focusedPosition, activate } = useSpatialZone(props.zoneId, grid, {
  isChrome: props.isChrome,
  active: props.activateOnMount,
  edges: props.edges,
  onSelect: (position, cell) => {
    const index = cell?.hasAttribute(ITEM_ATTRIBUTE)
      ? [...scroller.value.children].indexOf(cell)
      : -1

    emit('select', cell, props.items[index])
  },
})

/** @returns {Element | null} the focused cell, when it is an entry of the list */
function focusedEntry() {
  const position = focusedPosition.value
  const cell = position ? grid()[position.row]?.[0] : null
  return cell?.hasAttribute(ITEM_ATTRIBUTE) ? cell : null
}

// Where the focused entry comes to rest. It slides there from one entry to
// the next only: when the focus comes back to the list, it shows up on its
// entry, not on its way from the last one.
const highlight = reactive({ shown: false, sliding: false, visual: false, top: 0, height: 0 })

function updateHighlight() {
  const entry = focusedEntry()

  highlight.sliding = highlight.shown && entry != null
  highlight.shown = entry != null
  if (entry == null) { return }

  highlight.visual = entry.hasAttribute('data-spatial-nav-visual')
  // Rounded like the scroll position the list ends up at
  highlight.top = scroller.value.offsetTop + entry.offsetTop - Math.round(centeredScrollTop(scroller.value, entry))
  highlight.height = entry.offsetHeight
}

watch(focusedPosition, updateHighlight, { flush: 'post' })

// A resize moves the middle: the list follows at once, with the highlight
function onResize() {
  const entry = focusedEntry()

  if (entry != null) {
    scroller.value.scrollTop = centeredScrollTop(scroller.value, entry)
  }

  updateHighlight()
}

/** Lines up for the next time the focus comes in, see `landOnEntry` */
function syncPosition() {
  if (!isActive.value) {
    landOnEntry()
  }
}

watch(isActive, (active) => {
  if (!active) {
    syncPosition()
  }
})

onMounted(() => {
  window.addEventListener('resize', onResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
})

defineExpose({ isActive, focusedPosition, syncPosition, activate })
</script>

<style scoped src="./TvScrollList.css" />
