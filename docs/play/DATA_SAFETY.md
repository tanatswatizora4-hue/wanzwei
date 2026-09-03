# Wanzwei Android TWA (Play preparation)

Factual description of current product behavior for Google Play Data safety
and policy questionnaires. Do not treat unanswered items as “No” or “Yes”.

## Identity

| Field | Value |
| --- | --- |
| App name | Wanzwei |
| Package ID | `app.wanzwei.android` |
| Production URL | https://wanzwei.vercel.app |
| Privacy policy URL | https://wanzwei.vercel.app/privacy |
| Account deletion URL | https://wanzwei.vercel.app/account-deletion |
| Wrapper | Trusted Web Activity via Android Browser Helper (not Capacitor, not a custom WebView product) |
| Target SDK | 36 |

## What the app is

Wanzwei is a healthcare **workforce / hiring** web application wrapped for
Android. Professionals can create profiles, submit Health Professions Authority
(HPA) credentials for verification, browse jobs, and apply. Facilities can post
jobs and review applications. Admins review verification and operate the
marketplace.

The product does **not** diagnose, treat, or manage medical conditions. It is
not a medical device. It does not impersonate a regulator.

## Authentication (current)

- Email and password through Supabase Auth (cookie session).
- Optional Google OAuth through the existing web route `/api/auth/google` →
  Supabase → Google → Supabase callback → `https://wanzwei.vercel.app/auth/callback`.
- There is **no** native Google Sign-In SDK in the Android project.
- Password recovery uses Supabase Auth emails and the same explicit
  confirmation landing: `/auth/confirm?next=/reset-password` → human POST →
  `/reset-password`. Opening the email does not reset the password.
- Roles: `professional`, `facility`, `admin`. Admin route access is enforced
  from the database role, not from a client-chosen role.

## Data the product currently processes

### Account and profile

Collected when a user creates or edits an account: name, email, role, optional
location **text** (city/area typed by the user), optional profession, optional
facility organisation name/type/location, optional avatar image.

Approximate location: **self-reported text only**. The app does not call the
Android location APIs, does not request `ACCESS_FINE_LOCATION` /
`ACCESS_COARSE_LOCATION`, and does not use `navigator.geolocation` in this
codebase.

### HPA verification

Professionals may submit registering body, registration number, and supporting
documents (PDF/JPG/PNG). Admins record verification decisions. Verification
events are append-only audit records.

### Jobs and applications

Job posts, applications, application status changes, emergency-shift alerts
between facilities and professionals.

### Documents / uploads

HTML `<input type="file">` for PDF, JPEG, and PNG. Private storage with
short-lived signed URLs. The Android wrapper does not add `CAMERA` or
`READ_MEDIA_*` permissions.

### CPD and Marketplace

Professionals can enrol in CPD courses. Facilities and professionals can view
marketplace listings and send enquiries. Course, enrolment, listing, and
enquiry rows are stored in Postgres with the same RLS model as the rest of
the product.

## Classification for Play Data safety (factual)

Play’s “shared” vs “service provider” wording is a legal question. Engineering
can only say whether data leaves the device and which processors receive it.

| Data | Status | Notes |
| --- | --- | --- |
| Account information (name, email, role) | COLLECTED | Stored in Supabase Auth + `public.users` |
| Professional profile (profession, location text, avatar) | COLLECTED | Optional fields |
| Facility information | COLLECTED | Organisation name/type/location for facility users |
| HPA verification data | COLLECTED | Registering body, registration number, documents, admin decisions, audit events |
| Uploaded documents | COLLECTED | PDF/JPG/PNG in private Supabase Storage |
| Job applications | COLLECTED | Applications and status history |
| CPD enrolments | COLLECTED | Course enrolments and related course records |
| Marketplace enquiries | COLLECTED | Listing enquiries |
| Emergency locum interactions | COLLECTED | Emergency alerts and responses |
| Diagnostics / error logging | COLLECTED when configured | App logs; Sentry only if production env is set |
| Precise / GPS location | NOT COLLECTED | No Android location permission; no `geolocation` usage in this repo |
| Advertising IDs / ads SDK | NOT COLLECTED | Not present |
| Payment card numbers | NOT COLLECTED | No in-app payments in this product |
| Native Google Sign-In tokens | NOT COLLECTED | Web OAuth only |

**SHARED (engineering meaning: sent to a third party as part of a user-chosen or hosting flow)**

- Google, when the user taps Continue with Google (OAuth identity).
- Vercel and Supabase, as hosts of the app, database, auth, and storage.

Do **not** mark “sold”, “shared for advertising”, encryption-at-rest, HIPAA,
ISO, or PCI on the Play form unless counsel confirms those claims. TLS to
Vercel/Supabase is used; that is not a certification.

## Third-party processors (current)

| Processor | Role | Status |
| --- | --- | --- |
| Vercel | Hosts the Next.js web app | Active |
| Supabase | Auth, Postgres, Storage | Active |
| Sentry | Error monitoring when env is configured | Optional / env-dependent |
| Upstash Redis | Rate limiting when env is configured | Optional / env-dependent |
| Resend | Transactional product email | **Not currently active.** Code exists; sends are skipped unless `RESEND_API_KEY` is set. Auth confirmation and recovery emails are sent by **Supabase Auth**, not Resend. |
| Google | OAuth identity provider when the user chooses Google sign-in | Active for that flow |

## Data safety worksheet (do not guess)

Play Console asks yes/no questions that depend on legal classification
(encryption in transit vs at rest, “sold”, “shared for advertising”, account
creation, deletion, children). Answer only from confirmed behavior:

**Confirmed**

- Users can create accounts.
- Users can delete their own account in Settings → Security; public instructions
  are at `/account-deletion`.
- Data is sent off-device to Vercel/Supabase (and Google during OAuth).
- Files can be uploaded by the user.
- Email addresses and names are collected.
- Approximate location is only user-typed text; GPS is not collected.
- No in-app advertising SDK is present in this repository.
- No crashlytics/Firebase Analytics SDK is present in the Android wrapper.
- No medical-device or diagnosis functionality.

**Ambiguous — operator/counsel must answer; do not guess**

- Whether data is “encrypted in transit” / “encrypted at rest” as Play defines
  those terms (TLS is used to Vercel/Supabase; at-rest details are the
  processors’ controls).
- Whether any processor relationship is “data sharing” vs “service provider”
  under Play’s definitions.
- Data retention periods (none are published as legal commitments).
- Whether the app is directed at children (product is workforce hiring; no
  under-18 flow is implemented, but age gating is not a dedicated feature).
- Whether Sentry/Upstash are enabled in the production Vercel project right now.
- Full list of data collected by Google during OAuth (Google’s account picker).

## Account deletion (implemented)

Soft-delete / anonymize `public.users`. Remove Auth user. Remove personal saved
jobs, notifications, and non-audit professional uploads. **Retain**
applications, jobs, verification rows, and verification events because no
counsel-approved retention schedule exists. Facility organisations and job
listings are not deleted when a facility user closes their login.

`supabase/migrations/0010_account_soft_delete.sql` adds `users.deleted_at`.
Do not apply a “0009 deletion” migration; production `0009` is CPD/marketplace.

Counsel should review whether verification rows (which still contain historical
name/registration submitted at the time) must later be anonymized on a defined
schedule. `LEGAL_RETENTION_REVIEW_REQUIRED=true`

## Policy statements that are true of the current product

- No medical diagnosis or treatment.
- No medical device claim.
- No regulator impersonation.
- Not a thin WebView wrapper of an arbitrary third-party site; it is a TWA of
  the developer’s own production origin `wanzwei.vercel.app`.
