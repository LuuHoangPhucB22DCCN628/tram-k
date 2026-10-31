import { HairRegistrationStatus } from "@prisma/client";
import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";

export class ReviewHairRegistrationDto {
  @IsIn([
    HairRegistrationStatus.APPROVED,
    HairRegistrationStatus.REJECTED,
    HairRegistrationStatus.COMPLETED,
  ])
  status!: HairRegistrationStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
