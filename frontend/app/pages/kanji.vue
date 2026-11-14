<script setup lang="ts">
import { useContentStore } from '~/stores/content'

useSeoMeta({
  title: 'Kanji — Kanotoba',
})

const contentStore = useContentStore()
</script>

<template>
  <section :class="[$style.ContentPage, 'container']">
    <h1 class="h1">
      Kanji
    </h1>

    <p
      v-if="!contentStore.kanjiLoaded"
      class="text"
    >
      Data not yet loaded from API.
    </p>

    <p
      v-else-if="contentStore.kanji.length === 0"
      class="text"
    >
      Kanji not found.
    </p>

    <p
      v-else
      class="text"
    >
      Data loaded from API: {{ contentStore.kanji.length }} items.
    </p>
  </section>
</template>

<style lang="scss" module>
.ContentPage {
  padding-top: 5rem;
  padding-bottom: 5rem;
}
</style>
