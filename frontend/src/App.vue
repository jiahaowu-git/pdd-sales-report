<script setup>
import { computed, nextTick, ref, watch } from "vue";
import dayjs from "dayjs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import DateRangePicker from "@/components/DateRangePicker.vue";
import DashboardView from "@/views/DashboardView.vue";
import DetailView from "@/views/DetailView.vue";
import { fetchDashboard } from "@/api";
import { Button } from "@/components/ui/button";
import { Search, Loader2, LayoutDashboard } from "@lucide/vue";

// 进入页面时不预设日期，由用户主动选择后再点查询
const shopOptions = [
  { label: "物空旗舰店", value: "物空旗舰店" },
  { label: "望穿专卖店", value: "望穿专卖店" },
  { label: "梵塔专卖店", value: "梵塔专卖店" },
];

const shopName = ref("物空旗舰店");
const dateRange = ref({ start: null, end: null });
// 记录最近一次查询使用的条件，用于判断"是否变更过"
const lastQuery = ref({ shopName: null, start: null, end: null });

const collapsed = ref(false);

const ready = computed(
  () => !!(shopName.value && dateRange.value.start && dateRange.value.end),
);

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

watch(
  [shopName, () => dateRange.value?.start, () => dateRange.value?.end],
  () => {
    // 条件变化 → 标记为需要重新查询
    if (ready.value) markDirty();
  },
);

// 数据 + 菜单
const loadingMenu = ref(false);
const menuItems = ref([]);
const data = ref(null);
const errorMsg = ref("");

const activeKey = ref("dashboard");
const activeDetail = ref(null);

const dashboardRef = ref(null);

// 左侧明细菜单的 DOM 引用（按 fileName 索引）
const menuItemRefs = ref({});
function setMenuItemRef(fileName, el) {
  if (el) menuItemRefs.value[fileName] = el;
}

async function runQuery() {
  if (!ready.value) return;
  loadingMenu.value = true;
  errorMsg.value = "";
  try {
    const res = await fetchDashboard({
      shopName: shopName.value,
      startDate: dateRange.value.start,
      endDate: dateRange.value.end,
    });
    data.value = res.data;
    menuItems.value = res.data.menu || [];
    menuItemRefs.value = {};
    activeKey.value = "dashboard";
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
watch(ready, () => {
  markDirty();
});

// 让用户重新选择条件时，"查询"按钮呈高亮提示（让用户意识到还没查询）
const isDirty = ref(false);
function markDirty() {
  isDirty.value = true;
}
function resetDirty() {
  isDirty.value = false;
}

function selectDashboard() {
  activeKey.value = "dashboard";
  activeDetail.value = null;
}
function selectDetail(item) {
  activeKey.value = `detail-${item.fileName}`;
  activeDetail.value = item;
}

// 从图表节点跳转：按日期找对应明细菜单，并把左侧菜单项滚动到可视区
async function gotoDetailByDate({ date }) {
  if (!date) return;
  const item = menuItems.value.find((m) => m.date === date);
  if (!item) return;
  selectDetail(item);
  // 等 DOM 更新后滚动到对应菜单项（左右两侧可能同步滚）
  await nextTick();
  const el = menuItemRefs.value[item.fileName];
  el?.scrollIntoView({ behavior: "smooth", block: "center" });
}
</script>

<template>
  <div
    class="flex h-screen w-screen overflow-hidden bg-background text-foreground"
  >
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
          <svg
            viewBox="0 0 24 24"
            class="h-5 w-5"
            fill="none"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <rect x="2.5" y="3.5" width="19" height="12" rx="1.5" />
            <polyline points="6,12 9.5,8.5 13,11 17.5,6" />
            <path d="M5 19h14" />
            <path d="M9 16h6" />
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
            <div class="mb-1.5 text-xs font-medium text-muted-foreground">
              选择店铺
            </div>
            <Select v-model="shopName">
              <SelectTrigger class="w-full">
                <SelectValue :placeholder="shopName" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="o in shopOptions"
                  :key="o.value"
                  :value="o.value"
                >
                  {{ o.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="mx-3">
            <div class="mb-1.5 text-xs font-medium text-muted-foreground">
              选择日期范围
            </div>
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
              <span>{{ loadingMenu ? "查询中…" : "查询" }}</span>
            </Button>
          </div>
        </div>

        <nav class="flex-1 overflow-auto pb-3 scrollbar-thin pt-2">
          <ul class="space-y-1">
            <li>
              <button
                type="button"
                class="flex items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors"
                :class="
                  activeKey === 'dashboard'
                    ? 'bg-zinc-200 text-zinc-900 shadow-inner shadow-zinc-300/70'
                    : 'hover:bg-accent/60'
                "
                :disabled="!data"
                @click="selectDashboard"
              >
                <span class="truncate">数据汇总看板</span>
                <span
                  class="shrink-0 rounded px-2 py-0.5 text-xs transition-colors"
                  :class="
                    activeKey === 'dashboard'
                      ? 'text-zinc-900'
                      : 'bg-muted text-muted-foreground'
                  "
                  >汇总</span
                >
              </button>
            </li>
            <li
              v-if="loadingMenu"
              class="px-3 py-2 text-xs text-muted-foreground"
            >
              加载中...
            </li>
            <li
              v-else-if="!menuItems.length"
              class="px-3 py-2 text-xs text-muted-foreground"
            >
              暂无明细
            </li>
            <li
              v-for="item in menuItems"
              :key="item.fileName"
              :ref="(el) => setMenuItemRef(item.fileName, el)"
            >
              <button
                type="button"
                class="flex items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors"
                :class="
                  activeKey === `detail-${item.fileName}`
                    ? 'bg-zinc-200 text-zinc-900 font-medium shadow-inner shadow-zinc-300/70'
                    : 'hover:bg-accent/60'
                "
                @click="selectDetail(item)"
              >
                <span class="truncate">{{ item.date }}</span>
                <span
                  class="shrink-0 rounded px-2 py-0.5 text-xs transition-colors"
                  :class="
                    activeKey === `detail-${item.fileName}`
                      ? 'text-zinc-900'
                      : 'bg-muted text-muted-foreground'
                  "
                  >明细</span
                >
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
            <svg
              viewBox="0 0 24 24"
              class="h-5 w-5"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <button
            class="flex h-10 w-10 items-center justify-center rounded-md transition-colors"
            :class="
              activeKey === 'dashboard'
                ? 'bg-zinc-200 text-zinc-900 shadow-inner shadow-zinc-300/70'
                : 'hover:bg-accent hover:text-accent-foreground'
            "
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
            <svg
              viewBox="0 0 24 24"
              class="h-5 w-5"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M3 5h18M3 12h18M3 19h18" />
            </svg>
          </button>
        </nav>
      </template>
    </aside>

    <!-- 右侧内容 -->
    <main class="flex-1 overflow-auto bg-background p-6 scrollbar-thin">
      <div v-if="!ready" class="flex h-full items-center justify-center">
        <div
          class="rounded-lg border border-dashed border-border px-6 py-4 text-sm text-muted-foreground"
        >
          请在左侧选择店铺和日期范围
        </div>
      </div>

      <div v-else-if="errorMsg" class="flex h-full items-center justify-center">
        <div
          class="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {{ errorMsg }}
        </div>
      </div>

      <DashboardView
        v-if="activeKey === 'dashboard' && data"
        ref="dashboardRef"
        :data="data"
        :shop-name="shopName"
        :start-date="dateRange.start"
        :end-date="dateRange.end"
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
