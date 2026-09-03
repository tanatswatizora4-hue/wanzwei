import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("professional CPD actions", () => {
  const source = readFileSync(
    "src/app/(app)/professional/cpd/actions.ts",
    "utf8",
  );

  it("registers without HPA verification and only for the signed-in professional", () => {
    const enrol = source.slice(
      source.indexOf("export async function enrolInCourseAction"),
      source.indexOf("export async function completeCourseEnrolmentAction"),
    );
    expect(enrol).toContain('requireRole(["professional"])');
    expect(enrol).not.toContain("requireVerifiedProfessional");
    expect(enrol).toContain("enrolUserInCourse(user.id, parsed.data.courseId)");
  });

  it("blocks completion and withdraw unless the enrolment belongs to the user", () => {
    expect(source).toContain("getEnrolmentForUserCourse(user.id, parsed.data.courseId)");
    expect(source).toContain("existing.userId !== user.id");
    expect(source).toContain("completeEnrolmentForUser(user.id, parsed.data.courseId)");
    expect(source).toContain("withdrawEnrolmentForUser(user.id, parsed.data.courseId)");
  });
});

describe("CPD pages persist real catalogue and history routes", () => {
  it("professional browse and detail are not gated", () => {
    const browse = readFileSync("src/app/(app)/professional/cpd/page.tsx", "utf8");
    const detail = readFileSync(
      "src/app/(app)/professional/cpd/[id]/page.tsx",
      "utf8",
    );
    expect(browse).toContain("listCourses");
    expect(browse).toContain("listEnrolmentsForUser");
    expect(browse).not.toContain("mvpSurfaceUnavailable");
    expect(detail).toContain("getCourseById");
    expect(detail).toContain("CpdEnrolButtons");
    expect(detail).not.toContain("href=\"#\"");
  });

  it("does not ship fake certificates or shared catalogue progress as learner state", () => {
    const view = readFileSync("src/components/app/cpd-view.tsx", "utf8");
    expect(view).not.toContain("Certificate");
    expect(view).not.toContain("2026 Cycle");
    expect(view).not.toContain("Certified");
    expect(view).not.toContain("href=\"#\"");
    expect(view).toContain("CpdEnrolButtons");
  });
});
