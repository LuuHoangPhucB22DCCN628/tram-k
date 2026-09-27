import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";

import { HealthService } from "./health.service";

@ApiTags("System")
@Controller("health")
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: "Kiểm tra Backend đang hoạt động" })
  @ApiOkResponse({ description: "Backend đang hoạt động bình thường" })
  check() {
    return { success: true, data: this.healthService.check() };
  }
}
