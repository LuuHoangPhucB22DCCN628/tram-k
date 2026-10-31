/** Cấu hình được Angular tự thay thế khi build production. */
export const environment = {
  production: true,
  apiBaseUrl: '/api',
  useMockAuthFallback: false,
  googleMapsApiKey: '',
} as const;
