import { DONATION_MAP_REGIONS } from "../../../frontend/src/app/features/community/data/donation-map-regions.data";

import { SUPPORT_REGIONS } from "./support-regions";

describe("support regions", () => {
  it("keeps backend suggestions aligned with the provinces shown on the public map", () => {
    expect(SUPPORT_REGIONS).toEqual(
      DONATION_MAP_REGIONS.map(({ id, name }) => ({ id, name })),
    );
    expect(new Set(SUPPORT_REGIONS.map(({ id }) => id)).size).toBe(SUPPORT_REGIONS.length);
    expect(SUPPORT_REGIONS.every(({ id, name }) => id && name.trim())).toBe(true);
  });
});
