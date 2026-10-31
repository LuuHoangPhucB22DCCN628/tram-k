import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_BASE_URL } from '@core/config/api-base-url.token';

import { AdminHairRegistrationsPage } from './admin-hair-registrations-page';

describe('AdminHairRegistrationsPage', () => {
  const url = 'http://localhost:3000/community/hair-registrations/admin';
  const item = {
    id: 'hair-1',
    reference: 'TK-20261016-TEST1234',
    mode: 'DONATE',
    status: 'PENDING',
    fullName: 'Nguyễn Minh An',
    phone: '0912345678',
    province: 'Hà Nội',
    district: 'Ba Đình',
    createdAt: '2026-10-16T10:00:00.000Z',
  };
  const detail = {
    ...item,
    email: null,
    address: '12 Phố Huế',
    gender: 'female',
    relativePhone: null,
    relativeName: null,
    duration: null,
    hospital: null,
    diagnosis: null,
    borrowDate: null,
    desiredLength: null,
    transparency: null,
    donationLocation: 'Hà Nội',
    donatedLength: '30 cm',
    acceptedCommitments: [],
    history: [],
  };
  const list = {
    items: [item],
    total: 1,
    page: 1,
    limit: 20,
    summary: { PENDING: 1, APPROVED: 0, REJECTED: 0, COMPLETED: 0 },
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminHairRegistrationsPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'http://localhost:3000' },
      ],
    }).compileComponents();
  });

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('loads the queue, opens details and approves a pending donation', () => {
    const fixture = TestBed.createComponent(AdminHairRegistrationsPage);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne((request) => request.url === url).flush({ success: true, data: list });
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('TK-20261016-TEST1234');

    root.querySelector<HTMLButtonElement>('.hair-admin__view')?.click();
    http.expectOne(`${url}/hair-1`).flush({ success: true, data: detail });
    fixture.detectChanges();
    expect(root.querySelector('.hair-admin__detail')?.textContent).toContain('30 cm');

    root.querySelector<HTMLButtonElement>('.hair-admin__primary')?.click();
    const review = http.expectOne(`${url}/hair-1/status`);
    expect(review.request.method).toBe('PATCH');
    expect(review.request.body).toEqual({ status: 'APPROVED' });
    review.flush({ success: true, data: { ...detail, status: 'APPROVED' } });
    http.expectOne(`${url}/hair-1`).flush({
      success: true,
      data: { ...detail, status: 'APPROVED' },
    });
    http
      .expectOne((request) => request.url === url)
      .flush({
        success: true,
        data: { ...list, items: [{ ...item, status: 'APPROVED' }] },
      });
    fixture.detectChanges();
    expect(root.querySelector('.hair-admin__detail')?.textContent).toContain('Đã duyệt');
  });
});
