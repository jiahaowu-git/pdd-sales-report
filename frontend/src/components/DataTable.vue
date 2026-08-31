<script setup>
import { computed, onMounted, onBeforeUnmount, ref } from "vue";

const props = defineProps({
  columns: { type: Array, default: () => [] }, // ['列名', ...]
  rows: { type: Array, default: () => [] },
});

// 滚动容器 ref + 横向是否已滚动（用于显示固定列阴影）
const scrollEl = ref(null);
const hasScroll = ref(false);

function updateScrollState() {
  const el = scrollEl.value;
  if (!el) return;
  hasScroll.value = el.scrollLeft > 0;
}

// 固定列数（横向滚动时左侧一直可见）
const FROZEN_COL_COUNT = 2;

// 计算固定列宽度（用于 sticky left 偏移量）
// 第一列是 ID 类文本（等宽紧凑），第二列是较长的字符串（如"净目标投产比: 3.49"）
const COL_WIDTHS = [130, 160]; // 前两列最小宽度（像素）

// 商品ID 等"标识符"类列：原样显示数字/字符串，不加千分符
const ID_COLS = new Set(["商品ID"]);
const isIdCol = (col) => ID_COLS.has(col);
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
  if (v === null || v === undefined || v === "") return "-";
  if (typeof v === "number") {
    return v.toLocaleString("zh-CN", { maximumFractionDigits: 4 });
  }
  return v;
};

// 标识符类列：原样输出数字/字符串，不加千分符
const fmtId = (v) => {
  if (v === null || v === undefined || v === "") return "-";
  return String(v);
};

// 百分比类列（值是小数，显示成 X.XX%）
const PERCENT_COLS = new Set(["退货率", "仅退款率", "销售占比"]);
const isPercentCol = (col) => PERCENT_COLS.has(col);
const fmtPercent = (v) => {
  if (v === null || v === undefined || v === "") return "-";
  const n = Number(v);
  if (Number.isNaN(n)) return v;
  return (
    (n * 100).toLocaleString("zh-CN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + "%"
  );
};

const isNumericCol = (col) => {
  // 简单推断：列名含金额/花费/交易额/退款/ROI/花费/数量/销售额 等
  return /(金额|花费|交易额|退款|ROI|数量|单价|销量|销售额|利润|成本|佣金|服务费)/.test(
    col,
  );
};

// 合计行：按列对数值求和
// - SUM_COLS: 直接求和的列
// - RATIO_COLS: 用合计值再相除得到的列（不参与行累加）
const SUM_COLS = new Set([
  "店铺成交金额",
  "推广交易额",
  "推广成交花费",
  "总退款金额",
  "未发货退款金额",
  "店铺净销售",
  "推广净销售",
]);
const RATIO_COLS = new Set(["店铺ROI", "推广ROI"]);

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
  const tuiguangSpend = result["推广成交花费"];
  if (tuiguangSpend > 0) {
    result["店铺ROI"] = Number(
      (result["店铺成交金额"] / tuiguangSpend).toFixed(4),
    );
    result["推广ROI"] = Number(
      (result["推广净销售"] / tuiguangSpend).toFixed(4),
    );
  } else {
    result["店铺ROI"] = 0;
    result["推广ROI"] = 0;
  }
  return result;
});

function fmtCell(col, value) {
  if (value === null || value === undefined) return "-";
  if (isIdCol(col)) return fmtId(value);
  return isPercentCol(col) ? fmtPercent(value) : fmt(value);
}

// 组件挂载后初始化滚动状态；卸载时清理
onMounted(() => {
  // 表格内容/容器尺寸变化后，初始 scrollLeft 可能 > 0
  setTimeout(updateScrollState, 0);
});
onBeforeUnmount(() => {
  // 这里如果以后加了 window/resize 监听可在此清理；目前无全局监听
});
</script>

<template>
  <div
    ref="scrollEl"
    class="overflow-auto rounded-lg border border-border bg-card scrollbar-thin"
    style="max-height: calc(100vh - 200px)"
    @scroll="updateScrollState"
  >
    <table class="w-full text-sm border-separate border-spacing-0">
      <colgroup>
        <col
          v-for="(col, idx) in columns"
          :key="col"
          :style="
            idx < FROZEN_COL_COUNT
              ? { minWidth: COL_WIDTHS[idx] + 'px' }
              : undefined
          "
        />
      </colgroup>
      <thead>
        <tr>
          <th
            v-for="(col, ci) in columns"
            :key="col"
            class="whitespace-nowrap text-left font-medium text-muted-foreground border-b border-border"
            :class="
              isIdCol(col) ? 'px-2 py-2 font-mono text-[13px]' : 'px-3 py-2'
            "
            :style="
              ci < FROZEN_COL_COUNT
                ? {
                    position: 'sticky',
                    top: 0,
                    left: frozenOffsets[ci] + 'px',
                    zIndex: 30,
                    backgroundColor: '#f1f5f9',
                    boxShadow:
                      ci === FROZEN_COL_COUNT - 1 && hasScroll
                        ? '4px 0 6px -2px rgba(0,0,0,0.08)'
                        : 'none',
                  }
                : {
                    position: 'sticky',
                    top: 0,
                    backgroundColor: '#f1f5f9',
                  }
            "
          >
            {{ col }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(row, i) in rows"
          :key="i"
          :style="{ backgroundColor: i % 2 === 1 ? '#f1f5f9' : '#ffffff' }"
        >
          <td
            v-for="(col, ci) in columns"
            :key="col"
            class="whitespace-nowrap border-b border-border hover:bg-accent/40"
            :class="
              isIdCol(col)
                ? 'px-2 py-2 text-left font-mono'
                : 'px-3 py-2 ' +
                  (isNumericCol(col) || isPercentCol(col)
                    ? 'text-right tabular-nums'
                    : 'text-left')
            "
            :style="
              ci < FROZEN_COL_COUNT
                ? {
                    position: 'sticky',
                    left: frozenOffsets[ci] + 'px',
                    // 固定列背景：直接写不透明色，不依赖 tr 透色
                    backgroundColor: i % 2 === 1 ? '#f1f5f9' : '#ffffff',
                    zIndex: 2,
                    boxShadow:
                      ci === FROZEN_COL_COUNT - 1 && hasScroll
                        ? '4px 0 6px -2px rgba(0,0,0,0.08)'
                        : 'none',
                  }
                : undefined
            "
          >
            {{ fmtCell(col, row[col]) }}
          </td>
        </tr>
        <tr v-if="!rows.length">
          <td
            :colspan="columns.length"
            class="px-3 py-10 text-center text-muted-foreground"
          >
            暂无数据
          </td>
        </tr>
        <tr
          v-if="rows.length"
          class="font-semibold sticky bottom-0 border-t-2 border-border"
        >
          <td
            v-for="(col, ci) in columns"
            :key="col"
            class="whitespace-nowrap px-3 py-2"
            :class="
              isNumericCol(col) || isPercentCol(col)
                ? 'text-right tabular-nums'
                : 'text-left'
            "
            :style="
              ci < FROZEN_COL_COUNT
                ? {
                    position: 'sticky',
                    left: frozenOffsets[ci] + 'px',
                    zIndex: 5,
                    backgroundColor: '#e2e8f0',
                    boxShadow:
                      ci === FROZEN_COL_COUNT - 1 && hasScroll
                        ? '4px 0 6px -2px rgba(0,0,0,0.08)'
                        : 'none',
                  }
                : {
                    backgroundColor: '#e2e8f0',
                  }
            "
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
