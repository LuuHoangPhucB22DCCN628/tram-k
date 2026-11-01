/** Cấu hình dùng khi chạy `ng serve` trên máy lập trình viên. */
export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:3000',
  useMockAuthFallback: false,
  googleMapsApiKey: '',
} as const;
