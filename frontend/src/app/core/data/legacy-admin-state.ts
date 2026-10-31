import { signal, type Signal, type WritableSignal } from '@angular/core';

interface StoredAdminState<Item, Override> {
  readonly overrides: Readonly<Record<string, Override>>;
  readonly createdItems: readonly Item[];
  readonly resolvedItems?: readonly Item[];
}

/** Keeps the pre-API editorial state available until its remote migration succeeds. */
export class LegacyAdminState<
  Item extends { readonly id: string },
  Override extends Partial<Item>,
> {
  private readonly state: WritableSignal<StoredAdminState<Item, Override>>;
  private legacyPresent: boolean;
  readonly changes: Signal<StoredAdminState<Item, Override>>;

  constructor(private readonly storageKey: string) {
    this.legacyPresent = localStorage.getItem(storageKey) !== null;
    this.state = signal(this.read());
    this.changes = this.state.asReadonly();
  }

  createdItems(): readonly Item[] {
    const state = this.state();
    return state.resolvedItems ?? state.createdItems;
  }

  resolve(baseItems: readonly Item[]): readonly Item[] {
    const state = this.state();
    if (state.resolvedItems) return state.resolvedItems;
    return [
      ...baseItems.map((item) => ({ ...item, ...state.overrides[item.id] })),
      ...state.createdItems,
    ];
  }

  update(id: string, values: Override): void {
    const state = this.state();
    if (state.resolvedItems) {
      this.state.set({
        ...state,
        resolvedItems: state.resolvedItems.map((item) =>
          item.id === id ? { ...item, ...values } : item,
        ),
      });
      return;
    }
    if (state.createdItems.some((item) => item.id === id)) {
      this.state.set({
        ...state,
        createdItems: state.createdItems.map((item) =>
          item.id === id ? { ...item, ...values } : item,
        ),
      });
      return;
    }
    this.state.set({
      ...state,
      overrides: { ...state.overrides, [id]: { ...state.overrides[id], ...values } },
    });
  }

  create(item: Item): void {
    const state = this.state();
    this.state.set(
      state.resolvedItems
        ? { ...state, resolvedItems: [item, ...state.resolvedItems] }
        : { ...state, createdItems: [item, ...state.createdItems] },
    );
  }

  replaceResolved(items: readonly Item[]): void {
    this.state.set({ overrides: {}, createdItems: [], resolvedItems: items });
  }

  hasLegacyState(): boolean {
    return this.legacyPresent;
  }

  migrationItems(baseItems: readonly Item[], includeAll: boolean): readonly Item[] {
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

  private read(): StoredAdminState<Item, Override> {
    try {
      const rawValue = localStorage.getItem(this.storageKey);
      if (!rawValue) return { overrides: {}, createdItems: [] };
      const value = JSON.parse(rawValue) as Partial<StoredAdminState<Item, Override>>;
      return {
        overrides: value.overrides && typeof value.overrides === 'object' ? value.overrides : {},
        createdItems: Array.isArray(value.createdItems) ? value.createdItems : [],
      };
    } catch {
      return { overrides: {}, createdItems: [] };
    }
  }
}
