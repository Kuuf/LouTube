<template>
  <div>
    <div class="searchBar">
      <FtSearchInput
        ref="searchInput"
        :placeholder="t('Search Bar.Search')"
        :value="typedText"
        @input="handleInput"
        @search="search"
      />
    </div>
    <div ref="results">
      <SearchPage v-if="query !== ''" />
    </div>
    <!-- Nothing searched yet: the mascot and an invitation under the bar -->
    <div
      v-if="query === ''"
      class="emptySearch"
    >
      <img
        class="mascot"
        src="../../assets/img/search_mascot.png"
        alt=""
      >
      <p class="emptySearchText">
        {{ t('Search Bar.Search for anything') }}
      </p>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'

import FtSearchInput from '../../components/FtSearchInput/FtSearchInput.vue'
import SearchPage from '../SearchPage/SearchPage.vue'

import { useSpatialZone } from '../../composables/useSpatialZone'
import { gridFromElements, ITEM_ATTRIBUTE } from '../../helpers/spatialNav/NavManager'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

const searchInput = useTemplateRef('searchInput')
const results = useTemplateRef('results')

/** @type {import('vue').ComputedRef<string>} */
const query = computed(() => route.params.query ?? '')

// What is in the field, which can be ahead of the searched query: the search
// follows the typing after a pause, with the focus staying in the field.
// Enter searches right away and moves on to the results.
const AUTO_SEARCH_DELAY_MS = 2000

const typedText = ref(query.value)
let autoSearchTimeout = 0

// Another query from elsewhere (going back, a link): shown in the field,
// unless it is what was typed (the query is the trimmed text)
watch(query, (newQuery) => {
  if (typedText.value.trim() !== newQuery) {
    typedText.value = newQuery
  }
})

/**
 * @param {string} text
 */
function handleInput(text) {
  typedText.value = text

  clearTimeout(autoSearchTimeout)
  autoSearchTimeout = setTimeout(autoSearch, AUTO_SEARCH_DELAY_MS)
}

/** Searches for what is typed, without leaving the field. Nothing typed: back to no search. */
function autoSearch() {
  const trimmedText = typedText.value.trim()
  if (trimmedText === query.value) { return }

  // Replacing: one history entry for the search page, not one per pause
  router.replace(trimmedText === ''
    ? { name: 'tvSearch' }
    : { name: 'tvSearch', params: { query: trimmedText } })
}

// Two spatial-nav zones: the search bar on top, the results grid below it.
// The bar's cell is its text field, which is ready to type into as soon as
// it has the focus (opens the on-screen keyboard on Android TV).
function searchBarGrid() {
  const field = searchInput.value?.$el.querySelector('input')
  return field ? [[field]] : []
}

const searchBarZone = useSpatialZone('tv-search-bar', searchBarGrid, {
  edges: {
    left: 'sidebar',
    // Only when there are results to go to
    down: () => (results.value?.querySelector(`[${ITEM_ATTRIBUTE}]`) ? 'tv-search-results' : null),
  },
})

const resultsZone = useSpatialZone('tv-search-results', () => gridFromElements(results.value?.querySelectorAll(`[${ITEM_ATTRIBUTE}]`) ?? []), {
  edges: {
    left: 'sidebar',
    up: 'tv-search-bar',
  },
})

// Results render asynchronously inside SearchPage, so when the results zone
// is activated before they exist, focus the first cell once they appear.
let awaitingResults = false

const resultsObserver = new MutationObserver(() => {
  if (!awaitingResults || !resultsZone.isActive.value) { return }

  if (results.value?.querySelector(`[${ITEM_ATTRIBUTE}]`)) {
    awaitingResults = false
    resultsZone.activate()
  }
})

function focusResults({ resetPosition = false } = {}) {
  awaitingResults = true
  resultsZone.activate({ resetPosition })
}

onMounted(() => {
  resultsObserver.observe(results.value, { childList: true, subtree: true })

  // Coming back from a video lands on the results. A fresh visit focuses the
  // input itself, ready to type (opens the on-screen keyboard on Android TV).
  if (query.value !== '') {
    focusResults()
  } else {
    searchBarZone.activate()
  }
})

onBeforeUnmount(() => {
  resultsObserver.disconnect()
  clearTimeout(autoSearchTimeout)
})

/**
 * @param {string} newQuery
 */
async function search(newQuery) {
  const trimmedQuery = newQuery.trim()
  if (trimmedQuery === '') { return }

  clearTimeout(autoSearchTimeout)
  searchInput.value?.blur()
  await router.push({ name: 'tvSearch', params: { query: trimmedQuery } })
  await nextTick()
  focusResults({ resetPosition: true })
}
</script>

<style scoped src="./TVSearch.css" />
