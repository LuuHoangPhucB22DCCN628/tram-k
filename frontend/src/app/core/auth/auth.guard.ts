import { inject } from '@angular/core';
import type { CanActivateFn } from '@angular/router';
import { Router } from '@angular/router';

import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.isAuthenticated()
    ? true
    : router.createUrlTree(['/dang-nhap'], { queryParams: { returnUrl: state.url } });
};

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isAuthenticated() ? router.parseUrl(auth.defaultRoute()) : true;
};

export const roleGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const allowedRoles = route.data['roles'] as readonly (
    'PATIENT' | 'CARER' | 'PARTNER' | 'ADMIN'
  )[];

  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/dang-nhap']);
  }

  return auth.hasRole(allowedRoles) ? true : router.parseUrl(auth.defaultRoute());
};
