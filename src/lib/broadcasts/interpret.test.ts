import { describe, expect, it } from "vitest";

import { emptyTargetingCriteria } from "./criteria";
import {
  interpretTargetingIntent,
  parseAiTargetingCriteria,
  targetingInterpretationPrompt,
} from "./interpret";
import { TargetingCriteriaSchema } from "@/lib/validation/broadcasts";

describe("AI targeting interpretation", () => {
  it("validates whitelist criteria and maps nurse aliases", () => {
    const criteria = parseAiTargetingCriteria(
      JSON.stringify({
        professions: ["Registered Nurse"],
        verifiedOnly: true,
        locations: ["Harare"],
        networkOnly: true,
        relationshipTypes: ["approved_locum"],
        professionalIds: [],
        excludeProfessionalIds: [],
      }),
    );
    expect(criteria.professions).toEqual(["Nurse"]);
    expect(criteria.verifiedOnly).toBe(true);
    expect(criteria.networkOnly).toBe(true);
    expect(criteria.relationshipTypes).toEqual(["approved_locum"]);
  });

  it("rejects unsupported AI fields", () => {
    expect(() =>
      parseAiTargetingCriteria(
        JSON.stringify({
          professions: ["Nurse"],
          verifiedOnly: true,
          locations: ["Harare"],
          networkOnly: false,
          relationshipTypes: [],
          professionalIds: [],
          excludeProfessionalIds: [],
          specialty: "theatre",
          yearsOfExperience: 5,
        }),
      ),
    ).toThrow(/Unsupported targeting fields/);
    expect(
      TargetingCriteriaSchema.safeParse({
        ...emptyTargetingCriteria(),
        radiusKm: 25,
      }).success,
    ).toBe(false);
  });

  it("never sends, queries, or mutates from interpret", async () => {
    const result = await interpretTargetingIntent(
      "Only send this to verified nurses in our approved locum pool.",
      async () =>
        JSON.stringify({
          professions: ["Nurse"],
          verifiedOnly: true,
          locations: [],
          networkOnly: true,
          relationshipTypes: ["approved_locum"],
          professionalIds: [],
          excludeProfessionalIds: [],
        }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.criteria.professions).toEqual(["Nurse"]);
    }
    const source = await import("node:fs").then((fs) =>
      fs.readFileSync("src/lib/broadcasts/interpret.ts", "utf8"),
    );
    expect(source).not.toContain("insertWorkforceBroadcast");
    expect(source).not.toContain("sendBroadcastAction");
    expect(source).not.toContain("getDb(");
    expect(source).not.toContain("generateSQL");
    expect(targetingInterpretationPrompt("nurses")).toContain("Never send a message");
  });
});
