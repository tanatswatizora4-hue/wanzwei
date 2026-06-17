# Private beta deployment

Deploy Wanzwei to Vercel for a small private beta. This guide covers environment variables, Supabase Auth, and pre-flight checks.

## Prerequisites

- Supabase project with migrations `0001`–`0005` applied
- Storage bucket `documents` created as **private** (Public bucket disabled)
- Seed data: `npm run db:seed` (optional, for demo users)
- Auth bootstrap: `npm run auth:bootstrap` (creates demo admin if needed)

## 1. Vercel project setup

1. Import the `wanzwei` directory as a Next.js project on [Vercel](https://vercel.com).
2. Set **Root Directory** to `wanzwei` if deploying from the monorepo root.
3. Framework preset: **Next.js** (default build: `npm run build`).

## 2. Required environment variables (Vercel → Settings → Environment Variables)

Set these for **Production** (and Preview if you want staging):

| Variable | Required | Notes |
|----------|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Anon/public key only |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-only; never `NEXT_PUBLIC_*` |
| `SUPABASE_DB_URL` | Yes | Pooler URI (port 6543) for runtime queries |

### Recommended for production

| Variable | Purpose |
|----------|---------|
| `UPSTASH_REDIS_REST_URL` | Shared rate limits (login, uploads, password reset) |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash REST token |
| `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` | Error reporting |
| `RESEND_API_KEY` | App transactional email (optional; Auth emails use Supabase) |

### Security note

Authentication is always enforced via Supabase Auth. Do not add env flags or code paths that bypass login in any environment.

In **Supabase Dashboard → Authentication → URL Configuration**:

**Site URL**

```
https://your-app.vercel.app
```

**Redirect URLs** (add all that apply):

```
https://your-app.vercel.app/login
https://your-app.vercel.app/signup
https://your-app.vercel.app/forgot-password
https://your-app.vercel.app/auth/callback
http://localhost:3000/login
http://localhost:3000/auth/callback
```

Email verification and password reset links use these redirects.

## 4. Security checklist (Supabase Dashboard)

- [ ] **Leaked password protection** enabled  
  Authentication → Providers → Email → Leaked password protection
- [ ] **Documents bucket is private**  
  Storage → `documents` → Public bucket **off**
- [ ] **RLS enabled** on sensitive tables (migrations `0003`, `0005`)
- [ ] **Service role key** only in Vercel env vars, not in client code or git
- [ ] **Email confirmations** configured if you require verified signups

## 5. Deploy

```bash
# From wanzwei/
npm run lint
npm run build
npm test
npm run smoke:test
```

Push to your connected Git branch, or:

```bash
npx vercel --prod
```

After deploy, verify:

1. `/login` — email/password sign-in works
2. `/signup` — creates account and redirects appropriately
3. Logout from sidebar — returns to `/login`
4. Role redirects — professional cannot access `/admin/*`
5. Document upload — professional profile uploads work (signed URLs only)

## 6. Smoke test against production (optional)

Point `SUPABASE_DB_URL` in `.env.local` at the same project and run:

```bash
npm run smoke:test
```

This validates DB connectivity and core hiring flows; it does not test the deployed Vercel URL.

## 7. Known non-blocking gaps

- Social login (Google/Microsoft) is hidden until OAuth is configured
- Document search/filters on some pages are disabled stubs
- Facility profile marketing copy and some KPIs are static placeholders
- Messages, talent pool, and billing are not MVP-complete
