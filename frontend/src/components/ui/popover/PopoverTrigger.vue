<script setup>
import { PopoverTrigger as RekaPopoverTrigger } from 'reka-ui';
const props = defineProps({ asChild: { type: Boolean, default: false } });
</script>

<template>
  <RekaPopoverTrigger :as-child="props.asChild">
    <slot />
  </RekaPopoverTrigger>
</template>