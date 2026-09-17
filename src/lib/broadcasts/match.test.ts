import { describe, expect, it } from "vitest";

import { emptyTargetingCriteria } from "./criteria";
import {
  canProfessionalViewBroadcast,
  matchProfessionals,
  recipientsForSend,
} from "./match";
import type { BroadcastMatchCandidate, NetworkMembershipRecord } from "./network-types";

function professional(
  patch: Partial<BroadcastMatchCandidate> & { id: string },
): BroadcastMatchCandidate {
  return {
    name: patch.name ?? patch.id,
    email: patch.email ?? `${patch.id}@example.com`,
    role: "professional",
    verified: true,
    profession: "Nurse",
    location: "Harare",
    ...patch,
  };
}

const network: NetworkMembershipRecord[] = [
  {
    professionalUserId: "p-approved",
    relationshipType: "approved_locum",
    status: "active",
  },
  {
    professionalUserId: "p-employee",
    relationshipType: "employee",
    status: "active",
  },
  {
    professionalUserId: "p-inactive",
    relationshipType: "approved_locum",
    status: "inactive",
  },
];

const candidates: BroadcastMatchCandidate[] = [
  professional({ id: "p-approved" }),
  professional({ id: "p-employee", profession: "Pharmacist" }),
  professional({ id: "p-inactive" }),
  professional({ id: "p-outsider", location: "Bulawayo" }),
  professional({ id: "p-unverified", verified: false }),
  professional({ id: "p-other-city", location: "Mutare" }),
  {
    id: "facility-user",
    role: "facility",
    name: "Admin",
    email: "admin@example.com",
    verified: true,
    profession: "Nurse",
    location: "Harare",
  },
];

describe("deterministic workforce matcher", () => {
  it("uses only whitelisted criteria", () => {
    const matched = matchProfessionals({
      candidates,
      network,
      criteria: {
        ...emptyTargetingCriteria(),
        professions: ["Nurse"],
        verifiedOnly: true,
        locations: ["Harare"],
      },
    });
    expect(matched.map((row) => row.id).sort()).toEqual([
      "p-approved",
      "p-inactive",
    ]);
  });

  it("excludes unverified when verifiedOnly is set", () => {
    const matched = matchProfessionals({
      candidates,
      network,
      criteria: { ...emptyTargetingCriteria(), verifiedOnly: true },
    });
    expect(matched.some((row) => row.id === "p-unverified")).toBe(false);
    expect(matched.every((row) => row.verified === true)).toBe(true);
  });

  it("excludes outsiders when networkOnly is set", () => {
    const matched = matchProfessionals({
      candidates,
      network,
      criteria: { ...emptyTargetingCriteria(), networkOnly: true },
    });
    expect(matched.map((row) => row.id).sort()).toEqual([
      "p-approved",
      "p-employee",
    ]);
    expect(matched.some((row) => row.id === "p-outsider")).toBe(false);
    expect(matched.some((row) => row.id === "p-inactive")).toBe(false);
  });

  it("filters by network relationship type", () => {
    const matched = matchProfessionals({
      candidates,
      network,
      criteria: {
        ...emptyTargetingCriteria(),
        relationshipTypes: ["approved_locum"],
      },
    });
    expect(matched.map((row) => row.id)).toEqual(["p-approved"]);
  });

  it("honours explicit professional includes still subject to eligibility", () => {
    const matched = matchProfessionals({
      candidates,
      network,
      criteria: {
        ...emptyTargetingCriteria(),
        verifiedOnly: true,
        professionalIds: ["p-unverified", "p-approved", "facility-user"],
      },
    });
    expect(matched.map((row) => row.id)).toEqual(["p-approved"]);
  });

  it("honours excluded professional IDs", () => {
    const matched = matchProfessionals({
      candidates,
      network,
      criteria: {
        ...emptyTargetingCriteria(),
        professions: ["Nurse"],
        excludeProfessionalIds: ["p-approved"],
      },
    });
    expect(matched.some((row) => row.id === "p-approved")).toBe(false);
  });

  it("keeps internal locum outsiders unmatched when networkOnly is forced", () => {
    const matched = matchProfessionals({
      candidates,
      network,
      criteria: {
        ...emptyTargetingCriteria(),
        networkOnly: true,
      },
    });
    expect(matched.some((row) => row.id === "p-outsider")).toBe(false);
  });

  it("recomputes send recipients from the server-matched set", () => {
    const matched = matchProfessionals({
      candidates,
      network,
      criteria: { ...emptyTargetingCriteria(), networkOnly: true },
    });
    const result = recipientsForSend(matched);
    expect(result.count).toBe(matched.length);
    expect(result.count).not.toBe(999);
    expect(result.recipients).toEqual(matched);
  });

  it("allows a professional to view a broadcast only with a recipient snapshot", () => {
    expect(
      canProfessionalViewBroadcast({
        professionalUserId: "p-approved",
        recipientProfessionalUserId: "p-approved",
      }),
    ).toBe(true);
    expect(
      canProfessionalViewBroadcast({
        professionalUserId: "p-outsider",
        recipientProfessionalUserId: null,
      }),
    ).toBe(false);
  });
});
