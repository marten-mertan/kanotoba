<script setup lang="ts">
import { useKanjiStore } from '~/stores/kanji'

useSeoMeta({
  title: 'Kanotoba / Kanji',
})

const kanjiStore = useKanjiStore()

onMounted(() => {
  void kanjiStore.fetchAll()
})
</script>

<template>
  <section :class="[$style.ContentPage, 'container']">
    <h1 class="h1">
      Kanji
    </h1>

    <p
      v-if="kanjiStore.status === 'idle' || kanjiStore.status === 'loading'"
      class="text"
      role="status"
    >
      Loading kanji…
    </p>

    <div v-else-if="kanjiStore.status === 'error'">
      <p
        class="text"
        role="alert"
      >
        {{ kanjiStore.error }}
      </p>
      <button
        type="button"
        @click="kanjiStore.fetchAll(true)"
      >
        Retry
      </button>
    </div>

    <p
      v-else-if="kanjiStore.items.length === 0"
      class="text"
    >
      No kanji found.
    </p>

    <p
      v-else
      class="text"
    >
      Loaded records: {{ kanjiStore.items.length }}.
    </p>
  </section>
</template>

<style lang="scss" module>
.ContentPage {
  padding-top: 5rem;
  padding-bottom: 5rem;
}
</style>
