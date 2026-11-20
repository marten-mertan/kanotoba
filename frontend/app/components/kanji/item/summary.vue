<script setup lang="ts">
withDefaults(defineProps<{
  item: KanjiItemData
}>(), {
})
</script>

<template>
  <UiCard :class="$style.KanjiItemSummary">
    <h1
      :class="$style.character"
      lang="ja"
    >
      {{ item.character }}
    </h1>

    <div :class="$style.meaning">
      <span :class="$style.eyebrow">
        Meaning
      </span>

      <span :class="$style.meaningText">
        {{ item.meaningEn || 'Meaning not available' }}
      </span>

      <div :class="$style.metadata">
        <UiTag
          :class="$style.metadataItem"
          size="small"
        >
          <span :class="$style.metadataLabel">
            Grade
          </span>

          <span :class="$style.metadataValue">
            {{ item.schoolGrade ?? '—' }}
          </span>
        </UiTag>
      </div>
    </div>

    <div :class="$style.strokeCard">
      <span :class="$style.strokeNumber">
        {{ item.strokeCount ?? '—' }}
      </span>

      <span :class="$style.strokeLabel">
        Strokes
      </span>
    </div>
  </UiCard>
</template>

<style lang="scss" module>
.KanjiItemSummary {
  display: grid;
  grid-template-columns: 12rem minmax(0, 1fr) 8rem;
  align-items: center;
  gap: 2.4rem;
  padding: 2.4rem;

  @include respond-to(mobile) {
    grid-template-columns: 7rem minmax(0, 1fr);
    gap: 1.6rem;
    padding: 1.6rem;
  }
}

.character {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 12rem;
  min-height: 12rem;
  margin: 0;
  border-right: .1rem solid $border;
  font-size: 8rem;
  font-weight: 700;
  line-height: 1;

  @include respond-to(mobile) {
    grid-row: 1 / span 2;
    width: 7rem;
    min-height: 9rem;
    font-size: 5.6rem;
  }
}

.meaning {
  min-width: 0;
}

.eyebrow {
  display: block;
  margin-bottom: .8rem;
  font-size: 1.2rem;
  font-weight: 600;
  letter-spacing: .04em;
  text-transform: uppercase;
}

.meaningText {
  font-size: 2.4rem;
  font-weight: 600;
  line-height: 1.3;

  @include respond-to(mobile) {
    font-size: 2rem;
  }
}

.metadata {
  display: flex;
  flex-wrap: wrap;
  gap: .8rem;
  margin-top: 1.6rem;
}

.metadataItem {
  display: flex;
  align-items: center;
  gap: .6rem;
}

.metadataLabel {
  //
}

.metadataValue {
  font-weight: 600;
}

.strokeCard {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 8rem;
  min-height: 8rem;
  padding: 1rem;
  border: .1rem solid $border;
  border-radius: .8rem;

  @include respond-to(mobile) {
    grid-column: 2;
    flex-direction: row;
    justify-self: start;
    align-items: baseline;
    min-width: 0;
    min-height: auto;
    padding: .6rem 1rem;
    gap: .4rem;
  }
}

.strokeNumber {
  font-size: 3.2rem;
  font-weight: 700;
  line-height: 1;

  @include respond-to(mobile) {
    font-size: 2rem;
  }
}

.strokeLabel {
  margin-top: .6rem;
  font-size: 1.2rem;

  @include respond-to(mobile) {
    margin-top: 0;
  }
}
</style>
