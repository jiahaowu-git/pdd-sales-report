<script setup>
import { computed, ref, watch } from 'vue';
import { CalendarIcon } from '@lucide/vue';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronLeft, ChevronRight } from '@lucide/vue';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, format, addMonths, isSameDay, isWithinInterval, isBefore, isAfter,
} from 'date-fns';

const props = defineProps({
  // { start: 'YYYY-MM-DD' | null, end: 'YYYY-MM-DD' | null }
  modelValue: { type: Object, default: () => ({ start: null, end: null }) },
  placeholder: { type: String, default: '选择日期范围' },
});
const emit = defineEmits(['update:modelValue']);

const open = ref(false);
const today = new Date();
const viewMonth = ref(new Date(today.getFullYear(), today.getMonth(), 1));
const startDraft = ref(null);
const endDraft = ref(null);

watch(() => props.modelValue, (v) => {
  if (v?.start) startDraft.value = new Date(v.start);
  if (v?.end) endDraft.value = new Date(v.end);
}, { immediate: true, deep: true });

const weekdays = ['日', '一', '二', '三', '四', '五', '六'];

const days = computed(() => {
  const monthStart = startOfMonth(viewMonth.value);
  const monthEnd = endOfMonth(viewMonth.value);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  return eachDayOfInterval({ start: gridStart, end: gridEnd });
});

function inCurrentMonth(d) {
  return d.getMonth() === viewMonth.value.getMonth();
}
function isStart(d) { return startDraft.value && isSameDay(d, startDraft.value); }
function isEnd(d)   { return endDraft.value   && isSameDay(d, endDraft.value); }
function isInRange(d) {
  if (!startDraft.value || !endDraft.value) return false;
  return isWithinInterval(d, { start: startDraft.value, end: endDraft.value });
}

function pick(d) {
  if (!startDraft.value || (startDraft.value && endDraft.value)) {
    startDraft.value = d;
    endDraft.value = null;
    return;
  }
  if (isBefore(d, startDraft.value)) {
    endDraft.value = startDraft.value;
    startDraft.value = d;
  } else {
    endDraft.value = d;
  }
  const fmt = (x) => format(x, 'yyyy-MM-dd');
  emit('update:modelValue', { start: fmt(startDraft.value), end: fmt(endDraft.value) });
  open.value = false;
}

function prevMonth() { viewMonth.value = addMonths(viewMonth.value, -1); }
function nextMonth() { viewMonth.value = addMonths(viewMonth.value, 1); }

const displayText = computed(() => {
  const s = props.modelValue?.start, e = props.modelValue?.end;
  if (!s && !e) return props.placeholder;
  if (s && e) {
    try {
      return `${format(new Date(s), 'yyyy/M/d')} 至 ${format(new Date(e), 'yyyy/M/d')}`;
    } catch { return `${s} 至 ${e}`; }
  }
  if (s) try { return format(new Date(s), 'yyyy/M/d'); } catch { return s; }
  if (e) try { return format(new Date(e), 'yyyy/M/d'); } catch { return e; }
  return props.placeholder;
});
</script>

<template>
  <Popover v-model:open="open">
    <PopoverTrigger as-child>
      <Button
        variant="outline"
        :class="cn(
          'w-full justify-start text-left font-normal',
          (!modelValue?.start || !modelValue?.end) && 'text-muted-foreground',
        )"
      >
        <CalendarIcon class="mr-2 h-4 w-4" />
        <span class="truncate">{{ displayText }}</span>
      </Button>
    </PopoverTrigger>
    <PopoverContent
      class="w-auto p-0"
      align="start"
      side="bottom"
      :side-offset="4"
      :collision-padding="8"
    >
      <div class="p-3 w-[280px]">
        <div class="flex items-center justify-between pb-2">
          <button
            type="button"
            class="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-accent transition-colors"
            @click="prevMonth"
          >
            <ChevronLeft class="h-4 w-4" />
          </button>
          <div class="text-sm font-medium">{{ format(viewMonth, 'yyyy 年 M 月') }}</div>
          <button
            type="button"
            class="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-accent transition-colors"
            @click="nextMonth"
          >
            <ChevronRight class="h-4 w-4" />
          </button>
        </div>

        <div class="grid grid-cols-7 mb-1">
          <div
            v-for="w in weekdays"
            :key="w"
            class="text-muted-foreground text-[0.8rem] text-center py-1"
          >
            {{ w }}
          </div>
        </div>

        <div class="grid grid-cols-7 gap-1">
          <button
            v-for="d in days"
            :key="d.toISOString()"
            type="button"
            class="h-8 w-8 rounded-md text-sm font-normal transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-30"
            :class="{
              'text-muted-foreground/50': !inCurrentMonth(d),
              'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground': isStart(d) || isEnd(d),
              'rounded-l-md': isStart(d) && (!endDraft || isSameDay(startDraft, endDraft)),
              'rounded-r-md': isEnd(d) && (!endDraft || isSameDay(startDraft, endDraft)),
              'bg-accent text-accent-foreground rounded-none': isInRange(d) && !isStart(d) && !isEnd(d),
              'bg-accent/40': isSameDay(d, today),
            }"
            @click="pick(d)"
          >
            {{ d.getDate() }}
          </button>
        </div>
      </div>
    </PopoverContent>
  </Popover>
</template>