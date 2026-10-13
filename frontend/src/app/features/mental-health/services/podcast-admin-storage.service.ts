import { Injectable, signal } from '@angular/core';

import type { PodcastItem } from '../models/podcast.models';

type PodcastOverride = Partial<Omit<PodcastItem, 'id'>>;

interface StoredPodcastAdminState {
  readonly overrides: Readonly<Record<string, PodcastOverride>>;
  readonly createdItems: readonly PodcastItem[];
  readonly resolvedItems?: readonly PodcastItem[];
}

@Injectable({ providedIn: 'root' })
export class PodcastAdminStorageService {
  private readonly storageKey = 'tram-k.podcast-admin-state';
  private legacyPresent = localStorage.getItem(this.storageKey) !== null;
  private readonly state = signal<StoredPodcastAdminState>(this.read());

  readonly changes = this.state.asReadonly();

  resolve(baseItems: readonly PodcastItem[]): readonly PodcastItem[] {
    const state = this.state();
    if (state.resolvedItems) return state.resolvedItems;
    return [
      ...baseItems.map((item) => ({ ...item, ...state.overrides[item.id] })),
      ...state.createdItems,
    ];
  }

  create(item: PodcastItem): void {
    const state = this.state();
    if (state.resolvedItems) {
      this.setState({ ...state, resolvedItems: [item, ...state.resolvedItems] });
      return;
    }
    this.setState({ ...state, createdItems: [item, ...state.createdItems] });
  }

  update(id: string, values: PodcastOverride): void {
    const state = this.state();
    if (state.resolvedItems) {
      this.setState({
        ...state,
        resolvedItems: state.resolvedItems.map((item) =>
          item.id === id ? { ...item, ...values } : item,
        ),
      });
      return;
    }
    const createdIndex = state.createdItems.findIndex((item) => item.id === id);
    if (createdIndex >= 0) {
      this.setState({
        ...state,
        createdItems: state.createdItems.map((item) =>
          item.id === id ? { ...item, ...values } : item,
        ),
      });
      return;
    }

    this.setState({
      ...state,
      overrides: {
        ...state.overrides,
        [id]: { ...state.overrides[id], ...values },
      },
    });
  }

  replaceResolved(items: readonly PodcastItem[]): void {
    this.setState({ overrides: {}, createdItems: [], resolvedItems: items });
  }

  hasLegacyState(): boolean {
    return this.legacyPresent;
  }

  migrationItems(baseItems: readonly PodcastItem[], includeAll: boolean): readonly PodcastItem[] {
    if (includeAll) return this.resolve(baseItems);
    const state = this.state();
    const changedBaseItems = baseItems
      .filter((item) => Boolean(state.overrides[item.id]))
      .map((item) => ({ ...item, ...state.overrides[item.id] }));
    return [...changedBaseItems, ...state.createdItems];
  }

  clearLegacyState(): void {
    localStorage.removeItem(this.storageKey);
    this.legacyPresent = false;
  }

  private setState(state: StoredPodcastAdminState): void {
    this.state.set(state);
  }

  private read(): StoredPodcastAdminState {
    try {
      const rawValue = localStorage.getItem(this.storageKey);
      if (!rawValue) return { overrides: {}, createdItems: [] };
      const value = JSON.parse(rawValue) as Partial<StoredPodcastAdminState>;
      return {
        overrides: value.overrides && typeof value.overrides === 'object' ? value.overrides : {},
        createdItems: Array.isArray(value.createdItems) ? value.createdItems : [],
      };
    } catch {
      return { overrides: {}, createdItems: [] };
    }
  }
}
