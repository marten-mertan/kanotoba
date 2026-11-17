<script setup lang="ts">
import { useGrammarStore } from '~/stores/grammar'

useSeoMeta({
  title: 'Kanotoba / Grammar',
})

const grammarStore = useGrammarStore()

onMounted(() => {
  void grammarStore.fetchAll()
})
</script>

<template>
  <section :class="[$style.ContentPage, 'container']">
    <h1 class="h1">
      Grammar
    </h1>

    <LayoutLoader
      :status="grammarStore.status"
      loading-message="Loading grammar…"
      error-message="An error occurred while loading grammar."
      :is-empty="grammarStore.items.length === 0"
      empty-message="No grammar rules found."
    >
      <p class="text">
        Loaded records: {{ grammarStore.items.length }}.
      </p>
    </LayoutLoader>
  </section>
</template>

<style lang="scss" module>
.ContentPage {
  padding-top: 5rem;
  padding-bottom: 5rem;
}
</style>
