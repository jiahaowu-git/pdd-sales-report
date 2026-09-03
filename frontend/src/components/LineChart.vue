<script setup>
import { ref, watch, onMounted, onBeforeUnmount, shallowRef, computed } from "vue";
import * as echarts from "echarts/core";
import { BarChart, LineChart } from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  DataZoomComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";

echarts.use([
  BarChart,
  LineChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  DataZoomComponent,
  CanvasRenderer,
]);

const props = defineProps({
  dates: { type: Array, default: () => [] },
  series: { type: Array, default: () => [] }, // [{ name, data }]
  title: { type: String, default: "" },
  height: { type: String, default: "320px" },
  // 是否给 echarts 图表本身加浅灰背景（仅商品图开启，店铺总图保持透明）
  showBg: { type: Boolean, default: false },
  // 默认不显示的系列名列表（用于图例默认关闭，点击后显示）
  defaultHiddenSeries: { type: Array, default: () => [] },
  // 右 Y 轴是否为百分数（0~100%）。仅商品图开启
  rightAxisPercent: { type: Boolean, default: false },
  // ROI 系列是否放在左 Y 轴。店铺总图默认 false（ROI 在右轴），
  // 商品图传 true（ROI 在左轴，百分数在右轴）
  leftAxisRoi: { type: Boolean, default: false },
});

// 是否处于首次渲染（series/dates 到位后的一帧内），用于显示骨架屏
const ready = ref(false);
const hasData = computed(
  () => props.dates.length > 0 && props.series.length > 0,
);

const emit = defineEmits(["point-click"]);

const chartEl = ref(null);
const instance = shallowRef(null);

// 左 Y 轴：ROI 系列（数值小，自动范围）
const LEFT_AXIS_NAMES = new Set(["店铺ROI", "推广ROI"]);
// 右 Y 轴：百分数系列（0~100%）
const RIGHT_AXIS_NAMES = new Set(["退款率", "仅退款率", "销售占比"]);

// === 配色与线型（按 AGENTS.md §1 / §7：自定义调色板 + 双轴对比色 + 线型区分） ===
// 按"语义族"分配高区分度色相：金额/退款/净销售/ROI 四族之间色相尽量拉开
// 同一族内的相邻系列走不同明度/饱和度避免混淆
const COLOR_PALETTE = [
  "#2563eb", // blue-600        店铺成交金额
  "#7c3aed", // violet-600      推广交易额
  "#0d9488", // teal-600        推广成交花费
  "#f59e0b", // amber-500       总退款金额
  "#dc2626", // red-600         未发货退款金额
  "#db2777", // pink-600        店铺净销售
  "#ea580c", // orange-600      推广净销售（与退款橙区分，暖色另一支）
  "#581c87", // violet-900      店铺ROI（深紫，与金额蓝明显区分）
  "#475569", // slate-600       推广ROI（深灰，避免与所有暖色撞）
];
// 左 Y 轴文字/网格用深灰，右 Y 轴用对应主色，让"哪条线对应哪条轴"一眼可辨
const LEFT_AXIS_COLOR = "#475569"; // slate-600
const RIGHT_AXIS_COLOR = "#581c87"; // violet-900（与店铺ROI同色系，右轴突出）

function buildOption() {
  // 是否启用双 Y 轴：
  //  - 店铺总图：左=金额、右=ROI
  //  - 商品图：左=ROI、右=百分数（百分比格式）
  // 两种场景都需要双轴
  const hasRightAxis = props.series.some(
    (s) => LEFT_AXIS_NAMES.has(s.name) || RIGHT_AXIS_NAMES.has(s.name),
  );
  // 默认隐藏的系列映射成 ECharts legend.selected 的 false
  const hiddenSet = new Set(props.defaultHiddenSeries);
  return {
    // ROI 系列在 legend 用方方形图标，百分数系列也用方块（视觉一致）；其它系列用圆形
    legend: {
      type: "scroll",
      top: 0,
      left: "center",
      textStyle: { color: "#334155", fontSize: 12 },
      itemGap: 16,
      data: props.series.map((s, idx) => ({
        name: s.name,
        icon:
          LEFT_AXIS_NAMES.has(s.name) || RIGHT_AXIS_NAMES.has(s.name)
            ? "rect"
            : "circle",
      })),
      selected: props.series.reduce((acc, s) => {
        acc[s.name] = !hiddenSet.has(s.name);
        return acc;
      }, {}),
    },
    backgroundColor: props.showBg ? "#f8fafc" : "transparent",
    tooltip: {
      trigger: "axis",
      backgroundColor: "rgba(255,255,255,0.98)",
      borderColor: "#cbd5e1",
      borderWidth: 1,
      textStyle: { color: "#0f172a", fontSize: 12 },
      extraCssText: "box-shadow: 0 4px 12px rgba(15,23,42,0.08); border-radius: 6px;",
      // tooltip 中百分数系列带 % 后缀；其它（金额/ROI）走默认
      // 同时显示与上一日 diff（绿色▲ / 红色▼），让用户一眼看出趋势
      formatter: (params) => {
        if (!Array.isArray(params) || !params.length) return "";
        const axisLabel = params[0].axisValueLabel ?? params[0].name;
        const idx = params[0].dataIndex;
        const prevIdx = idx - 1;
        const lines = params.map((p) => {
          const v =
            p.value === null || p.value === undefined ? "-" : Number(p.value);
          const isPct =
            RIGHT_AXIS_NAMES.has(p.seriesName) && props.rightAxisPercent;
          const text = isPct
            ? `${v.toFixed(2)}%`
            : v.toLocaleString("zh-CN", {
                maximumFractionDigits: 2,
              });
          // diff：与上一日对比
          let diffText = "";
          if (prevIdx >= 0) {
            const prevArr = p.seriesData?.map?.((x) => x) || [];
            // ECharts 把同 series 的所有点放在 series.data，我们从前一个 series 同 dataIndex 拿
            const seriesArr = props.series.find((s) => s.name === p.seriesName)
              ?.data;
            const prev = seriesArr && seriesArr[prevIdx];
            if (
              prev !== null &&
              prev !== undefined &&
              Number.isFinite(Number(prev)) &&
              Number.isFinite(v)
            ) {
              const d = v - Number(prev);
              if (Math.abs(d) > 1e-9) {
                const arrow = d > 0 ? "▲" : "▼";
                const color = d > 0 ? "#16a34a" : "#dc2626"; // green-600 / red-600
                const diffStr = isPct
                  ? `${Math.abs(d).toFixed(2)}%`
                  : Math.abs(d).toLocaleString("zh-CN", {
                      maximumFractionDigits: 2,
                    });
                diffText = ` <span style="color:${color};font-size:11px;">${arrow} ${diffStr}</span>`;
              }
            }
          }
          return `${p.marker}${p.seriesName}: <b>${text}</b>${diffText}`;
        });
        return `${axisLabel}<br/>${lines.join("<br/>")}`;
      },
    },
    grid: {
      top: 56,
      left: 36,
      right: hasRightAxis ? 36 : 36,
      bottom: 0,
      containLabel: true,
    },
    xAxis: {
      type: "category",
      data: props.dates,
      boundaryGap: false,
      axisLabel: {
        color: "#64748b",
        rotate: 30,
        fontSize: 11,
        // 让斜着的文字不超出底部网格
        margin: 12,
        hideOverlap: false,
      },
    },
    yAxis: hasRightAxis
      ? [
          // 左 Y 轴：
          //  - rightAxisPercent=true 时是 ROI 小数值
          //  - 否则（店铺总图）是金额，用千分位
          {
            type: "value",
            min: 0,
            axisLabel: {
              color: LEFT_AXIS_COLOR,
              fontWeight: 500,
              formatter: props.rightAxisPercent
                ? (v) => Number(v).toFixed(2)
                : (v) => Number(v).toLocaleString("zh-CN"),
            },
            splitLine: { lineStyle: { color: "#e2e8f0" } },
            axisLine: { show: true, lineStyle: { color: LEFT_AXIS_COLOR } },
          },
          // 右 Y 轴：根据 rightAxisPercent 决定是百分数 0~100% 还是 ROI 小数
          props.rightAxisPercent
            ? {
                type: "value",
                min: 0,
                max: 100,
                position: "right",
                axisLabel: {
                  color: RIGHT_AXIS_COLOR,
                  fontWeight: 500,
                  formatter: (v) => `${Number(v).toFixed(0)}%`,
                },
                splitLine: { show: false },
                axisLine: { show: true, lineStyle: { color: RIGHT_AXIS_COLOR } },
              }
            : {
                type: "value",
                min: 0,
                position: "right",
                axisLabel: {
                  color: RIGHT_AXIS_COLOR,
                  fontWeight: 500,
                  formatter: (v) => Number(v).toFixed(2),
                },
                splitLine: { show: false },
                axisLine: { show: true, lineStyle: { color: RIGHT_AXIS_COLOR } },
              },
        ]
      : {
          type: "value",
          min: 0,
          axisLabel: {
            color: LEFT_AXIS_COLOR,
            formatter: (v) => Number(v).toLocaleString("zh-CN"),
          },
        },
    dataZoom: props.dates.length > 14 ? [{ type: "inside" }] : undefined,
    animation: true,
    animationDuration: 900,
    animationEasing: "cubicOut",
    animationDurationUpdate: 600,
    animationEasingUpdate: "cubicOut",
    series: props.series.map((s, idx) => {
      const isLeft = LEFT_AXIS_NAMES.has(s.name);
      const isRight = RIGHT_AXIS_NAMES.has(s.name);
      // ROI 系列归属哪边：店铺总图 → 右；商品图 → 左
      // 百分数系列永远在右轴
      // 金额系列永远在左轴
      let yAxisIndex = 0;
      if (isLeft) yAxisIndex = props.leftAxisRoi ? 0 : 1;
      else if (isRight) yAxisIndex = 1;
      const isRect = isLeft || isRight;
      // 自定义调色板：按系列索引取色，循环使用
      const color = COLOR_PALETTE[idx % COLOR_PALETTE.length];
      // 线型区分：金额实线 + smooth；百分数 / ROI 系列用虚线 + 圆点（视觉上弱化，避免与主指标抢眼）
      return {
        name: s.name,
        type: "line",
        smooth: !isRect, // ROI/百分数不要平滑，避免斜率误读
        symbol: isRect ? "rect" : "circle",
        symbolSize: isRect ? 8 : 10,
        yAxisIndex,
        itemStyle: { borderWidth: 2, borderColor: "#fff", color },
        lineStyle: {
          width: isRect ? 1.5 : 2.5,
          type: isRight ? "dashed" : isLeft ? "dotted" : "solid",
          color,
        },
        data: s.data,
        z: 2,
        // 逐条 + 逐点画出：线之间错开 120ms，点之间错开 8ms，整体更有'扫'的感觉
        animationDelay: (i) => idx * 120 + i * 8,
        animationDuration: 700,
      };
    }),
  };
}

function render() {
  if (!chartEl.value) return;
  if (!instance.value) instance.value = echarts.init(chartEl.value);
  instance.value.setOption(buildOption(), true);
  // 渲染已启动，下一帧移除骨架屏（让 ECharts 的逐条动画接管视觉）
  requestAnimationFrame(() => {
    ready.value = true;
  });
  // 点击某个数据点（任意系列上的点）都视为点击该日期
  instance.value.off("click");
  instance.value.on("click", (params) => {
    // 坐标轴类点击时 dataIndex 表示 x 轴索引
    const idx = params?.dataIndex;
    if (idx === undefined || idx === null) return;
    const date = props.dates[idx];
    if (date) emit("point-click", { date, dataIndex: idx });
  });
}

function resize() {
  instance.value?.resize();
}

watch(() => [props.dates, props.series], render, { deep: true });

onMounted(() => {
  render();
  window.addEventListener("resize", resize);
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", resize);
  instance.value?.dispose();
  instance.value = null;
});
</script>

<template>
  <div class="relative" :style="{ width: '100%', height: props.height }">
    <!-- 无数据：居中空态 -->
    <div
      v-if="!hasData"
      class="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground"
    >
      暂无数据
    </div>
    <!-- 加载骨架屏：首帧前显示，与 ECharts 动画接力，避免空白闪烁 -->
    <div
      v-else-if="!ready"
      class="absolute inset-0 overflow-hidden rounded-md bg-muted/30"
      aria-hidden="true"
    >
      <div
        class="absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-white/40 to-transparent"
        style="background-size: 200% 100%; animation: shimmer 1.4s linear infinite;"
      ></div>
    </div>
    <div ref="chartEl" class="h-full w-full" />
  </div>
</template>

<style scoped>
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>
