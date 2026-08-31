<script setup>
import { cn } from '@/lib/utils';
import { Primitive } from 'reka-ui';
import { useAttrs } from 'vue';
import { buttonVariants } from '.';

defineOptions({ inheritAttrs: false });

const props = defineProps({
  as: { type: String, default: 'button' },
  variant: { type: String, default: 'default' },
  size: { type: String, default: 'default' },
  class: { type: String, default: '' },
  type: { type: String, default: 'button' },
  disabled: { type: Boolean, default: false },
});

const attrs = useAttrs();
</script>

<template>
  <Primitive
    :as="props.as"
    :type="props.as === 'button' ? props.type : undefined"
    :disabled="props.disabled"
    v-bind="attrs"
    :class="cn(buttonVariants({ variant: props.variant, size: props.size }), props.class)"
  >
    <slot />
  </Primitive>
</template>