import { describe, expect, it } from "vitest";

import { CreateApplicationSchema } from "./applications";
import { CreateEmergencyAlertSchema, RespondToEmergencyAlertSchema } from "./emergency";
import { CreateJobSchema } from "./jobs";

const uuid = "11111111-1111-4111-8111-111111111111";

describe("workflow validation", () => {
  it("normalizes job creation payloads", () => {
    const parsed = CreateJobSchema.parse({
      facilityId: uuid,
      title: " Registered Nurse ",
      location: " Harare ",
      type: "Locum",
      salary: "USD 25/hour",
      description: " Night shift cover ",
      tags: [" ICU ", "Emergency"],
    });

    expect(parsed).toMatchObject({
      facilityId: uuid,
      title: "Registered Nurse",
      location: "Harare",
      type: "Locum",
      status: "Open",
      applicantsCount: 0,
      description: "Night shift cover",
      tags: ["ICU", "Emergency"],
    });
  });

  it("requires valid application ids and defaults the status", () => {
    const parsed = CreateApplicationSchema.parse({
      jobId: uuid,
      professionalId: "22222222-2222-4222-8222-222222222222",
      notes: " Available immediately ",
    });

    expect(parsed).toEqual({
      jobId: uuid,
      professionalId: "22222222-2222-4222-8222-222222222222",
      status: "Under Review",
      notes: "Available immediately",
    });
  });

  it("rejects invalid emergency alert ranges", () => {
    expect(
      CreateEmergencyAlertSchema.safeParse({
        profession: "Registered Nurse",
        location: "Harare",
        urgency: "High",
        shiftStart: "2026-06-09T08:00",
        shiftEnd: "2026-06-09T07:00",
        notes: "",
        payMin: 50,
        payMax: 40,
        payCurrency: "USD",
        payPeriod: "hour",
        expiresInMinutes: 60,
      }).success,
    ).toBe(false);
  });

  it("accepts only supported emergency responses", () => {
    expect(
      RespondToEmergencyAlertSchema.safeParse({
        alertId: "ea_123",
        response: "Accepted",
      }).success,
    ).toBe(true);
    expect(
      RespondToEmergencyAlertSchema.safeParse({
        alertId: "ea_123",
        response: "Pending",
      }).success,
    ).toBe(false);
  });
});
