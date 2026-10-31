import type { CharityProgramProposal } from './charity-program.models';
import {
  programDisplayStatus,
  programHasUpcomingOccurrence,
  programScheduleLabel,
  validProgramSchedule,
} from './charity-program-schedule';

describe('charity program schedule', () => {
  it('requires a future specific date and an end time after the start time', () => {
    const schedule = {
      scheduleType: 'ONE_TIME' as const,
      startsOn: '2099-10-24',
      startTime: '09:00',
      endTime: '11:00',
    };
    expect(validProgramSchedule(schedule, '2026-10-22')).toBe(true);
    expect(programScheduleLabel(schedule)).toBe('09:00–11:00, ngày 24/10/2099');
    expect(validProgramSchedule({ ...schedule, endTime: '08:00' }, '2026-10-22')).toBe(false);
    expect(validProgramSchedule({ ...schedule, startsOn: '2026-10-21' }, '2026-10-22')).toBe(false);
  });

  it('requires selected weekdays and an end date for a weekly series', () => {
    const schedule = {
      scheduleType: 'WEEKLY' as const,
      startsOn: '2099-10-01',
      endsOn: '2099-10-31',
      startTime: '10:00',
      endTime: '12:00',
      weekdays: [1, 6],
    };
    expect(validProgramSchedule(schedule, '2026-10-22')).toBe(true);
    expect(programScheduleLabel(schedule)).toContain('Thứ Hai, Thứ Bảy');
    expect(validProgramSchedule({ ...schedule, weekdays: [] }, '2026-10-22')).toBe(false);
  });

  it('marks a published one-time program completed at its end time in Vietnam', () => {
    const program = {
      status: 'PUBLISHED',
      scheduleType: 'ONE_TIME',
      startsOn: '2026-10-24',
      startTime: '09:00',
      endTime: '11:00',
    } as CharityProgramProposal;

    expect(programHasUpcomingOccurrence(program, new Date('2026-10-24T03:59:00Z'))).toBe(true);
    expect(programDisplayStatus(program, new Date('2026-10-24T03:59:00Z'))).toBe('PUBLISHED');
    expect(programHasUpcomingOccurrence(program, new Date('2026-10-24T04:00:00Z'))).toBe(false);
    expect(programDisplayStatus(program, new Date('2026-10-24T04:00:00Z'))).toBe('COMPLETED');
    expect(program.status).toBe('PUBLISHED');
  });

  it('keeps a text-only published program out of registration until its schedule is repaired', () => {
    const program = { status: 'PUBLISHED', schedule: 'Thứ Hai' } as CharityProgramProposal;
    expect(programHasUpcomingOccurrence(program)).toBe(false);
    expect(programDisplayStatus(program)).toBe('NEEDS_SCHEDULE');
  });
});
