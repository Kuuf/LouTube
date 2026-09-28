<template>
  <div>
    <FtCard
      ref="card"
      class="card"
    >
      <h2>
        <FontAwesomeIcon
          :icon="['fas', 'tv']"
          class="headingIcon"
        />
        {{ $t("TV.TV") }}
      </h2>
      <FtSkeletonList
        v-if="isLoading"
        display="grid"
        :columns="3"
        :count="9"
      />
      <FtElementList
        v-else
        :data="shownResults"
        display="grid"
        :columns="3"
      />
    </FtCard>
  </div>
</template>

<script setup>
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { computed, nextTick, onMounted, ref, shallowRef, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'

import FtCard from '../../components/ft-card/ft-card.vue'
import FtElementList from '../../components/FtElementList/FtElementList.vue'
import FtSkeletonList from '../../components/FtSkeletonList/FtSkeletonList.vue'

import store from '../../store/index'

import { copyToClipboard, showToast } from '../../helpers/utils'
import { getLocalTrending } from '../../helpers/api/local'
import { getInvidiousPopularFeed } from '../../helpers/api/invidious'
import { useSpatialZone } from '../../composables/useSpatialZone'
import { gridFromElements, ITEM_ATTRIBUTE } from '../../helpers/spatialNav/NavManager'

const { t } = useI18n()

/** @type {import('vue').ComputedRef<'local' | 'invidious'>} */
const backendPreference = computed(() => store.getters.getBackendPreference)

/** @type {import('vue').ComputedRef<boolean>} */
const backendFallback = computed(() => store.getters.getBackendFallback)

/** @type {import('vue').ComputedRef<string>} */
const region = computed(() => store.getters.getRegion.toUpperCase())

const isLoading = ref(true)
const shownResults = shallowRef([])
const card = useTemplateRef('card')

// Arrow-key navigation over the rendered video grid (hidden videos render no
// element, so they are skipped). Pressing Left in the first column exits to
// the side nav; this zone remembers its spot (via `lastPosition`) for when
// focus comes back.
const { isActive, activate } = useSpatialZone('tv-video-grid', () => gridFromElements(card.value?.$el.querySelectorAll(`[${ITEM_ATTRIBUTE}]`) ?? []), {
  active: true,
  edges: {
    left: 'sidebar',
  },
})

onMounted(async () => {
  if (process.env.SUPPORTS_LOCAL_API && (backendFallback.value || backendPreference.value === 'local')) {
    await getTrendingLocal()
  } else {
    await getTrendingInvidious()
  }

  isLoading.value = false

  // Focus the (restored) position now that the videos are rendered
  await nextTick()
  if (isActive.value) {
    activate()
  }
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
