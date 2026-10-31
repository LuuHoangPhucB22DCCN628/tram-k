import type {
  CharityProgramProposal,
  CharityProgramStatus,
  CharityScheduleType,
} from './charity-program.models';

export type CharityProgramDisplayStatus = CharityProgramStatus | 'COMPLETED' | 'NEEDS_SCHEDULE';

export interface StructuredProgramSchedule {
  readonly scheduleType: CharityScheduleType;
  readonly startsOn: string;
  readonly endsOn?: string;
  readonly startTime: string;
  readonly endTime: string;
  readonly weekdays?: readonly number[];
}

const WEEKDAY_LABELS = [
  '',
  'Thứ Hai',
  'Thứ Ba',
  'Thứ Tư',
  'Thứ Năm',
  'Thứ Sáu',
  'Thứ Bảy',
  'Chủ Nhật',
];

export function vietnamToday(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const value = (name: string) => parts.find((part) => part.type === name)?.value ?? '';
  return `${value('year')}-${value('month')}-${value('day')}`;
}

export function validProgramSchedule(
  value: StructuredProgramSchedule,
  today = vietnamToday(),
): boolean {
  const validDate = (date: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
    const parsed = new Date(`${date}T00:00:00Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
  };
  const validTime = (time: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(time);
  if (
    !validDate(value.startsOn) ||
    value.startsOn < today ||
    !validTime(value.startTime) ||
    !validTime(value.endTime) ||
    value.endTime <= value.startTime
  )
    return false;
  if (value.scheduleType === 'ONE_TIME') return true;
  return (
    value.scheduleType === 'WEEKLY' &&
    !!value.endsOn &&
    validDate(value.endsOn) &&
    value.endsOn >= value.startsOn &&
    Array.isArray(value.weekdays) &&
    value.weekdays.length > 0 &&
    value.weekdays.every((day) => Number.isInteger(day) && day >= 1 && day <= 7)
  );
}

export function programScheduleLabel(value: StructuredProgramSchedule): string {
  const formatDate = (date: string) => date.split('-').reverse().join('/');
  const time = `${value.startTime}–${value.endTime}`;
  if (value.scheduleType === 'ONE_TIME') return `${time}, ngày ${formatDate(value.startsOn)}`;
  const weekdays = [...new Set(value.weekdays ?? [])]
    .sort((a, b) => a - b)
    .map((day) => WEEKDAY_LABELS[day])
    .join(', ');
  return `${weekdays} (hằng tuần), ${time}; từ ${formatDate(value.startsOn)} đến ${formatDate(value.endsOn ?? '')}`;
}

export function programScheduleHasUpcomingOccurrence(
  value: StructuredProgramSchedule,
  now = new Date(),
): boolean {
  if (!validProgramSchedule(value, value.startsOn)) return false;
  const today = vietnamToday(now);
  const timeParts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const part = (name: string) => timeParts.find((item) => item.type === name)?.value ?? '';
  const currentTime = `${part('hour')}:${part('minute')}`;
  if (value.scheduleType === 'ONE_TIME') {
    return value.startsOn > today || (value.startsOn === today && value.endTime > currentTime);
  }
  const start = value.startsOn > today ? value.startsOn : today;
  for (let offset = 0; offset < 7; offset += 1) {
    const date = new Date(`${start}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + offset);
    const candidate = date.toISOString().slice(0, 10);
    if (candidate > (value.endsOn ?? '')) break;
    const weekday = date.getUTCDay() || 7;
    if (value.weekdays?.includes(weekday) && (candidate > today || value.endTime > currentTime))
      return true;
  }
  return false;
}

export function programStructuredSchedule(program: CharityProgramProposal): StructuredProgramSchedule | null {
  if (!program.scheduleType) return null;
  const schedule = {
    scheduleType: program.scheduleType,
    startsOn: program.startsOn ?? '',
    endsOn: program.endsOn,
    startTime: program.startTime ?? '',
    endTime: program.endTime ?? '',
    weekdays: program.weekdays,
  };
  return validProgramSchedule(schedule, schedule.startsOn) ? schedule : null;
}

export function programHasUpcomingOccurrence(
  program: CharityProgramProposal,
  now = new Date(),
): boolean {
  const schedule = programStructuredSchedule(program);
  return schedule !== null && programScheduleHasUpcomingOccurrence(schedule, now);
}

export function programDisplayStatus(
  program: CharityProgramProposal,
  now = new Date(),
): CharityProgramDisplayStatus {
  if (program.status !== 'PUBLISHED') return program.status;
  if (!programStructuredSchedule(program)) return 'NEEDS_SCHEDULE';
  return programHasUpcomingOccurrence(program, now) ? 'PUBLISHED' : 'COMPLETED';
}

export function programDisplayStatusLabel(status: CharityProgramDisplayStatus): string {
  return {
    PENDING: 'Chờ duyệt',
    PUBLISHED: 'Đã xuất bản',
    REJECTED: 'Cần chỉnh sửa',
    COMPLETED: 'Đã hoàn thành',
    NEEDS_SCHEDULE: 'Cần cập nhật lịch',
  }[status];
}
