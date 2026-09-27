import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { ApiCreatedResponse, ApiOperation, ApiTags } from "@nestjs/swagger";

import type { ApiSuccessResponse } from "../common/interfaces/api-response.interface";
import { CreateHairRegistrationDto } from "./dto/create-hair-registration.dto";
import {
  HairRegistrationsService,
  type HairRegistrationReceipt,
} from "./hair-registrations.service";

@ApiTags("Community")
@Controller("community/hair-registrations")
export class HairRegistrationsController {
  constructor(private readonly registrations: HairRegistrationsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Tiếp nhận đăng ký nhận tóc hoặc hiến tóc" })
  @ApiCreatedResponse({ description: "Đăng ký đã được tiếp nhận và chờ xử lý" })
  async create(
    @Body() dto: CreateHairRegistrationDto,
  ): Promise<ApiSuccessResponse<HairRegistrationReceipt>> {
    return { success: true, data: await this.registrations.create(dto) };
  }
}
