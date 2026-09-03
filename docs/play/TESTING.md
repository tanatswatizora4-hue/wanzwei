# Play testing requirements (operator)

This repository cannot see the Play Console account type. Do not assume
production-access eligibility or that closed testing is already complete.

## What the repo can know

- Package ID: `app.wanzwei.android`
- Production origin: `https://wanzwei.vercel.app`
- Wrapper: Trusted Web Activity
- Login is required for professional / facility / admin areas
- Reviewer credentials are **not** stored in git (`REVIEWER_ACCOUNT_MANUAL_REQUIRED=true`)

## What requires the Play Console

Confirm in the developer account:

1. Personal vs organization Play developer account.
2. Whether Google’s **closed testing** rule applies (personal accounts have
   been required to run a closed test with a minimum number of testers for a
   minimum number of days before production). Exact current numbers live in
   Play Console policy, not in this repo.
3. Whether Play App Signing is enabled and which SHA-256 is the **app signing**
   certificate.
4. Whether the AAB has been uploaded to internal / closed / open testing.
5. Whether Data safety, content rating, and store listing assets are complete.

## Operator actions (do not guess)

1. Open Play Console → Policy status / Testing and read the **current**
   production-access requirements for this account.
2. If closed testing is required, create a closed track, add testers the
   operator actually controls, and wait the required period. Do not invent
   tester identities in git.
3. Create Play reviewer accounts only in Play Console App access notes, never
   in the repository. See `REVIEWER_ACCESS.md`.
4. Do **not** submit a production release from this engineering sprint.

`PLAY_TESTING_REQUIREMENT_STATUS=OPERATOR_MUST_CONFIRM_ACCOUNT_TYPE`
