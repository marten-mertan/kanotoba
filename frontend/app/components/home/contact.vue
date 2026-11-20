<script setup lang="ts">
</script>

<template>
  <section :class="$style.HomeContact">
    <h2 :class="$style.title">
      Contact
    </h2>

    <div :class="$style.content">
      <p>
        Found a bug or have a suggestion?
        Feel free to get in touch.
      </p>

      <div :class="$style.links">
        <a
          href="https://github.com/marten-mertan"
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub <span>@marten-mertan</span>
        </a>

        <a
          href="https://x.com/Marten_Mertan"
          target="_blank"
          rel="noopener noreferrer"
        >
          X <span>@Marten_Mertan</span>
        </a>
      </div>
    </div>
  </section>
</template>

<style lang="scss" module>
.HomeContact {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  padding-top: 5rem;
  border-top: .1rem solid $border;

  @include respond-to(tablet) {
    padding-top: 4rem;
  }

  @include respond-to(mobile) {
    gap: 1.6rem;
    padding-top: 3rem;
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
  align-items: flex-start;
  justify-content: space-between;
  gap: 2rem;

  @include respond-to(mobile) {
    flex-direction: column;
    gap: 1.6rem;
  }

  p {
    margin: 0;
    font-size: 1.6rem;
    line-height: 1.6;
  }
}

.links {
  display: flex;
  flex-wrap: wrap;
  gap: 2rem;

  a {
    font-size: 1.4rem;
    text-decoration: underline;
    text-underline-offset: .3rem;

    &:focus-visible {
      outline: .2rem solid currentColor;
      outline-offset: .3rem;
    }

    span {
      font-weight: 600;
    }
  }
}
</style>
