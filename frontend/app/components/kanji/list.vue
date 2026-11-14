<script setup lang="ts">
const props = withDefaults(defineProps<{
  status?: Status
  cards?: KanjiData[]
}>(), {
  status: 'loading',
})
</script>

<template>
  <div :class="$style.KanjiList">
    <KanjiCard
      v-for="card in props.cards"
      :key="card.character"
      :card="card"
    />
  </div>
</template>

<style lang="scss" module>
  .KanjiList {
    display: grid;
    grid-template-columns: repeat(8, 1fr);
    gap: 2.4rem;

    @include respond-to(tablet) {
      grid-template-columns: repeat(4, 1fr);
      gap: 1.6rem;
    }

    @include respond-to(mobile) {
      grid-template-columns: repeat(2, 1fr);
      gap: 1.2rem;
    }
  }
</style>
