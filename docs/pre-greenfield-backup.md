# Pre-Greenfield Backup

Archive of legacy Supabase data captured **before** Option A greenfield migration.

| Field | Value |
|-------|-------|
| **Exported** | 2026-06-16 |
| **Project URL** | `https://irgkeksrittimdwwxckl.supabase.co` |
| **Method** | Supabase MCP `execute_sql` (read-only) |
| **Destructive SQL run?** | **No** |

## Row counts at export time

| Table | Rows |
|-------|------|
| `public.profiles` | 3 |
| `public.facilities` | 4 |
| `public.jobs` | 3 |
| `public.applications` | 2 |
| `auth.users` | 5 |

## Backup queries used

```sql
SELECT json_agg(t ORDER BY t.created_at NULLS LAST, t.id) AS backup
FROM public.profiles t;

SELECT json_agg(t ORDER BY t.created_at NULLS LAST, t.id) AS backup
FROM public.facilities t;

SELECT json_agg(t ORDER BY t.created_at NULLS LAST, t.id) AS backup
FROM public.jobs t;

SELECT json_agg(t ORDER BY t.created_at NULLS LAST, t.id) AS backup
FROM public.applications t;

SELECT json_agg(row_to_json(u) ORDER BY u.created_at) AS backup
FROM (
  SELECT id, email, raw_app_meta_data, raw_user_meta_data, created_at, email_confirmed_at
  FROM auth.users u
) u;
```

---

## `public.profiles` (3 rows)

```json
[
  {
    "id": "00000000-0000-0000-0000-000000000001",
    "full_name": "Demo Professional",
    "profession": "Registered Nurse",
    "phone": "+263 77 000 0000",
    "council_number": "DEMO-001",
    "location": "Harare",
    "verification_status": "verified",
    "created_at": "2026-04-28T08:16:37.286862+00:00",
    "auth_user_id": null
  },
  {
    "id": "b57b8a38-001e-4e01-ac15-ad2dad1c05e1",
    "full_name": "mavis",
    "profession": "hoh",
    "phone": "68688686868",
    "council_number": null,
    "location": "jjjjj",
    "verification_status": "pending",
    "created_at": "2026-04-28T08:24:13.863594+00:00",
    "auth_user_id": null
  },
  {
    "id": "ddc93f4b-48dc-4b98-a75c-68949eda8141",
    "full_name": "tana tizo",
    "profession": "nurse",
    "phone": "+263567276722",
    "council_number": "32324",
    "location": "harre",
    "verification_status": "pending",
    "created_at": "2026-05-05T09:45:58.543632+00:00",
    "auth_user_id": "ffc05453-7bf4-4b8c-a242-b443a6d90896"
  }
]
```

---

## `public.facilities` (4 rows)

```json
[
  {
    "id": "6ec626d4-c2dc-44ca-bcd1-a627fb2ad011",
    "facility_name": "Unknown facility",
    "facility_type": null,
    "location": null,
    "contact_person": null,
    "phone": null,
    "verification_status": "pending",
    "created_at": "2026-04-28T08:31:35.803772+00:00",
    "auth_user_id": null
  },
  {
    "id": "3ee72fba-a763-4d5d-aa19-324829a9d13c",
    "facility_name": "kl;;k;k",
    "facility_type": ";k;k;",
    "location": "llnn",
    "contact_person": "k;;k;k",
    "phone": ";k;k",
    "verification_status": "pending",
    "created_at": "2026-04-28T08:44:13.236794+00:00",
    "auth_user_id": "e079dfc5-34cf-4dc2-978d-0bc238600a54"
  },
  {
    "id": "f106a844-ca27-4566-b857-f76081985fe3",
    "facility_name": "harare",
    "facility_type": "ho",
    "location": "ho",
    "contact_person": "ho",
    "phone": "ho",
    "verification_status": "",
    "created_at": "2026-05-02T09:10:10+00:00",
    "auth_user_id": "f106a844-ca27-4566-b857-f76081985fe3"
  },
  {
    "id": "3d3c8143-a334-4efa-bee2-8971ed9f17b5",
    "facility_name": "msmsmsms",
    "facility_type": "clinic",
    "location": "harqqe",
    "contact_person": "taku",
    "phone": "0784527532",
    "verification_status": "pending",
    "created_at": "2026-05-05T08:44:48.651319+00:00",
    "auth_user_id": "aee70f88-fe32-4d7b-9b47-f735684cd3e7"
  }
]
```

---

## `public.jobs` (3 rows)

```json
[
  {
    "id": "48dc05ba-57e6-4053-953f-c781ab643579",
    "facility_id": null,
    "title": "kkkkk",
    "profession_needed": "kkkk",
    "location": "kkkkk",
    "job_date": "0099-08-08",
    "shift_type": "Day shift",
    "notes": "pp",
    "status": "Open",
    "created_at": "2026-04-28T07:58:46.412533+00:00"
  },
  {
    "id": "ca8ab5d2-8f7b-409e-8b29-2fbd832af9e2",
    "facility_id": null,
    "title": "hyy",
    "profession_needed": "jnknk",
    "location": "knknk",
    "job_date": "0009-09-09",
    "shift_type": "Day shift",
    "notes": "ojpjp",
    "status": "Open",
    "created_at": "2026-04-28T08:10:31.53816+00:00"
  },
  {
    "id": "58832e6b-7cda-4fa4-92ce-0c4cbce05f8b",
    "facility_id": "6ec626d4-c2dc-44ca-bcd1-a627fb2ad011",
    "title": "mmm",
    "profession_needed": "-",
    "location": "0i0",
    "job_date": "0099-09-09",
    "shift_type": "Day shift",
    "notes": "mm",
    "status": "Open",
    "created_at": "2026-04-28T08:32:04.794582+00:00"
  }
]
```

---

## `public.applications` (2 rows)

```json
[
  {
    "id": "10649428-44ea-41ea-b38f-d3e5970caa84",
    "job_id": "48dc05ba-57e6-4053-953f-c781ab643579",
    "professional_id": "00000000-0000-0000-0000-000000000001",
    "status": "interested",
    "created_at": "2026-04-28T08:16:56.87404+00:00"
  },
  {
    "id": "426dd51e-60c2-495d-999d-32754cf30c00",
    "job_id": "ca8ab5d2-8f7b-409e-8b29-2fbd832af9e2",
    "professional_id": "00000000-0000-0000-0000-000000000001",
    "status": "interested",
    "created_at": "2026-04-28T08:16:59.811986+00:00"
  }
]
```

---

## `auth.users` (5 rows — not dropped by greenfield)

Password hashes are **not** exported. Use this for re-provisioning `public.users` after migration.

```json
[
  {
    "id": "e079dfc5-34cf-4dc2-978d-0bc238600a54",
    "email": "tanatswatizora4@gmail.com",
    "raw_app_meta_data": {
      "provider": "email",
      "providers": ["email"]
    },
    "raw_user_meta_data": {
      "sub": "e079dfc5-34cf-4dc2-978d-0bc238600a54",
      "email": "tanatswatizora4@gmail.com",
      "email_verified": false,
      "phone_verified": false
    },
    "created_at": "2026-04-28T08:44:12.455735+00:00",
    "email_confirmed_at": null
  },
  {
    "id": "f106a844-ca27-4566-b857-f76081985fe3",
    "email": "ttizora@gmail.com",
    "raw_app_meta_data": {
      "provider": "email",
      "providers": ["email"]
    },
    "raw_user_meta_data": {
      "email_verified": true
    },
    "created_at": "2026-04-28T09:06:50.558282+00:00",
    "email_confirmed_at": "2026-04-28T09:06:50.571457+00:00"
  },
  {
    "id": "aee70f88-fe32-4d7b-9b47-f735684cd3e7",
    "email": "tizora4@gmail.com",
    "raw_app_meta_data": {
      "provider": "email",
      "providers": ["email"]
    },
    "raw_user_meta_data": {
      "sub": "aee70f88-fe32-4d7b-9b47-f735684cd3e7",
      "email": "tizora4@gmail.com",
      "email_verified": false,
      "phone_verified": false
    },
    "created_at": "2026-05-05T08:44:47.268974+00:00",
    "email_confirmed_at": null
  },
  {
    "id": "ffc05453-7bf4-4b8c-a242-b443a6d90896",
    "email": "fobants@gmail.com",
    "raw_app_meta_data": {
      "provider": "email",
      "providers": ["email"]
    },
    "raw_user_meta_data": {
      "sub": "ffc05453-7bf4-4b8c-a242-b443a6d90896",
      "email": "fobants@gmail.com",
      "email_verified": false,
      "phone_verified": false
    },
    "created_at": "2026-05-05T09:45:57.429681+00:00",
    "email_confirmed_at": null
  },
  {
    "id": "5882ff01-392a-46b1-ab1c-97d55d9af598",
    "email": "erys@wanzwei.com",
    "raw_app_meta_data": {
      "role": "admin",
      "provider": "email",
      "providers": ["email"]
    },
    "raw_user_meta_data": {
      "name": "Erys",
      "email_verified": true
    },
    "created_at": "2026-06-09T13:26:58.767675+00:00",
    "email_confirmed_at": "2026-06-09T13:32:33.153264+00:00"
  }
]
```

---

## Auth ↔ legacy cross-reference

| Email | `auth.users.id` | Linked legacy row |
|-------|-----------------|-------------------|
| `tanatswatizora4@gmail.com` | `e079dfc5-34cf-4dc2-978d-0bc238600a54` | `facilities.auth_user_id` → `3ee72fba-...` |
| `ttizora@gmail.com` | `f106a844-ca27-4566-b857-f76081985fe3` | `facilities.auth_user_id` → `f106a844-...` (same UUID) |
| `tizora4@gmail.com` | `aee70f88-fe32-4d7b-9b47-f735684cd3e7` | `facilities.auth_user_id` → `3d3c8143-...` |
| `fobants@gmail.com` | `ffc05453-7bf4-4b8c-a242-b443a6d90896` | `profiles.auth_user_id` → `ddc93f4b-...` |
| `erys@wanzwei.com` | `5882ff01-392a-46b1-ab1c-97d55d9af598` | `app_metadata.role = admin` (no legacy profile row) |

---

## Notes

- All four legacy `public` tables had **RLS disabled** at export time.
- Two of three `jobs` rows have `facility_id = null`.
- Only one of three `profiles` rows has `auth_user_id` set.
- `auth.users` records are **preserved** by the greenfield plan; only `public.profiles`, `public.facilities`, `public.jobs`, and `public.applications` are dropped.
- Next step after approval: run legacy DROP, then apply migrations `0001` → `0004`.
