import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const roleEnum = pgEnum("role", [
  "professional",
  "facility",
  "admin",
]);

export const facilityTypeEnum = pgEnum("facility_type", [
  "Hospital",
  "Clinic",
  "Pharmacy",
  "Laboratory",
  "Radiology",
]);

export const employmentTypeEnum = pgEnum("employment_type", [
  "Full-time",
  "Part-time",
  "Locum",
  "Contract",
  "Permanent",
]);

export const jobStatusEnum = pgEnum("job_status", [
  "Open",
  "Interested",
  "Shortlisted",
  "Matched",
  "Closed",
]);

export const applicationStatusEnum = pgEnum("application_status", [
  "Under Review",
  "Screening",
  "Shortlisted",
  "Interview",
  "Offer",
  "Hired",
  "Rejected",
]);

export const notificationKindEnum = pgEnum("notification_kind", [
  "match",
  "application",
  "verification",
  "system",
  "emergency",
]);

export const urgencyEnum = pgEnum("urgency", [
  "Standard",
  "High",
  "Critical",
]);

export const alertOverallStatusEnum = pgEnum("alert_overall_status", [
  "Sent",
  "Filled",
  "Expired",
  "Cancelled",
]);

export const alertResponseStatusEnum = pgEnum("alert_response_status", [
  "Pending",
  "Accepted",
  "Declined",
  "Expired",
]);

export const payCurrencyEnum = pgEnum("pay_currency", [
  "USD",
  "ZWL",
  "ZAR",
]);

export const payPeriodEnum = pgEnum("pay_period", [
  "hour",
  "shift",
  "day",
]);

export const interviewModeEnum = pgEnum("interview_mode", [
  "Onsite",
  "Video",
  "Phone",
]);

export const verificationStatusEnum = pgEnum("verification_status", [
  "Pending",
  "Under Review",
  "Verified",
  "Rejected",
]);

export const courseCategoryEnum = pgEnum("course_category", [
  "Clinical",
  "Compliance",
  "Leadership",
  "Tech",
  "Wellbeing",
]);

export const courseStatusEnum = pgEnum("course_status", [
  "not_started",
  "in_progress",
  "completed",
]);

export const listingKindEnum = pgEnum("listing_kind", [
  "Clinic",
  "Pharmacy",
  "Hospital",
  "Laboratory",
  "Practice",
]);

export const listingModeEnum = pgEnum("listing_mode", ["Sale", "Lease"]);

export const courseFormatEnum = pgEnum("course_format", [
  "Online",
  "In person",
  "Hybrid",
]);

export const courseEnrolmentStatusEnum = pgEnum("course_enrolment_status", [
  "registered",
  "completed",
  "withdrawn",
]);

export const listingStatusEnum = pgEnum("listing_status", [
  "Open",
  "Closed",
  "Paused",
  "Draft",
]);

// ---------------------------------------------------------------------------
// facilities
// ---------------------------------------------------------------------------

export const facilities = pgTable("facilities", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  type: facilityTypeEnum("type").notNull(),
  location: text("location").notNull(),
  premisesNumber: text("premises_number"),
  verified: boolean("verified").notNull().default(false),
  rating: numeric("rating", { precision: 3, scale: 2 }).notNull().default("0"),
  openRoles: integer("open_roles").notNull().default(0),
  logoColor: text("logo_color"),
  initials: text("initials"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------------------------------------------------------------------------
// users
// NOTE: `id` is left without a default so a future migration can tie it to
// `auth.users(id)` without an ALTER. For now we default-random it via the
// SQL migration so the table is usable in isolation during scaffolding.
// ---------------------------------------------------------------------------

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    // Legacy signup/provisioning metadata. Active identity is account_memberships
    // plus the wanzwei_workspace cookie. Do not treat this as the workspace.
    role: roleEnum("role").notNull(),
    name: text("name").notNull(),
    title: text("title"),
    location: text("location"),
    avatarUrl: text("avatar_url"),
    verified: boolean("verified").notNull().default(false),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    profession: text("profession"),
    cpdCredits: numeric("cpd_credits", { precision: 6, scale: 2 }),
    cpdTarget: numeric("cpd_target", { precision: 6, scale: 2 }),
    // Legacy single-home link for facility-signup accounts. New workspace
    // authorization uses account_memberships, not this column.
    facilityId: uuid("facility_id").references(() => facilities.id, {
      onDelete: "set null",
    }),
    registeringBody: text("registering_body"),
    registrationNumber: text("registration_number"),
    regulatoryBodyOther: text("regulatory_body_other"),
    identityVerificationStatus: text("identity_verification_status"),
    credentialStatus: text("credential_status"),
    credentialVerifiedAt: timestamp("credential_verified_at", {
      withTimezone: true,
    }),
    credentialVerificationMethod: text("credential_verification_method"),
    practisingCertificateExpiry: date("practising_certificate_expiry"),
    practisingCertificateStatus: text("practising_certificate_status"),
    lastVerificationReviewAt: timestamp("last_verification_review_at", {
      withTimezone: true,
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("users_email_uniq").on(t.email),
    index("users_facility_id_idx").on(t.facilityId),
    index("users_role_idx").on(t.role),
    index("users_deleted_at_idx").on(t.deletedAt),
    index("users_registering_body_registration_number_idx").on(
      t.registeringBody,
      t.registrationNumber,
    ),
  ],
);

// ---------------------------------------------------------------------------
// jobs
// ---------------------------------------------------------------------------

export const jobs = pgTable(
  "jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    facilityId: uuid("facility_id")
      .notNull()
      .references(() => facilities.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    location: text("location").notNull(),
    type: employmentTypeEnum("type").notNull(),
    salary: text("salary"),
    status: jobStatusEnum("status").notNull().default("Open"),
    applicantsCount: integer("applicants_count").notNull().default(0),
    description: text("description").notNull().default(""),
    tags: text("tags")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    postedAt: timestamp("posted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("jobs_facility_id_idx").on(t.facilityId),
    index("jobs_status_idx").on(t.status),
    index("jobs_posted_at_idx").on(t.postedAt),
  ],
);

// ---------------------------------------------------------------------------
// applications
// ---------------------------------------------------------------------------

export const applications = pgTable(
  "applications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    professionalId: uuid("professional_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: applicationStatusEnum("status").notNull().default("Under Review"),
    notes: text("notes"),
    appliedAt: timestamp("applied_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("applications_job_id_idx").on(t.jobId),
    index("applications_professional_id_idx").on(t.professionalId),
    // One application per (job, professional) pair.
    uniqueIndex("applications_job_pro_uniq").on(t.jobId, t.professionalId),
  ],
);

// ---------------------------------------------------------------------------
// saved_jobs
// ---------------------------------------------------------------------------

export const savedJobs = pgTable(
  "saved_jobs",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.jobId] }),
    index("saved_jobs_job_id_idx").on(t.jobId),
  ],
);

// ---------------------------------------------------------------------------
// interviews
// ---------------------------------------------------------------------------

export const interviews = pgTable(
  "interviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    professionalId: uuid("professional_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: timestamp("date", { withTimezone: true }).notNull(),
    duration: integer("duration").notNull(),
    mode: interviewModeEnum("mode").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("interviews_job_id_idx").on(t.jobId),
    index("interviews_professional_id_idx").on(t.professionalId),
    index("interviews_date_idx").on(t.date),
  ],
);

// ---------------------------------------------------------------------------
// notifications
// ---------------------------------------------------------------------------

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    body: text("body").notNull(),
    kind: notificationKindEnum("kind").notNull(),
    unread: boolean("unread").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("notifications_user_id_idx").on(t.userId),
    index("notifications_created_at_idx").on(t.createdAt),
  ],
);

// ---------------------------------------------------------------------------
// practitioner_registry
// Server-side HPA (and later council) licence dump. Not exposed to clients.
// ---------------------------------------------------------------------------

export const practitionerRegistry = pgTable(
  "practitioner_registry",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    registeringBody: text("registering_body").notNull().default("HPA"),
    registrationNumber: text("registration_number").notNull(),
    registrationNumberNormalized: text("registration_number_normalized").notNull(),
    licenceClass: text("licence_class").notNull(),
    licenceSerial: text("licence_serial").notNull(),
    licenceYear: integer("licence_year").notNull(),
    fullName: text("full_name").notNull(),
    fullNameNormalized: text("full_name_normalized").notNull(),
    qualification: text("qualification").notNull(),
    qualificationNormalized: text("qualification_normalized").notNull(),
    address: text("address"),
    town: text("town"),
    expiryDate: date("expiry_date").notNull(),
    derivedStatus: text("derived_status").notNull(),
    isPlaceholder: boolean("is_placeholder").notNull().default(false),
    sourceFile: text("source_file").notNull(),
    sourceImportedAt: timestamp("source_imported_at", { withTimezone: true })
      .notNull(),
    sourceRow: jsonb("source_row")
      .$type<Record<string, unknown>>()
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("practitioner_registry_body_number_nonplaceholder_uniq")
      .on(t.registeringBody, t.registrationNumberNormalized)
      .where(sql`${t.isPlaceholder} = false`),
    index("practitioner_registry_body_number_idx").on(
      t.registeringBody,
      t.registrationNumberNormalized,
    ),
    index("practitioner_registry_body_class_serial_idx").on(
      t.registeringBody,
      t.licenceClass,
      t.licenceSerial,
    ),
    index("practitioner_registry_expiry_date_idx").on(t.expiryDate),
    index("practitioner_registry_qualification_normalized_idx").on(
      t.qualificationNormalized,
    ),
    index("practitioner_registry_derived_status_idx").on(t.derivedStatus),
  ],
);

// ---------------------------------------------------------------------------
// verifications
// ---------------------------------------------------------------------------

export const verifications = pgTable(
  "verifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    profession: text("profession").notNull(),
    status: verificationStatusEnum("status").notNull().default("Pending"),
    documentCount: integer("document_count").notNull().default(0),
    submittedAt: timestamp("submitted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    flags: text("flags")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    registeringBody: text("registering_body"),
    registrationNumber: text("registration_number"),
    regulatoryBodyOther: text("regulatory_body_other"),
    matchedRegistryId: uuid("matched_registry_id").references(
      () => practitionerRegistry.id,
      { onDelete: "set null" },
    ),
    matchOutcome: text("match_outcome"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("verifications_user_id_idx").on(t.userId),
    index("verifications_status_idx").on(t.status),
    index("verifications_submitted_at_idx").on(t.submittedAt),
    index("verifications_matched_registry_id_idx").on(t.matchedRegistryId),
    index("verifications_registering_body_registration_number_idx").on(
      t.registeringBody,
      t.registrationNumber,
    ),
  ],
);

// ---------------------------------------------------------------------------
// verification_documents
// ---------------------------------------------------------------------------

export const verificationDocuments = pgTable(
  "verification_documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    verificationId: uuid("verification_id")
      .notNull()
      .references(() => verifications.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    fileName: text("file_name").notNull(),
    storageBucket: text("storage_bucket").notNull(),
    storagePath: text("storage_path").notNull(),
    contentType: text("content_type"),
    sizeBytes: integer("size_bytes"),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("verification_documents_verification_id_idx").on(t.verificationId),
    index("verification_documents_user_id_idx").on(t.userId),
    uniqueIndex("verification_documents_storage_path_uniq").on(
      t.storageBucket,
      t.storagePath,
    ),
  ],
);

// ---------------------------------------------------------------------------
// verification_events
// Append-only audit. actor_user_id is null for automatic registry decisions.
// ---------------------------------------------------------------------------

export const verificationEvents = pgTable(
  "verification_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    verificationId: uuid("verification_id")
      .notNull()
      .references(() => verifications.id, { onDelete: "cascade" }),
    actorUserId: uuid("actor_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    fromStatus: text("from_status"),
    toStatus: text("to_status").notNull(),
    method: text("method").notNull(),
    matchRegistryId: uuid("match_registry_id").references(
      () => practitionerRegistry.id,
      { onDelete: "set null" },
    ),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("verification_events_verification_id_idx").on(t.verificationId),
    index("verification_events_actor_user_id_idx").on(t.actorUserId),
    index("verification_events_match_registry_id_idx").on(t.matchRegistryId),
    index("verification_events_created_at_idx").on(t.createdAt),
  ],
);

export const verificationEvidence = pgTable(
  "verification_evidence",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    verificationId: uuid("verification_id")
      .notNull()
      .references(() => verifications.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    identityDocumentId: uuid("identity_document_id"),
    credentialDocumentId: uuid("credential_document_id"),
    identityName: text("identity_name"),
    identityDocumentType: text("identity_document_type"),
    credentialName: text("credential_name"),
    credentialType: text("credential_type"),
    detectedProfession: text("detected_profession"),
    registrationNumber: text("registration_number"),
    issuingBody: text("issuing_body"),
    regulatoryBody: text("regulatory_body"),
    regulatoryBodyOther: text("regulatory_body_other"),
    issueDate: text("issue_date"),
    expiryDate: text("expiry_date"),
    nameMatch: text("name_match"),
    professionMatch: text("profession_match"),
    expiryCheck: text("expiry_check"),
    registryAvailable: boolean("registry_available").notNull().default(false),
    registryOutcome: text("registry_outcome"),
    registryNameMatch: boolean("registry_name_match"),
    registryProfessionMatch: boolean("registry_profession_match"),
    documentQuality: text("document_quality"),
    identityQuality: text("identity_quality"),
    credentialQuality: text("credential_quality"),
    credentialClass: text("credential_class"),
    fraudFlags: text("fraud_flags"),
    analysisStatus: text("analysis_status").notNull(),
    decision: text("decision").notNull(),
    decisionReason: text("decision_reason").notNull(),
    verificationMethod: text("verification_method").notNull(),
    reviewRequired: boolean("review_required").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("verification_evidence_verification_id_idx").on(t.verificationId),
    index("verification_evidence_user_id_idx").on(t.userId),
    index("verification_evidence_created_at_idx").on(t.createdAt),
  ],
);

// ---------------------------------------------------------------------------
// courses
// ---------------------------------------------------------------------------

export const courses = pgTable(
  "courses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    provider: text("provider").notNull(),
    category: courseCategoryEnum("category").notNull(),
    duration: text("duration").notNull(),
    credits: numeric("credits", { precision: 6, scale: 2 }).notNull(),
    progress: integer("progress").notNull().default(0),
    status: courseStatusEnum("status").notNull().default("not_started"),
    cover: text("cover").notNull(),
    recommended: boolean("recommended").notNull().default(false),
    description: text("description").notNull().default(""),
    format: courseFormatEnum("format").notNull().default("Online"),
    location: text("location"),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    cpdPoints: numeric("cpd_points", { precision: 6, scale: 2 }),
    accreditingBody: text("accrediting_body"),
    accreditationReference: text("accreditation_reference"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("courses_category_idx").on(t.category),
    index("courses_status_idx").on(t.status),
    index("courses_recommended_idx").on(t.recommended),
  ],
);

// ---------------------------------------------------------------------------
// listings
// ---------------------------------------------------------------------------

export const listings = pgTable(
  "listings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    kind: listingKindEnum("kind").notNull(),
    mode: listingModeEnum("mode").notNull(),
    location: text("location").notNull(),
    price: numeric("price", { precision: 12, scale: 2 }).notNull(),
    currency: text("currency").notNull(),
    beds: integer("beds"),
    rooms: integer("rooms"),
    staff: integer("staff"),
    posted: timestamp("posted", { withTimezone: true }).notNull().defaultNow(),
    cover: text("cover").notNull(),
    description: text("description").notNull(),
    confidential: boolean("confidential").notNull().default(false),
    ownerId: uuid("owner_id").references(() => users.id, {
      onDelete: "set null",
    }),
    status: listingStatusEnum("status").notNull().default("Open"),
    category: text("category"),
    condition: text("condition"),
    sellerType: text("seller_type"),
    facilityId: uuid("facility_id").references(() => facilities.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("listings_kind_idx").on(t.kind),
    index("listings_mode_idx").on(t.mode),
    index("listings_posted_idx").on(t.posted),
    index("listings_owner_id_idx").on(t.ownerId),
    index("listings_status_idx").on(t.status),
    index("listings_category_idx").on(t.category),
    index("listings_facility_id_idx").on(t.facilityId),
    index("listings_seller_type_idx").on(t.sellerType),
  ],
);

export const accountMemberships = pgTable(
  "account_memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    profileType: text("profile_type").notNull(),
    professionalProfileId: uuid("professional_profile_id").references(
      () => users.id,
      { onDelete: "cascade" },
    ),
    facilityId: uuid("facility_id").references(() => facilities.id, {
      onDelete: "cascade",
    }),
    membershipRole: text("membership_role").notNull(),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("account_memberships_user_id_idx").on(t.userId),
    index("account_memberships_facility_id_idx").on(t.facilityId),
  ],
);

export const facilityInvitations = pgTable(
  "facility_invitations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    facilityId: uuid("facility_id")
      .notNull()
      .references(() => facilities.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    membershipRole: text("membership_role").notNull(),
    tokenHash: text("token_hash").notNull(),
    status: text("status").notNull().default("pending"),
    invitedBy: uuid("invited_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedBy: uuid("accepted_by").references(() => users.id, {
      onDelete: "set null",
    }),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("facility_invitations_token_hash_uniq").on(t.tokenHash),
    index("facility_invitations_facility_id_idx").on(t.facilityId),
    index("facility_invitations_email_idx").on(t.email),
    index("facility_invitations_status_idx").on(t.status),
    index("facility_invitations_invited_by_idx").on(t.invitedBy),
    index("facility_invitations_accepted_by_idx").on(t.acceptedBy),
  ],
);

export const listingImages = pgTable(
  "listing_images",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    storagePath: text("storage_path").notNull(),
    fileName: text("file_name").notNull(),
    contentType: text("content_type").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("listing_images_storage_path_uniq").on(t.storagePath),
    index("listing_images_listing_id_idx").on(t.listingId),
  ],
);

export const cpdCertificates = pgTable(
  "cpd_certificates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    certificateId: text("certificate_id").notNull(),
    enrolmentId: uuid("enrolment_id")
      .notNull()
      .references(() => courseEnrolments.id, { onDelete: "restrict" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "restrict" }),
    recipientDisplayName: text("recipient_display_name").notNull(),
    courseTitle: text("course_title").notNull(),
    providerName: text("provider_name").notNull(),
    completionDate: date("completion_date").notNull(),
    cpdPoints: numeric("cpd_points", { precision: 6, scale: 2 }),
    accreditingBody: text("accrediting_body"),
    accreditationReference: text("accreditation_reference"),
    issuedAt: timestamp("issued_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("cpd_certificates_certificate_id_uniq").on(t.certificateId),
    uniqueIndex("cpd_certificates_enrolment_id_uniq").on(t.enrolmentId),
    index("cpd_certificates_user_id_idx").on(t.userId),
    index("cpd_certificates_course_id_idx").on(t.courseId),
  ],
);

export const courseEnrolments = pgTable(
  "course_enrolments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    status: courseEnrolmentStatusEnum("status").notNull().default("registered"),
    enrolledAt: timestamp("enrolled_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("course_enrolments_user_course_uniq").on(t.userId, t.courseId),
    index("course_enrolments_user_id_idx").on(t.userId),
    index("course_enrolments_course_id_idx").on(t.courseId),
  ],
);

export const listingEnquiries = pgTable(
  "listing_enquiries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    fromUserId: uuid("from_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone").notNull().default(""),
    message: text("message").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("listing_enquiries_listing_id_idx").on(t.listingId),
    index("listing_enquiries_from_user_id_idx").on(t.fromUserId),
    index("listing_enquiries_created_at_idx").on(t.createdAt),
  ],
);

// ---------------------------------------------------------------------------
// emergency_alerts
// ---------------------------------------------------------------------------

export const emergencyAlerts = pgTable(
  "emergency_alerts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    facilityId: uuid("facility_id")
      .notNull()
      .references(() => facilities.id, { onDelete: "cascade" }),
    profession: text("profession").notNull(),
    location: text("location").notNull(),
    urgency: urgencyEnum("urgency").notNull(),
    shiftStart: timestamp("shift_start", { withTimezone: true }).notNull(),
    shiftEnd: timestamp("shift_end", { withTimezone: true }).notNull(),
    notes: text("notes").notNull().default(""),
    payMin: numeric("pay_min", { precision: 10, scale: 2 }).notNull(),
    payMax: numeric("pay_max", { precision: 10, scale: 2 }).notNull(),
    payCurrency: payCurrencyEnum("pay_currency").notNull(),
    payPeriod: payPeriodEnum("pay_period").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    status: alertOverallStatusEnum("status").notNull().default("Sent"),
    matchedCount: integer("matched_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("emergency_alerts_facility_id_idx").on(t.facilityId),
    index("emergency_alerts_status_idx").on(t.status),
    index("emergency_alerts_expires_at_idx").on(t.expiresAt),
  ],
);

// ---------------------------------------------------------------------------
// emergency_alert_recipients (join table)
// ---------------------------------------------------------------------------

export const emergencyAlertRecipients = pgTable(
  "emergency_alert_recipients",
  {
    alertId: uuid("alert_id")
      .notNull()
      .references(() => emergencyAlerts.id, { onDelete: "cascade" }),
    professionalId: uuid("professional_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: alertResponseStatusEnum("status").notNull().default("Pending"),
    respondedAt: timestamp("responded_at", { withTimezone: true }),
  },
  (t) => [
    primaryKey({ columns: [t.alertId, t.professionalId] }),
    index("alert_recipients_professional_id_idx").on(t.professionalId),
    index("alert_recipients_status_idx").on(t.status),
  ],
);

// ---------------------------------------------------------------------------
// facility_professional_network
// Talent/affiliation pool only. NOT workspace authorization.
// ---------------------------------------------------------------------------

export const facilityProfessionalNetwork = pgTable(
  "facility_professional_network",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    facilityId: uuid("facility_id")
      .notNull()
      .references(() => facilities.id, { onDelete: "cascade" }),
    professionalUserId: uuid("professional_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    relationshipType: text("relationship_type").notNull(),
    status: text("status").notNull().default("active"),
    addedBy: uuid("added_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("facility_professional_network_facility_professional_uniq").on(
      t.facilityId,
      t.professionalUserId,
    ),
    index("facility_professional_network_facility_id_idx").on(t.facilityId),
    index("facility_professional_network_professional_user_id_idx").on(
      t.professionalUserId,
    ),
    index("facility_professional_network_added_by_idx").on(t.addedBy),
  ],
);

// ---------------------------------------------------------------------------
// workforce_broadcasts
// ---------------------------------------------------------------------------

export const workforceBroadcasts = pgTable(
  "workforce_broadcasts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    facilityId: uuid("facility_id")
      .notNull()
      .references(() => facilities.id, { onDelete: "cascade" }),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    message: text("message").notNull(),
    location: text("location"),
    positionsNeeded: integer("positions_needed"),
    shiftStart: timestamp("shift_start", { withTimezone: true }),
    shiftEnd: timestamp("shift_end", { withTimezone: true }),
    status: text("status").notNull().default("draft"),
    targetingCriteria: jsonb("targeting_criteria")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    matchedRecipientCount: integer("matched_recipient_count")
      .notNull()
      .default(0),
    jobId: uuid("job_id").references(() => jobs.id, { onDelete: "set null" }),
    emergencyAlertId: uuid("emergency_alert_id").references(
      () => emergencyAlerts.id,
      { onDelete: "set null" },
    ),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("workforce_broadcasts_facility_id_idx").on(t.facilityId),
    index("workforce_broadcasts_created_by_idx").on(t.createdBy),
    index("workforce_broadcasts_job_id_idx").on(t.jobId),
    index("workforce_broadcasts_emergency_alert_id_idx").on(t.emergencyAlertId),
    index("workforce_broadcasts_status_idx").on(t.status),
  ],
);

// ---------------------------------------------------------------------------
// workforce_broadcast_recipients (auditable snapshot after send)
// ---------------------------------------------------------------------------

export const workforceBroadcastRecipients = pgTable(
  "workforce_broadcast_recipients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    broadcastId: uuid("broadcast_id")
      .notNull()
      .references(() => workforceBroadcasts.id, { onDelete: "cascade" }),
    professionalUserId: uuid("professional_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("notified"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("workforce_broadcast_recipients_broadcast_professional_uniq").on(
      t.broadcastId,
      t.professionalUserId,
    ),
    index("workforce_broadcast_recipients_broadcast_id_idx").on(t.broadcastId),
    index("workforce_broadcast_recipients_professional_user_id_idx").on(
      t.professionalUserId,
    ),
  ],
);

// ---------------------------------------------------------------------------
// Inferred row + insert types
// ---------------------------------------------------------------------------

export type Facility = typeof facilities.$inferSelect;
export type NewFacility = typeof facilities.$inferInsert;

export type DbUser = typeof users.$inferSelect;
export type NewDbUser = typeof users.$inferInsert;

export type DbJob = typeof jobs.$inferSelect;
export type NewDbJob = typeof jobs.$inferInsert;

export type DbApplication = typeof applications.$inferSelect;
export type NewDbApplication = typeof applications.$inferInsert;

export type DbSavedJob = typeof savedJobs.$inferSelect;
export type NewDbSavedJob = typeof savedJobs.$inferInsert;

export type DbInterview = typeof interviews.$inferSelect;
export type NewDbInterview = typeof interviews.$inferInsert;

export type DbNotification = typeof notifications.$inferSelect;
export type NewDbNotification = typeof notifications.$inferInsert;

export type DbVerification = typeof verifications.$inferSelect;
export type NewDbVerification = typeof verifications.$inferInsert;

export type DbPractitionerRegistry = typeof practitionerRegistry.$inferSelect;
export type NewDbPractitionerRegistry = typeof practitionerRegistry.$inferInsert;

export type DbVerificationEvent = typeof verificationEvents.$inferSelect;
export type NewDbVerificationEvent = typeof verificationEvents.$inferInsert;

export type DbVerificationEvidence = typeof verificationEvidence.$inferSelect;
export type NewDbVerificationEvidence = typeof verificationEvidence.$inferInsert;

export type DbVerificationDocument =
  typeof verificationDocuments.$inferSelect;
export type NewDbVerificationDocument =
  typeof verificationDocuments.$inferInsert;

export type DbCourse = typeof courses.$inferSelect;
export type NewDbCourse = typeof courses.$inferInsert;

export type DbListing = typeof listings.$inferSelect;
export type NewDbListing = typeof listings.$inferInsert;

export type DbAccountMembership = typeof accountMemberships.$inferSelect;
export type NewDbAccountMembership = typeof accountMemberships.$inferInsert;

export type DbListingImage = typeof listingImages.$inferSelect;
export type NewDbListingImage = typeof listingImages.$inferInsert;

export type DbCpdCertificate = typeof cpdCertificates.$inferSelect;
export type NewDbCpdCertificate = typeof cpdCertificates.$inferInsert;

export type DbCourseEnrolment = typeof courseEnrolments.$inferSelect;
export type NewDbCourseEnrolment = typeof courseEnrolments.$inferInsert;

export type DbListingEnquiry = typeof listingEnquiries.$inferSelect;
export type NewDbListingEnquiry = typeof listingEnquiries.$inferInsert;

export type DbEmergencyAlert = typeof emergencyAlerts.$inferSelect;
export type NewDbEmergencyAlert = typeof emergencyAlerts.$inferInsert;

export type DbEmergencyAlertRecipient =
  typeof emergencyAlertRecipients.$inferSelect;
export type NewDbEmergencyAlertRecipient =
  typeof emergencyAlertRecipients.$inferInsert;

export type DbFacilityInvitation = typeof facilityInvitations.$inferSelect;
export type NewDbFacilityInvitation = typeof facilityInvitations.$inferInsert;

export type DbFacilityProfessionalNetwork =
  typeof facilityProfessionalNetwork.$inferSelect;
export type NewDbFacilityProfessionalNetwork =
  typeof facilityProfessionalNetwork.$inferInsert;

export type DbWorkforceBroadcast = typeof workforceBroadcasts.$inferSelect;
export type NewDbWorkforceBroadcast = typeof workforceBroadcasts.$inferInsert;

export type DbWorkforceBroadcastRecipient =
  typeof workforceBroadcastRecipients.$inferSelect;
export type NewDbWorkforceBroadcastRecipient =
  typeof workforceBroadcastRecipients.$inferInsert;
