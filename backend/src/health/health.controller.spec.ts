import { HealthController } from "./health.controller";
import { HealthService } from "./health.service";

describe("HealthController", () => {
  const health = {
    live: jest.fn().mockReturnValue({ status: "ok" }),
    ready: jest.fn().mockResolvedValue({ status: "ready" }),
  };
  const controller = new HealthController(health as unknown as HealthService);

  it("wraps liveness in the success envelope", () => {
    expect(controller.live()).toEqual({
      success: true,
      data: { status: "ok" },
    });
  });

  it("wraps readiness in the success envelope", async () => {
    await expect(controller.ready()).resolves.toEqual({
      success: true,
      data: { status: "ready" },
    });
  });
});
