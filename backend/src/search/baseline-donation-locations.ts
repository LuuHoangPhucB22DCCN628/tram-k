import { HANOI_DONATION_LOCATIONS } from "@tram-k/support-data";

import type { PublicSupportOption } from "./search.service";

// These fixed-schedule points are also shown on the public Hanoi map. A managed
// resource with the same id takes precedence, including when it is inactive.
export const BASELINE_DONATION_LOCATIONS: readonly PublicSupportOption[] =
  HANOI_DONATION_LOCATIONS.map(({ id, title, regionId, address, schedule, summary }) => ({
    id,
    type: "DONATION_LOCATION",
    title,
    regionId,
    city: "Hà Nội",
    address,
    schedule,
    supportType: "MEAL",
    description: summary,
  }));
