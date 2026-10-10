<template>
  <div>
    <div class="searchBar">
      <FtSearchInput
        ref="searchInput"
        :placeholder="t('Search Bar.Search')"
        :value="query"
        @search="search"
      />
    </div>
    <div ref="results">
      <SearchPage v-if="query !== ''" />
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, useTemplateRef } from 'vue'
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
})

/**
 * @param {string} newQuery
 */
async function search(newQuery) {
  const trimmedQuery = newQuery.trim()
  if (trimmedQuery === '') { return }

  searchInput.value?.blur()
  await router.push({ name: 'tvSearch', params: { query: trimmedQuery } })
  await nextTick()
  focusResults({ resetPosition: true })
}
</script>

<style scoped src="./TVSearch.css" />
