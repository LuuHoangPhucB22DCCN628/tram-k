import { TestBed } from '@angular/core/testing';
import {
  type ActivatedRouteSnapshot,
  provideRouter,
  Router,
  type RouterStateSnapshot,
} from '@angular/router';

import type { UserRole } from './auth.models';
import { AuthService } from './auth.service';
import { roleGuard } from './auth.guard';

describe('roleGuard access matrix', () => {
  let currentRole: UserRole | null;

  const authStub = {
    isAuthenticated: () => currentRole !== null,
    hasRole: (roles: readonly UserRole[]) => currentRole !== null && roles.includes(currentRole),
    defaultRoute: () => {
      if (currentRole === 'ADMIN') return '/admin';
      if (currentRole === 'PARTNER') return '/doi-tac';
      return '/thanh-vien';
    },
  };

  beforeEach(() => {
    currentRole = null;
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: authStub }],
    });
  });

  it.each([
    { actor: 'Thành viên', role: 'PATIENT' as const, allowed: ['PATIENT', 'CARER'] as const },
    { actor: 'Người chăm sóc', role: 'CARER' as const, allowed: ['PATIENT', 'CARER'] as const },
    { actor: 'Đối tác', role: 'PARTNER' as const, allowed: ['PARTNER'] as const },
    { actor: 'Admin', role: 'ADMIN' as const, allowed: ['ADMIN'] as const },
  ])('allows $actor to enter the correct protected area', ({ role, allowed }) => {
    currentRole = role;

    expect(runGuard(allowed, '/khu-vuc')).toBe(true);
  });

  it.each([
    {
      actor: 'Thành viên',
      role: 'PATIENT' as const,
      allowed: ['ADMIN'] as const,
      redirect: '/thanh-vien',
    },
    {
      actor: 'Đối tác',
      role: 'PARTNER' as const,
      allowed: ['PATIENT', 'CARER'] as const,
      redirect: '/doi-tac',
    },
    { actor: 'Admin', role: 'ADMIN' as const, allowed: ['PARTNER'] as const, redirect: '/admin' },
  ])('redirects $actor away from a forbidden area', ({ role, allowed, redirect }) => {
    currentRole = role;

    expect(urlOf(runGuard(allowed, '/khu-vuc'))).toBe(redirect);
  });

  it('sends a guest to login and preserves the requested URL', () => {
    const result = urlOf(runGuard(['ADMIN'], '/admin/nguoi-dung'));

    expect(result).toContain('/dang-nhap');
    expect(result).toContain('returnUrl');
    expect(result).toContain('admin');
  });

  function runGuard(
    allowedRoles: readonly UserRole[],
    url: string,
  ): boolean | ReturnType<Router['parseUrl']> {
    const route = { data: { roles: allowedRoles } } as unknown as ActivatedRouteSnapshot;
    const state = { url } as RouterStateSnapshot;
    return TestBed.runInInjectionContext(() => roleGuard(route, state)) as
      boolean | ReturnType<Router['parseUrl']>;
  }

  function urlOf(result: boolean | ReturnType<Router['parseUrl']>): string {
    expect(result).not.toBe(true);
    return TestBed.inject(Router).serializeUrl(result as ReturnType<Router['parseUrl']>);
  }
});
