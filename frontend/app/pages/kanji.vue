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

    <KanjiList
      :class="$style.list"
      :status="kanjiStore.status"
      :cards="kanjiStore.items"
    />

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

  @include respond-to(tablet) {
    padding-top: 4rem;
    padding-bottom: 4rem;
  }

  @include respond-to(mobile) {
    padding-top: 2.4rem;
    padding-bottom: 2.4rem;
  }
}

.list {
  margin-top: 4rem;

  @include respond-to(tablet) {
    margin-top: 2.4rem;
  }

  @include respond-to(mobile) {
    margin-top: 1.6rem;
  }
}
</style>
