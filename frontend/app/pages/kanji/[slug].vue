<script setup lang="ts">
import { useKanjiItemStore } from '~/stores/kanjiItem'

const kanjiItemStore = useKanjiItemStore()
const route = useRoute()

useSeoMeta({
  title: 'Kanotoba / Kanji / ' + route.params.slug,
})

const slug = computed(() => {
  const value = route.params.slug

  return Array.isArray(value) ? value[0] : value
})

function loadKanji() {
  if (!slug.value) return

  void kanjiItemStore.fetchItem(slug.value)
}

onMounted(() => {
  loadKanji()
})

watch(slug, () => {
  loadKanji()
})
</script>

<template>
  <section :class="[$style.ContentPage, 'container']">
    <LayoutLoader
      :status="kanjiItemStore.status"
      error-message="An error occurred while loading kanji."
      :is-empty="!kanjiItemStore.item"
      empty-message="No kanji found."
    >
      <KanjiItem
        v-if="kanjiItemStore.item"
        :item="kanjiItemStore.item"
      />
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
</style>
