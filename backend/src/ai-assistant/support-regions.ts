import { DONATION_MAP_REGIONS } from "@tram-k/support-data";

export const SUPPORT_REGIONS = DONATION_MAP_REGIONS.map(({ id, name }) => ({ id, name }));
