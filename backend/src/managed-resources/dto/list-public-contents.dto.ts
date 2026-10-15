import { Transform, Type } from "class-transformer";
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import { SearchDocumentType } from "@prisma/client";

export const PUBLIC_CONTENT_KINDS = [
  SearchDocumentType.GUIDE,
  SearchDocumentType.STORY,
  SearchDocumentType.CANCER_TYPE,
] as const;

export type PublicContentKind = (typeof PUBLIC_CONTENT_KINDS)[number];

export const PUBLIC_CONTENT_KIND_ENUM = {
  GUIDE: SearchDocumentType.GUIDE,
  STORY: SearchDocumentType.STORY,
  CANCER_TYPE: SearchDocumentType.CANCER_TYPE,
} as const;

export class ListPublicContentsDto {
  @IsOptional()
  @IsIn(PUBLIC_CONTENT_KINDS)
  kind?: PublicContentKind;

  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  categorySlug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  tagSlug?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === "true") return true;
    if (value === "false") return false;
    return value;
  })
  @IsBoolean()
  featured?: boolean;

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

export class ListPublicContentCategoriesDto {
  @IsOptional()
  @IsIn(PUBLIC_CONTENT_KINDS)
  kind?: PublicContentKind;
}
