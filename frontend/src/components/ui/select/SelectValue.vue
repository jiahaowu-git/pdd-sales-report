<script setup>
import { SelectValue as RekaSelectValue } from 'reka-ui';
const props = defineProps({
  placeholder: { type: String, default: '' },
});
</script>

<template>
  <RekaSelectValue :placeholder="props.placeholder">
    <slot />
  </RekaSelectValue>
</template>