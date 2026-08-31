<script setup>
import { computed } from "vue";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SummaryCards from "@/components/SummaryCards.vue";
import LineChart from "@/components/LineChart.vue";

const props = defineProps({
  data: { type: Object, required: true }, // { summaryCards, chart, chartByProduct, ... }
  shopName: { type: String, default: "" },
  startDate: { type: String, default: "" },
  endDate: { type: String, default: "" },
});

const emit = defineEmits(["goto-detail"]);

// 折线图展示的 7 个系列（顺序固定）
const CHART_SERIES = [
  "店铺成交金额",
  "推广交易额",
  "推广成交花费",
  "总退款金额",
  "未发货退款金额",
  "店铺净销售",
  "推广净销售",
];

const chartSeries = computed(() => {
  if (!props.data?.chart?.series) return [];
  const all = props.data.chart.series;
  const dates = props.data.chart.dates;
  return CHART_SERIES.map((name) => {
    const found = all.find((s) => s.name === name);
    // 后端别名处理：'推广成交花费' 在后端写入到 '成交花费'
    const data = found
      ? found.data
      : name === "推广成交花费"
        ? all.find((s) => s.name === "成交花费")?.data || []
        : [];
    return { name, data };
  }).filter((s) => s.data.length);
});

const chartDates = computed(() => props.data?.chart?.dates || []);

// 图表标题：日期范围 + 店铺名 + "数据折线图"
const chartTitle = computed(() => {
  const range =
    props.startDate && props.endDate
      ? props.startDate === props.endDate
        ? props.startDate
        : `${props.startDate} 至 ${props.endDate}`
      : "";
  const shop = props.shopName || "";
  if (range && shop) return `${range} ${shop} 数据折线图`;
  if (range) return `${range} 数据折线图`;
  if (shop) return `${shop} 数据折线图`;
  return "销售与推广数据趋势";
});

// 按商品ID 维度拆成多个 Chart：每个商品ID 一张折线图，每个图里这个商品的 7 个指标做 7 条线
const productCharts = computed(() => {
  const list = props.data?.chartByProduct || [];
  return list.map((item) => ({
    productId: item.productId,
    series: (item.series || []).filter((s) => s.data && s.data.length),
  }));
});

// 折线图节点被点击时，把日期传给上层
function onPointClick({ date }) {
  emit("goto-detail", { date });
}
</script>

<template>
  <div class="space-y-4">
    <SummaryCards :cards="data.summaryCards" />

    <Card>
      <CardHeader class="pb-2">
        <CardTitle class="text-base">{{ chartTitle }}</CardTitle>
      </CardHeader>
      <CardContent class="px-2">
        <LineChart
          v-if="chartSeries.length"
          :dates="chartDates"
          :series="chartSeries"
          height="520px"
          @point-click="onPointClick"
        />
        <div v-else class="py-10 text-center text-sm text-muted-foreground">
          暂无趋势数据
        </div>
      </CardContent>
    </Card>

    <Card v-if="productCharts.length">
      <CardHeader class="pb-2">
        <CardTitle class="text-base">{{ chartTitle }} - 各商品ID 维度</CardTitle>
      </CardHeader>
      <CardContent class="px-2 space-y-6">
        <div v-for="p in productCharts" :key="p.productId">
          <div class="px-1 pb-2 text-sm font-medium text-muted-foreground">
            商品ID：{{ p.productId }}
          </div>
          <LineChart
            v-if="p.series.length"
            :dates="chartDates"
            :series="p.series"
            height="360px"
            @point-click="onPointClick"
          />
        </div>
      </CardContent>
    </Card>
  </div>
</template>
