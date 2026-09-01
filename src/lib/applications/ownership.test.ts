import { describe, expect, it } from "vitest";

import {
  canFacilityAccessApplication,
  canProfessionalViewApplication,
} from "./ownership";

const PRO_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const PRO_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const FAC_A = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const FAC_B = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

describe("application ownership", () => {
  it("PROFESSIONAL_A_CAN_VIEW_APPLICATION_OF_PROFESSIONAL_B=false", () => {
    expect(
      canProfessionalViewApplication({
        actor: { role: "professional", id: PRO_A },
        applicationProfessionalId: PRO_B,
      }),
    ).toBe(false);
    expect(
      canProfessionalViewApplication({
        actor: { role: "professional", id: PRO_A },
        applicationProfessionalId: PRO_A,
      }),
    ).toBe(true);
    expect(
      canProfessionalViewApplication({
        actor: { role: "facility", id: FAC_A },
        applicationProfessionalId: PRO_A,
      }),
    ).toBe(false);
  });

  it("FACILITY_A_CAN_VIEW_PRIVATE_APPLICATION_FOR_FACILITY_B=false", () => {
    expect(
      canFacilityAccessApplication({
        actor: { role: "facility", facilityId: FAC_A },
        jobFacilityId: FAC_B,
      }),
    ).toBe(false);
    expect(
      canFacilityAccessApplication({
        actor: { role: "facility", facilityId: FAC_A },
        jobFacilityId: FAC_A,
      }),
    ).toBe(true);
  });

  it("admin may inspect any facility application; missing facility id cannot", () => {
    expect(
      canFacilityAccessApplication({
        actor: { role: "admin", facilityId: null },
        jobFacilityId: FAC_B,
      }),
    ).toBe(true);
    expect(
      canFacilityAccessApplication({
        actor: { role: "facility", facilityId: null },
        jobFacilityId: FAC_A,
      }),
    ).toBe(false);
  });
});
