<script setup lang="ts">
useSeoMeta({
  title: 'Kanotoba / Japanese Learning',
  description: 'Learn Japanese kanji and grammar with explanations and examples.',
})
</script>

<template>
  <main :class="[$style.HomePage, 'container']">
    <HomeIntro />

    <HomeLearning />

    <HomeContact />
  </main>
</template>

<style lang="scss" module>
.HomePage {
  padding-top: 5rem;
  padding-bottom: 5rem;

  @include respond-to(tablet) {
    padding-top: 4rem;
    padding-bottom: 4rem;
  }

  @include respond-to(mobile) {
    padding-top: 3rem;
    padding-bottom: 3rem;
  }
}
</style>
