<script setup>
import { SelectRoot } from 'reka-ui';

const props = defineProps({
  modelValue: { type: [String, Number, Array, null], default: undefined },
  defaultValue: { type: [String, Number, Array, null], default: undefined },
  multiple: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
});
defineEmits(['update:modelValue', 'update:open']);
</script>

<template>
  <SelectRoot
    :model-value="props.modelValue"
    :default-value="props.defaultValue"
    :multiple="props.multiple"
    :disabled="props.disabled"
    @update:model-value="(v) => $emit('update:modelValue', v)"
    @update:open="(v) => $emit('update:open', v)"
  >
    <slot />
  </SelectRoot>
</template>