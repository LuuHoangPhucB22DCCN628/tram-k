import { ComponentFixture, TestBed } from '@angular/core/testing'; // Công cụ kiểm thử component
import { provideRouter } from '@angular/router'; // Cung cấp Router cho routerLink trong template

import { AuthService } from '@core/auth/auth.service';
import { PublicHeader } from './public-header'; // Component cần kiểm thử

describe('PublicHeader', () => {
  let component: PublicHeader; // Biến truy cập class của component
  let fixture: ComponentFixture<PublicHeader>; // Biến truy cập giao diện kiểm thử

  beforeEach(async () => {
    localStorage.clear();
    sessionStorage.clear();
    await TestBed.configureTestingModule({
      imports: [PublicHeader], // Nạp standalone component vào môi trường test
      providers: [provideRouter([])], // Tạo Router rỗng để routerLink hoạt động
    }).compileComponents();

    fixture = TestBed.createComponent(PublicHeader); // Khởi tạo component
    component = fixture.componentInstance; // Lấy instance của component
    fixture.detectChanges(); // Cập nhật giao diện lần đầu
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('should create', () => {
    expect(component).toBeTruthy(); // Xác nhận component được tạo thành công
  });

  it('should toggle the mobile menu', () => {
    expect(component.isMobileMenuOpen()).toBe(false); // Menu đóng khi mới mở trang

    component.toggleMobileMenu(); // Mô phỏng người dùng bấm nút menu
    fixture.detectChanges();
    expect(component.isMobileMenuOpen()).toBe(true); // Menu được mở
    expect(fixture.nativeElement.querySelector('.public-mobile-nav')).not.toBeNull();

    component.closeMobileMenu(); // Mô phỏng chọn liên kết hoặc đóng menu
    expect(component.isMobileMenuOpen()).toBe(false); // Menu trở lại trạng thái đóng
  });

  it('closes the mobile menu with Escape and restores focus to its trigger', async () => {
    component.toggleMobileMenu();
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const menuButton = element.querySelector<HTMLButtonElement>(
      '[aria-controls="mobile-navigation"]',
    )!;
    const firstLink = element.querySelector<HTMLAnchorElement>('#mobile-navigation a')!;

    expect(menuButton.getAttribute('aria-label')).toBe('Đóng menu chính');
    firstLink.focus();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.isMobileMenuOpen()).toBe(false);
    expect(element.querySelector('#mobile-navigation')).toBeNull();
    expect(document.activeElement).toBe(menuButton);
    expect(menuButton.getAttribute('aria-label')).toBe('Mở menu chính');
  });

  it('should expose real routes for every public menu item', () => {
    expect(component.menuItems.every((item) => item.path.startsWith('/'))).toBe(true);
    expect(component.menuItems.some((item) => item.path === '/ve-chung-toi')).toBe(false);
  });

  it('shows the member avatar, registered name and member functions', () => {
    const auth = TestBed.inject(AuthService);
    auth.login({ email: 'phuc@tramk.vn', password: 'Matkhau123', rememberMe: false }).subscribe();
    auth.updateDisplayName('Nguyễn An Nhiên');
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    element.querySelector<HTMLButtonElement>('.account-menu__trigger')?.click();
    fixture.detectChanges();

    expect(element.querySelector('.account-menu__avatar')?.textContent?.trim()).toBe('AN');
    expect(element.querySelector('.account-menu__name')?.textContent?.trim()).toBe(
      'Nguyễn An Nhiên',
    );
    expect(element.querySelector('.account-menu__panel')?.textContent).toContain('Hồ sơ');
    expect(element.querySelector('.account-menu__panel')?.textContent).toContain('Bài viết');
    expect(element.querySelector('.account-menu__panel')?.textContent).toContain('Bình luận');
    expect(element.querySelector('.account-menu__panel')?.textContent).toContain(
      'Các chương trình đã đăng ký',
    );
    expect(element.querySelector('.account-menu__panel')?.textContent).not.toContain(
      'Quản lý chương trình từ thiện',
    );
  });

  it('adds support registration and charity management for a benefactor', () => {
    const auth = TestBed.inject(AuthService);
    auth.login({ email: 'doitac@tramk.vn', password: 'Matkhau123', rememberMe: false }).subscribe();
    auth.updateDisplayName('Nhà hảo tâm Minh Anh');
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    element.querySelector<HTMLButtonElement>('.account-menu__trigger')?.click();
    fixture.detectChanges();
    const panelText = element.querySelector('.account-menu__panel')?.textContent;

    expect(panelText).toContain('Nhà hảo tâm');
    expect(panelText).toContain('Đăng ký hỗ trợ');
    expect(panelText).toContain('Quản lý chương trình từ thiện');
  });

  it('places notifications immediately after search for authenticated users', () => {
    const auth = TestBed.inject(AuthService);
    auth.login({ email: 'phuc@tramk.vn', password: 'Matkhau123', rememberMe: false }).subscribe();
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const search = element.querySelector('[data-header-action="search"]');
    const notifications = element.querySelector('[data-header-action="notifications"]');

    expect(search).not.toBeNull();
    expect(notifications).not.toBeNull();
    expect(search?.nextElementSibling).toBe(notifications);
  });
});
