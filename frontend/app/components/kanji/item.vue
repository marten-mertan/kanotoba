<script setup lang="ts">
const props = withDefaults(defineProps<{
  item: KanjiItemData
}>(), {
})

const kunyomi = computed(() =>
  (props.item.readings?.kunyomi ?? [])
    .map(reading => reading.kana?.trim())
    .filter((reading): reading is string => Boolean(reading)),
)

const onyomi = computed(() =>
  (props.item.readings?.onyomi ?? [])
    .map(reading => reading.kana?.trim())
    .filter((reading): reading is string => Boolean(reading)),
)

const examples = computed(() =>
  [...(props.item.examples ?? [])].sort((a, b) => a.order - b.order),
)
</script>

<template>
  <article :class="$style.KanjiContent">
    <UiCard :class="$style.summary">
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

        <h2 :class="$style.meaningText">
          {{ item.meaningEn || 'Meaning not available' }}
        </h2>

        <div :class="$style.metadata">
          <div :class="$style.metadataItem">
            <span :class="$style.metadataLabel">
              Grade
            </span>

            <span :class="$style.metadataValue">
              {{ item.schoolGrade ?? '—' }}
            </span>
          </div>
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

    <section
      v-if="kunyomi.length || onyomi.length"
      :class="$style.section"
    >
      <h3 :class="$style.sectionTitle">
        Readings
      </h3>

      <div :class="$style.readings">
        <UiCard
          v-if="kunyomi.length"
          :class="$style.readingCard"
        >
          <span :class="$style.readingLabel">
            Kunyomi
          </span>

          <div :class="$style.tags">
            <span
              v-for="reading in kunyomi"
              :key="reading"
              :class="$style.tag"
            >
              {{ reading }}
            </span>
          </div>
        </UiCard>

        <UiCard
          v-if="onyomi.length"
          :class="$style.readingCard"
        >
          <span :class="$style.readingLabel">
            Onyomi
          </span>

          <div :class="$style.tags">
            <span
              v-for="reading in onyomi"
              :key="reading"
              :class="$style.tag"
            >
              {{ reading }}
            </span>
          </div>
        </UiCard>
      </div>
    </section>

    <section :class="$style.section">
      <div :class="$style.sectionHeader">
        <h3 :class="$style.sectionTitle">
          Examples
        </h3>

        <span :class="$style.exampleCount">
          {{ examples.length }}
        </span>
      </div>

      <ul
        v-if="examples.length"
        :class="$style.exampleList"
      >
        <li
          v-for="example in examples"
          :key="example.order"
          :class="$style.example"
        >
          <span
            :class="$style.exampleWord"
            lang="ja"
          >
            {{ example.word }}
          </span>

          <span :class="$style.exampleMeaning">
            {{ example.meaningEn || 'Translation unavailable' }}
          </span>
        </li>
      </ul>

      <UiCard
        v-else
        :class="$style.emptyExamples"
      >
        No examples available yet.
      </UiCard>
    </section>
  </article>
</template>

<style lang="scss" module>
.KanjiContent {
  display: flex;
  flex-direction: column;
  gap: 2.4rem;
  width: 100%;
}

.summary {
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
  margin: 0;
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
  padding: .6rem 1rem;
  border: .1rem solid $border;
  border-radius: .6rem;
}

.metadataLabel {
  font-size: 1.3rem;
}

.metadataValue {
  font-size: 1.4rem;
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

.section {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}

.sectionHeader {
  display: flex;
  align-items: center;
  gap: .8rem;
}

.sectionTitle {
  font-size: 1.8rem;
  font-weight: 600;
}

.readings {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1.2rem;

  @include respond-to(mobile) {
    grid-template-columns: 1fr;
  }
}

.readingCard {
  min-width: 0;
  padding: 1.6rem;
}

.readingLabel {
  display: block;
  font-size: 1.4rem;
  font-weight: 600;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  margin-top: 1rem;
  gap: .8rem;
}

.tag {
  padding: .6rem 1rem;
  border: .1rem solid $border;
  border-radius: .6rem;
  font-size: 1.6rem;
}

.exampleCount {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 2.4rem;
  height: 2.4rem;
  padding: 0 .6rem;
  border: .1rem solid $border;
  border-radius: .6rem;
  font-size: 1.2rem;
}

.exampleList {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
}

.example {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.6rem;
  padding: 1.2rem 0;
  border-bottom: .1rem solid $border;

  &:first-child {
    border-top: .1rem solid $border;
  }

  @include respond-to(mobile) {
    align-items: flex-start;
    flex-direction: column;
    gap: .4rem;
  }
}

.exampleWord {
  font-size: 1.8rem;
  font-weight: 600;
}

.exampleMeaning {
  font-size: 1.4rem;
  text-align: right;

  @include respond-to(mobile) {
    text-align: left;
  }
}

.emptyExamples {
  margin: 0;
  padding: 1.6rem;
  font-size: 1.4rem;
}
</style>
