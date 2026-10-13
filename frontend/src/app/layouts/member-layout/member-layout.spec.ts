import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AuthService } from '@core/auth/auth.service';
import { MemberLayout } from './member-layout';

describe('MemberLayout', () => {
  let fixture: ComponentFixture<MemberLayout>;

  beforeEach(async () => {
    localStorage.clear();
    sessionStorage.clear();
    await TestBed.configureTestingModule({
      imports: [MemberLayout],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(MemberLayout);
    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('should render member navigation', () => {
    expect(fixture.nativeElement.textContent).toContain('Bài viết');
  });

  it('should keep the public header and footer around private member pages', () => {
    expect(fixture.nativeElement.querySelector('app-public-header')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-public-footer')).not.toBeNull();

    const homeLink = fixture.nativeElement.querySelector(
      'app-public-header a[aria-label="Trạm K - Trang chủ"]',
    ) as HTMLAnchorElement;

    expect(homeLink.getAttribute('href')).toBe('/');
  });

  it('should render the partner navigation inside the same public shell', () => {
    const auth = TestBed.inject(AuthService);
    auth.login({ email: 'doitac@tramk.vn', password: 'Matkhau123', rememberMe: false }).subscribe();
    fixture.detectChanges();

    const sidebar = fixture.nativeElement.querySelector('.member-shell__sidebar') as HTMLElement;

    expect(sidebar.textContent).toContain('Đăng ký hỗ trợ');
    expect(sidebar.textContent).toContain('Quản lý chương trình từ thiện');
    expect(sidebar.querySelector('a[href="/doi-tac/ho-so"]')).not.toBeNull();
  });

  it('should toggle the compact account navigation and close it with Escape', () => {
    const element = fixture.nativeElement as HTMLElement;
    const toggle = element.querySelector<HTMLButtonElement>('.member-shell__sidebar-toggle')!;
    const sidebar = element.querySelector<HTMLElement>('.member-shell__sidebar')!;

    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(sidebar.classList).not.toContain('member-shell__sidebar--open');

    toggle.click();
    fixture.detectChanges();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(sidebar.classList).toContain('member-shell__sidebar--open');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(sidebar.classList).not.toContain('member-shell__sidebar--open');
  });

  it('should provide a skip link to the member content', () => {
    const skipLink = fixture.nativeElement.querySelector('.skip-link') as HTMLAnchorElement;

    expect(skipLink.getAttribute('href')).toBe('#member-main-content');
    expect(fixture.nativeElement.querySelector('main').classList).toContain('ui-route-content');
  });
});
