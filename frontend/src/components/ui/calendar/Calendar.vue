<script setup>
import { cn } from '@/lib/utils';
import {
  CalendarRoot,
  CalendarHeader,
  CalendarHeading,
  CalendarGrid,
  CalendarGridBody,
  CalendarGridRow,
  CalendarGridHead,
  CalendarHeadCell,
  CalendarCell,
  CalendarCellTrigger,
  CalendarPrev,
  CalendarNext,
  useForwardPropsEmits,
} from 'reka-ui';
import { ChevronLeft, ChevronRight } from '@lucide/vue';

const props = defineProps({
  modelValue: { type: [Object, Array, null], default: undefined },
  defaultValue: { type: [Object, Array, null], default: undefined },
  placeholder: { type: Object, default: undefined },
  defaultPlaceholder: { type: Object, default: undefined },
  minValue: { type: Object, default: undefined },
  maxValue: { type: Object, default: undefined },
  layout: { type: String, default: 'month-and-year' },
  initialFocus: { type: Boolean, default: false },
  preventDeselect: { type: Boolean, default: false },
  class: { type: String, default: '' },
});

const emits = defineEmits(['update:modelValue', 'update:placeholder']);

const delegated = useForwardPropsEmits(props, emits);
</script>

<template>
  <CalendarRoot
    v-slot="{ grid, weekDays }"
    v-bind="delegated"
    :class="cn('p-3', props.class)"
  >
    <CalendarHeader class="flex items-center justify-between pt-1 pb-2">
      <CalendarPrev
        class="inline-flex h-7 w-7 items-center justify-center rounded-md border border-transparent text-sm hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50 transition-colors"
      >
        <ChevronLeft class="h-4 w-4" />
      </CalendarPrev>
      <CalendarHeading class="text-sm font-medium" />
      <CalendarNext
        class="inline-flex h-7 w-7 items-center justify-center rounded-md border border-transparent text-sm hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50 transition-colors"
      >
        <ChevronRight class="h-4 w-4" />
      </CalendarNext>
    </CalendarHeader>

    <CalendarGrid class="w-full border-collapse">
      <CalendarGridHead>
        <CalendarGridRow class="flex w-full">
          <CalendarHeadCell
            v-for="day in weekDays"
            :key="day"
            class="text-muted-foreground rounded-md w-9 font-normal text-[0.8rem] flex-1 text-center"
          >
            {{ day }}
          </CalendarHeadCell>
        </CalendarGridRow>
      </CalendarGridHead>
      <CalendarGridBody>
        <CalendarGridRow
          v-for="(days, weekIdx) in grid"
          :key="`week-${weekIdx}`"
          class="mt-2 flex w-full"
        >
          <CalendarCell
            v-for="day in days"
            :key="day.key"
            :date="day"
            class="h-9 w-9 text-center text-sm p-0 relative flex-1"
          >
            <CalendarCellTrigger
              :day="day"
              :month="day.month"
              class="inline-flex h-9 w-9 items-center justify-center rounded-md text-sm font-normal transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-30 data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[selected]:bg-primary data-[selected]:text-primary-foreground data-[selected]:hover:bg-primary data-[selected]:hover:text-primary-foreground data-[today]:bg-accent/40 data-[outside-view]:text-muted-foreground/50 data-[disabled]:text-muted-foreground/50"
            />
          </CalendarCell>
        </CalendarGridRow>
      </CalendarGridBody>
    </CalendarGrid>
  </CalendarRoot>
</template>