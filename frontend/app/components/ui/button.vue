<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'

const $style = useCssModule()

const props = withDefaults(defineProps<{
  tag?: string | Component
  type?: 'primary' | 'secondary' | 'danger'
  to?: RouteLocationRaw
}>(), {
  tag: 'button',
  type: 'primary',
})

const nuxtLinkComponent = resolveComponent('NuxtLink')

const component = computed(() => {
  return props.to ? nuxtLinkComponent : props.tag
})

const classList = computed(() => $style[`_${props.type}`])
</script>

<template>
  <component
    :is="component"
    v-bind="props.to ? { to: props.to } : {}"
    :class="[$style.UiButton, classList]"
  >
    <slot />
  </component>
</template>

<style lang="scss" module>
.UiButton {
  font-size: 1.4rem;
  font-weight: 600;
  line-height: 1.5;
  padding: 1rem 1.6rem;
  cursor: pointer;
  border: .1rem solid $border;
  border-radius: .6rem;
  transition: color $default-transition, background-color $default-transition, border-color $default-transition;

  &:focus-visible {
    outline: .2rem solid currentColor;
    outline-offset: .3rem;
  }

  &._primary {
      background: $bg-tertiary;
      color: $text-primary;
  }
  &._primary:hover {
      border-color: $text-primary;
      background: $bg-tertiary;
  }

  &._secondary {
      background: transparent;
      border: 1px solid $border;
      color: $text-primary;
  }
  &._secondary:hover {
      border-color: $text-primary;
      background: $bg-tertiary;
  }

  &._danger {
      background: $danger;
      color: white;

    &:focus-visible {
      outline-color: $danger;
    }
  }
  &._danger:hover {
      background: $danger-hover;
  }
}
</style>
