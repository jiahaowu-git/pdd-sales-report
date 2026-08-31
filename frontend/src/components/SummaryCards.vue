<script setup>
import { computed } from 'vue';
import { formatCurrency, formatNumber } from '@/lib/utils';

const props = defineProps({
  cards: { type: Object, default: () => ({}) },
});

// 把 0~1 的小数转成 "12.34%"，保留两位小数
function formatPercent(n) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return '-';
  return (Number(n) * 100).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + '%';
}

const items = computed(() => [
  // 第 1 行：金额类
  { key: '店铺成交金额',     ...formatCurrency(props.cards['店铺成交金额']),   accent: false },
  { key: '推广交易额',       ...formatCurrency(props.cards['推广交易额']),     accent: false },
  { key: '推广成交花费',     ...formatCurrency(props.cards['推广成交花费'] ?? props.cards['成交花费']), accent: false },
  { key: '总退款金额',       ...formatCurrency(props.cards['总退款金额']),     accent: false },
  { key: '未发货退款金额',   ...formatCurrency(props.cards['未发货退款金额']), accent: false },
  { key: '店铺净销售',       ...formatCurrency(props.cards['店铺净销售']),     accent: false },
  // 第 2 行：派生指标（金额 / 比值 / 百分比）
  { key: '推广净销售',       ...formatCurrency(props.cards['推广净销售']),     accent: false },
  { key: '店铺ROI',          value: formatNumber(props.cards['店铺ROI'], 2),   accent: true },
  { key: '推广ROI',          value: formatNumber(props.cards['推广ROI'], 2),   accent: true },
  { key: '退款率',           value: formatPercent(props.cards['退款率']),       accent: true, suffix: '' },
  { key: '仅退款率',         value: formatPercent(props.cards['仅退款率']),     accent: true, suffix: '' },
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