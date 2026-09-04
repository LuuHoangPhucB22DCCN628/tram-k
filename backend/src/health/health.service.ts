import { Injectable } from '@nestjs/common';

export interface HealthResult {
  status: 'ok';
  service: 'tram-k-api';
  timestamp: string;
}

@Injectable()
export class HealthService {
  check(): HealthResult {
    return {
      status: 'ok',
      service: 'tram-k-api',
      timestamp: new Date().toISOString(),
    };
  }
}
