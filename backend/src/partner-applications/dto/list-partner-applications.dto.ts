import { Type } from "class-transformer";
import { PartnerApplicationStatus } from "@prisma/client";
import { IsEnum, IsInt, IsOptional, Max, Min } from "class-validator";

export class ListPartnerApplicationsDto {
  @IsOptional()
  @IsEnum(PartnerApplicationStatus)
  status?: PartnerApplicationStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}
