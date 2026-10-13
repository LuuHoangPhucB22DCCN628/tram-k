import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class CreateCommunityCommentDto {
  @ApiProperty({ example: "story-hope-01" })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  sourceKey!: string;

  @ApiProperty({ example: "Ngày mình học cách hy vọng" })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  sourceTitle!: string;

  @ApiProperty({ example: "/goc-tam-ly#story-hope-01" })
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  sourcePath!: string;

  @ApiProperty({ minLength: 1, maxLength: 1000 })
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  content!: string;

  @ApiProperty({ description: "Khóa duy nhất do client tạo cho mỗi lần gửi" })
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  idempotencyKey!: string;

  @ApiPropertyOptional({ description: "Bình luận gốc được trả lời" })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  parentId?: string;
}
