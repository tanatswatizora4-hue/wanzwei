import { describe, expect, it } from "vitest";

import type { User, VerificationMatchOutcome, VerificationStatus } from "@/lib/types";
import type { RegistryMatchRecord } from "@/lib/registry/match";
import { normalizeRegistrationNumber } from "@/lib/registry/persons-register";
import { applyAdminVerificationDecision } from "@/lib/verification/admin-decision";
import {
  SubmitVerificationError,
  pickCurrentCase,
  submitProfessionalVerification,
  type SubmitVerificationStore,
  type VerificationWriteTx,
} from "@/lib/verification/submit";

const USER: User = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "pro@example.com",
  role: "professional",
  name: "Tinashe Moyo",
  verified: false,
};

const ADMIN: User = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  email: "admin@example.com",
  role: "admin",
  name: "Admin",
};

const INPUT = {
  registeringBody: "HPA" as const,
  registrationNumber: "P01-6420-2026",
  profession: "Pharmacist",
};

function pharmacistRow(
  overrides: Partial<RegistryMatchRecord> = {},
): RegistryMatchRecord {
  return {
    id: "reg-1",
    registeringBody: "HPA",
    registrationNumberNormalized: "P0164202026",
    fullNameNormalized: "TINASHE MOYO",
    qualification: "PHARMACIST",
    qualificationNormalized: "PHARMACIST",
    expiryDate: "2027-02-28",
    isPlaceholder: false,
    licenceClass: "P01",
    licenceSerial: "6420",
    ...overrides,
  };
}

type MemCase = {
  id: string;
  userId: string;
  name: string;
  profession: string;
  status: VerificationStatus;
  registeringBody: string | null;
  registrationNumber: string | null;
  matchOutcome: string | null;
  matchedRegistryId: string | null;
  documentCount: number;
  submittedAt: Date;
  createdAt: Date;
  flags: string[];
};

type MemEvent = {
  verificationId: string;
  method: "auto" | "admin";
  fromStatus: VerificationStatus | null;
  toStatus: VerificationStatus;
  reason: string;
  matchRegistryId: string | null;
};

function memoryStore(options: {
  rows?: RegistryMatchRecord[];
  lookupError?: boolean;
  failOnSetVerified?: boolean;
  seedCases?: MemCase[];
  verifiedUserIds?: string[];
}): SubmitVerificationStore & {
  cases: MemCase[];
  events: MemEvent[];
  verified: Set<string>;
  ops: string[];
  lookups: number;
} {
  const cases: MemCase[] = [...(options.seedCases ?? [])];
  const events: MemEvent[] = [];
  const verified = new Set(options.verifiedUserIds ?? []);
  const ops: string[] = [];
  let lookups = 0;
  let nextId = 1;

  function snapshot() {
    return {
      cases: cases.map((row) => ({ ...row })),
      events: events.map((event) => ({ ...event })),
      verified: new Set(verified),
      nextId,
      lookups,
    };
  }

  function restore(snap: ReturnType<typeof snapshot>) {
    cases.splice(0, cases.length, ...snap.cases);
    events.splice(0, events.length, ...snap.events);
    verified.clear();
    for (const id of snap.verified) verified.add(id);
    nextId = snap.nextId;
    lookups = snap.lookups;
  }

  const tx: VerificationWriteTx = {
    acquireUserLock: async () => {
      ops.push("lock");
    },
    lookupRegistry: async (_body, registrationNumber) => {
      ops.push("lookup");
      lookups += 1;
      if (options.lookupError) throw new Error("connect failed");
      const normalized = normalizeRegistrationNumber(registrationNumber);
      return (options.rows ?? []).filter(
        (row) => row.registrationNumberNormalized === normalized,
      );
    },
    findCurrentCase: async (userId) => {
      ops.push("findCurrentCase");
      return pickCurrentCase(cases.filter((row) => row.userId === userId));
    },
    getById: async (id) => cases.find((row) => row.id === id) ?? null,
    insertCase: async (input) => {
      const now = new Date("2026-08-31T10:00:00.000Z");
      const row: MemCase = {
        id: `case-${nextId++}`,
        userId: input.userId,
        name: input.name,
        profession: input.profession,
        status: input.status,
        registeringBody: input.registeringBody,
        registrationNumber: input.registrationNumber,
        matchOutcome: input.matchOutcome,
        matchedRegistryId: input.matchedRegistryId,
        documentCount: 0,
        submittedAt: now,
        createdAt: now,
        flags: [],
      };
      cases.push(row);
      return row;
    },
    updateCase: async (id, patch) => {
      const row = cases.find((item) => item.id === id);
      if (!row) throw new Error("missing case");
      const { touchSubmittedAt, ...fields } = patch;
      Object.assign(row, fields);
      if (touchSubmittedAt) {
        row.submittedAt = new Date("2026-08-31T12:00:00.000Z");
      }
      return { ...row };
    },
    setUserVerified: async (userId, isVerified) => {
      if (options.failOnSetVerified) {
        throw new Error("users.verified update failed");
      }
      if (isVerified) verified.add(userId);
      else verified.delete(userId);
    },
    updateUserCredentials: async () => undefined,
    insertEvent: async (event) => {
      events.push({
        verificationId: event.verificationId,
        method: event.method,
        fromStatus: event.fromStatus,
        toStatus: event.toStatus,
        reason: event.reason,
        matchRegistryId: event.matchRegistryId,
      });
    },
    countOtherVerifiedCases: async (userId, exceptVerificationId) =>
      cases.filter(
        (row) =>
          row.userId === userId &&
          row.id !== exceptVerificationId &&
          row.status === "Verified",
      ).length,
  };

  return {
    cases,
    events,
    verified,
    ops,
    get lookups() {
      return lookups;
    },
    hasDbConfig: () => true,
    runInTransaction: async (fn) => {
      const snap = snapshot();
      try {
        return await fn(tx);
      } catch (error) {
        restore(snap);
        throw error;
      }
    },
  };
}

describe("submitProfessionalVerification", () => {
  it("auto-verifies an active unique HPA match and sets users.verified", async () => {
    const store = memoryStore({ rows: [pharmacistRow()] });
    const result = await submitProfessionalVerification(USER, INPUT, store);

    expect(result.verification.status).toBe("Verified");
    expect(result.verification.matchOutcome).toBe("matched" satisfies VerificationMatchOutcome);
    expect(result.userVerified).toBe(true);
    expect(store.verified.has(USER.id)).toBe(true);
    expect(store.cases).toHaveLength(1);
    expect(store.events).toEqual([
      expect.objectContaining({
        method: "auto",
        fromStatus: null,
        toStatus: "Verified",
      }),
    ]);
  });

  it("acquires the user lock before findCurrentCase and lookup", async () => {
    const store = memoryStore({ rows: [pharmacistRow()] });
    await submitProfessionalVerification(USER, INPUT, store);
    expect(store.ops[0]).toBe("lock");
    expect(store.ops.indexOf("lock")).toBeLessThan(
      store.ops.indexOf("findCurrentCase"),
    );
    expect(store.ops.indexOf("findCurrentCase")).toBeLessThan(
      store.ops.indexOf("lookup"),
    );
  });

  it("routes expired, missing, and lookup failures to Under Review without rejecting", async () => {
    const expired = memoryStore({
      rows: [pharmacistRow({ expiryDate: "2026-01-01" })],
    });
    const expiredResult = await submitProfessionalVerification(USER, INPUT, expired);
    expect(expiredResult.verification.status).toBe("Under Review");
    expect(expiredResult.verification.matchOutcome).toBe("expired");
    expect(expired.verified.has(USER.id)).toBe(false);

    const missing = memoryStore({ rows: [] });
    const missingResult = await submitProfessionalVerification(USER, INPUT, missing);
    expect(missingResult.verification.status).toBe("Under Review");
    expect(missingResult.verification.matchOutcome).toBe("not_found");

    const failed = memoryStore({ lookupError: true });
    const failedResult = await submitProfessionalVerification(USER, INPUT, failed);
    expect(failedResult.verification.status).toBe("Under Review");
    expect(failedResult.verification.matchOutcome).toBe("registry_lookup_failed");
    expect(failedResult.verification.status).not.toBe("Rejected");
  });

  it("never auto-verifies P03-0000 or SALES REPRESENTATIVE", async () => {
    const placeholder = memoryStore({
      rows: [
        pharmacistRow({
          isPlaceholder: true,
          licenceClass: "P03",
          licenceSerial: "0000",
          registrationNumberNormalized: "P0300002026",
        }),
      ],
    });
    const placeholderResult = await submitProfessionalVerification(
      USER,
      { ...INPUT, registrationNumber: "P03-0000-2026" },
      placeholder,
    );
    expect(placeholderResult.verification.status).toBe("Under Review");
    expect(placeholderResult.userVerified).toBe(false);

    const sales = memoryStore({
      rows: [
        pharmacistRow({
          qualification: "SALES REPRESENTATIVE",
          qualificationNormalized: "SALES REPRESENTATIVE",
        }),
      ],
    });
    const salesResult = await submitProfessionalVerification(
      USER,
      { ...INPUT, profession: "Sales Representative" },
      sales,
    );
    expect(salesResult.verification.matchOutcome).toBe(
      "non_clinical_qualification",
    );
    expect(salesResult.verification.status).toBe("Under Review");
  });

  it("never auto-verifies a malformed P03-0000 row with wrong class/serial flags", async () => {
    const store = memoryStore({
      rows: [
        pharmacistRow({
          isPlaceholder: false,
          licenceClass: "P01",
          licenceSerial: "6420",
          registrationNumberNormalized: "P0300002026",
        }),
      ],
    });
    const result = await submitProfessionalVerification(
      USER,
      { ...INPUT, registrationNumber: "P03-0000-2026" },
      store,
    );
    expect(result.verification.status).toBe("Under Review");
    expect(result.verification.matchOutcome).toBe("ambiguous");
    expect(result.userVerified).toBe(false);
  });

  it("routes profession mismatch to Under Review", async () => {
    const store = memoryStore({ rows: [pharmacistRow()] });
    const result = await submitProfessionalVerification(
      USER,
      { ...INPUT, profession: "Registered Nurse" },
      store,
    );
    expect(result.verification.matchOutcome).toBe("profession_mismatch");
    expect(result.verification.status).toBe("Under Review");
  });

  it("looks up the registry on identical resubmit and skips a duplicate event when unchanged", async () => {
    const store = memoryStore({ rows: [pharmacistRow()] });
    const first = await submitProfessionalVerification(USER, INPUT, store);
    const submittedAt = store.cases[0]!.submittedAt;
    const second = await submitProfessionalVerification(
      { ...USER, verified: true },
      INPUT,
      store,
    );
    expect(store.lookups).toBe(2);
    expect(store.cases).toHaveLength(1);
    expect(second.reusedExisting).toBe(true);
    expect(second.verification.id).toBe(first.verification.id);
    expect(store.events).toHaveLength(1);
    expect(store.cases[0]!.submittedAt).toEqual(submittedAt);
  });

  it("reclassifies an expired case to Verified after the registry is renewed", async () => {
    const rows = [pharmacistRow({ expiryDate: "2026-01-01" })];
    const store = memoryStore({ rows });
    const first = await submitProfessionalVerification(USER, INPUT, store);
    expect(first.verification.status).toBe("Under Review");
    expect(first.verification.matchOutcome).toBe("expired");

    rows.splice(0, 1, pharmacistRow());
    const second = await submitProfessionalVerification(USER, INPUT, store);
    expect(store.lookups).toBe(2);
    expect(second.reusedExisting).toBe(false);
    expect(second.verification.status).toBe("Verified");
    expect(second.verification.id).toBe(first.verification.id);
    expect(store.cases).toHaveLength(1);
    expect(store.events).toHaveLength(2);
    expect(store.verified.has(USER.id)).toBe(true);
  });

  it("reclassifies not_found to Verified when the registry row appears later", async () => {
    const rows: RegistryMatchRecord[] = [];
    const store = memoryStore({ rows });
    const first = await submitProfessionalVerification(USER, INPUT, store);
    expect(first.verification.matchOutcome).toBe("not_found");

    rows.push(pharmacistRow());
    const second = await submitProfessionalVerification(USER, INPUT, store);
    expect(second.verification.status).toBe("Verified");
    expect(second.verification.id).toBe(first.verification.id);
    expect(store.events).toHaveLength(2);
  });

  it("does not blindly reuse a Verified match after the registry later expires", async () => {
    const rows = [pharmacistRow()];
    const store = memoryStore({ rows });
    const first = await submitProfessionalVerification(USER, INPUT, store);
    expect(first.verification.status).toBe("Verified");

    rows.splice(0, 1, pharmacistRow({ expiryDate: "2026-01-01" }));
    const second = await submitProfessionalVerification(
      { ...USER, verified: true },
      INPUT,
      store,
    );
    expect(store.lookups).toBe(2);
    expect(second.verification.status).toBe("Under Review");
    expect(second.verification.matchOutcome).toBe("expired");
    expect(second.verification.id).not.toBe(first.verification.id);
    expect(store.cases).toHaveLength(2);
    expect(store.cases.find((row) => row.id === first.verification.id)?.status).toBe(
      "Verified",
    );
    expect(store.verified.has(USER.id)).toBe(true);
  });

  it("does not create a case for another user and rejects non-professionals", async () => {
    const store = memoryStore({ rows: [pharmacistRow()] });
    const other: User = { ...USER, id: "22222222-2222-4222-8222-222222222222" };
    await submitProfessionalVerification(USER, INPUT, store);
    expect(store.cases[0]?.userId).toBe(USER.id);
    expect(store.cases[0]?.userId).not.toBe(other.id);

    await expect(
      submitProfessionalVerification({ ...USER, role: "facility" }, INPUT, store),
    ).rejects.toBeInstanceOf(SubmitVerificationError);
  });

  it("rolls back so a Verified case cannot persist with users.verified false", async () => {
    const store = memoryStore({
      rows: [pharmacistRow()],
      failOnSetVerified: true,
    });
    await expect(
      submitProfessionalVerification(USER, INPUT, store),
    ).rejects.toThrow(/users.verified update failed/);
    expect(store.cases).toHaveLength(0);
    expect(store.verified.has(USER.id)).toBe(false);
    expect(store.events).toHaveLength(0);
  });

  it("preserves a Verified row when changed credentials go Under Review", async () => {
    const store = memoryStore({
      rows: [pharmacistRow()],
      verifiedUserIds: [USER.id],
    });
    store.cases.push({
      id: "case-existing",
      userId: USER.id,
      name: USER.name,
      profession: "Pharmacist",
      status: "Verified",
      registeringBody: "HPA",
      registrationNumber: "P01-6420-2026",
      matchOutcome: "matched",
      matchedRegistryId: "reg-1",
      documentCount: 0,
      submittedAt: new Date("2026-08-01T00:00:00.000Z"),
      createdAt: new Date("2026-08-01T00:00:00.000Z"),
      flags: [],
    });

    const result = await submitProfessionalVerification(
      { ...USER, verified: true },
      { ...INPUT, registrationNumber: "P01-9999-2026" },
      store,
    );
    expect(result.verification.status).toBe("Under Review");
    expect(result.verification.id).not.toBe("case-existing");
    expect(store.verified.has(USER.id)).toBe(true);
    expect(store.cases).toHaveLength(2);
    expect(store.cases.find((row) => row.id === "case-existing")?.status).toBe(
      "Verified",
    );
    expect(store.events.at(-1)).toEqual(
      expect.objectContaining({
        verificationId: result.verification.id,
        fromStatus: null,
        toStatus: "Under Review",
        method: "auto",
      }),
    );
  });
});

describe("current-case ordering", () => {
  it("breaks submitted_at ties with created_at then id descending", () => {
    const tie = new Date("2026-08-31T10:00:00.000Z");
    const current = pickCurrentCase([
      {
        id: "11111111-1111-4111-8111-aaaaaaaaaaaa",
        submittedAt: tie,
        createdAt: tie,
      },
      {
        id: "11111111-1111-4111-8111-zzzzzzzzzzzz",
        submittedAt: tie,
        createdAt: tie,
      },
    ]);
    expect(current?.id).toBe("11111111-1111-4111-8111-zzzzzzzzzzzz");
  });
});

describe("applyAdminVerificationDecision", () => {
  it("sets users.verified true atomically and writes an admin event", async () => {
    const store = memoryStore({
      seedCases: [
        {
          id: "case-1",
          userId: USER.id,
          name: USER.name,
          profession: "Pharmacist",
          status: "Under Review",
          registeringBody: "HPA",
          registrationNumber: "P01-6420-2026",
          matchOutcome: "name_mismatch",
          matchedRegistryId: "reg-1",
          documentCount: 0,
          submittedAt: new Date("2026-08-01T00:00:00.000Z"),
          createdAt: new Date("2026-08-01T00:00:00.000Z"),
          flags: [],
        },
      ],
    });

    const result = await applyAdminVerificationDecision(
      ADMIN,
      "case-1",
      "Verified",
      store,
    );
    expect(result?.verification.status).toBe("Verified");
    expect(result?.userVerified).toBe(true);
    expect(store.verified.has(USER.id)).toBe(true);
    expect(store.cases[0]?.matchOutcome).toBe("name_mismatch");
    expect(store.cases[0]?.submittedAt).toEqual(
      new Date("2026-08-01T00:00:00.000Z"),
    );
    expect(store.events).toEqual([
      expect.objectContaining({ method: "admin", toStatus: "Verified" }),
    ]);
  });

  it("does not insert a duplicate event for a repeated identical decision", async () => {
    const store = memoryStore({
      seedCases: [
        {
          id: "case-1",
          userId: USER.id,
          name: USER.name,
          profession: "Pharmacist",
          status: "Verified",
          registeringBody: "HPA",
          registrationNumber: "P01-6420-2026",
          matchOutcome: "name_mismatch",
          matchedRegistryId: "reg-1",
          documentCount: 0,
          submittedAt: new Date("2026-08-01T00:00:00.000Z"),
          createdAt: new Date("2026-08-01T00:00:00.000Z"),
          flags: [],
        },
      ],
      verifiedUserIds: [USER.id],
    });

    await applyAdminVerificationDecision(ADMIN, "case-1", "Verified", store);
    expect(store.events).toHaveLength(0);
    expect(store.verified.has(USER.id)).toBe(true);
  });

  it("keeps users.verified when rejecting if another Verified case exists", async () => {
    const store = memoryStore({
      seedCases: [
        {
          id: "case-old",
          userId: USER.id,
          name: USER.name,
          profession: "Pharmacist",
          status: "Verified",
          registeringBody: "HPA",
          registrationNumber: "P01-6420-2026",
          matchOutcome: "matched",
          matchedRegistryId: "reg-1",
          documentCount: 0,
          submittedAt: new Date("2026-07-01T00:00:00.000Z"),
          createdAt: new Date("2026-07-01T00:00:00.000Z"),
          flags: [],
        },
        {
          id: "case-new",
          userId: USER.id,
          name: USER.name,
          profession: "Pharmacist",
          status: "Under Review",
          registeringBody: "HPA",
          registrationNumber: "P01-9999-2026",
          matchOutcome: "not_found",
          matchedRegistryId: null,
          documentCount: 0,
          submittedAt: new Date("2026-08-01T00:00:00.000Z"),
          createdAt: new Date("2026-08-01T00:00:00.000Z"),
          flags: [],
        },
      ],
      verifiedUserIds: [USER.id],
    });

    const result = await applyAdminVerificationDecision(
      ADMIN,
      "case-new",
      "Rejected",
      store,
    );
    expect(result?.verification.status).toBe("Rejected");
    expect(result?.userVerified).toBe(true);
    expect(store.verified.has(USER.id)).toBe(true);
  });

  it("clears users.verified when rejecting the only Verified case", async () => {
    const store = memoryStore({
      seedCases: [
        {
          id: "case-1",
          userId: USER.id,
          name: USER.name,
          profession: "Pharmacist",
          status: "Verified",
          registeringBody: "HPA",
          registrationNumber: "P01-6420-2026",
          matchOutcome: "matched",
          matchedRegistryId: "reg-1",
          documentCount: 0,
          submittedAt: new Date("2026-08-01T00:00:00.000Z"),
          createdAt: new Date("2026-08-01T00:00:00.000Z"),
          flags: [],
        },
      ],
      verifiedUserIds: [USER.id],
    });

    const result = await applyAdminVerificationDecision(
      ADMIN,
      "case-1",
      "Rejected",
      store,
    );
    expect(result?.userVerified).toBe(false);
    expect(store.verified.has(USER.id)).toBe(false);
  });

  it("does not promote an older case to current after an admin decision", async () => {
    const olderSubmitted = new Date("2026-07-01T00:00:00.000Z");
    const newerSubmitted = new Date("2026-08-01T00:00:00.000Z");
    const store = memoryStore({
      seedCases: [
        {
          id: "case-old",
          userId: USER.id,
          name: USER.name,
          profession: "Pharmacist",
          status: "Under Review",
          registeringBody: "HPA",
          registrationNumber: "P01-6420-2026",
          matchOutcome: "name_mismatch",
          matchedRegistryId: "reg-1",
          documentCount: 0,
          submittedAt: olderSubmitted,
          createdAt: olderSubmitted,
          flags: [],
        },
        {
          id: "case-new",
          userId: USER.id,
          name: USER.name,
          profession: "Pharmacist",
          status: "Under Review",
          registeringBody: "HPA",
          registrationNumber: "P01-9999-2026",
          matchOutcome: "not_found",
          matchedRegistryId: null,
          documentCount: 0,
          submittedAt: newerSubmitted,
          createdAt: newerSubmitted,
          flags: [],
        },
      ],
    });

    await applyAdminVerificationDecision(ADMIN, "case-old", "Verified", store);
    expect(store.cases.find((row) => row.id === "case-old")?.submittedAt).toEqual(
      olderSubmitted,
    );
    const current = pickCurrentCase(store.cases);
    expect(current?.id).toBe("case-new");
  });
});
