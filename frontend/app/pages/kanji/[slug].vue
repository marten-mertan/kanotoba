<script setup lang="ts">
import { useKanjiItemStore } from '~/stores/kanjiItem'

const kanjiItemStore = useKanjiItemStore()
const route = useRoute()

useSeoMeta({
  title: 'Kanotoba / Kanji / ' + route.params.slug,
})

onMounted(() => {
  const slug = Array.isArray(route.params.slug)
    ? route.params.slug[0]
    : route.params.slug

  if (slug) {
    void kanjiItemStore.fetchItem(slug)
  }
})
</script>

<template>
  <section :class="[$style.ContentPage, 'container']">
    <h1 class="h1">
      {{ route.params.slug }}
    </h1>

    <LayoutLoader
      :status="kanjiItemStore.status"
      error-message="An error occurred while loading kanji."
      :is-empty="!kanjiItemStore.item"
      empty-message="No kanji found."
    >
      <div :class="$style.content">
        <div :class="$style.info">
          <span>{{ kanjiItemStore.item?.strokeCount }}</span> strokes
        </div>
        <div
          v-if="kanjiItemStore.item?.readings.kunyomi"
          :class="$style.info"
        >
          Kun: <span>{{ kanjiItemStore.item?.readings.kunyomi[0]?.kana || 'N/A' }}</span>
        </div>
        <div
          v-if="kanjiItemStore.item?.readings.onyomi"
          :class="$style.info"
        >
          On: <span>{{ kanjiItemStore.item?.readings.onyomi[0]?.kana || 'N/A' }}</span>
        </div>
        <div :class="$style.info">
          Grade: <span>{{ kanjiItemStore.item?.schoolGrade || 'N/A' }}</span>
        </div>
        <div :class="$style.info">
          Meaning: <span>{{ kanjiItemStore.item?.meaningEn || 'N/A' }}</span>
        </div>
        <div :class="$style.info">
          Examples:
        </div>
        <div
          v-for="(example) in kanjiItemStore.item?.examples"
          :key="example.order"
        >
          {{ `${example.word}${example.meaningEn}` }}
        </div>
      </div>
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

.info {
  margin-top: .8rem;
}
</style>
