import {
  parseRecurringLocationSchedule,
  parseStructuredSupportSchedule,
  recurringLocationMatchesDate,
  requestedSupportDate,
  scheduleHasUpcomingOccurrence,
  scheduleMatchesDate,
  vietnamDateAndTime,
} from "./support-schedule";

describe("structured support schedule", () => {
  const now = { date: "2026-10-22", time: "10:00" };

  it("recognizes the requested date and time in Vietnam", () => {
    expect(vietnamDateAndTime(new Date("2026-10-22T03:00:00Z"))).toEqual(now);
    expect(requestedSupportDate("Có suất cơm ngày mai lúc 11h không?", now)).toEqual({
      date: "2026-10-23", time: "11:00",
    });
    expect(requestedSupportDate("Tôi cần hỗ trợ 24/10/2026", now)).toEqual({ date: "2026-10-24", time: undefined });
    expect(requestedSupportDate("Có chương trình thứ 7 lúc 10h30 không?", now)).toEqual({
      date: "2026-10-24", time: "10:30",
    });
  });

  it("matches a one-time event only during its exact date and hours", () => {
    const schedule = parseStructuredSupportSchedule({
      scheduleType: "ONE_TIME", startsOn: "2026-10-24", startTime: "09:00", endTime: "11:00",
    });
    expect(schedule).not.toBeNull();
    expect(scheduleMatchesDate(schedule!, "2026-10-24", "10:00")).toBe(true);
    expect(scheduleMatchesDate(schedule!, "2026-10-24", "12:00")).toBe(false);
    expect(scheduleMatchesDate(schedule!, "2026-10-25")).toBe(false);
    expect(scheduleHasUpcomingOccurrence(schedule!, now)).toBe(true);
    expect(scheduleHasUpcomingOccurrence(schedule!, { date: "2026-10-24", time: "11:00" })).toBe(false);
  });

  it("matches a weekly event only on selected weekdays within its date range", () => {
    const schedule = parseStructuredSupportSchedule({
      scheduleType: "WEEKLY", startsOn: "2026-10-22", endsOn: "2026-11-02",
      startTime: "09:00", endTime: "12:00", weekdays: [1],
    });
    expect(schedule).not.toBeNull();
    expect(scheduleMatchesDate(schedule!, "2026-10-26")).toBe(true);
    expect(scheduleMatchesDate(schedule!, "2026-10-27")).toBe(false);
    expect(scheduleHasUpcomingOccurrence(schedule!, now)).toBe(true);
    expect(scheduleHasUpcomingOccurrence(schedule!, { date: "2026-11-03", time: "10:00" })).toBe(false);
  });

  it("rejects invalid or incomplete calendar data", () => {
    expect(parseStructuredSupportSchedule({ scheduleType: "ONE_TIME", startsOn: "2026-13-01", startTime: "09:00", endTime: "10:00" })).toBeNull();
    expect(parseStructuredSupportSchedule({ scheduleType: "WEEKLY", startsOn: "2026-10-22", endsOn: "2026-11-01", startTime: "09:00", endTime: "10:00", weekdays: [] })).toBeNull();
  });

  it("matches a fixed reception point by weekday and opening hours", () => {
    const schedule = parseRecurringLocationSchedule({ weekdays: [1, 2], startTime: "09:00", endTime: "11:00" });
    expect(schedule).not.toBeNull();
    expect(recurringLocationMatchesDate(schedule!, "2026-10-26", "10:00")).toBe(true);
    expect(recurringLocationMatchesDate(schedule!, "2026-10-27", "11:00")).toBe(false);
    expect(recurringLocationMatchesDate(schedule!, "2026-10-28")).toBe(false);
    expect(parseRecurringLocationSchedule({ weekdays: [1], startTime: "11:00", endTime: "09:00" })).toBeNull();
  });
});
