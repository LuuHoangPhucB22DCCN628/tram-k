import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsOptional } from "class-validator";

export class PublishContentDto {
    @ApiPropertyOptional({ description: "Thời điểm xuất bản (nếu muốn hẹn giờ)" })
    @IsOptional() @IsDateString()
    publishAt?: string;
}