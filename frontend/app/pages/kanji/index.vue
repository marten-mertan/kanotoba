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

    <LayoutLoader
      :status="kanjiStore.status"
      error-message="An error occurred while loading kanji."
      :is-empty="kanjiStore.items.length === 0"
      empty-message="No kanji found."
    >
      <KanjiList
        :class="$style.list"
        :status="kanjiStore.status"
        :cards="kanjiStore.items"
      />
      Loaded records: {{ kanjiStore.items.length }}.
    </LayoutLoader>
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
