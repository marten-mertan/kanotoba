<script setup lang="ts">
const props = withDefaults(defineProps<{
  item: GrammarItemData
}>(), {
})

const readingLabel = computed(() => {
  let readingLabel = ''

  if (props.item.reading && props.item.reading !== props.item.pattern) {
    readingLabel += props.item.reading
  }

  if (props.item.romaji) {
    if (readingLabel) {
      readingLabel += ' ・ '
    }

    readingLabel += props.item.romaji
  }

  return readingLabel
})
</script>

<template>
  <UiCard :class="$style.GrammarCard">
    <div :class="$style.header">
      <div :class="$style.patternInfo">
        <h2
          :class="$style.pattern"
          lang="ja"
        >
          {{ item.pattern }}
        </h2>

        <span
          v-if="readingLabel"
          :class="$style.reading"
        >
          {{ readingLabel }}
        </span>
      </div>

      <UiTag size="small">
        {{ item.jlptLevel }}
      </UiTag>
    </div>

    <div :class="$style.content">
      <p :class="$style.meaning">
        {{ item.meaningEn }}
      </p>

      <p :class="$style.explanation">
        {{ item.explanationEn }}
      </p>
    </div>

    <div :class="$style.metadata">
      <span :class="$style.register">
        {{ item.registerLabelEn }}
      </span>

      <span :class="$style.category">
        {{ item.category.nameEn }}
      </span>
    </div>

    <div
      v-if="item.tagLabels.length"
      :class="$style.tags"
    >
      <UiTag
        v-for="tag in item.tagLabels"
        :key="tag.slug"
        size="small"
      >
        {{ tag.label_en }}
      </UiTag>
    </div>
  </UiCard>
</template>

<style lang="scss" module>
.GrammarCard {
  display: flex;
  flex-direction: column;
  gap: 1.6rem;
  min-width: 0;
  height: 100%;
  padding: 2rem;
}

.header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1.6rem;
}

.patternInfo {
  display: flex;
  flex-direction: column;
  gap: .8rem;
  min-width: 0;
}

.pattern {
  font-size: 2.8rem;
  font-weight: 600;
  line-height: 1.3;
  overflow-wrap: anywhere;

  @include respond-to(mobile) {
    font-size: 2.4rem;
  }
}

.reading {
  font-size: 1.4rem;
}

.content {
  display: flex;
  flex-direction: column;
  gap: .8rem;
}

.meaning {
  font-size: 1.6rem;
  font-weight: 600;
  line-height: 1.5;
}

.explanation {
  font-size: 1.4rem;
  line-height: 1.6;
}

.metadata {
  display: flex;
  flex-direction: column;
  gap: .6rem;
  margin-top: auto;
  padding-top: 1.2rem;
  border-top: .1rem solid $border;
}

.register {
  font-size: 1.3rem;
  font-weight: 600;
}

.category {
  font-size: 1.3rem;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: .6rem;
}
</style>
