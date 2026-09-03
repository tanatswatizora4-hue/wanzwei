# Play Store listing checklist

Do not invent screenshots or marketing claims. Capture assets from the live
product after the mobile layout ships.

## Required listing fields

| Item | Requirement | Notes |
| --- | --- | --- |
| App name | Wanzwei | ≤ 30 characters; already fits |
| Package ID | `app.wanzwei.android` | Set in Play Console on first create |
| Short description | ≤ 80 characters | Draft only after legal review of claims. Do not invent headcount or “AI matching”. |
| Full description | ≤ 4000 characters | Describe hiring/verification only. No diagnosis/device/regulator language. |
| App icon | 512 × 512 PNG, 32-bit | Use `public/icons/icon-512.png` (existing Wanzwei mark). Play may still want a separate store asset with padding. |
| Feature graphic | 1024 × 500 PNG | **Not generated.** Capture or design from current brand; do not invent a new logo. |
| Phone screenshots | At least 2, JPEG/PNG | **Not generated.** Capture from a phone or Chrome device mode on production after deploy: login, professional dashboard, jobs, facility dashboard. |
| 7-inch / 10-inch screenshots | Optional | Capture if tablet listing is enabled |
| Privacy policy URL | https://wanzwei.vercel.app/privacy | Must stay publicly reachable |
| Account deletion URL | https://wanzwei.vercel.app/account-deletion | Play Console field |
| Contact email | Play requires one | **Not in repo.** Operator must supply a monitored address. Do not invent one. |
| Content rating | IARC questionnaire | Workforce hiring; complete in Play Console. Do not guess ratings here. |
| App access | Login required | See `REVIEWER_ACCESS.md` |
| Category | Suggested: Business or Medical? | **Ambiguous.** Product is hiring, not clinical care. Operator chooses; do not claim Medical Device. |

## Short description (draft, factual)

`Healthcare hiring for Zimbabwe professionals and facilities, including HPA credential checks.`

Count and wording may be edited. Do not add unverified metrics.

## Full description (draft outline — fill from live product, do not inflate)

1. Wanzwei is a healthcare workforce platform.
2. Professionals create an account, submit credentials, browse jobs, and apply.
3. Facilities post roles and review applicants.
4. Admins review verification.
5. The Android app opens the same production site in a Trusted Web Activity.
6. Link privacy and account deletion URLs.
7. Explicitly: this is not a clinical diagnostic or treatment tool.

## Reviewer access instructions (paste into Play Console)

See `REVIEWER_ACCESS.md`. Do not put passwords in this repository or in the
public listing.

## Store listing assets still missing

- Feature graphic 1024×500
- Phone screenshots (minimum two)
- Contact email
- Final short/full description after counsel review of `/privacy` and `/terms`

## Content rating / Data safety / testing

- Complete the IARC questionnaire in Play Console. Do not guess a rating here.
- Fill Data safety from `DATA_SAFETY.md`. Do not claim encryption, HIPAA, or
  certifications unless independently confirmed.
- Confirm whether this Play account must complete closed testing before
  production. See `TESTING.md`.

