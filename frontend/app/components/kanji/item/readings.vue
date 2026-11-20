<script setup lang="ts">
const props = withDefaults(defineProps<{
  readings: KanjiItemReadingsData
}>(), {
})

const kunyomi = computed(() =>
  (props.readings.kunyomi ?? [])
    .map(reading => reading.kana?.trim())
    .filter((reading): reading is string => Boolean(reading)),
)

const onyomi = computed(() =>
  (props.readings.onyomi ?? [])
    .map(reading => reading.kana?.trim())
    .filter((reading): reading is string => Boolean(reading)),
)
</script>

<template>
  <section
    v-if="kunyomi.length || onyomi.length"
    :class="$style.KanjiItemReadings"
  >
    <h2 :class="$style.title">
      Readings
    </h2>

    <div :class="$style.readings">
      <UiCard
        v-if="kunyomi.length"
        :class="$style.readingCard"
      >
        <span :class="$style.readingLabel">
          Kunyomi
        </span>

        <div :class="$style.tags">
          <UiTag
            v-for="reading in kunyomi"
            :key="reading"
          >
            {{ reading }}
          </UiTag>
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
          <UiTag
            v-for="reading in onyomi"
            :key="reading"
          >
            {{ reading }}
          </UiTag>
        </div>
      </UiCard>
    </div>
  </section>
</template>

<style lang="scss" module>
.KanjiItemReadings {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}

.title {
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
</style>
