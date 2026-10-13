import { Injectable, signal } from '@angular/core';

import type { DonationLocationMarker } from '../data/hanoi-donation-locations.data';

interface LocationAdminState {
  readonly overrides: Readonly<Record<string, DonationLocationMarker>>;
  readonly created: readonly DonationLocationMarker[];
}

@Injectable({ providedIn: 'root' })
export class CommunityLocationAdminStorageService {
  private readonly storageKey = 'tram-k.community-location-admin-state';
  private readonly state = signal<LocationAdminState>(this.read());
  readonly changes = this.state.asReadonly();

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

  save(baseIds: readonly string[], location: DonationLocationMarker): void {
    const state = this.state();
    if (baseIds.includes(location.id)) {
      this.persist({ ...state, overrides: { ...state.overrides, [location.id]: location } });
      return;
    }
    const created = state.created.some((item) => item.id === location.id)
      ? state.created.map((item) => (item.id === location.id ? location : item))
      : [location, ...state.created];
    this.persist({ ...state, created });
  }

  private persist(state: LocationAdminState): void {
    this.state.set(state);
    localStorage.setItem(this.storageKey, JSON.stringify(state));
  }

  private withDefaultRegion(location: DonationLocationMarker): DonationLocationMarker {
    return location.regionId ? location : { ...location, regionId: 'ha-noi' };
  }

  private read(): LocationAdminState {
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
