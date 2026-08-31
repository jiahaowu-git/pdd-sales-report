<script setup>
import { onMounted, ref, watch } from 'vue';
import { fetchDetail } from '@/api';
import DataTable from '@/components/DataTable.vue';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const props = defineProps({
  shopName: { type: String, required: true },
  startDate: { type: String, required: true },
  endDate: { type: String, required: true },
  fileName: { type: String, required: true },
});

const loading = ref(false);
const errorMsg = ref('');
const columns = ref([]);
const rows = ref([]);

async function load() {
  loading.value = true;
  errorMsg.value = '';
  columns.value = [];
  rows.value = [];
  try {
    const res = await fetchDetail({
      shopName: props.shopName,
      startDate: props.startDate,
      endDate: props.endDate,
      fileName: props.fileName,
    });
    columns.value = (res.data.columns || []).filter(Boolean);
    rows.value = res.data.rows;
  } catch (e) {
    errorMsg.value = e.message;
  } finally {
    loading.value = false;
  }
}

onMounted(load);
watch(() => [props.fileName, props.shopName, props.startDate, props.endDate], load);
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>明细数据：{{ fileName }}</CardTitle>
      <CardDescription>来自原始 Excel 透视汇总表（共 {{ rows.length }} 行）</CardDescription>
    </CardHeader>
    <CardContent>
      <div v-if="errorMsg" class="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
        {{ errorMsg }}
      </div>
      <div v-else-if="loading" class="py-10 text-center text-muted-foreground">加载中...</div>
      <DataTable v-else :columns="columns" :rows="rows" />
    </CardContent>
  </Card>
</template>