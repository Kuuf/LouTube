<template>
  <FtAutoGrid
    class="skeletonList"
    :grid="displayValue !== 'list'"
    :columns="columns"
    aria-busy="true"
  >
    <!-- Not data-spatial-nav-item: the remote never stops on a skeleton, and
         the pages waiting for their first list item keep waiting -->
    <div
      v-for="index in count"
      :key="index"
      class="item"
      :class="[type, displayValue === 'list' ? 'list' : 'grid']"
      data-skeleton
      aria-hidden="true"
    >
      <template v-if="type === 'channel'">
        <div class="skeleton skeletonRound avatar" />
        <div class="info">
          <div class="skeleton skeletonText name" />
          <div class="skeleton skeletonText meta" />
          <div class="skeleton skeletonSmall button" />
        </div>
      </template>
      <template v-else-if="type === 'comment'">
        <div class="skeleton skeletonRound avatar" />
        <div class="info">
          <div class="skeleton skeletonText name" />
          <div class="skeleton skeletonText" />
          <div class="skeleton skeletonText short" />
        </div>
      </template>
      <template v-else-if="type === 'post'">
        <div class="author">
          <div class="skeleton skeletonRound avatar" />
          <div class="skeleton skeletonText name" />
        </div>
        <div class="skeleton skeletonText" />
        <div class="skeleton skeletonText" />
        <div class="skeleton skeletonText short" />
        <div class="skeleton postImage" />
      </template>
      <template v-else>
        <div class="skeleton thumbnail" />
        <div class="info">
          <div class="skeleton skeletonText title" />
          <div class="skeleton skeletonText title short" />
          <div class="skeleton skeletonText meta" />
        </div>
      </template>
    </div>
  </FtAutoGrid>
</template>

<script setup>
import { computed } from 'vue'

import FtAutoGrid from '../FtAutoGrid/FtAutoGrid.vue'

import store from '../../store/index'

const props = defineProps({
  /** What the list will hold: 'video' and 'playlist' look the same */
  type: {
    type: String,
    default: 'video',
    validator: value => ['video', 'playlist', 'channel', 'post', 'comment'].includes(value)
  },
  count: {
    type: Number,
    default: 12
  },
  /** 'grid' or 'list', or '' (default) for the list type setting */
  display: {
    type: String,
    default: ''
  },
  /** Fixed column count in grid mode, like FtElementList */
  columns: {
    type: Number,
    default: null
  }
})

/** @type {import('vue').ComputedRef<'grid' | 'list'>} */
const displayValue = computed(() => {
  if (props.type === 'post' || props.type === 'comment') {
    return 'list'
  }

  return props.display === '' ? store.getters.getListType : props.display
})
</script>

<style scoped src="./FtSkeletonList.css" />
