import { describe, expect, it } from "vitest";

import { CreateCourseSchema, CourseIdSchema } from "./cpd";

describe("CPD validation", () => {
  it("accepts a real catalogue payload", () => {
    const parsed = CreateCourseSchema.parse({
      title: "BLS Renewal",
      provider: "Resuscitation Council",
      category: "Clinical",
      duration: "4 hours",
      credits: "4",
      format: "In person",
      description: "Hands-on renewal.",
      location: "Harare",
    });
    expect(parsed.credits).toBe(4);
    expect(parsed.recommended).toBe(false);
    expect(parsed.format).toBe("In person");
  });

  it("rejects empty titles and invalid ids", () => {
    expect(() =>
      CreateCourseSchema.parse({
        title: " ",
        provider: "MOHCC",
        category: "Clinical",
        duration: "2 hours",
        credits: 1,
      }),
    ).toThrow();
    expect(CourseIdSchema.safeParse({ courseId: "not-a-uuid" }).success).toBe(
      false,
    );
  });
});
