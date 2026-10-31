import "reflect-metadata";

import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";

import { ListPublicContentsDto } from "./list-public-contents.dto";

describe("ListPublicContentsDto", () => {
  it("defaults to page 1 with 12 items and caps larger page sizes at 48", () => {
    const defaults = plainToInstance(ListPublicContentsDto, {});
    const capped = plainToInstance(ListPublicContentsDto, {
      page: "2",
      pageSize: "100",
    });

    expect(defaults).toMatchObject({ page: 1, pageSize: 12 });
    expect(capped).toMatchObject({ page: 2, pageSize: 48 });
    expect(validateSync(defaults)).toEqual([]);
    expect(validateSync(capped)).toEqual([]);
  });

  it("rejects a page size below one", () => {
    const query = plainToInstance(ListPublicContentsDto, { pageSize: "0" });

    expect(validateSync(query).map((error) => error.property)).toContain(
      "pageSize",
    );
  });
});
