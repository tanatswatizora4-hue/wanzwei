import { describe, expect, it } from "vitest";

import {
  evaluateInvitationAcceptance,
  hashFacilityInvitationToken,
  wouldLeaveZeroOwners,
} from "./facility-invitations";

const future = new Date("2026-09-24T12:00:00.000Z");
const now = new Date("2026-09-10T12:00:00.000Z");

describe("facility invitation acceptance", () => {
  it("accepts a pending invitation for the same login email", () => {
    expect(
      evaluateInvitationAcceptance({
        invitation: {
          status: "pending",
          email: "Jane.Moyo@example.com",
          expiresAt: future,
        },
        actorEmail: "jane.moyo@example.com",
        now,
      }),
    ).toEqual({ ok: true });
  });

  it("rejects a different email, expired, revoked, and already-accepted invitations", () => {
    expect(
      evaluateInvitationAcceptance({
        invitation: {
          status: "pending",
          email: "owner@example.com",
          expiresAt: future,
        },
        actorEmail: "other@example.com",
        now,
      }).ok,
    ).toBe(false);
    expect(
      evaluateInvitationAcceptance({
        invitation: {
          status: "pending",
          email: "jane@example.com",
          expiresAt: now,
        },
        actorEmail: "jane@example.com",
        now,
      }),
    ).toMatchObject({ ok: false, reason: "expired" });
    expect(
      evaluateInvitationAcceptance({
        invitation: {
          status: "revoked",
          email: "jane@example.com",
          expiresAt: future,
        },
        actorEmail: "jane@example.com",
        now,
      }),
    ).toMatchObject({ ok: false, reason: "revoked" });
    expect(
      evaluateInvitationAcceptance({
        invitation: {
          status: "accepted",
          email: "jane@example.com",
          expiresAt: future,
        },
        actorEmail: "jane@example.com",
        now,
      }),
    ).toMatchObject({ ok: false, reason: "already_accepted" });
  });

  it("hashes invitation tokens instead of comparing plaintext", () => {
    const hash = hashFacilityInvitationToken("secret-token");
    expect(hash).toHaveLength(64);
    expect(hash).not.toContain("secret-token");
    expect(hashFacilityInvitationToken("secret-token")).toBe(hash);
    expect(hashFacilityInvitationToken("other")).not.toBe(hash);
  });

  it("blocks removing or demoting the last owner", () => {
    expect(wouldLeaveZeroOwners({ ownerCount: 1, targetIsOwner: true })).toBe(
      true,
    );
    expect(wouldLeaveZeroOwners({ ownerCount: 2, targetIsOwner: true })).toBe(
      false,
    );
    expect(wouldLeaveZeroOwners({ ownerCount: 1, targetIsOwner: false })).toBe(
      false,
    );
  });
});
