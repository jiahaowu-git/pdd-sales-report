<script setup>
import { PopoverRoot } from 'reka-ui';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  defaultOpen: { type: Boolean, default: false },
});
defineEmits(['update:modelValue']);
</script>

<template>
  <PopoverRoot
    :open="props.modelValue"
    :default-open="props.defaultOpen"
    @update:open="(v) => $emit('update:modelValue', v)"
  >
    <slot />
  </PopoverRoot>
</template>