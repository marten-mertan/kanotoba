<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'

const $style = useCssModule()

const props = withDefaults(defineProps<{
  tag?: string | Component
  to?: RouteLocationRaw
}>(), {
  tag: 'div',
})

const nuxtLinkComponent = resolveComponent('NuxtLink')

const component = computed(() => {
  return props.to ? nuxtLinkComponent : props.tag
})

const classList = computed(() => {
  return {
    [$style.link]: Boolean(props.to),
  }
})
</script>

<template>
  <component
    :is="component"
    v-bind="props.to ? { to: props.to } : {}"
    :class="[$style.UiCard, classList]"
  >
    <slot />
  </component>
</template>

<style lang="scss" module>
.UiCard {
  background-color: $bg-tertiary;
  border: .1rem solid $border;
  border-radius: .8rem;
}

.link {
  cursor: pointer;
  transform: translateY(0);
  transition: background-color $default-transition, transform $default-transition;

  &:hover {
    background-color: $bg-secondary;
    border-color: $border-hover;
    transform: translateY(-.2rem);
  }

  &:focus-visible {
    outline: .2rem solid currentColor;
    outline-offset: .3rem;
  }
}
</style>
