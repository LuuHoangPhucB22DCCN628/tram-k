import { ServiceUnavailableException } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";
import { HealthService } from "./health.service";

describe("HealthService", () => {
  const prisma = {
    $queryRaw: jest.fn(),
  } as unknown as PrismaService;
  const service = new HealthService(prisma);

  beforeEach(() => jest.clearAllMocks());

  it("returns a live payload without touching the database", () => {
    const result = service.live();
    expect(result.status).toBe("ok");
    expect(result.service).toBe("tram-k-api");
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it("returns ready when the database answers", async () => {
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ "?column?": 1 }]);
    const result = await service.ready();
    expect(result).toEqual(
      expect.objectContaining({ status: "ready", database: "connected" }),
    );
  });

  it("throws 503 when the database is unavailable", async () => {
    (prisma.$queryRaw as jest.Mock).mockRejectedValue(new Error("ECONNREFUSED"));
    await expect(service.ready()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
