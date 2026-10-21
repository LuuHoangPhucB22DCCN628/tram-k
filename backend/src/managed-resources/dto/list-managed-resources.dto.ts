import { Transform, Type } from "class-transformer";
import { SearchDocumentType } from "@prisma/client";
import { IsEnum, IsInt, IsOptional, Max, Min } from "class-validator";

export class ListManagedResourcesDto {
  @IsOptional()
  @IsEnum(SearchDocumentType)
  type?: SearchDocumentType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined) return 12;
    const pageSize = Number(value);
    return Number.isInteger(pageSize) ? Math.min(pageSize, 48) : value;
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(48)
  pageSize = 12;
}
