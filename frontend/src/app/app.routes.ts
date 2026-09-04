import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('@layouts/public-layout/public-layout').then((component) => component.PublicLayout),
    children: [
      {
        path: '',
        title: 'Trang chủ | Tram-K',
        loadComponent: () =>
          import('@features/home/pages/home-page/home-page').then(
            (component) => component.HomePage,
          ),
      },
      {
        path: 'style-guide',
        title: 'Style Guide | Trạm K',
        loadComponent: () =>
          import('@features/style-guide/pages/style-guide-page/style-guide-page').then(
            (component) => component.StyleGuidePage,
          ),
      },
    ],
  },
];
