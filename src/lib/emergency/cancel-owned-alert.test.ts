import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { cancelOwnedEmergencyAlert } from "./cancel-owned-alert";

const FACILITY_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const FACILITY_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const ALERT_A = "alert-a";
const ALERT_B = "alert-b";

function store() {
  const alerts = new Map<string, string>([
    [ALERT_A, FACILITY_A],
    [ALERT_B, FACILITY_B],
  ]);
  return {
    cancelled: [] as string[],
    async cancelForFacility(alertId: string, facilityId: string) {
      if (alerts.get(alertId) !== facilityId) return false;
      this.cancelled.push(alertId);
      alerts.delete(alertId);
      return true;
    },
  };
}

describe("cancelOwnedEmergencyAlert", () => {
  it("lets Facility A cancel Facility A's alert", async () => {
    const db = store();
    await expect(
      cancelOwnedEmergencyAlert(
        { role: "facility", facilityId: FACILITY_A },
        ALERT_A,
        db,
      ),
    ).resolves.toBe("cancelled");
    expect(db.cancelled).toEqual([ALERT_A]);
  });

  it("does not let Facility A cancel Facility B's alert", async () => {
    const db = store();
    await expect(
      cancelOwnedEmergencyAlert(
        { role: "facility", facilityId: FACILITY_A },
        ALERT_B,
        db,
      ),
    ).resolves.toBe("not_found");
    expect(db.cancelled).toEqual([]);
  });

  it("forbids professionals from cancelling", async () => {
    const db = store();
    await expect(
      cancelOwnedEmergencyAlert(
        { role: "professional", facilityId: FACILITY_A },
        ALERT_A,
        db,
      ),
    ).resolves.toBe("forbidden");
    expect(db.cancelled).toEqual([]);
  });

  it("forbids unauthenticated callers", async () => {
    const db = store();
    await expect(
      cancelOwnedEmergencyAlert(null, ALERT_A, db),
    ).resolves.toBe("forbidden");
    expect(db.cancelled).toEqual([]);
  });

  it("wires the facility emergency action through ownership checks", () => {
    const source = readFileSync(
      "src/app/(app)/facility/emergency/actions.ts",
      "utf8",
    );
    expect(source).toContain("cancelOwnedEmergencyAlert");
    expect(source).toContain("cancelEmergencyAlertForFacility");
    expect(source).toContain("resolveFacilityIdForUser");
    expect(source).not.toMatch(/cancelEmergencyAlert\(/);
  });
});
