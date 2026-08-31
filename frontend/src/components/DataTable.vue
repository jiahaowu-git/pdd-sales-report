<script setup>
import { computed } from 'vue';

const props = defineProps({
  columns: { type: Array, default: () => [] }, // ['列名', ...]
  rows: { type: Array, default: () => [] },
});

const fmt = (v) => {
  if (v === null || v === undefined || v === '') return '-';
  if (typeof v === 'number') {
    return v.toLocaleString('zh-CN', { maximumFractionDigits: 4 });
  }
  return v;
};

// 百分比类列（值是小数，显示成 X.XX%）
const PERCENT_COLS = new Set(['退款率', '仅退款率', '销售占比']);
const isPercentCol = (col) => PERCENT_COLS.has(col);
const fmtPercent = (v) => {
  if (v === null || v === undefined || v === '') return '-';
  const n = Number(v);
  if (Number.isNaN(n)) return v;
  return (n * 100).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + '%';
};

const isNumericCol = (col) => {
  // 简单推断：列名含金额/花费/交易额/退款/ROI/花费/数量 等
  return /(金额|花费|交易额|退款|ROI|数量|单价|销量)/.test(col);
};
</script>

<template>
  <div class="overflow-auto rounded-lg border border-border bg-card scrollbar-thin" style="max-height: calc(100vh - 200px);">
    <table class="w-full text-sm">
      <thead class="sticky top-0 z-10 bg-muted/80 backdrop-blur">
        <tr>
          <th
            v-for="col in columns"
            :key="col"
            class="whitespace-nowrap px-3 py-2 text-left font-medium text-muted-foreground border-b border-border"
          >
            {{ col }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, i) in rows" :key="i" class="even:bg-muted/30 hover:bg-accent/40">
          <td
            v-for="col in columns"
            :key="col"
            class="whitespace-nowrap px-3 py-2 border-b border-border"
            :class="isNumericCol(col) || isPercentCol(col) ? 'text-right tabular-nums' : 'text-left'"
          >
            {{ isPercentCol(col) ? fmtPercent(row[col]) : fmt(row[col]) }}
          </td>
        </tr>
        <tr v-if="!rows.length">
          <td :colspan="columns.length" class="px-3 py-10 text-center text-muted-foreground">
            暂无数据
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>