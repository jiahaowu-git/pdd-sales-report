<script setup>
import { cn } from '@/lib/utils';

const props = defineProps({
  modelValue: { type: [String, Number, Array], default: '' },
  options: { type: Array, default: () => [] }, // [{ label, value }]
  multiple: { type: Boolean, default: false },
  placeholder: { type: String, default: '请选择' },
  class: { type: String, default: '' },
});
const emit = defineEmits(['update:modelValue']);

function toggle(value) {
  if (!props.multiple) {
    emit('update:modelValue', value);
    return;
  }
  const arr = Array.isArray(props.modelValue) ? [...props.modelValue] : [];
  const idx = arr.indexOf(value);
  if (idx >= 0) arr.splice(idx, 1);
  else arr.push(value);
  emit('update:modelValue', arr);
}
function isActive(value) {
  if (!props.multiple) return props.modelValue === value;
  return Array.isArray(props.modelValue) && props.modelValue.includes(value);
}
</script>

<template>
  <div :class="cn('flex flex-wrap gap-2', props.class)">
    <button
      v-for="opt in options"
      :key="opt.value"
      type="button"
      :class="cn(
        'inline-flex items-center rounded-md border px-3 py-1.5 text-sm transition-colors',
        isActive(opt.value)
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-input bg-background hover:bg-accent hover:text-accent-foreground',
      )"
      @click="toggle(opt.value)"
    >
      {{ opt.label }}
    </button>
  </div>
</template>