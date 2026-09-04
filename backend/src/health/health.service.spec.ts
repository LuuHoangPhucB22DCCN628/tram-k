import { HealthService } from './health.service';

describe('HealthService', () => {
  it('returns the service status', () => {
    const result = new HealthService().check();

    expect(result.status).toBe('ok');
    expect(result.service).toBe('tram-k-api');
    expect(Date.parse(result.timestamp)).not.toBeNaN();
  });
});
