<script setup lang="ts">
import { useContentStore } from '~/stores/content'

useSeoMeta({
  title: 'Grammar — Kanotoba',
})

const contentStore = useContentStore()
</script>

<template>
  <section :class="[$style.ContentPage, 'container']">
    <h1 class="h1">
      Grammar
    </h1>

    <p
      v-if="!contentStore.grammarLoaded"
      class="text"
    >
      Data not yet loaded from API.
    </p>

    <p
      v-else-if="contentStore.grammar.length === 0"
      class="text"
    >
      Grammar constructions not found.
    </p>

    <p
      v-else
      class="text"
    >
      Data loaded from API: {{ contentStore.grammar.length }} items.
    </p>
  </section>
</template>

<style lang="scss" module>
.ContentPage {
  padding-top: 5rem;
  padding-bottom: 5rem;
}
</style>
