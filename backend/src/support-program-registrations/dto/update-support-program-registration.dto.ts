import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { SupportProgramRegistrationStatus } from "@prisma/client";
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class UpdateSupportProgramRegistrationDto {
  @ApiProperty({
    enum: [
      SupportProgramRegistrationStatus.ATTENDED,
      SupportProgramRegistrationStatus.NO_SHOW,
    ],
  })
  @IsEnum(SupportProgramRegistrationStatus)
  status!: SupportProgramRegistrationStatus;

  @ApiPropertyOptional({ minLength: 10, maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  decisionReason?: string;
}
