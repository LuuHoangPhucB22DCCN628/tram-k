import { PartnerApplicationStatus } from "@prisma/client";
import { IsEnum, IsOptional } from "class-validator";

export class ListPartnerApplicationsDto {
  @IsOptional()
  @IsEnum(PartnerApplicationStatus)
  status?: PartnerApplicationStatus;
}
