export interface StructuredSupportSchedule {
  readonly scheduleType: "ONE_TIME" | "WEEKLY";
  readonly startsOn: string;
  readonly endsOn?: string;
  readonly startTime: string;
  readonly endTime: string;
  readonly weekdays?: readonly number[];
}

export interface RecurringLocationSchedule {
  readonly weekdays: readonly number[];
  readonly startTime: string;
  readonly endTime: string;
}

export function parseRecurringLocationSchedule(payload: Record<string, unknown>): RecurringLocationSchedule | null {
  const { weekdays, startTime, endTime } = payload;
  if (!Array.isArray(weekdays) || !weekdays.length ||
    !weekdays.every((day) => Number.isInteger(day) && day >= 1 && day <= 7) ||
    typeof startTime !== "string" || typeof endTime !== "string" ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime) ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(endTime) || endTime <= startTime) return null;
  return { weekdays, startTime, endTime };
}

export function recurringLocationMatchesDate(
  schedule: RecurringLocationSchedule, date: string, time?: string,
): boolean {
  return schedule.weekdays.includes(new Date(`${date}T00:00:00Z`).getUTCDay() || 7) &&
    (!time || (time >= schedule.startTime && time < schedule.endTime));
}

export function vietnamDateAndTime(now = new Date()): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(now);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return { date: `${part("year")}-${part("month")}-${part("day")}`, time: `${part("hour")}:${part("minute")}` };
}

export function parseStructuredSupportSchedule(payload: Record<string, unknown>): StructuredSupportSchedule | null {
  const scheduleType = payload["scheduleType"];
  const startsOn = payload["startsOn"];
  const endsOn = payload["endsOn"];
  const startTime = payload["startTime"];
  const endTime = payload["endTime"];
  const weekdays = payload["weekdays"];
  if ((scheduleType !== "ONE_TIME" && scheduleType !== "WEEKLY") ||
    typeof startsOn !== "string" || typeof startTime !== "string" || typeof endTime !== "string") return null;
  const validDate = (value: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const parsed = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  };
  if (!validDate(startsOn) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime) ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(endTime) || endTime <= startTime) return null;
  if (scheduleType === "ONE_TIME") return { scheduleType, startsOn, startTime, endTime };
  if (typeof endsOn !== "string" || !validDate(endsOn) || endsOn < startsOn ||
    !Array.isArray(weekdays) || !weekdays.length ||
    !weekdays.every((day) => Number.isInteger(day) && day >= 1 && day <= 7)) return null;
  return { scheduleType, startsOn, endsOn, startTime, endTime, weekdays };
}

function weekday(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay() || 7;
}

function addDays(date: string, count: number): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + count);
  return value.toISOString().slice(0, 10);
}

export function scheduleMatchesDate(
  schedule: StructuredSupportSchedule,
  date: string,
  time?: string,
): boolean {
  if (time && (time < schedule.startTime || time >= schedule.endTime)) return false;
  if (schedule.scheduleType === "ONE_TIME") return schedule.startsOn === date;
  return date >= schedule.startsOn && date <= (schedule.endsOn ?? "") &&
    Boolean(schedule.weekdays?.includes(weekday(date)));
}

export function scheduleHasUpcomingOccurrence(
  schedule: StructuredSupportSchedule,
  now = vietnamDateAndTime(),
): boolean {
  if (schedule.scheduleType === "ONE_TIME") {
    return schedule.startsOn > now.date ||
      (schedule.startsOn === now.date && schedule.endTime > now.time);
  }
  const start = schedule.startsOn > now.date ? schedule.startsOn : now.date;
  for (let offset = 0; offset < 7; offset += 1) {
    const date = addDays(start, offset);
    if (date > (schedule.endsOn ?? "")) break;
    if (scheduleMatchesDate(schedule, date) && (date > now.date || schedule.endTime > now.time)) return true;
  }
  return false;
}

export function requestedSupportDate(message: string, now = vietnamDateAndTime()): { date: string; time?: string } | null {
  const normalized = message.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/đ/g, "d");
  const explicit = /\b(?:ngay\s+)?(\d{1,2})[/-](\d{1,2})(?:[/-](\d{4}))?\b/.exec(normalized);
  const timeMatch = /\b(?:luc\s+|vao\s+)?([01]?\d|2[0-3])(?:h|:)([0-5]\d)?\b/.exec(normalized);
  const time = timeMatch ? `${timeMatch[1].padStart(2, "0")}:${timeMatch[2] ?? "00"}` : undefined;
  let date: string | null = null;
  if (explicit) {
    const year = explicit[3] ?? now.date.slice(0, 4);
    const candidate = `${year}-${explicit[2].padStart(2, "0")}-${explicit[1].padStart(2, "0")}`;
    const parsed = new Date(`${candidate}T00:00:00Z`);
    if (!Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === candidate) date = candidate;
  } else if (/\bhom nay\b/.test(normalized)) {
    date = now.date;
  } else if (/\bngay mai\b/.test(normalized)) {
    date = addDays(now.date, 1);
  } else if (/\bngay kia\b/.test(normalized)) {
    date = addDays(now.date, 2);
  } else {
    const weekdayMatch = /\bthu (hai|ba|tu|nam|sau|bay|[2-7])\b|\bchu nhat\b/.exec(normalized);
    if (weekdayMatch) {
      const desired = weekdayMatch[0] === "chu nhat" ? 7 :
        ({ hai: 1, ba: 2, tu: 3, nam: 4, sau: 5, bay: 6,
          "2": 1, "3": 2, "4": 3, "5": 4, "6": 5, "7": 6 } as Record<string, number>)[weekdayMatch[1]];
      const delta = (desired - weekday(now.date) + 7) % 7;
      date = addDays(now.date, delta + (/\btuan sau\b/.test(normalized) ? 7 : 0));
    }
  }
  return date ? { date, time } : null;
}
