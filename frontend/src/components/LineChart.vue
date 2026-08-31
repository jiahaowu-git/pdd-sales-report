<script setup>
import { ref, watch, onMounted, onBeforeUnmount, shallowRef } from 'vue';
import * as echarts from 'echarts/core';
import { LineChart } from 'echarts/charts';
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  DataZoomComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([
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
  title: { type: String, default: '' },
  height: { type: String, default: '320px' },
});

const emit = defineEmits(['point-click']);

const chartEl = ref(null);
const instance = shallowRef(null);

function buildOption() {
  return {
    tooltip: { trigger: 'axis' },
    legend: { type: 'scroll', top: 0, left: 'center' },
    grid: { top: 40, left: 8, right: 24, bottom: 40, containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: props.dates,
      axisLabel: { color: '#64748b' },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#64748b', formatter: (v) => Number(v).toLocaleString('zh-CN') },
    },
    dataZoom: props.dates.length > 14 ? [{ type: 'inside' }, { type: 'slider', height: 18 }] : undefined,
    animation: true,
    animationDuration: 900,
    animationEasing: 'cubicOut',
    animationDurationUpdate: 600,
    animationEasingUpdate: 'cubicOut',
    series: props.series.map((s) => ({
      name: s.name,
      type: 'line',
      smooth: true,
      symbol: 'circle',
      symbolSize: 10,
      itemStyle: { borderWidth: 2, borderColor: '#fff' },
      data: s.data,
      animationDelay: (idx) => idx * 30,
    })),
  };
}

function render() {
  if (!chartEl.value) return;
  if (!instance.value) instance.value = echarts.init(chartEl.value);
  instance.value.setOption(buildOption(), true);
  // 点击某个数据点（任意系列上的点）都视为点击该日期
  instance.value.off('click');
  instance.value.on('click', (params) => {
    // 坐标轴类点击时 dataIndex 表示 x 轴索引
    const idx = params?.dataIndex;
    if (idx === undefined || idx === null) return;
    const date = props.dates[idx];
    if (date) emit('point-click', { date, dataIndex: idx });
  });
}

function resize() {
  instance.value?.resize();
}

watch(() => [props.dates, props.series], render, { deep: true });

onMounted(() => {
  render();
  window.addEventListener('resize', resize);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', resize);
  instance.value?.dispose();
  instance.value = null;
});
</script>

<template>
  <div :style="{ width: '100%', height: props.height }" ref="chartEl" />
</template>