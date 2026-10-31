import { DONATION_MAP_REGIONS } from "../../../frontend/src/app/features/community/data/donation-map-regions.data";

import { SUPPORT_REGIONS } from "./support-regions";

describe("support regions", () => {
  it("keeps backend suggestions aligned with the provinces shown on the public map", () => {
    // Thêm ": any" vào tham số để tránh lỗi implicit any trên CI
    expect(SUPPORT_REGIONS).toEqual(
      DONATION_MAP_REGIONS.map(({ id, name }: any) => ({ id, name })),
    );

    expect(new Set(SUPPORT_REGIONS.map(({ id }: any) => id)).size).toBe(SUPPORT_REGIONS.length);
    expect(SUPPORT_REGIONS.every(({ id, name }: any) => id && name.trim())).toBe(true);
  });
});