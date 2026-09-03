<script setup>
import { ref, watch, onMounted, onBeforeUnmount, shallowRef } from "vue";
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

const emit = defineEmits(["point-click"]);

const chartEl = ref(null);
const instance = shallowRef(null);

// 左 Y 轴：ROI 系列（数值小，自动范围）
const LEFT_AXIS_NAMES = new Set(["店铺ROI", "推广ROI"]);
// 右 Y 轴：百分数系列（0~100%）
const RIGHT_AXIS_NAMES = new Set(["退款率", "仅退款率", "销售占比"]);

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
      data: props.series.map((s) => ({
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
      // tooltip 中百分数系列带 % 后缀；其它（金额/ROI）走默认
      formatter: (params) => {
        if (!Array.isArray(params) || !params.length) return "";
        const axisLabel = params[0].axisValueLabel ?? params[0].name;
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
          return `${p.marker}${p.seriesName}: <b>${text}</b>`;
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
              color: "#64748b",
              formatter: props.rightAxisPercent
                ? (v) => Number(v).toFixed(2)
                : (v) => Number(v).toLocaleString("zh-CN"),
            },
          },
          // 右 Y 轴：根据 rightAxisPercent 决定是百分数 0~100% 还是 ROI 小数
          props.rightAxisPercent
            ? {
                type: "value",
                min: 0,
                max: 100,
                position: "right",
                axisLabel: {
                  color: "#64748b",
                  formatter: (v) => `${Number(v).toFixed(0)}%`,
                },
                splitLine: { show: false },
              }
            : {
                type: "value",
                min: 0,
                position: "right",
                axisLabel: {
                  color: "#64748b",
                  formatter: (v) => Number(v).toFixed(2),
                },
                splitLine: { show: false },
              },
        ]
      : {
          type: "value",
          min: 0,
          axisLabel: {
            color: "#64748b",
            formatter: (v) => Number(v).toLocaleString("zh-CN"),
          },
        },
    dataZoom: props.dates.length > 14 ? [{ type: "inside" }] : undefined,
    animation: true,
    animationDuration: 900,
    animationEasing: "cubicOut",
    animationDurationUpdate: 600,
    animationEasingUpdate: "cubicOut",
    series: props.series.map((s) => {
      const isLeft = LEFT_AXIS_NAMES.has(s.name);
      const isRight = RIGHT_AXIS_NAMES.has(s.name);
      // ROI 系列归属哪边：店铺总图 → 右；商品图 → 左
      // 百分数系列永远在右轴
      // 金额系列永远在左轴
      let yAxisIndex = 0;
      if (isLeft) yAxisIndex = props.leftAxisRoi ? 0 : 1;
      else if (isRight) yAxisIndex = 1;
      const isRect = isLeft || isRight;
      return {
        name: s.name,
        type: "line",
        smooth: true,
        symbol: isRect ? "rect" : "circle",
        symbolSize: isRect ? 8 : 10,
        yAxisIndex,
        itemStyle: { borderWidth: 2, borderColor: "#fff" },
        data: s.data,
        z: 2,
        animationDelay: (idx) => idx * 30,
      };
    }),
  };
}

function render() {
  if (!chartEl.value) return;
  if (!instance.value) instance.value = echarts.init(chartEl.value);
  instance.value.setOption(buildOption(), true);
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
  <div :style="{ width: '100%', height: props.height }" ref="chartEl" />
</template>
