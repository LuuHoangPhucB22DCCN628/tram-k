import { TestBed } from '@angular/core/testing';

import { CommunityMealRegistrationService } from './community-meal-registration.service';

describe('CommunityMealRegistrationService', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
  });

  afterEach(() => localStorage.clear());

  it('lists registrations for the correct member and prevents duplicates', () => {
    const service = TestBed.inject(CommunityMealRegistrationService);

    expect(service.register('tan-trieu', 'MEMBER-A')).toBe(true);
    expect(service.register('tan-trieu', 'MEMBER-A')).toBe(false);
    expect(service.register('ung-buou-ha-noi', 'MEMBER-B')).toBe(true);
    expect(service.registrationsFor('MEMBER-A').map((item) => item.locationId)).toEqual([
      'tan-trieu',
    ]);
  });

  it('only cancels an existing registration owned by the member', () => {
    const service = TestBed.inject(CommunityMealRegistrationService);
    service.register('tan-trieu', 'MEMBER-A');

    expect(service.unregister('tan-trieu', 'MEMBER-B')).toBe(false);
    expect(service.unregister('tan-trieu', 'MEMBER-A')).toBe(true);
    expect(service.registrationsFor('MEMBER-A')).toHaveLength(0);
  });
});
