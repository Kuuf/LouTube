<template>
  <div>
    <div class="searchBar">
      <FtInput
        ref="searchInput"
        :placeholder="t('Search Bar.Search')"
        :value="query"
        :action-button-label="t('Search Bar.Search')"
        is-search
        show-clear-text-button
        @click="search"
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

import FtInput from '../../components/FtInput/FtInput.vue'
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
// Enter on the search bar focuses the real input, which opens the on-screen
// keyboard on Android TV.
// The focus outline goes on the input component itself, hugging the bar
const searchBarZone = useSpatialZone('tv-search-bar', () => (searchInput.value?.$el ? [[searchInput.value.$el]] : []), {
  edges: {
    left: 'sidebar',
    // Only when there are results to go to
    down: () => (results.value?.querySelector(`[${ITEM_ATTRIBUTE}]`) ? 'tv-search-results' : null),
  },
  onSelect: () => searchInput.value?.focus(),
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

  // Coming back from a video lands on the results, a fresh visit on the bar
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
