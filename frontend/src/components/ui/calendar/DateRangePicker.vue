<script setup>
import { cn } from '@/lib/utils';
import {
  DateRangePickerRoot,
  DateRangePickerHeader,
  DateRangePickerHeading,
  DateRangePickerGrid,
  DateRangePickerGridBody,
  DateRangePickerGridRow,
  DateRangePickerGridHead,
  DateRangePickerHeadCell,
  DateRangePickerCell,
  DateRangePickerCellTrigger,
  DateRangePickerPrev,
  DateRangePickerNext,
  useForwardPropsEmits,
} from 'reka-ui';
import { ChevronLeft, ChevronRight } from '@lucide/vue';

const props = defineProps({
  modelValue: { type: [Object, null], default: undefined },
  defaultValue: { type: [Object, null], default: undefined },
  placeholder: { type: Object, default: undefined },
  defaultPlaceholder: { type: Object, default: undefined },
  minValue: { type: Object, default: undefined },
  maxValue: { type: Object, default: undefined },
  numberOfMonths: { type: Number, default: 2 },
  initialFocus: { type: Boolean, default: false },
  class: { type: String, default: '' },
});

const emits = defineEmits(['update:modelValue', 'update:placeholder']);

const delegated = useForwardPropsEmits(props, emits);
</script>

<template>
  <DateRangePickerRoot
    v-slot="{ grid, weekDays }"
    v-bind="delegated"
    :class="cn('p-3', props.class)"
  >
    <DateRangePickerHeader class="flex items-center justify-between pt-1 pb-2">
      <DateRangePickerPrev
        class="inline-flex h-7 w-7 items-center justify-center rounded-md border border-transparent text-sm hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50 transition-colors"
      >
        <ChevronLeft class="h-4 w-4" />
      </DateRangePickerPrev>
      <DateRangePickerHeading class="text-sm font-medium" />
      <DateRangePickerNext
        class="inline-flex h-7 w-7 items-center justify-center rounded-md border border-transparent text-sm hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50 transition-colors"
      >
        <ChevronRight class="h-4 w-4" />
      </DateRangePickerNext>
    </DateRangePickerHeader>

    <div class="flex gap-3">
      <template v-for="(monthGrid, index) in grid" :key="index">
        <DateRangePickerGrid class="w-full border-collapse">
          <DateRangePickerGridHead>
            <DateRangePickerGridRow class="flex w-full">
              <DateRangePickerHeadCell
                v-for="day in weekDays"
                :key="day"
                class="text-muted-foreground rounded-md w-9 font-normal text-[0.8rem] flex-1 text-center"
              >
                {{ day }}
              </DateRangePickerHeadCell>
            </DateRangePickerGridRow>
          </DateRangePickerGridHead>
          <DateRangePickerGridBody>
            <DateRangePickerGridRow
              v-for="(days, weekIdx) in monthGrid"
              :key="`week-${index}-${weekIdx}`"
              class="mt-2 flex w-full"
            >
              <DateRangePickerCell
                v-for="day in days"
                :key="day.key"
                :date="day"
                class="h-9 w-9 text-center text-sm p-0 relative flex-1"
              >
                <DateRangePickerCellTrigger
                  :day="day"
                  :month="day.month"
                  class="inline-flex h-9 w-9 items-center justify-center rounded-md text-sm font-normal transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-30 data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[selection-start]:bg-primary data-[selection-start]:text-primary-foreground data-[selection-end]:bg-primary data-[selection-end]:text-primary-foreground data-[selection-start]:rounded-l-md data-[selection-end]:rounded-r-md data-[in-selection]:rounded-none data-[in-selection]:bg-accent data-[in-selection]:text-accent-foreground data-[today]:bg-accent/40 data-[outside-view]:text-muted-foreground/50 data-[disabled]:text-muted-foreground/50"
                />
              </DateRangePickerCell>
            </DateRangePickerGridRow>
          </DateRangePickerGridBody>
        </DateRangePickerGrid>
      </template>
    </div>
  </DateRangePickerRoot>
</template>