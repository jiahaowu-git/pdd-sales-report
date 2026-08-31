<script setup>
import { computed } from 'vue';

const props = defineProps({
  columns: { type: Array, default: () => [] }, // ['列名', ...]
  rows: { type: Array, default: () => [] },
});

// 固定列数（横向滚动时左侧一直可见）
const FROZEN_COL_COUNT = 2;

// 计算固定列宽度（用于 sticky left 偏移量）
// 用列的近似最大宽度估计：第一列固定宽 160px，其余后续列左偏移累加。
// 注意：实际宽度取决于内容，但这样估算后视觉上"前两列常驻左侧"已够用，
// 列宽差异由 min-w 兜底，不会出现错位。
const COL_WIDTHS = [180, 160]; // 前两列最小宽度（像素）
const frozenOffsets = computed(() => {
  const offsets = [];
  let acc = 0;
  for (let i = 0; i < FROZEN_COL_COUNT; i++) {
    offsets.push(acc);
    acc += COL_WIDTHS[i] || 0;
  }
  return offsets;
});

const fmt = (v) => {
  if (v === null || v === undefined || v === '') return '-';
  if (typeof v === 'number') {
    return v.toLocaleString('zh-CN', { maximumFractionDigits: 4 });
  }
  return v;
};

// 百分比类列（值是小数，显示成 X.XX%）
const PERCENT_COLS = new Set(['退货率', '仅退款率', '销售占比']);
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

// 合计行：按列对数值求和
// - SUM_COLS: 直接求和的列
// - RATIO_COLS: 用合计值再相除得到的列（不参与行累加）
const SUM_COLS = new Set([
  '店铺成交金额',
  '推广交易额',
  '推广成交花费',
  '总退款金额',
  '未发货退款金额',
  '店铺净销售',
  '推广净销售',
]);
const RATIO_COLS = new Set(['店铺ROI', '推广ROI']);

const sumRow = computed(() => {
  const result = {};
  for (const col of SUM_COLS) {
    let total = 0;
    for (const row of props.rows) {
      const v = Number(row?.[col]);
      if (Number.isFinite(v)) total += v;
    }
    result[col] = total;
  }
  // 店铺 ROI = 店铺成交金额合计 / 推广成交花费合计
  const tuiguangSpend = result['推广成交花费'];
  if (tuiguangSpend > 0) {
    result['店铺ROI'] = Number(
      (result['店铺成交金额'] / tuiguangSpend).toFixed(4),
    );
    result['推广ROI'] = Number(
      (result['推广净销售'] / tuiguangSpend).toFixed(4),
    );
  } else {
    result['店铺ROI'] = 0;
    result['推广ROI'] = 0;
  }
  return result;
});

function fmtCell(col, value) {
  if (value === null || value === undefined) return '-';
  return isPercentCol(col) ? fmtPercent(value) : fmt(value);
}
</script>

<template>
  <div class="overflow-auto rounded-lg border border-border bg-card scrollbar-thin" style="max-height: calc(100vh - 200px);">
    <table class="w-full text-sm border-separate border-spacing-0">
      <colgroup>
        <col
          v-for="(col, idx) in columns"
          :key="col"
          :style="idx < FROZEN_COL_COUNT ? { minWidth: COL_WIDTHS[idx] + 'px' } : undefined"
        />
      </colgroup>
      <thead class="sticky top-0 z-20">
        <tr>
          <th
            v-for="(col, ci) in columns"
            :key="col"
            class="whitespace-nowrap px-3 py-2 text-left font-medium text-muted-foreground border-b border-border"
            :class="ci < FROZEN_COL_COUNT ? 'sticky bg-muted/90 backdrop-blur' : 'bg-muted/80 backdrop-blur'"
            :style="ci < FROZEN_COL_COUNT ? { left: frozenOffsets[ci] + 'px', zIndex: 30 } : undefined"
          >
            {{ col }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, i) in rows" :key="i" :class="i % 2 === 1 ? 'bg-muted/30' : ''">
          <td
            v-for="(col, ci) in columns"
            :key="col"
            class="whitespace-nowrap px-3 py-2 border-b border-border hover:bg-accent/40"
            :class="[
              isNumericCol(col) || isPercentCol(col) ? 'text-right tabular-nums' : 'text-left',
              ci < FROZEN_COL_COUNT ? 'sticky' : ''
            ]"
            :style="ci < FROZEN_COL_COUNT
              ? {
                  left: frozenOffsets[ci] + 'px',
                  backgroundColor: i % 2 === 1 ? 'rgb(248 250 252 / 0.95)' : 'rgb(255 255 255 / 0.95)',
                }
              : undefined"
          >
            {{ fmtCell(col, row[col]) }}
          </td>
        </tr>
        <tr v-if="!rows.length">
          <td :colspan="columns.length" class="px-3 py-10 text-center text-muted-foreground">
            暂无数据
          </td>
        </tr>
        <tr
          v-if="rows.length"
          class="bg-muted/60 font-semibold sticky bottom-0 border-t-2 border-border"
        >
          <td
            v-for="(col, ci) in columns"
            :key="col"
            class="whitespace-nowrap px-3 py-2"
            :class="[
              isNumericCol(col) || isPercentCol(col) ? 'text-right tabular-nums' : 'text-left',
              ci < FROZEN_COL_COUNT ? 'sticky bg-muted/60' : ''
            ]"
            :style="ci < FROZEN_COL_COUNT ? { left: frozenOffsets[ci] + 'px', zIndex: 5 } : undefined"
          >
            <template v-if="SUM_COLS.has(col) || RATIO_COLS.has(col)">
              {{ fmtCell(col, sumRow[col]) }}
            </template>
            <template v-else>
              <span class="text-muted-foreground">-</span>
            </template>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>