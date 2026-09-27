import { TestBed } from '@angular/core/testing';

import { ContentFavoritesService } from './content-favorites.service';

describe('ContentFavoritesService', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
  });

  it('toggles and persists a content favorite without duplicate ids', () => {
    const service = TestBed.inject(ContentFavoritesService);

    expect(service.toggle('GUIDE-007')).toBe(true);
    expect(service.toggle('GUIDE-007')).toBe(false);
    expect(service.favoriteIds()).toEqual([]);
  });
});
