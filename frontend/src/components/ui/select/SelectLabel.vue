<script setup>
import { cn } from '@/lib/utils';
import { SelectLabel as RekaSelectLabel } from 'reka-ui';
const props = defineProps({ class: { type: String, default: '' } });
</script>

<template>
  <RekaSelectLabel :class="cn('px-2 py-1.5 text-sm font-semibold', props.class)">
    <slot />
  </RekaSelectLabel>
</template>