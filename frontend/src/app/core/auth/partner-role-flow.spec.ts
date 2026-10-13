import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './auth.service';

describe('partner role grant flow', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({});
  });
  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('does not expose a browser-side path for granting PARTNER', async () => {
    const auth = TestBed.inject(AuthService);
    const user = await firstValueFrom(
      auth.register({
        displayName: 'Nguyễn An',
        email: 'an@example.com',
        password: 'Matkhau123',
        role: 'CARER',
      }),
    );
    expect(user.role).toBe('CARER');
    expect('canGrantPartnerRole' in auth).toBe(false);
    expect('grantPartnerRole' in auth).toBe(false);
    await firstValueFrom(
      auth.login({ email: user.email, password: 'Matkhau123', rememberMe: false }),
    );
    expect(auth.currentUser()?.role).toBe('CARER');
  });
});
