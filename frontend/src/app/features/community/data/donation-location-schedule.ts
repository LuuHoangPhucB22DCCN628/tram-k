export interface RecurringLocationSchedule {
  readonly weekdays: readonly number[];
  readonly startTime: string;
  readonly endTime: string;
}

const DAYS = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật'];

export function validRecurringLocationSchedule(value: RecurringLocationSchedule): boolean {
  return Array.isArray(value.weekdays) && value.weekdays.length > 0 &&
    value.weekdays.every((day) => Number.isInteger(day) && day >= 1 && day <= 7) &&
    /^([01]\d|2[0-3]):[0-5]\d$/.test(value.startTime) &&
    /^([01]\d|2[0-3]):[0-5]\d$/.test(value.endTime) &&
    value.endTime > value.startTime;
}

export function recurringLocationScheduleLabel(value: RecurringLocationSchedule): string {
  const days = [...new Set(value.weekdays)].sort((a, b) => a - b);
  const dayLabel = days.length === 7 ? 'Hằng ngày' : days.map((day) => DAYS[day - 1]).join(', ');
  return `${dayLabel} (hằng tuần), ${value.startTime}–${value.endTime}`;
}
