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

    <p
      v-if="grammarStore.status === 'idle' || grammarStore.status === 'loading'"
      class="text"
      role="status"
    >
      Loading grammar…
    </p>

    <div v-else-if="grammarStore.status === 'error'">
      <p
        class="text"
        role="alert"
      >
        {{ grammarStore.error }}
      </p>
      <button
        type="button"
        @click="grammarStore.fetchAll(true)"
      >
        Retry
      </button>
    </div>

    <p
      v-else-if="grammarStore.items.length === 0"
      class="text"
    >
      No grammar rules found.
    </p>

    <p
      v-else
      class="text"
    >
      Loaded records: {{ grammarStore.items.length }}.
    </p>
  </section>
</template>

<style lang="scss" module>
.ContentPage {
  padding-top: 5rem;
  padding-bottom: 5rem;
}
</style>
