import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { LoginPage } from './login-page';

@Component({ standalone: true, template: '' })
class MemberTestPage {}

@Component({ standalone: true, template: '' })
class HomeTestPage {}

describe('LoginPage', () => {
  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('should validate required credentials and accept a valid mock login', async () => {
    await TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [
        provideRouter([
          { path: '', component: HomeTestPage },
          { path: 'thanh-vien', component: MemberTestPage },
        ]),
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(LoginPage);
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigateByUrl');
    fixture.detectChanges();
    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;

    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Vui lòng nhập email.');

    fill('#login-email', 'phuc@tramk.vn');
    fill('#login-password', 'Matkhau123');
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Đăng nhập thành công.');
    expect(navigateSpy).toHaveBeenCalledWith('/');

    function fill(selector: string, value: string): void {
      const input = fixture.nativeElement.querySelector(selector) as HTMLInputElement;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    }
  });
});
