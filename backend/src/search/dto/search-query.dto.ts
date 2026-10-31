import { Transform, Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsString, Length, Max, Min } from "class-validator";
import { SearchDocumentType } from "@prisma/client";

export class SearchQueryDto {
  @Transform(({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @Length(2, 120)
  q!: string;

  @IsOptional()
  @IsEnum(SearchDocumentType)
  type?: SearchDocumentType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(48)
  pageSize = 12;
}
