import { HANOI_DONATION_LOCATIONS } from "../../../frontend/src/app/features/community/data/hanoi-donation-locations.data";

import { BASELINE_DONATION_LOCATIONS } from "./baseline-donation-locations";

describe("baseline donation locations", () => {
  it("keeps AI fallback addresses and schedules aligned with the public map", () => {
    expect(BASELINE_DONATION_LOCATIONS.map(({ id, title, regionId, address, schedule }) => ({
      id, title, regionId, address, schedule,
    }))).toEqual(HANOI_DONATION_LOCATIONS.map(({ id, title, regionId, address, schedule }) => ({
      id, title, regionId, address, schedule,
    })));
    expect(BASELINE_DONATION_LOCATIONS.map(({ description }) => description)).toEqual(
      HANOI_DONATION_LOCATIONS.map(({ summary }) => summary),
    );
    expect(BASELINE_DONATION_LOCATIONS.every(({ type, city, supportType }) =>
      type === "DONATION_LOCATION" && city === "Hà Nội" && supportType === "MEAL",
    )).toBe(true);
  });
});
