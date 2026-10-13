import type { Route } from '@angular/router';

import { routes } from './app.routes';

describe('application role route contracts', () => {
  it('protects each private area with its matching role set', () => {
    const member = findRoute('thanh-vien');
    const admin = findRoute('admin');
    const partner = findRoute('doi-tac');

    expect(member.data?.['roles']).toEqual(['PATIENT', 'CARER']);
    expect(admin.data?.['roles']).toEqual(['ADMIN']);
    expect(partner.data?.['roles']).toEqual(['PARTNER']);
    expect(partner.children?.some((route) => route.path === 'ho-so')).toBe(true);
  });

  it('routes each private area to its intended landing page', () => {
    const admin = findRoute('admin');
    const adminDefault = admin.children?.find((route) => route.path === '');
    const partner = findRoute('doi-tac');
    const partnerDefault = partner.children?.find((route) => route.path === '');

    expect(adminDefault?.redirectTo).toBe('tong-quan');
    expect(admin.children?.some((route) => route.path === 'tong-quan')).toBe(true);
    expect(partnerDefault?.redirectTo).toBe('ho-so');
    expect(findRoute('thanh-vien').children?.some((route) => route.path === '')).toBe(true);
  });

  it('routes admin-created stories and cancer articles to the shared detail page', () => {
    const publicLayout = findRoute('');
    const publicRoutes = publicLayout.children ?? [];
    const storyArticle = publicRoutes.find((route) => route.path === 'cau-chuyen/bai-viet/:slug');
    const cancerArticle = publicRoutes.find(
      (route) => route.path === 'loai-ung-thu/bai-viet/:slug',
    );

    expect(storyArticle?.data?.['kind']).toBe('STORY');
    expect(storyArticle?.data?.['backPath']).toBe('/cau-chuyen');
    expect(cancerArticle?.data?.['kind']).toBe('CANCER_TYPE');
    expect(cancerArticle?.data?.['backPath']).toBe('/loai-ung-thu');
  });

  function findRoute(path: string): Route {
    const route = routes.find((candidate) => candidate.path === path);
    expect(route).toBeDefined();
    return route!;
  }
});
