import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { LoginForm } from './login-form';

describe('LoginForm', () => {
  it('validates fields before emitting credentials', async () => {
    await TestBed.configureTestingModule({
      imports: [LoginForm],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(LoginForm);
    const emitted: unknown[] = [];
    fixture.componentRef.instance.credentialsSubmitted.subscribe((value) => emitted.push(value));
    fixture.detectChanges();

    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    expect(emitted).toHaveLength(0);
    expect(fixture.nativeElement.textContent).toContain('Vui lòng nhập email.');

    fill(fixture.nativeElement, '#login-email', 'phuc@tramk.vn');
    fill(fixture.nativeElement, '#login-password', 'Matkhau123');
    form.dispatchEvent(new Event('submit'));
    expect(emitted).toHaveLength(1);
  });

  function fill(host: HTMLElement, selector: string, value: string): void {
    const input = host.querySelector(selector) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }
});
