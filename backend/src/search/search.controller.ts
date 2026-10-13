import { Controller, Get, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";

import { ApiSuccessResponse } from "../common/interfaces/api-response.interface";
import { SearchQueryDto } from "./dto/search-query.dto";
import { SearchService } from "./search.service";

@ApiTags("search")
@Controller("search")
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  async search(@Query() query: SearchQueryDto): Promise<ApiSuccessResponse<unknown>> {
    return { success: true, data: await this.searchService.search(query) };
  }
}
