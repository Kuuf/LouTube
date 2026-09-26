<template>
  <div>
    <FtLoader
      v-if="isLoading"
      :fullscreen="true"
    />
    <FtCard
      v-else
      class="card"
    >
      <h2>
        <FontAwesomeIcon
          :icon="['fas', 'tv']"
          class="headingIcon"
        />
        {{ $t("TV.TV") }}
      </h2>
      <FtElementList
        ref="elementList"
        :data="shownResults"
        display="grid"
        :columns="COLUMNS"
        :focused-index="focusedIndex"
      />
    </FtCard>
  </div>
</template>

<script setup>
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { computed, onMounted, ref, shallowRef, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'

import FtCard from '../../components/ft-card/ft-card.vue'
import FtLoader from '../../components/FtLoader/FtLoader.vue'
import FtElementList from '../../components/FtElementList/FtElementList.vue'

import store from '../../store/index'

import { copyToClipboard, showToast } from '../../helpers/utils'
import { getLocalTrending } from '../../helpers/api/local'
import { getInvidiousPopularFeed } from '../../helpers/api/invidious'
import { useSpatialZone } from '../../composables/useSpatialZone'

const { t } = useI18n()

/** @type {import('vue').ComputedRef<'local' | 'invidious'>} */
const backendPreference = computed(() => store.getters.getBackendPreference)

/** @type {import('vue').ComputedRef<boolean>} */
const backendFallback = computed(() => store.getters.getBackendFallback)

/** @type {import('vue').ComputedRef<string>} */
const region = computed(() => store.getters.getRegion.toUpperCase())

const isLoading = ref(true)
const shownResults = shallowRef([])
const elementList = useTemplateRef('elementList')

const COLUMNS = 3

// Arrow-key navigation grid matching the rendered COLUMNS-wide video grid.
// Built from rendered items only: videos hidden by preferences render no
// element, and the visual grid reflows around them, so they must not take a
// cell either. Cells are the elements, so NavManager scrolls the focused one
// into view.
// Pressing Left in the first column exits to the side nav, which remembers
// this spot and restores it (via `lastPosition`) on the way back.
function renderedItems() {
  const items = []

  for (let index = 0; index < shownResults.value.length; index++) {
    const element = elementList.value?.getItemElement(index)
    if (element) {
      items.push({ index, element })
    }
  }

  return items
}

function videoGrid() {
  const elements = renderedItems().map(item => item.element)
  const rows = []

  for (let start = 0; start < elements.length; start += COLUMNS) {
    rows.push(elements.slice(start, start + COLUMNS))
  }

  return rows
}

const { focusedPosition } = useSpatialZone('tv-video-grid', videoGrid, {
  active: true,
  edges: {
    left: { id: 'sidebar', resetPosition: true },
  },
})

// Index in `shownResults` of the focused cell.
const focusedIndex = computed(() => {
  const pos = focusedPosition.value
  if (!pos) { return -1 }

  return renderedItems()[pos.row * COLUMNS + pos.col]?.index ?? -1
})

onMounted(async () => {
  if (process.env.SUPPORTS_LOCAL_API && (backendFallback.value || backendPreference.value === 'local')) {
    await getTrendingLocal()
  } else {
    await getTrendingInvidious()
  }

  isLoading.value = false
})

// YouTube no longer has a general trending page, only these categories
const TRENDING_TABS = ['gaming', 'sports', 'podcasts']

async function getTrendingLocal() {
  const settled = await Promise.allSettled(TRENDING_TABS.map((tab) => getLocalTrending(region.value, tab)))

  const seenVideoIds = new Set()
  const videos = []

  for (const result of settled) {
    if (result.status === 'rejected') {
      showLocalError(result.reason)
      continue
    }

    for (const video of result.value) {
      if (seenVideoIds.has(video.videoId)) { continue }

      seenVideoIds.add(video.videoId)
      videos.push(video)
    }
  }

  shownResults.value = videos
}

async function getTrendingInvidious() {
  try {
    shownResults.value = await getInvidiousPopularFeed()
  } catch (error) {
    console.error(error)
    const errorMessage = t('Invidious API Error (Click to copy)')
    showToast(`${errorMessage}: ${error}`, 10000, () => {
      copyToClipboard(error)
    })
  }
}

function showLocalError(error) {
  console.error(error)
  const errorMessage = t('Local API Error (Click to copy)')
  showToast(`${errorMessage}: ${error}`, 10000, () => {
    copyToClipboard(error)
  })
}
</script>

<style scoped src="./TV.css" />
