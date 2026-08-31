<script setup>
import { cn } from '@/lib/utils';
import { SelectScrollUpButton as RekaScrollUpButton } from 'reka-ui';
const props = defineProps({ class: { type: String, default: '' } });
</script>

<template>
  <RekaScrollUpButton :class="cn('flex cursor-default items-center justify-center py-1', props.class)">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-4 w-4">
      <path d="m18 15-6-6-6 6" />
    </svg>
  </RekaScrollUpButton>
</template>