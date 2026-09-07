import { TestBed } from '@angular/core/testing';

import { AdminUsersMockService } from './admin-users-mock.service';

describe('AdminUsersMockService', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
  });

  afterEach(() => localStorage.clear());

  it('returns the default user list', () => {
    const service = TestBed.inject(AdminUsersMockService);

    expect(service.list()).toHaveLength(8);
  });

  it('persists a locked status', () => {
    const service = TestBed.inject(AdminUsersMockService);

    service.toggleLocked('USR-001');

    expect(service.list().find((user) => user.id === 'USR-001')?.status).toBe('LOCKED');
  });
});
