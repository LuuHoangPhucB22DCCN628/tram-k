import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { ManagedResourceAdminApiService } from '@core/data/managed-resource-admin-api.service';
import { ManagedResourcePublicApiService } from '@core/data/managed-resource-public-api.service';
import { ManagedResourceSyncService } from '@core/data/managed-resource-sync.service';

import {
  type DonationLocationMarker,
  HANOI_DONATION_LOCATIONS,
} from '../data/hanoi-donation-locations.data';

interface LocationAdminState {
  readonly overrides: Readonly<Record<string, DonationLocationMarker>>;
  readonly created: readonly DonationLocationMarker[];
}

@Injectable({ providedIn: 'root' })
export class CommunityLocationAdminStorageService {
  private readonly storageKey = 'tram-k.community-location-admin-state';
  private readonly publicApi = inject(ManagedResourcePublicApiService);
  private readonly adminApi = inject(ManagedResourceAdminApiService);
  private readonly resourceSync = inject(ManagedResourceSyncService);
  private readonly baseIds = new Set(HANOI_DONATION_LOCATIONS.map((item) => item.id));
  private readonly state = signal<LocationAdminState>(this.readLegacy());
  private publicLoading = false;
  private adminLoading = false;
  private loadVersion = 0;

  readonly changes = this.state.asReadonly();
  readonly adminReady = signal(false);
  readonly loadError = signal('');

  initializePublic(): void {
    if (this.publicLoading || this.adminLoading) return;
    this.publicLoading = true;
    const version = ++this.loadVersion;
    this.publicApi.state('DONATION_LOCATION', this.isLocation).subscribe((remote) => {
      this.publicLoading = false;
      if (!remote) return;
      if (version !== this.loadVersion) return;
      this.replaceFromItems([...this.legacyItems(), ...remote.items]);
    });
  }

  initializeAdmin(): void {
    if (this.adminLoading) return;
    this.adminLoading = true;
    this.adminReady.set(false);
    this.loadError.set('');
    const version = ++this.loadVersion;
    this.adminApi.state('DONATION_LOCATION').subscribe(async (remote) => {
      if (!remote) {
        this.adminLoading = false;
        this.loadError.set('Chưa kết nối được máy chủ. Không thể lưu điểm tiếp nhận lúc này.');
        return;
      }

      const saved = remote.items.map((item) => item.payload).filter(this.isLocation);
      const existingIds = new Set(saved.map((item) => item.id));
      const legacy = this.legacyItems();
      const migrated: DonationLocationMarker[] = [];
      let migrationSucceeded = true;
      for (const item of legacy) {
        if (existingIds.has(item.id)) continue;
        if (!(await firstValueFrom(this.resourceSync.upsertResult(this.asResource(item))))) {
          migrationSucceeded = false;
          break;
        }
        migrated.push(item);
      }

      if (version === this.loadVersion) {
        this.replaceFromItems([...legacy, ...saved, ...migrated]);
      }
      if (migrationSucceeded) {
        localStorage.removeItem(this.storageKey);
        this.loadError.set('');
      } else {
        this.loadError.set(
          'Một số điểm cũ chưa chuyển lên máy chủ, có thể do thiếu GPS. Dữ liệu trong trình duyệt vẫn được giữ lại; hãy chỉnh sửa và bổ sung tọa độ.',
        );
      }
      this.adminLoading = false;
      this.adminReady.set(true);
    });
  }

  resolve(base: readonly DonationLocationMarker[]): readonly DonationLocationMarker[] {
    const state = this.state();
    return [
      ...base.map((item) => this.withDefaultRegion(state.overrides[item.id] ?? item)),
      ...state.created.map((item) => this.withDefaultRegion(item)),
    ];
  }

  active(
    base: readonly DonationLocationMarker[],
    regionId?: string,
  ): readonly DonationLocationMarker[] {
    return this.resolve(base).filter(
      (item) => item.status === 'ACTIVE' && (!regionId || item.regionId === regionId),
    );
  }

  async saveRemote(location: DonationLocationMarker): Promise<boolean> {
    if (!this.adminReady()) return false;
    const saved = await firstValueFrom(this.resourceSync.upsertResult(this.asResource(location)));
    if (saved) this.apply(location);
    return saved;
  }

  // Preserves older browser data and existing isolated tests; admin edits use saveRemote.
  save(_baseIds: readonly string[], location: DonationLocationMarker): void {
    this.apply(location);
    localStorage.setItem(this.storageKey, JSON.stringify(this.state()));
  }

  private apply(location: DonationLocationMarker): void {
    const state = this.state();
    if (this.baseIds.has(location.id)) {
      this.state.set({ ...state, overrides: { ...state.overrides, [location.id]: location } });
      return;
    }
    const created = state.created.some((item) => item.id === location.id)
      ? state.created.map((item) => (item.id === location.id ? location : item))
      : [location, ...state.created];
    this.state.set({ ...state, created });
  }

  private asResource(location: DonationLocationMarker) {
    return {
      sourceId: location.id,
      type: 'DONATION_LOCATION' as const,
      status: 'PUBLISHED' as const,
      title: location.title,
      description: (location.description.join(' ') || location.title).slice(0, 1000),
      eyebrow: 'Điểm tiếp nhận',
      metadata: `${location.address} · ${location.schedule}`.slice(0, 255),
      imageUrl: location.image,
      imageAlt: location.title,
      link: `/cong-dong/diem-quyen-gop/${encodeURIComponent(location.regionId)}?location=${encodeURIComponent(location.id)}`,
      publishedAt: new Date().toISOString(),
      payload: location as unknown as Readonly<Record<string, unknown>>,
    };
  }

  private replaceFromItems(items: readonly DonationLocationMarker[]): void {
    const unique = [
      ...new Map(items.map((item) => [item.id, this.withDefaultRegion(item)])).values(),
    ];
    const overrides: Record<string, DonationLocationMarker> = {};
    const created: DonationLocationMarker[] = [];
    for (const item of unique) {
      if (this.baseIds.has(item.id)) overrides[item.id] = item;
      else created.push(item);
    }
    this.state.set({ overrides, created });
  }

  private legacyItems(): DonationLocationMarker[] {
    const legacy = this.readLegacy();
    return [...Object.values(legacy.overrides), ...legacy.created]
      .map((item) => this.withDefaultRegion(item))
      .filter(this.isLocation);
  }

  private withDefaultRegion(location: DonationLocationMarker): DonationLocationMarker {
    return location.regionId ? location : { ...location, regionId: 'ha-noi' };
  }

  private isLocation(value: unknown): value is DonationLocationMarker {
    if (!value || typeof value !== 'object') return false;
    const item = value as Partial<DonationLocationMarker>;
    return (
      typeof item.id === 'string' &&
      typeof item.regionId === 'string' &&
      typeof item.label === 'string' &&
      typeof item.title === 'string' &&
      typeof item.image === 'string' &&
      Array.isArray(item.description) &&
      item.description.every((part) => typeof part === 'string') &&
      typeof item.schedule === 'string' &&
      typeof item.address === 'string' &&
      typeof item.contactName === 'string' &&
      typeof item.phone === 'string' &&
      (item.status === 'ACTIVE' || item.status === 'INACTIVE') &&
      typeof item.mapTopPercent === 'number' &&
      typeof item.mapLeftPercent === 'number' &&
      (item.latitude === undefined ||
        (typeof item.latitude === 'number' && Number.isFinite(item.latitude))) &&
      (item.longitude === undefined ||
        (typeof item.longitude === 'number' && Number.isFinite(item.longitude)))
    );
  }

  private readLegacy(): LocationAdminState {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return { overrides: {}, created: [] };
      const value = JSON.parse(raw) as Partial<LocationAdminState>;
      return {
        overrides: value.overrides && typeof value.overrides === 'object' ? value.overrides : {},
        created: Array.isArray(value.created) ? value.created : [],
      };
    } catch {
      return { overrides: {}, created: [] };
    }
  }
}
