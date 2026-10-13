import { TestBed } from '@angular/core/testing';

import { HANOI_DONATION_LOCATIONS } from '@features/community/data/hanoi-donation-locations.data';
import { CommunityLocationAdminStorageService } from '@features/community/services/community-location-admin-storage.service';

import { AdminCommunityLocationsPage } from './admin-community-locations-page';

describe('AdminCommunityLocationsPage', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('renders locations and can hide one from the shared public data', async () => {
    await TestBed.configureTestingModule({
      imports: [AdminCommunityLocationsPage],
    }).compileComponents();
    const fixture = TestBed.createComponent(AdminCommunityLocationsPage);
    const storage = TestBed.inject(CommunityLocationAdminStorageService);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const firstToggle = element.querySelectorAll<HTMLButtonElement>(
      '.location-actions button:nth-child(2)',
    )[0];
    firstToggle.click();
    fixture.detectChanges();

    expect(storage.active(HANOI_DONATION_LOCATIONS)).toHaveLength(2);
    expect(element.textContent).toContain('Đã tạm ngưng tiếp nhận');
  });

  it('exposes the table as a keyboard region and closes the editor with Escape', async () => {
    await TestBed.configureTestingModule({
      imports: [AdminCommunityLocationsPage],
    }).compileComponents();
    const fixture = TestBed.createComponent(AdminCommunityLocationsPage);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('.location-table-wrap')?.getAttribute('tabindex')).toBe('0');
    element.querySelector<HTMLButtonElement>('.admin-locations > header button')?.click();
    fixture.detectChanges();
    expect(element.querySelector('.location-editor')?.getAttribute('role')).toBe('dialog');
    expect(
      element.querySelector<HTMLSelectElement>('.location-editor__grid select')?.options,
    ).toHaveLength(34);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    expect(element.querySelector('.location-editor')).toBeNull();
  });
});
