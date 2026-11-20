<script setup lang="ts">
const props = withDefaults(defineProps<{
  item: KanjiItemData
}>(), {
})

const examples = computed(() =>
  [...(props.item.examples ?? [])].sort((a, b) => a.order - b.order),
)
</script>

<template>
  <article :class="$style.KanjiContent">
    <KanjiItemSummary
      :item="props.item"
    />

    <KanjiItemReadings
      v-if="props.item.readings"
      :readings="props.item.readings"
    />

    <KanjiItemExamples
      v-if="examples.length"
      :examples="examples"
    />
  </article>
</template>

<style lang="scss" module>
.KanjiContent {
  display: flex;
  flex-direction: column;
  gap: 2.4rem;
  width: 100%;
}
</style>
