<script setup lang="ts">
</script>

<template>
  <section :class="$style.HomeIntro">
    <div :class="$style.content">
      <h1 :class="$style.title">
        What is Kanotoba?
      </h1>

      <div :class="$style.text">
        <p>
          Kanotoba is a project for learning Japanese.
          It brings together information about kanji and grammar
          in one place.
        </p>

        <p>
          You can look up Japanese characters, check their readings
          and meanings, and study common grammar patterns.
        </p>
      </div>

      <div :class="$style.actions">
        <UiButton
          to="/kanji/"
        >
          Browse kanji
        </UiButton>

        <UiButton
          type="secondary"
          to="/grammar/"
        >
          Browse grammar
        </UiButton>
      </div>
    </div>

    <div
      :class="$style.artwork"
      aria-hidden="true"
    >
      <span :class="$style.artworkLabel">
        KANOTOBA
      </span>

      <span
        :class="$style.artworkCharacter"
        lang="ja"
      >
        言
      </span>

      <span :class="$style.artworkCaption">
        Japanese language
      </span>
    </div>
  </section>
</template>

<style lang="scss" module>
.HomeIntro {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 40rem;
  align-items: center;
  gap: 4rem;
  padding-bottom: 5rem;

  @include respond-to(tablet) {
    grid-template-columns: minmax(0, 1fr) 28rem;
    gap: 2.4rem;
    padding-bottom: 4rem;
  }

  @include respond-to(mobile) {
    grid-template-columns: 1fr;
    gap: 3rem;
    padding-bottom: 3rem;
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

.content {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
}

.text {
  margin-top: 3rem;

  @include respond-to(mobile) {
    margin-top: 2.4rem;
  }

  p {
    margin-top: 1.5rem;
    font-size: 2rem;
    line-height: 1.5;

    @include respond-to(tablet) {
      font-size: 1.6rem;
    }

    &:first-child {
      margin-top: 0;
    }
  }
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-top: 2.4rem;

  @include respond-to(mobile) {
    margin-top: 2rem;
  }
}

.artwork {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  max-width: 42rem;
  aspect-ratio: 1 / 1;
  justify-self: end;
  padding: 2rem;
  border: .1rem solid $border;
  border-radius: .8rem;
  background-color: $bg-tertiary;

  @include respond-to(mobile) {
    max-width: 32rem;
    justify-self: center;
  }
}

.artworkLabel,
.artworkCaption {
  font-size: 1.2rem;
  letter-spacing: .08em;
  text-transform: uppercase;
}

.artworkCharacter {
  font-size: 16rem;
  font-weight: 500;
  line-height: 1;

  @include respond-to(tablet) {
    font-size: 12rem;
  }

  @include respond-to(mobile) {
    font-size: 14rem;
  }
}
</style>
