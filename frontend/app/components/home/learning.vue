<script setup lang="ts">
</script>

<template>
  <section :class="$style.HomeLearning">
    <div :class="$style.header">
      <h2 :class="$style.title">
        What can you find here?
      </h2>

      <p>
        Kanotoba has two main sections: Kanji and Grammar.
        Each covers a different part of the Japanese language.
      </p>
    </div>

    <div :class="$style.grid">
      <UiCard
        to="/kanji/"
        :class="$style.card"
      >
        <div :class="$style.cardHeader">
          <span
            :class="$style.cardJapanese"
            lang="ja"
          >
            漢字
          </span>

          <span
            :class="$style.cardArrow"
            aria-hidden="true"
          >
            ↗
          </span>
        </div>

        <div>
          <h3 :class="$style.cardTitle">
            Kanji
          </h3>

          <p :class="$style.cardDescription">
            Look up Japanese characters, learn their meanings
            and readings, and see examples of words that
            contain them.
          </p>
        </div>
      </UiCard>

      <UiCard
        to="/grammar/"
        :class="$style.card"
      >
        <div :class="$style.cardHeader">
          <span
            :class="$style.cardJapanese"
            lang="ja"
          >
            文法
          </span>

          <span
            :class="$style.cardArrow"
            aria-hidden="true"
          >
            ↗
          </span>
        </div>

        <div>
          <h3 :class="$style.cardTitle">
            Grammar
          </h3>

          <p :class="$style.cardDescription">
            Browse common Japanese grammar patterns and learn
            how they are formed and used in sentences.
          </p>
        </div>
      </UiCard>
    </div>
  </section>
</template>

<style lang="scss" module>
.HomeLearning {
  padding-top: 5rem;
  padding-bottom: 5rem;
  border-top: .1rem solid $border;

  @include respond-to(tablet) {
    padding-top: 4rem;
    padding-bottom: 4rem;
  }

  @include respond-to(mobile) {
    padding-top: 3rem;
    padding-bottom: 3rem;
  }
}

.header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 3rem;

  @include respond-to(tablet) {
    flex-direction: column;
    gap: 1.6rem;
  }

  p {
    max-width: 48rem;
    margin: 0;
    font-size: 1.6rem;
    line-height: 1.6;
  }
}

.title {
  font-size: 2rem;
  font-weight: 700;
  line-height: 1.3;
  text-transform: uppercase;

  @include respond-to(mobile) {
    font-size: 1.8rem;
  }
}

.grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1.6rem;
  margin-top: 2.8rem;

  @include respond-to(mobile) {
    grid-template-columns: 1fr;
    gap: 1.2rem;
    margin-top: 2rem;
  }
}

.card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-width: 0;
  min-height: 25rem;
  padding: 2.4rem;

  @include respond-to(mobile) {
    min-height: 22rem;
    padding: 1.8rem;
  }
}

.cardHeader {
  display: flex;
  justify-content: space-between;
}

.cardJapanese {
  font-size: 4rem;
  line-height: 1;
}

.cardArrow {
  font-size: 2rem;
}

.cardTitle {
  margin-top: 2.4rem;
  font-size: 2.4rem;
  font-weight: 600;

  @include respond-to(mobile) {
    margin-top: 1.8rem;
  }
}

.cardDescription {
  max-width: 48rem;
  margin-top: 1rem;
  font-size: 1.6rem;
}
</style>
