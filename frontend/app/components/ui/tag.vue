<script setup lang="ts">
const $style = useCssModule()

const props = withDefaults(defineProps<{
  size?: 'medium' | 'small'
}>(), {
  size: 'medium',
})

const classList = computed(() => {
  return [
    $style[`_${props.size}`],
  ]
})
</script>

<template>
  <div :class="[$style.UiTag, classList]">
    <slot />
  </div>
</template>

<style lang="scss" module>
.UiTag {
  border: .1rem solid $border;
  border-radius: .6rem;

  &._medium {
    padding: .6rem 1rem;
    font-size: 1.6rem;
  }

  &._small {
    padding: .4rem .8rem;
    font-size: 1.4rem;
  }
}
</style>
