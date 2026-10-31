import { TestBed } from '@angular/core/testing';

import { CharityProgramClockService } from './charity-program-clock.service';

describe('CharityProgramClockService', () => {
  afterEach(() => vi.useRealTimers());

  it('updates the current time while a page remains open', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-24T03:59:00Z'));
    const clock = TestBed.inject(CharityProgramClockService);

    expect(clock.now().toISOString()).toBe('2026-10-24T03:59:00.000Z');
    vi.advanceTimersByTime(15_000);
    expect(clock.now().toISOString()).toBe('2026-10-24T03:59:15.000Z');
  });
});
