import { SearchDocumentType } from "@prisma/client";
import { IsEnum, IsOptional } from "class-validator";

export class ListManagedResourcesDto {
  @IsOptional()
  @IsEnum(SearchDocumentType)
  type?: SearchDocumentType;
}
