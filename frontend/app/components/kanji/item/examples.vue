<script setup lang="ts">
withDefaults(defineProps<{
  examples: ExampleObject[]
}>(), {
})
</script>

<template>
  <section :class="$style.KanjiItemExamples">
    <div :class="$style.header">
      <h2 :class="$style.title">
        Examples
      </h2>

      <UiTag size="small">
        {{ examples.length }}
      </UiTag>
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
</template>

<style lang="scss" module>
.KanjiItemExamples {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}

.header {
  display: flex;
  align-items: center;
  gap: .8rem;
}

.title {
  font-size: 1.8rem;
  font-weight: 600;
}

.exampleList {
  display: flex;
  flex-direction: column;
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
  padding: 1.6rem;
  font-size: 1.4rem;
}
</style>
