import { DOCUMENT } from '@angular/common';
import { inject, Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ContentFavoritesService {
  private readonly storageKey = 'tram-k:content-favorites';
  private readonly storage = inject(DOCUMENT).defaultView?.localStorage;
  private readonly favoriteIdsState = signal<readonly string[]>(this.restore());

  readonly favoriteIds = this.favoriteIdsState.asReadonly();

  has(contentId: string): boolean {
    return this.favoriteIdsState().includes(contentId);
  }

  toggle(contentId: string): boolean {
    const isFavorite = this.has(contentId);
    const nextIds = isFavorite
      ? this.favoriteIdsState().filter((id) => id !== contentId)
      : [...this.favoriteIdsState(), contentId];

    this.favoriteIdsState.set(nextIds);
    this.persist(nextIds);
    return !isFavorite;
  }

  private restore(): readonly string[] {
    try {
      const value = this.storage?.getItem(this.storageKey);
      const parsed: unknown = value ? JSON.parse(value) : [];
      return Array.isArray(parsed)
        ? parsed.filter((id): id is string => typeof id === 'string')
        : [];
    } catch {
      return [];
    }
  }

  private persist(ids: readonly string[]): void {
    try {
      this.storage?.setItem(this.storageKey, JSON.stringify(ids));
    } catch {
      // Yêu thích vẫn hoạt động trong phiên hiện tại nếu trình duyệt chặn localStorage.
    }
  }
}
