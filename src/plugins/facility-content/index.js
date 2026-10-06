import { registerFacilityContent } from "../../engine/extensions/facility-content.js";
/** Select this catalog plugin; all business selections below come from its JSON argument. */
export function createFacilityContent(pack) {
  return { id: "facility-content", apiVersion: 1, dataVersion: 1, version: "1.0.0", permissions: [],
    setup(api) { registerFacilityContent(api, pack); } };
}
