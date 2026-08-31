<script setup>
import { computed } from 'vue';
import { formatCurrency, formatNumber } from '@/lib/utils';

const props = defineProps({
  cards: { type: Object, default: () => ({}) },
});

const items = computed(() => [
  { key: '店铺成交金额',     ...formatCurrency(props.cards['店铺成交金额']),   accent: false },
  { key: '推广交易额',       ...formatCurrency(props.cards['推广交易额']),     accent: false },
  { key: '成交花费',         ...formatCurrency(props.cards['成交花费']),       accent: false },
  { key: '整体推广 ROI',     value: formatNumber(props.cards['整体推广 ROI'], 2), accent: true },
  { key: '总退款金额',       ...formatCurrency(props.cards['总退款金额']),     accent: false },
  { key: '未发货退款金额',   ...formatCurrency(props.cards['未发货退款金额']), accent: false },
]);
</script>

<template>
  <div class="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
    <div
      v-for="it in items"
      :key="it.key"
      class="flex flex-col justify-between rounded-lg border border-border bg-card p-4 shadow-sm min-h-[96px]"
    >
      <div class="text-sm text-muted-foreground leading-none">
        <span>{{ it.key }}</span>
        <span v-if="it.symbol" class="ml-1">{{ it.symbol }}</span>
      </div>
      <div
        class="mt-3 text-xl font-semibold"
        :class="it.accent ? 'text-blue-600' : 'text-foreground'"
      >
        <span v-if="it.num">{{ it.num }}</span>
        <span v-else>{{ it.value }}</span>
      </div>
    </div>
  </div>
</template>