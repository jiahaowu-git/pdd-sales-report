<script setup>
import { computed, ref } from "vue";
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

// 折线图展示的 9 个系列（顺序固定；后两个 ROI 数值小，挂右侧 Y 轴）
const CHART_SERIES = [
  "店铺成交金额",
  "推广交易额",
  "推广成交花费",
  "总退款金额",
  "未发货退款金额",
  "店铺净销售",
  "推广净销售",
  "店铺ROI",
  "推广ROI",
];

const chartSeries = computed(() => {
  if (!props.data?.chart?.series) return [];
  const all = props.data.chart.series;
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
    promotionName: item.promotionName || "",
    series: (item.series || []).filter((s) => s.data && s.data.length),
  }));
});

// 每个商品图表的展开/折叠状态（默认全部展开）
const expandedMap = ref({});
function toggleProduct(productId) {
  // 默认全部展开；首次点击该 productId 时，"折叠"操作；之后每次点击都取反。
  // 之所以不用 !current：undefined 取反仍是 true，与默认展开相同，会导致首次点击无变化。
  const current = expandedMap.value[productId];
  expandedMap.value[productId] = current === undefined ? false : !current;
}
function isExpanded(productId) {
  return expandedMap.value[productId] !== false; // 默认 true（展开）
}

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
          :default-hidden-series="['推广ROI']"
          @point-click="onPointClick"
        />
        <div v-else class="py-10 text-center text-sm text-muted-foreground">
          暂无趋势数据
        </div>
      </CardContent>
    </Card>

    <Card v-if="productCharts.length">
      <CardContent class="px-2 pt-6 space-y-[42px]">
        <div v-for="p in productCharts" :key="p.productId">
          <!-- 标题区视觉升级：左侧 4px 主题色装饰条 + 商品ID胶囊 + 推广名称柔和灰 -->
          <div
            class="relative flex items-center justify-between gap-2 rounded-md px-3 py-2 mb-2 transition-colors hover:bg-muted/40"
          >
            <!-- 左侧装饰条 -->
            <span
              class="absolute left-0 top-2 bottom-2 w-1 rounded-full bg-primary"
              aria-hidden="true"
            ></span>
            <div class="flex items-center gap-3 pl-2">
              <span
                class="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 font-mono text-[13px] font-semibold text-primary"
              >
                <span class="text-xs font-normal text-primary/70">商品ID</span>
                <span>{{ p.productId }}</span>
              </span>
              <span
                v-if="p.promotionName"
                class="text-sm font-normal text-muted-foreground"
              >
                <span class="text-xs">推广名称：</span>
                <span class="font-medium text-foreground">{{
                  p.promotionName
                }}</span>
              </span>
            </div>
            <button
              type="button"
              class="inline-flex h-7 w-7 items-center justify-center rounded-md border border-input bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              :title="isExpanded(p.productId) ? '折叠' : '展开'"
              :aria-label="isExpanded(p.productId) ? '折叠' : '展开'"
              :aria-expanded="isExpanded(p.productId)"
              @click="toggleProduct(p.productId)"
            >
              <!-- 展开状态：向上箭头（点击此图标将折叠） -->
              <svg
                v-if="isExpanded(p.productId)"
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="m18 15-6-6-6 6" />
              </svg>
              <!-- 折叠状态：向下箭头（点击此图标将展开） -->
              <svg
                v-else
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
          </div>
          <LineChart
            v-if="p.series.length && isExpanded(p.productId)"
            :dates="chartDates"
            :series="p.series"
            height="360px"
            :show-bg="true"
            :right-axis-percent="true"
            :left-axis-roi="true"
            :default-hidden-series="['推广ROI']"
            @point-click="onPointClick"
          />
        </div>
      </CardContent>
    </Card>
  </div>
</template>
