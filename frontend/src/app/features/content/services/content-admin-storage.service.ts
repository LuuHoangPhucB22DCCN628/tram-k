import { Injectable, signal } from '@angular/core';

import type { ContentDetail } from '../models/content.models';

type ContentOverride = Partial<
  Pick<
    ContentDetail,
    'title' | 'excerpt' | 'status' | 'category' | 'coverImage' | 'sections' | 'readingMinutes'
  >
>;

interface StoredContentAdminState {
  readonly overrides: Readonly<Record<string, ContentOverride>>;
  readonly createdItems: readonly ContentDetail[];
  readonly resolvedItems?: readonly ContentDetail[];
}

@Injectable({ providedIn: 'root' })
export class ContentAdminStorageService {
  private readonly storageKey = 'tram-k.content-admin-state';
  private legacyPresent = localStorage.getItem(this.storageKey) !== null;
  private readonly state = signal<StoredContentAdminState>(this.read());

  readonly changes = this.state.asReadonly();

  createdItems(): readonly ContentDetail[] {
    const state = this.state();
    return state.resolvedItems ?? state.createdItems;
  }

  resolve(baseItems: readonly ContentDetail[]): readonly ContentDetail[] {
    const state = this.state();
    if (state.resolvedItems) return state.resolvedItems;
    return [
      ...baseItems.map((item) => ({ ...item, ...state.overrides[item.id] })),
      ...state.createdItems,
    ];
  }

  update(contentId: string, values: ContentOverride): void {
    const state = this.state();
    if (state.resolvedItems) {
      this.setState({
        ...state,
        resolvedItems: state.resolvedItems.map((item) =>
          item.id === contentId ? { ...item, ...values } : item,
        ),
      });
      return;
    }
    const createdIndex = state.createdItems.findIndex((item) => item.id === contentId);
    if (createdIndex >= 0) {
      const createdItems = state.createdItems.map((item) =>
        item.id === contentId ? { ...item, ...values } : item,
      );
      this.setState({ ...state, createdItems });
      return;
    }

    this.setState({
      ...state,
      overrides: {
        ...state.overrides,
        [contentId]: { ...state.overrides[contentId], ...values },
      },
    });
  }

  create(item: ContentDetail): void {
    const state = this.state();
    if (state.resolvedItems) {
      this.setState({ ...state, resolvedItems: [item, ...state.resolvedItems] });
      return;
    }
    this.setState({ ...state, createdItems: [item, ...state.createdItems] });
  }

  replaceResolved(items: readonly ContentDetail[]): void {
    this.setState({ overrides: {}, createdItems: [], resolvedItems: items });
  }

  hasLegacyState(): boolean {
    return this.legacyPresent;
  }

  migrationItems(
    baseItems: readonly ContentDetail[],
    includeAll: boolean,
  ): readonly ContentDetail[] {
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

  private setState(state: StoredContentAdminState): void {
    this.state.set(state);
  }

  private read(): StoredContentAdminState {
    try {
      const rawValue = localStorage.getItem(this.storageKey);
      if (!rawValue) return { overrides: {}, createdItems: [] };
      const value = JSON.parse(rawValue) as Partial<StoredContentAdminState>;
      return {
        overrides: value.overrides && typeof value.overrides === 'object' ? value.overrides : {},
        createdItems: Array.isArray(value.createdItems) ? value.createdItems : [],
      };
    } catch {
      return { overrides: {}, createdItems: [] };
    }
  }
}
