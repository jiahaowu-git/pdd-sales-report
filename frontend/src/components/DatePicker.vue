<script setup>
import { computed, ref } from 'vue';
import { CalendarIcon } from '@lucide/vue';
import { CalendarDate, DateFormatter, getLocalTimeZone, today, parseDate } from '@internationalized/date';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const props = defineProps({
  modelValue: { type: [String, null], default: null }, // 'YYYY-MM-DD' 或 null
  placeholder: { type: String, default: '选择日期' },
});
const emit = defineEmits(['update:modelValue']);

const df = new DateFormatter('zh-CN', { dateStyle: 'long' });
const defaultPlaceholder = today(getLocalTimeZone());

const open = ref(false);

const date = computed({
  get() {
    if (!props.modelValue) return undefined;
    try {
      return parseDate(props.modelValue);
    } catch {
      return undefined;
    }
  },
  set(v) {
    if (!v) {
      emit('update:modelValue', null);
      return;
    }
    const y = v.year;
    const m = String(v.month).padStart(2, '0');
    const d = String(v.day).padStart(2, '0');
    emit('update:modelValue', `${y}-${m}-${d}`);
  },
});

const displayText = computed(() => {
  if (!props.modelValue) return props.placeholder;
  try {
    return df.format(parseDate(props.modelValue).toDate(getLocalTimeZone()));
  } catch {
    return props.modelValue;
  }
});
</script>

<template>
  <Popover v-model:open="open">
    <PopoverTrigger as-child>
      <Button
        variant="outline"
        :class="cn(
          'w-full justify-start text-left font-normal',
          !modelValue && 'text-muted-foreground',
        )"
      >
        <CalendarIcon class="mr-2 h-4 w-4" />
        <span class="truncate">{{ displayText }}</span>
      </Button>
    </PopoverTrigger>
    <PopoverContent class="w-auto p-0" align="start">
      <Calendar
        v-model="date"
        :default-placeholder="defaultPlaceholder"
        layout="month-and-year"
        initial-focus
        @update:model-value="open = false"
      />
    </PopoverContent>
  </Popover>
</template>