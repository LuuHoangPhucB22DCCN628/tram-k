import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AdminUsersPage } from './admin-users-page';

describe('AdminUsersPage', () => {
  let fixture: ComponentFixture<AdminUsersPage>;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [AdminUsersPage],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminUsersPage);
    fixture.detectChanges();
  });

  afterEach(() => localStorage.clear());

  it('should filter users by keyword', () => {
    const searchInput = fixture.nativeElement.querySelector(
      'input[type="search"]',
    ) as HTMLInputElement;
    searchInput.value = 'Thu Phương';
    searchInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(1);
    expect(rows[0].textContent).toContain('Trần Thu Phương');
  });

  it('should open a confirmation modal before changing status', () => {
    const actionButton = Array.from<HTMLButtonElement>(
      fixture.nativeElement.querySelectorAll('tbody app-ui-button button'),
    )[0];
    actionButton.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Xác nhận khóa');
  });

  it('should persist the status after Admin confirms', () => {
    const actionButton = fixture.nativeElement.querySelector(
      'tbody app-ui-button button',
    ) as HTMLButtonElement;
    actionButton.click();
    fixture.detectChanges();

    const confirmButton = Array.from<HTMLButtonElement>(
      fixture.nativeElement.querySelectorAll('[role="dialog"] app-ui-button button'),
    ).find((button) => button.textContent?.includes('Xác nhận khóa'));
    confirmButton?.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Đã khóa tài khoản Nguyễn Minh Anh.');
    expect(localStorage.getItem('tram-k.admin.users')).toContain('LOCKED');
  });
});
