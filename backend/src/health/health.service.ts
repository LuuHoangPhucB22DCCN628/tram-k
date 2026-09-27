import { Injectable } from "@nestjs/common";

@Injectable()
export class HealthService {
  check() {
    return {
      status: "ok",
      service: "tram-k-api",
      timestamp: new Date().toISOString(),
    } as const;
  }
}
