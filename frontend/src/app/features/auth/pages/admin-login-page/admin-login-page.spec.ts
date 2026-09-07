import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AuthService } from '@core/auth/auth.service';

import { AdminLoginPage } from './admin-login-page';

describe('AdminLoginPage', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('does not expose member account links or remember-me', async () => {
    await configure();
    const fixture = TestBed.createComponent(AdminLoginPage);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('Đăng ký');
    expect(fixture.nativeElement.textContent).not.toContain('Quên mật khẩu');
    expect(fixture.nativeElement.textContent).not.toContain('Ghi nhớ tôi');
  });

  it('rejects a non-admin account without creating a session', async () => {
    await configure();
    const fixture = TestBed.createComponent(AdminLoginPage);
    fixture.detectChanges();
    fill(fixture.nativeElement, '#login-email', 'phuc@tramk.vn');
    fill(fixture.nativeElement, '#login-password', 'Matkhau123');

    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(
      new Event('submit'),
    );
    fixture.detectChanges();

    expect(TestBed.inject(AuthService).isAuthenticated()).toBe(false);
    expect(fixture.nativeElement.textContent).toContain(
      'Email, mật khẩu hoặc quyền truy cập không hợp lệ.',
    );
  });

  async function configure(): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [AdminLoginPage],
      providers: [provideRouter([])],
    }).compileComponents();
  }

  function fill(host: HTMLElement, selector: string, value: string): void {
    const input = host.querySelector(selector) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }
});
