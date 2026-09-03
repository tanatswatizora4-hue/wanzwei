# Play reviewer access

Login is required for professional, facility, and admin areas. Play reviewers
need a way to sign in.

## Do not do this

- Do not hardcode reviewer emails or passwords in source, Gradle, or docs
  committed to git.
- Do not create production credentials in this repository.
- Do not reuse the operator admin Google account password in Play Console notes.

## Recommended plan (manual operator task)

1. Create a dedicated **review** professional account on production with a
   mailbox the operator controls.
2. Optionally create a dedicated **review** facility account if reviewer must
   see hiring tools.
3. Do **not** grant admin unless Play explicitly needs the verification queue;
   admin is DB-authoritative and is a privileged role.
4. Put the credentials only in the Play Console “App access” form (encrypted
   at rest by Google, not in git).
5. If confirmation email is required, confirm the account before submitting
   the review, or provide a pre-confirmed inbox.
6. Note in App access: Google sign-in is available on `/login` for accounts
   that use Google; the review account should be email/password unless the
   operator prefers Google.

## Until the operator creates the account

`REVIEWER_ACCOUNT_MANUAL_REQUIRED=true`

The engineering change in this sprint does not create that user.
