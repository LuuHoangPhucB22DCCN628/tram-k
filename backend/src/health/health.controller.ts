import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags, ApiServiceUnavailableResponse } from "@nestjs/swagger";

import { HealthService } from "./health.service";

@ApiTags("System")
@Controller("health")
export class HealthController {
  constructor(private readonly healthService: HealthService) { }

  @Get("live")
  @ApiOperation({ summary: "Liveness probe - Process còn sống không" })
  @ApiOkResponse({ description: "Backend đang chạy" })
  live() {
    return { success: true, data: this.healthService.live() };
  }

  @Get("ready")
  @ApiOperation({ summary: "Readiness probe - Sẵn sàng nhận traffic chưa" })
  @ApiOkResponse({ description: "Hệ thống sẵn sàng" })
  @ApiServiceUnavailableResponse({ description: "DB hoặc Storage đang lỗi" })
  async ready() {
    return { success: true, data: await this.healthService.ready() };
  }
}