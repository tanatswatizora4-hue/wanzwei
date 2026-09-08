import "server-only";

import { publicAccreditation, generateCertificateId } from "@/lib/cpd/certificate";
import { getEnrolmentForUserCourse } from "@/lib/repos/course-enrolments";
import { getCourseById } from "@/lib/repos/courses";
import {
  getCertificateForEnrolment,
  insertCertificate,
  type CpdCertificateRecord,
} from "@/lib/repos/cpd-certificates";
import { findUserById } from "@/lib/repos/users";

export async function issueCertificateForCompletedEnrolment(input: {
  userId: string;
  courseId: string;
}): Promise<
  | { ok: true; certificate: CpdCertificateRecord; created: boolean }
  | { ok: false; error: string }
> {
  const enrolment = await getEnrolmentForUserCourse(input.userId, input.courseId);
  if (!enrolment || enrolment.userId !== input.userId) {
    return { ok: false, error: "You are not registered for this CPD opportunity." };
  }
  if (enrolment.status !== "completed") {
    return { ok: false, error: "Complete the activity before a certificate can be issued." };
  }

  const existing = await getCertificateForEnrolment(enrolment.id);
  if (existing) {
    return { ok: true, certificate: existing, created: false };
  }

  const [course, user] = await Promise.all([
    getCourseById(input.courseId),
    findUserById(input.userId),
  ]);
  if (!course || !user) {
    return { ok: false, error: "Could not issue this certificate." };
  }

  const accreditation = publicAccreditation({
    cpdPoints: course.cpdPoints,
    accreditingBody: course.accreditingBody,
    accreditationReference: course.accreditationReference,
  });
  const completion = enrolment.completedAt
    ? new Date(enrolment.completedAt)
    : new Date();
  const completionDate = Number.isNaN(completion.getTime())
    ? new Date()
    : completion;

  const created = await insertCertificate({
    certificateId: generateCertificateId(),
    enrolmentId: enrolment.id,
    userId: input.userId,
    courseId: course.id,
    recipientDisplayName: user.name,
    courseTitle: course.title,
    providerName: course.provider,
    completionDate: completionDate.toISOString().slice(0, 10),
    cpdPoints: accreditation?.cpdPoints != null ? String(accreditation.cpdPoints) : null,
    accreditingBody: accreditation?.accreditingBody ?? null,
    accreditationReference: accreditation?.accreditationReference ?? null,
  });
  if (!created) {
    const raced = await getCertificateForEnrolment(enrolment.id);
    if (raced) return { ok: true, certificate: raced, created: false };
    return { ok: false, error: "Could not issue this certificate." };
  }
  return { ok: true, certificate: created, created: true };
}
