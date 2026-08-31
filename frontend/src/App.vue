<script setup>
import { computed, ref, watch } from 'vue';
import dayjs from 'dayjs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import DateRangePicker from '@/components/DateRangePicker.vue';
import DashboardView from '@/views/DashboardView.vue';
import DetailView from '@/views/DetailView.vue';
import { fetchDashboard } from '@/api';
import { Button } from '@/components/ui/button';
import { Search, Loader2, LayoutDashboard } from '@lucide/vue';

// 进入页面时不预设日期，由用户主动选择后再点查询
const shopOptions = [
  { label: '物空旗舰店', value: '物空旗舰店' },
  { label: '望穿专卖店', value: '望穿专卖店' },
  { label: '梵塔专卖店', value: '梵塔专卖店' },
];

const shopName = ref('物空旗舰店');
const dateRange = ref({ start: null, end: null });
// 记录最近一次查询使用的条件，用于判断"是否变更过"
const lastQuery = ref({ shopName: null, start: null, end: null });

const collapsed = ref(false);

const ready = computed(() => !!(shopName.value && dateRange.value.start && dateRange.value.end));

// 当前条件与上次查询条件是否一致
const canQuery = computed(() => {
  if (!ready.value) return false;
  const l = lastQuery.value;
  return (
    l.shopName !== shopName.value ||
    l.start !== dateRange.value.start ||
    l.end !== dateRange.value.end
  );
});

watch([shopName, () => dateRange.value?.start, () => dateRange.value?.end], () => {
  // 条件变化 → 标记为需要重新查询
  if (ready.value) markDirty();
});

// 数据 + 菜单
const loadingMenu = ref(false);
const menuItems = ref([]);
const data = ref(null);
const errorMsg = ref('');

const activeKey = ref('dashboard');
const activeDetail = ref(null);

const dashboardRef = ref(null);

async function runQuery() {
  if (!ready.value) return;
  loadingMenu.value = true;
  errorMsg.value = '';
  try {
    const res = await fetchDashboard({
      shopName: shopName.value,
      startDate: dateRange.value.start,
      endDate: dateRange.value.end,
    });
    data.value = res.data;
    menuItems.value = res.data.menu || [];
    activeKey.value = 'dashboard';
    activeDetail.value = null;
    lastQuery.value = {
      shopName: shopName.value,
      start: dateRange.value.start,
      end: dateRange.value.end,
    };
  } catch (e) {
    errorMsg.value = e.message;
    data.value = null;
    menuItems.value = [];
  } finally {
    loadingMenu.value = false;
    resetDirty();
  }
}

// 进入页面不自动查询，必须由用户点"查询"按钮触发
watch(ready, () => { markDirty(); });

// 让用户重新选择条件时，"查询"按钮呈高亮提示（让用户意识到还没查询）
const isDirty = ref(false);
function markDirty() { isDirty.value = true; }
function resetDirty() { isDirty.value = false; }

function selectDashboard() {
  activeKey.value = 'dashboard';
  activeDetail.value = null;
}
function selectDetail(item) {
  activeKey.value = `detail-${item.fileName}`;
  activeDetail.value = item;
}

// 从图表节点跳转：按日期找对应明细菜单
function gotoDetailByDate({ date }) {
  if (!date) return;
  const item = menuItems.value.find((m) => m.date === date);
  if (item) selectDetail(item);
}
</script>

<template>
  <div class="flex h-screen w-screen overflow-hidden bg-background text-foreground">
    <!-- 左侧菜单 -->
    <aside
      class="flex h-full shrink-0 flex-col border-r border-border bg-muted/30 transition-[width] duration-200"
      :class="collapsed ? 'w-14' : 'w-[280px]'"
    >
      <!-- Header：logo（纯展示，不可点击折叠） -->
      <div class="flex items-center gap-2 border-b border-border px-3 py-3">
        <div
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground"
        >
          <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="7" height="9" rx="1" />
            <rect x="14" y="3" width="7" height="5" rx="1" />
            <rect x="14" y="12" width="7" height="9" rx="1" />
            <rect x="3" y="16" width="7" height="5" rx="1" />
          </svg>
        </div>
        <div v-if="!collapsed" class="flex-1 leading-tight">
          <div class="text-sm font-semibold">拼多多销售数据看板</div>
          <div class="text-xs text-muted-foreground">店铺数据可视化分析</div>
        </div>
      </div>

      <!-- 折叠时只显示竖排小按钮（避免完全隐藏入口） -->
      <template v-if="!collapsed">
        <div class="space-y-3 pt-3 pb-4 border-b border-border">
          <div class="mx-3">
            <div class="mb-1.5 text-xs font-medium text-muted-foreground">选择店铺</div>
            <Select v-model="shopName">
              <SelectTrigger class="w-full">
                <SelectValue :placeholder="shopName" />
              </SelectTrigger>
              <SelectContent>
                  <SelectItem v-for="o in shopOptions" :key="o.value" :value="o.value">
                    {{ o.label }}
                  </SelectItem>
                </SelectContent>
            </Select>
          </div>

          <div class="mx-3">
            <div class="mb-1.5 text-xs font-medium text-muted-foreground">选择日期范围</div>
            <DateRangePicker v-model="dateRange" />
          </div>

          <div class="mx-3">
            <Button
              class="w-full"
              :disabled="!ready || loadingMenu"
              @click="runQuery"
            >
              <Loader2 v-if="loadingMenu" class="mr-1.5 h-4 w-4 animate-spin" />
              <Search v-else class="mr-1.5 h-4 w-4" />
              <span>{{ loadingMenu ? '查询中…' : '查询' }}</span>
            </Button>
          </div>
        </div>

        <nav class="flex-1 overflow-auto pb-3 scrollbar-thin pt-4">
          <div class="mt-1 space-y-1">
            <button
              type="button"
              class="mx-3 flex w-[calc(100%-1.5rem)] items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors"
              :class="activeKey === 'dashboard' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent/60'"
              :disabled="!data"
              @click="selectDashboard"
            >
              <LayoutDashboard class="h-4 w-4 shrink-0" />
              <span class="truncate">数据汇总看板</span>
            </button>
          </div>

          <div class="mt-3 px-3 text-xs font-medium text-muted-foreground">
            数据明细列表 ({{ menuItems.length }})
          </div>

          <ul class="mt-1 space-y-1">
            <li v-if="loadingMenu" class="px-3 py-2 text-xs text-muted-foreground">加载中...</li>
            <li v-else-if="!menuItems.length" class="px-3 py-2 text-xs text-muted-foreground">暂无明细</li>
            <li v-for="item in menuItems" :key="item.fileName">
              <button
                type="button"
                class="flex items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors"
                :class="activeKey === `detail-${item.fileName}` ? 'bg-primary text-primary-foreground' : 'hover:bg-accent/60'"
                @click="selectDetail(item)"
              >
                <span class="truncate">{{ item.date }}</span>
                <span class="shrink-0 rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">明细</span>
              </button>
            </li>
          </ul>
        </nav>
      </template>

      <!-- 折叠态：看板/明细图标入口 -->
      <template v-else>
        <nav class="flex flex-1 flex-col items-center gap-2 py-3">
          <!-- 折叠态下的"展开"按钮（唯一折叠控制入口） -->
          <button
            class="flex h-10 w-10 items-center justify-center rounded-md transition-colors hover:bg-accent hover:text-accent-foreground"
            title="展开菜单"
            @click="collapsed = false"
          >
            <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <button
            class="flex h-10 w-10 items-center justify-center rounded-md transition-colors"
            :class="activeKey === 'dashboard' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent hover:text-accent-foreground'"
            :disabled="!data"
            title="数据汇总看板"
            @click="selectDashboard"
          >
            <LayoutDashboard class="h-5 w-5" />
          </button>
          <button
            v-if="menuItems.length"
            class="flex h-10 w-10 items-center justify-center rounded-md transition-colors hover:bg-accent hover:text-accent-foreground"
            :disabled="loadingMenu"
            title="数据明细列表"
            @click="collapsed = false"
          >
            <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 5h18M3 12h18M3 19h18" />
            </svg>
          </button>
        </nav>
      </template>
    </aside>

    <!-- 右侧内容 -->
    <main class="flex-1 overflow-auto bg-background p-6 scrollbar-thin">
      <div v-if="!ready" class="flex h-full items-center justify-center">
        <div class="rounded-lg border border-dashed border-border px-6 py-4 text-sm text-muted-foreground">
          请在左侧选择店铺和日期范围
        </div>
      </div>

      <div v-else-if="errorMsg" class="flex h-full items-center justify-center">
        <div class="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {{ errorMsg }}
        </div>
      </div>

      <DashboardView
        v-if="activeKey === 'dashboard' && data"
        ref="dashboardRef"
        :data="data"
        @goto-detail="gotoDetailByDate"
      />
      <DetailView
        v-else-if="activeDetail"
        :key="activeDetail.fileName"
        :shop-name="shopName"
        :start-date="dateRange.start"
        :end-date="dateRange.end"
        :file-name="activeDetail.fileName"
      />
    </main>
  </div>
</template>