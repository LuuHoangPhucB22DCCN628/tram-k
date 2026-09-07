import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AdminLayout } from './admin-layout';

describe('AdminLayout', () => {
  let fixture: ComponentFixture<AdminLayout>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminLayout],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminLayout);
    fixture.detectChanges();
  });

  it('should render the administration navigation', () => {
    expect(fixture.nativeElement.textContent).toContain('Kiểm duyệt cộng đồng');
    expect(fixture.nativeElement.textContent).toContain('Điểm phát cơm');
  });

  it('should provide a skip link and expose the mobile menu state', () => {
    const skipLink = fixture.nativeElement.querySelector('.skip-link') as HTMLAnchorElement;
    const menuButton = fixture.nativeElement.querySelector(
      '.admin-shell__menu-button',
    ) as HTMLButtonElement;

    expect(skipLink.getAttribute('href')).toBe('#admin-main-content');
    expect(menuButton.getAttribute('aria-expanded')).toBe('false');
    expect(menuButton.getAttribute('aria-label')).toBe('Mở menu quản trị');
  });
});
