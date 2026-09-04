import { InjectionToken } from '@angular/core';

/** Địa chỉ gốc để các service Angular gọi REST API. */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL');
