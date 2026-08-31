<script setup>
import { computed } from 'vue';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import SummaryCards from '@/components/SummaryCards.vue';
import LineChart from '@/components/LineChart.vue';

const props = defineProps({
  data: { type: Object, required: true }, // { summaryCards, chart, ... }
});

const chartList = computed(() => {
  if (!props.data) return [];
  return props.data.chart.series.map((s) => ({
    name: s.name,
    dates: props.data.chart.dates,
    data: s.data,
  }));
});
</script>

<template>
  <div class="space-y-4">
    <SummaryCards :cards="data.summaryCards" />

    <Card>
      <CardHeader>
        <CardTitle>销售与推广数据趋势</CardTitle>
        <CardDescription>点击趋势节点可弹出并调出当日 Excel 原始明细数据</CardDescription>
      </CardHeader>
      <CardContent>
        <!-- 仅在数据为空时给出提示；正常数据通过下方独立 Card 展示 -->
        <div v-if="!chartList.length" class="py-10 text-center text-sm text-muted-foreground">
          暂无趋势数据
        </div>
      </CardContent>
    </Card>

    <div class="space-y-4">
      <Card v-for="c in chartList" :key="c.name">
        <CardHeader class="pb-2">
          <CardTitle class="text-base">{{ c.name }} 趋势</CardTitle>
        </CardHeader>
        <CardContent>
          <LineChart :dates="c.dates" :series="[{ name: c.name, data: c.data }]" height="280px" />
        </CardContent>
      </Card>
    </div>
  </div>
</template>