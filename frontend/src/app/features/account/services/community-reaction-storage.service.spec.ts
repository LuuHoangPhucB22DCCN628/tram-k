import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AuthService } from '@core/auth/auth.service';
import { CommunityEngagementApiService } from './community-engagement-api.service';
import { CommunityReactionStorageService } from './community-reaction-storage.service';

describe('CommunityReactionStorageService', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
  });
  afterEach(() => localStorage.clear());

  it('keeps at most one reaction per account and story', () => {
    const service = TestBed.inject(CommunityReactionStorageService);
    expect(service.toggle('USER-1', '/story/1', 'LIKE')).toBe('LIKE');
    expect(service.toggle('USER-1', '/story/1', 'LOVE')).toBe('LOVE');
    expect(service.reactions()).toHaveLength(1);
    expect(service.countsFor('/story/1')).toEqual({ LIKE: 0, LOVE: 1, SUPPORT: 0 });
  });

  it('removes a reaction when the same reaction is selected again', () => {
    const service = TestBed.inject(CommunityReactionStorageService);
    service.toggle('USER-1', '/story/1', 'SUPPORT');
    expect(service.toggle('USER-1', '/story/1', 'SUPPORT')).toBeNull();
    expect(service.reactionFor('USER-1', '/story/1')).toBeNull();
  });

  it('counts reactions independently for each story', () => {
    const service = TestBed.inject(CommunityReactionStorageService);
    service.toggle('USER-1', '/story/1', 'LOVE');
    service.toggle('USER-2', '/story/1', 'LOVE');
    service.toggle('USER-1', '/story/2', 'LIKE');
    expect(service.countsFor('/story/1').LOVE).toBe(2);
    expect(service.countsFor('/story/2').LOVE).toBe(0);
  });

  it('retains a legacy reaction if the server rejects the import', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [
      { provide: AuthService, useValue: { currentUser: () => ({ id: 'USER-1' }), authMode: () => 'REMOTE' } },
      { provide: CommunityEngagementApiService, useValue: { available: true, importReaction: () => of(null) } },
    ] });
    const service = TestBed.inject(CommunityReactionStorageService);
    service.toggle('USER-1', '/goc-tam-ly?story=POST-1#cau-chuyen-POST-1', 'LOVE');
    await expect(service.migrateLegacyFor('USER-1')).resolves.toEqual({ migrated: 0, remaining: 1 });
    expect(service.legacyCountFor('USER-1')).toBe(1);
  });
});
