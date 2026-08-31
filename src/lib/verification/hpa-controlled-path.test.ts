import { describe, expect, it } from "vitest";

import type { User, VerificationMatchOutcome, VerificationStatus } from "@/lib/types";
import {
  classifyRegistryMatch,
  professionsCompatible,
  statusForMatchOutcome,
  type RegistryMatchRecord,
} from "@/lib/registry/match";
import {
  deriveStatus,
  isPlaceholderPersonNumber,
  isPlaceholderRegistration,
  normalizePersonName,
  normalizeQualification,
  normalizeRegistrationNumber,
} from "@/lib/registry/persons-register";
import {
  submitProfessionalVerification,
  type SubmitVerificationStore,
  type VerificationWriteTx,
} from "@/lib/verification/submit";

/**
 * Controlled HPA registry record used for the local verification strategy.
 * Values match the live imported Persons Register row for P02-6462-2026.
 */
const CONTROLLED = {
  registrationNumber: "P02-6462-2026",
  registrationNumberNormalized: "P0264622026",
  fullName: "REGINALD TATENDA KADZUNGUDZIKE",
  fullNameNormalized: "REGINALD TATENDA KADZUNGUDZIKE",
  qualification: "PHARMACIST",
  qualificationNormalized: "PHARMACIST",
  expiryDate: "2027-02-28",
  licenceClass: "P02",
  licenceSerial: "6462",
} as const;

const AS_OF = new Date("2026-08-31T12:00:00+02:00");
const UNKNOWN_REGISTRATION = "P99-8888-2099";
const PLACEHOLDER_REGISTRATION = "P03-0000-2026";

function controlledRow(
  overrides: Partial<RegistryMatchRecord> = {},
): RegistryMatchRecord {
  return {
    id: "reg-p02-6462-2026",
    registeringBody: "HPA",
    registrationNumberNormalized: CONTROLLED.registrationNumberNormalized,
    fullNameNormalized: CONTROLLED.fullNameNormalized,
    qualification: CONTROLLED.qualification,
    qualificationNormalized: CONTROLLED.qualificationNormalized,
    expiryDate: CONTROLLED.expiryDate,
    isPlaceholder: false,
    licenceClass: CONTROLLED.licenceClass,
    licenceSerial: CONTROLLED.licenceSerial,
    ...overrides,
  };
}

function professional(name: string): User {
  return {
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    email: "hpa-path@example.com",
    role: "professional",
    name,
    verified: false,
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
};

function memoryStore(rows: RegistryMatchRecord[]): SubmitVerificationStore & {
  cases: MemCase[];
  events: MemEvent[];
  verified: Set<string>;
} {
  const cases: MemCase[] = [];
  const events: MemEvent[] = [];
  const verified = new Set<string>();
  let nextId = 1;

  function snapshot() {
    return {
      cases: cases.map((row) => ({ ...row })),
      events: events.map((event) => ({ ...event })),
      verified: new Set(verified),
      nextId,
    };
  }

  function restore(snap: ReturnType<typeof snapshot>) {
    cases.splice(0, cases.length, ...snap.cases);
    events.splice(0, events.length, ...snap.events);
    verified.clear();
    for (const id of snap.verified) verified.add(id);
    nextId = snap.nextId;
  }

  const tx: VerificationWriteTx = {
    acquireUserLock: async () => undefined,
    lookupRegistry: async (_body, registrationNumber) => {
      const normalized = normalizeRegistrationNumber(registrationNumber);
      return rows.filter((row) => row.registrationNumberNormalized === normalized);
    },
    findCurrentCase: async (userId) =>
      cases.find((row) => row.userId === userId) ?? null,
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
      row.name = patch.name;
      row.profession = patch.profession;
      row.registeringBody = patch.registeringBody;
      row.registrationNumber = patch.registrationNumber;
      row.status = patch.status;
      row.matchOutcome = patch.matchOutcome;
      row.matchedRegistryId = patch.matchedRegistryId;
      return { ...row };
    },
    setUserVerified: async (userId, isVerified) => {
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
      });
    },
    countOtherVerifiedCases: async () => 0,
  };

  return {
    cases,
    events,
    verified,
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

describe("controlled HPA record P02-6462-2026", () => {
  const row = controlledRow();

  it("matches the imported registry facts used for local testing", () => {
    expect(normalizeRegistrationNumber(CONTROLLED.registrationNumber)).toBe(
      CONTROLLED.registrationNumberNormalized,
    );
    expect(normalizePersonName(CONTROLLED.fullName)).toBe(
      CONTROLLED.fullNameNormalized,
    );
    expect(normalizeQualification("Pharmacist")).toBe("PHARMACIST");
    expect(deriveStatus(row.expiryDate, AS_OF)).toBe("active");
    expect(row.isPlaceholder).toBe(false);
    expect(
      isPlaceholderRegistration(row.licenceClass, row.licenceSerial),
    ).toBe(false);
    expect(isPlaceholderPersonNumber(CONTROLLED.registrationNumber)).toBe(false);
    expect(professionsCompatible("Pharmacist", row.qualificationNormalized)).toBe(
      true,
    );
  });

  it("A: auto-verifies the legitimate matching pharmacist", () => {
    const classified = classifyRegistryMatch({
      registeringBody: "HPA",
      registrationNumber: CONTROLLED.registrationNumber,
      submittedName: CONTROLLED.fullName,
      submittedProfession: "Pharmacist",
      rows: [row],
      asOf: AS_OF,
    });

    expect(classified.outcome).toBe("matched" satisfies VerificationMatchOutcome);
    expect(classified.autoVerify).toBe(true);
    expect(classified.matchedRegistryId).toBe(row.id);
    expect(statusForMatchOutcome(classified.outcome, classified.autoVerify)).toBe(
      "Verified",
    );
  });

  it("B: knowing a valid number is insufficient when the profile name differs", () => {
    const classified = classifyRegistryMatch({
      registeringBody: "HPA",
      registrationNumber: CONTROLLED.registrationNumber,
      submittedName: "TANATSWA FACILITY",
      submittedProfession: "Pharmacist",
      rows: [row],
      asOf: AS_OF,
    });

    expect(classified.outcome).toBe("name_mismatch");
    expect(classified.autoVerify).toBe(false);
    expect(classified.matchedRegistryId).toBe(row.id);
    expect(statusForMatchOutcome(classified.outcome, classified.autoVerify)).toBe(
      "Under Review",
    );
  });

  it("C: correct name with a non-pharmacist profession is not auto-verified", () => {
    const classified = classifyRegistryMatch({
      registeringBody: "HPA",
      registrationNumber: CONTROLLED.registrationNumber,
      submittedName: CONTROLLED.fullName,
      submittedProfession: "Registered Nurse",
      rows: [row],
      asOf: AS_OF,
    });

    expect(classified.outcome).toBe("profession_mismatch");
    expect(classified.autoVerify).toBe(false);
    expect(statusForMatchOutcome(classified.outcome, classified.autoVerify)).toBe(
      "Under Review",
    );
  });

  it("D: unknown registration is not auto-verified", () => {
    const classified = classifyRegistryMatch({
      registeringBody: "HPA",
      registrationNumber: UNKNOWN_REGISTRATION,
      submittedName: CONTROLLED.fullName,
      submittedProfession: "Pharmacist",
      rows: [],
      asOf: AS_OF,
    });

    expect(classified.outcome).toBe("not_found");
    expect(classified.autoVerify).toBe(false);
    expect(classified.matchedRegistryId).toBeNull();
    expect(statusForMatchOutcome(classified.outcome, classified.autoVerify)).toBe(
      "Under Review",
    );
  });

  it("E: placeholder P03-0000 cannot auto-verify even with matching name and profession", () => {
    const placeholder = controlledRow({
      id: "reg-placeholder",
      registrationNumberNormalized: "P0300002026",
      isPlaceholder: true,
      licenceClass: "P03",
      licenceSerial: "0000",
    });
    const classified = classifyRegistryMatch({
      registeringBody: "HPA",
      registrationNumber: PLACEHOLDER_REGISTRATION,
      submittedName: CONTROLLED.fullName,
      submittedProfession: "Pharmacist",
      rows: [placeholder],
      asOf: AS_OF,
    });

    expect(classified.outcome).toBe("ambiguous");
    expect(classified.autoVerify).toBe(false);
    expect(statusForMatchOutcome(classified.outcome, classified.autoVerify)).toBe(
      "Under Review",
    );
  });

  it("F: expired registration is not auto-verified even with correct name and profession", () => {
    const expired = controlledRow({ expiryDate: "2026-01-31" });
    const classified = classifyRegistryMatch({
      registeringBody: "HPA",
      registrationNumber: CONTROLLED.registrationNumber,
      submittedName: CONTROLLED.fullName,
      submittedProfession: "Pharmacist",
      rows: [expired],
      asOf: AS_OF,
    });

    expect(deriveStatus(expired.expiryDate, AS_OF)).toBe("expired");
    expect(classified.outcome).toBe("expired");
    expect(classified.autoVerify).toBe(false);
    expect(statusForMatchOutcome(classified.outcome, classified.autoVerify)).toBe(
      "Under Review",
    );
  });
});

describe("controlled HPA auto-verify service path", () => {
  const input = {
    registeringBody: "HPA" as const,
    registrationNumber: CONTROLLED.registrationNumber,
    profession: "Pharmacist",
  };

  it("A: sets users.verified, Verified status, and an auto event for a legitimate match", async () => {
    const user = professional(CONTROLLED.fullName);
    const store = memoryStore([controlledRow()]);
    const result = await submitProfessionalVerification(user, input, store);

    expect(result.verification.status).toBe("Verified");
    expect(result.verification.matchOutcome).toBe("matched");
    expect(result.userVerified).toBe(true);
    expect(store.verified.has(user.id)).toBe(true);
    expect(store.cases).toHaveLength(1);
    expect(store.events).toEqual([
      expect.objectContaining({
        method: "auto",
        fromStatus: null,
        toStatus: "Verified",
      }),
    ]);
  });

  it("B: leaves users.verified false on name_mismatch Under Review", async () => {
    const user = professional("TANATSWA FACILITY");
    const store = memoryStore([controlledRow()]);
    const result = await submitProfessionalVerification(user, input, store);

    expect(result.verification.matchOutcome).toBe("name_mismatch");
    expect(result.verification.status).toBe("Under Review");
    expect(result.userVerified).toBe(false);
    expect(store.verified.has(user.id)).toBe(false);
    expect(store.events[0]).toMatchObject({
      method: "auto",
      toStatus: "Under Review",
    });
  });

  it("C: leaves users.verified false on profession_mismatch", async () => {
    const user = professional(CONTROLLED.fullName);
    const store = memoryStore([controlledRow()]);
    const result = await submitProfessionalVerification(
      user,
      { ...input, profession: "Registered Nurse" },
      store,
    );

    expect(result.verification.matchOutcome).toBe("profession_mismatch");
    expect(result.verification.status).toBe("Under Review");
    expect(result.userVerified).toBe(false);
    expect(store.verified.has(user.id)).toBe(false);
  });

  it("D: leaves users.verified false when the registration is unknown", async () => {
    const user = professional(CONTROLLED.fullName);
    const store = memoryStore([controlledRow()]);
    const result = await submitProfessionalVerification(
      user,
      { ...input, registrationNumber: UNKNOWN_REGISTRATION },
      store,
    );

    expect(result.verification.matchOutcome).toBe("not_found");
    expect(result.verification.status).toBe("Under Review");
    expect(result.userVerified).toBe(false);
    expect(store.verified.has(user.id)).toBe(false);
  });

  it("E: never auto-verifies a placeholder registration", async () => {
    const user = professional(CONTROLLED.fullName);
    const store = memoryStore([
      controlledRow({
        registrationNumberNormalized: "P0300002026",
        isPlaceholder: true,
        licenceClass: "P03",
        licenceSerial: "0000",
      }),
    ]);
    const result = await submitProfessionalVerification(
      user,
      { ...input, registrationNumber: PLACEHOLDER_REGISTRATION },
      store,
    );

    expect(result.verification.matchOutcome).toBe("ambiguous");
    expect(result.verification.status).toBe("Under Review");
    expect(result.userVerified).toBe(false);
    expect(store.verified.has(user.id)).toBe(false);
  });

  it("F: never auto-verifies an expired registration", async () => {
    const user = professional(CONTROLLED.fullName);
    const store = memoryStore([controlledRow({ expiryDate: "2026-01-31" })]);
    const result = await submitProfessionalVerification(user, input, store);

    expect(result.verification.matchOutcome).toBe("expired");
    expect(result.verification.status).toBe("Under Review");
    expect(result.userVerified).toBe(false);
    expect(store.verified.has(user.id)).toBe(false);
  });
});
