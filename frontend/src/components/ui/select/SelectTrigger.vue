<script setup>
import { cn } from '@/lib/utils';
import { SelectTrigger as RekaSelectTrigger } from 'reka-ui';

const props = defineProps({
  class: { type: String, default: '' },
  size: { type: String, default: 'default' }, // sm | default
  disabled: { type: Boolean, default: false },
});
</script>

<template>
  <RekaSelectTrigger
    :class="cn(
      'flex w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent shadow-sm ring-offset-background data-[placeholder]:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1',
      props.size === 'sm' ? 'h-8 px-3 text-xs' : 'h-9 px-3 py-2 text-sm',
      props.class,
    )"
  >
    <slot />
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-4 w-4 opacity-50">
      <path d="M8 9l4-4 4 4M16 15l-4 4-4-4" />
    </svg>
  </RekaSelectTrigger>
</template>