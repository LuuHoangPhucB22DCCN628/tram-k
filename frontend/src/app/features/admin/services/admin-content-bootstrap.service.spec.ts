import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { ManagedResourceAdminApiService } from '@core/data/managed-resource-admin-api.service';
import { ManagedResourceSyncService } from '@core/data/managed-resource-sync.service';
import { MediaUploadApiService } from '@core/data/media-upload-api.service';
import { MOCK_CONTENT_ITEMS } from '@features/content/data/content.mock-data';
import { DEFAULT_PODCASTS } from '@features/mental-health/data/podcast.data';

import { AdminContentBootstrapService } from './admin-content-bootstrap.service';

describe('AdminContentBootstrapService', () => {
  const adminApi = { state: vi.fn() };
  const sync = { upsertResult: vi.fn(() => of(true)) };
  const media = { upload: vi.fn() };

  beforeEach(() => {
    localStorage.clear();
    adminApi.state.mockReset();
    sync.upsertResult.mockClear();
    media.upload.mockReset();
    TestBed.configureTestingModule({
      providers: [
        AdminContentBootstrapService,
        { provide: ManagedResourceAdminApiService, useValue: adminApi },
        { provide: ManagedResourceSyncService, useValue: sync },
        { provide: MediaUploadApiService, useValue: media },
      ],
    });
  });

  afterEach(() => localStorage.clear());

  it('seeds every default article and podcast when PostgreSQL is not initialized', async () => {
    adminApi.state.mockReturnValue(of({ initialized: false, items: [] }));
    const service = TestBed.inject(AdminContentBootstrapService);

    service.initialize();

    await vi.waitFor(() => {
      expect(service.loading()).toBe(false);
      expect(service.message()).toContain('đã được đồng bộ');
    });
    expect(sync.upsertResult).toHaveBeenCalledTimes(
      MOCK_CONTENT_ITEMS.length + DEFAULT_PODCASTS.length,
    );
    expect(media.upload).not.toHaveBeenCalled();
  });
});
