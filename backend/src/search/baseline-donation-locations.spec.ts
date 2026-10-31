import { HANOI_DONATION_LOCATIONS } from "../../../frontend/src/app/features/community/data/hanoi-donation-locations.data";

import { BASELINE_DONATION_LOCATIONS } from "./baseline-donation-locations";

describe("baseline donation locations", () => {
  it("keeps AI fallback addresses and schedules aligned with the public map", () => {
    // Thêm ": any" vào tham số để tránh lỗi implicit any trên CI
    expect(BASELINE_DONATION_LOCATIONS.map(({ id, title, regionId, address, schedule }: any) => ({
      id, title, regionId, address, schedule,
    }))).toEqual(HANOI_DONATION_LOCATIONS.map(({ id, title, regionId, address, schedule }: any) => ({
      id, title, regionId, address, schedule,
    })));

    expect(BASELINE_DONATION_LOCATIONS.map(({ description }: any) => description)).toEqual(
      HANOI_DONATION_LOCATIONS.map(({ summary }: any) => summary),
    );

    expect(BASELINE_DONATION_LOCATIONS.every(({ type, city, supportType }: any) =>
      type === "DONATION_LOCATION" && city === "Hà Nội" && supportType === "MEAL",
    )).toBe(true);
  });
});