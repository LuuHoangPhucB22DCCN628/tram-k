import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_BASE_URL } from '@core/config/api-base-url.token';

import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';

describe('authInterceptor', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'http://localhost:3000' },
      ],
    });
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('should add a bearer token only to the configured API', () => {
    const auth = TestBed.inject(AuthService);
    const http = TestBed.inject(HttpTestingController);

    auth.login({ email: 'phuc@tramk.vn', password: 'Matkhau123', rememberMe: false }).subscribe();

    const client = TestBed.inject(HttpClient);
    client.get('http://localhost:3000/profile').subscribe();

    const request = http.expectOne('http://localhost:3000/profile');
    expect(request.request.headers.get('Authorization')).toContain('Bearer mock-access');
    request.flush({});
  });

  it('should not add a token for a guest API request', () => {
    const http = TestBed.inject(HttpTestingController);
    TestBed.inject(HttpClient).get('http://localhost:3000/public/articles').subscribe();

    const request = http.expectOne('http://localhost:3000/public/articles');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({});
  });

  it.each(['phuc@tramk.vn', 'doitac@tramk.vn', 'admin@tramk.vn'])(
    'should attach a token for authenticated role %s',
    (email) => {
      const auth = TestBed.inject(AuthService);
      const http = TestBed.inject(HttpTestingController);
      auth
        .login(
          { email, password: 'Matkhau123', rememberMe: false },
          email === 'admin@tramk.vn' ? 'ADMIN' : 'PUBLIC',
        )
        .subscribe();

      TestBed.inject(HttpClient).get('http://localhost:3000/secured-resource').subscribe();

      const request = http.expectOne('http://localhost:3000/secured-resource');
      expect(request.request.headers.get('Authorization')).toContain('Bearer mock-access');
      request.flush({});
    },
  );

  it('should never send the project token to an external URL', () => {
    const auth = TestBed.inject(AuthService);
    const http = TestBed.inject(HttpTestingController);
    auth
      .login({ email: 'admin@tramk.vn', password: 'Matkhau123', rememberMe: false }, 'ADMIN')
      .subscribe();

    TestBed.inject(HttpClient).get('https://external.example/resource').subscribe();

    const request = http.expectOne('https://external.example/resource');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({});
  });

  it('should pass a forbidden API response through without refreshing the token', () => {
    const auth = TestBed.inject(AuthService);
    const http = TestBed.inject(HttpTestingController);
    auth.login({ email: 'phuc@tramk.vn', password: 'Matkhau123', rememberMe: false }).subscribe();
    let responseStatus = 0;

    TestBed.inject(HttpClient)
      .get('http://localhost:3000/admin/users')
      .subscribe({ error: (error: { status: number }) => (responseStatus = error.status) });

    const request = http.expectOne('http://localhost:3000/admin/users');
    request.flush({ message: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });
    expect(responseStatus).toBe(403);
    http.expectNone('http://localhost:3000/auth/refresh');
  });
});
