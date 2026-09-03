<script setup>
import { computed } from "vue";
import { formatCurrency, formatNumber } from "@/lib/utils";

const props = defineProps({
  cards: { type: Object, default: () => ({}) },
});

// 把 0~1 的小数转成 "12.34%"，保留两位小数
function formatPercent(n) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return "-";
  return (
    Number(n * 100).toLocaleString("zh-CN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + "%"
  );
}

// 每类指标语义化：bar 颜色 + value 颜色 + 数字字号
//  - 金额类：中性蓝灰装饰条 + slate-700 数字 + text-lg
//  - ROI：indigo 装饰条 + indigo-600 数字 + text-2xl 放大
//  - 退款率：rose 装饰条 + rose-600 数字（>10% 加深警示）+ text-2xl
//  - 仅退款率：orange 装饰条 + orange-600 + text-2xl
function colorFor(key) {
  if (key === "店铺ROI" || key === "推广ROI")
    return {
      bar: "bg-indigo-500",
      value: "text-indigo-600",
      size: "text-2xl",
    };
  if (key === "退款率") {
    const pct = Number(props.cards["退款率"]) * 100;
    return {
      bar: pct > 10 ? "bg-rose-600" : "bg-rose-500",
      value: pct > 10 ? "text-rose-700" : "text-rose-600",
      size: "text-2xl",
    };
  }
  if (key === "仅退款率")
    return {
      bar: "bg-orange-500",
      value: "text-orange-600",
      size: "text-2xl",
    };
  // 默认：金额类
  return {
    bar: "bg-slate-400",
    value: "text-slate-700",
    size: "text-lg",
  };
}

const items = computed(() => [
  // 第 1 行：金额类
  { key: "店铺成交金额", ...formatCurrency(props.cards["店铺成交金额"]) },
  { key: "推广交易额", ...formatCurrency(props.cards["推广交易额"]) },
  {
    key: "推广成交花费",
    ...formatCurrency(
      props.cards["推广成交花费"] ?? props.cards["成交花费"],
    ),
  },
  { key: "总退款金额", ...formatCurrency(props.cards["总退款金额"]) },
  {
    key: "未发货退款金额",
    ...formatCurrency(props.cards["未发货退款金额"]),
  },
  { key: "店铺净销售", ...formatCurrency(props.cards["店铺净销售"]) },
  // 第 2 行：派生指标
  { key: "推广净销售", ...formatCurrency(props.cards["推广净销售"]) },
  { key: "店铺ROI", value: formatNumber(props.cards["店铺ROI"], 2) },
  { key: "推广ROI", value: formatNumber(props.cards["推广ROI"], 2) },
  { key: "退款率", value: formatPercent(props.cards["退款率"]) },
  { key: "仅退款率", value: formatPercent(props.cards["仅退款率"]) },
]);
</script>

<template>
  <div class="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
    <div
      v-for="it in items"
      :key="it.key"
      class="group relative flex flex-col justify-between overflow-hidden rounded-lg border border-border bg-card p-4 pl-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md min-h-[96px]"
    >
      <!-- 左侧主题色装饰条 -->
      <span
        class="absolute left-0 top-0 bottom-0 w-1 transition-colors"
        :class="colorFor(it.key).bar"
        aria-hidden="true"
      ></span>
      <div class="flex items-center gap-1.5 text-sm text-muted-foreground leading-none">
        <span>{{ it.key }}</span>
        <span v-if="it.symbol" class="text-xs">{{ it.symbol }}</span>
      </div>
      <div
        class="mt-3 font-semibold tabular-nums tracking-tight"
        :class="[colorFor(it.key).value, colorFor(it.key).size]"
      >
        <span v-if="it.num">{{ it.num }}</span>
        <span v-else>{{ it.value }}</span>
      </div>
    </div>
  </div>
</template>