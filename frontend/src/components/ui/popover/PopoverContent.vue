<script setup>
import { cn } from '@/lib/utils';
import {
  PopoverContent as RekaPopoverContent,
  PopoverPortal,
} from 'reka-ui';

const props = defineProps({
  class: { type: String, default: '' },
  align: { type: String, default: 'center' },
  side: { type: String, default: 'bottom' },
  sideOffset: { type: Number, default: 4 },
  alignOffset: { type: Number, default: 0 },
  collisionPadding: { type: Number, default: 0 },
});
</script>

<template>
  <PopoverPortal>
    <RekaPopoverContent
      :align="props.align"
      :side="props.side"
      :side-offset="props.sideOffset"
      :align-offset="props.alignOffset"
      :collision-padding="props.collisionPadding"
      :class="cn(
        'z-50 rounded-md border bg-popover text-popover-foreground shadow-md outline-none',
        'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2',
        props.class,
      )"
    >
      <slot />
    </RekaPopoverContent>
  </PopoverPortal>
</template>