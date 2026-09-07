import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { RegisterPage } from './register-page';

describe('RegisterPage', () => {
  it('should reject mismatched passwords', async () => {
    await TestBed.configureTestingModule({
      imports: [RegisterPage],
      providers: [provideRouter([])],
    }).compileComponents();

    const fixture = TestBed.createComponent(RegisterPage);
    const component = fixture.componentInstance as unknown as {
      registerForm: { patchValue(value: object): void; hasError(name: string): boolean };
    };

    component.registerForm.patchValue({ password: 'Matkhau123', confirmPassword: 'Khac1234A' });

    expect(component.registerForm.hasError('passwordMismatch')).toBe(true);
  });
});
