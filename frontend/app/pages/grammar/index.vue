<script setup lang="ts">
import { useGrammarStore } from '~/stores/grammar'

const grammarStore = useGrammarStore()

useSeoMeta({
  title: 'Kanotoba / Grammar',
  description: 'Explore Japanese grammar patterns, learn what they mean, and see how they are used.',
})

onMounted(() => {
  void grammarStore.fetchAll()
})
</script>

<template>
  <main :class="[$style.GrammarPage, 'container']">
    <header :class="$style.header">
      <h1 :class="$style.title">
        Japanese Grammar
      </h1>

      <p :class="$style.description">
        This section covers Japanese grammar patterns, from basic verb forms to expressions used in everyday conversation. Each entry explains what a pattern means, how it is formed, and how it is used in a sentence.
      </p>
    </header>

    <section :class="$style.catalog">
      <div :class="$style.resultsHeader">
        <h2 :class="$style.resultsTitle">
          Grammar patterns
        </h2>

        <UiTag
          v-if="grammarStore.items.length"
          size="small"
        >
          {{ grammarStore.items.length }}
        </UiTag>
      </div>

      <LayoutLoader
        :status="grammarStore.status"
        error-message="An error occurred while loading grammar."
        :is-empty="grammarStore.items.length === 0"
        empty-message="No grammar patterns found."
      >
        <div
          v-if="grammarStore.items.length"
          :class="$style.grid"
        >
          <GrammarCard
            v-for="item in grammarStore.items"
            :key="item.id"
            :item="item"
          />
        </div>
      </LayoutLoader>
    </section>
  </main>
</template>

<style lang="scss" module>
.GrammarPage {
  padding-top: 5rem;
  padding-bottom: 5rem;

  @include respond-to(tablet) {
    padding-top: 4rem;
    padding-bottom: 4rem;
  }

  @include respond-to(mobile) {
    padding-top: 3rem;
    padding-bottom: 3rem;
  }
}

.header {
  padding-bottom: 4rem;
  border-bottom: .1rem solid $border;

  @include respond-to(mobile) {
    padding-bottom: 2.4rem;
  }
}

.title {
  font-size: 3.2rem;
  font-weight: 700;
  line-height: 1.2;

  @include respond-to(mobile) {
    font-size: 2.6rem;
  }
}

.description {
  max-width: 94rem;
  margin-top: 1.6rem;
  font-size: 1.6rem;
  line-height: 1.7;

  @include respond-to(mobile) {
    font-size: 1.5rem;
  }
}

.catalog {
  padding-top: 3.2rem;

  @include respond-to(mobile) {
    padding-top: 2.4rem;
  }
}

.resultsHeader {
  display: flex;
  align-items: center;
  gap: .8rem;
  margin-bottom: 1.6rem;
}

.resultsTitle {
  font-size: 2rem;
  font-weight: 700;
  line-height: 1.3;
  text-transform: uppercase;
}

.grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1.6rem;

  @include respond-to(mobile) {
    grid-template-columns: 1fr;
    gap: 1.2rem;
  }
}
</style>
