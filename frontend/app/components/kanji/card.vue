<script setup lang="ts">
const props = withDefaults(defineProps<{
  card?: KanjiData
}>(), {
})

const meaningSingle = computed(() => {
  if (!props.card?.meaningEn) return ''

  const meanings = props.card.meaningEn.split(',')
  return meanings[0]?.trim() ?? ''
})
</script>

<template>
  <div :class="$style.KanjiCard">
    <div
      v-if="props.card?.character"
      :class="$style.character"
    >
      {{ props.card.character }}
    </div>
    <div
      v-if="meaningSingle"
      :class="$style.meaning"
    >
      {{ meaningSingle }}
    </div>
  </div>
</template>

<style lang="scss" module>
  .KanjiCard {
    display: flex;
    flex: 0 0 auto;
    flex-direction: column;
    align-items: center;
    padding: 4rem 1.6rem 1.6rem;
    width: 100%;
    min-width: 0;
    height: 14.4rem;
    background-color: $bg-tertiary;
    border: .1rem solid $border;
    border-radius: .8rem;
  }

  .character {
    font-size: 3.2rem;
    font-weight: 700;
    line-height: 1;
  }

  .meaning {
    font-size: 1.6rem;
    line-height: 1.4;
    margin-top: 1.2rem;
    text-align: center;

    @include respond-to(tablet) {
      font-size: 1.4rem;
    }
  }
</style>
