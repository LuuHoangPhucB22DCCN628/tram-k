import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) { }

  live() {
    return {
      status: "ok",
      service: "tram-k-api",
      timestamp: new Date().toISOString(),
    };
  }

  async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;

      return {
        status: "ready",
        database: "connected",
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new ServiceUnavailableException("Hệ thống chưa sẵn sàng (DB hoặc Storage lỗi).");
    }
  }
}