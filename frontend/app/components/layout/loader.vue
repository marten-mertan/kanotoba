<script setup lang="ts">
const props = withDefaults(defineProps<{
  status: Status
  loadingMessage?: string
  errorMessage?: string
  isEmpty?: boolean
  emptyMessage?: string
}>(), {
  loadingMessage: 'Loading…',
  errorMessage: 'An error occurred.',
  isEmpty: false,
  emptyMessage: 'No data found.',
})

const showContent = computed(() =>
  props.status === 'success' && !props.isEmpty,
)
</script>

<template>
  <div
    v-if="!showContent"
    :class="$style.Loader"
  >
    <div :class="$style.wrapper">
      <div
        v-if="props.status === 'idle' || props.status === 'loading'"
        :class="$style.animation"
      />

      <p
        v-else-if="props.status === 'error'"
        class="text"
      >
        {{ props.errorMessage }}
      </p>

      <p
        v-else-if="props.isEmpty"
        class="text"
      >
        {{ props.emptyMessage }}
      </p>
    </div>
  </div>

  <slot v-else />
</template>

<style lang="scss" module>
  .Loader {
    position: relative;
  }

  .wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 2rem;
  }

  .animation {
    width: 5.5rem;
    height: 5rem;
    --g1: conic-gradient(from  90deg at left   .2rem top   .2rem,#0000 90deg, #1f2430 0);
    --g2: conic-gradient(from -90deg at bottom .2rem right .2rem,#0000 90deg, #1f2430 0);
    background: var(--g1), var(--g1), var(--g1), var(--g2), var(--g2), var(--g2);
    background-position: left, center, right;
    background-repeat: no-repeat;
    animation: loading 1.2s infinite;
  }

  @keyframes loading {
    0%   {background-size: 1.5rem 50%, 1.5rem 50%, 1.5rem 50%}
    25%  {background-size: 1.5rem 100%, 1.5rem 50%, 1.5rem 50%}
    50%  {background-size: 1.5rem 50%, 1.5rem 100%, 1.5rem 50%}
    75%  {background-size: 1.5rem 50%, 1.5rem 50%, 1.5rem 100%}
    100% {background-size: 1.5rem 50%, 1.5rem 50%, 1.5rem 50%}
  }
</style>
