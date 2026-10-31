import { SearchDocumentType } from "@prisma/client";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("Prisma pin and SearchDocumentType", () => {
  it("pins prisma and @prisma/client to the same exact version", () => {
    const pkg = JSON.parse(
      readFileSync(join(__dirname, "../../package.json"), "utf-8"),
    ) as {
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
    };

    expect(pkg.dependencies["@prisma/client"]).toBe("6.12.0");
    expect(pkg.devDependencies.prisma).toBe("6.12.0");
    expect(pkg.dependencies["@prisma/client"]).toBe(pkg.devDependencies.prisma);
    expect(pkg.dependencies["@prisma/client"]).not.toMatch(/^[~^]/);
    expect(pkg.devDependencies.prisma).not.toMatch(/^[~^]/);
  });

  it("does not expose PODCAST on SearchDocumentType", () => {
    expect(Object.values(SearchDocumentType)).toEqual([
      "GUIDE",
      "CANCER_TYPE",
      "STORY",
      "SUPPORT_PROGRAM",
      "DONATION_LOCATION",
    ]);
    expect(Object.values(SearchDocumentType)).not.toContain("PODCAST");
  });
});