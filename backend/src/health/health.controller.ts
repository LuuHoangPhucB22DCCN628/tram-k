import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { ApiResponse } from '../common/interfaces/api-response.interface';
import { HealthService } from './health.service';
import type { HealthResult } from './health.service';

@ApiTags('System')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Kiem tra Backend dang hoat dong' })
  @ApiOkResponse({
    description: 'Backend dang hoat dong binh thuong',
    schema: {
      example: {
        success: true,
        data: {
          status: 'ok',
          service: 'tram-k-api',
          timestamp: '2026-09-04T00:00:00.000Z',
        },
      },
    },
  })
  check(): ApiResponse<HealthResult> {
    return { success: true, data: this.healthService.check() };
  }
}
