# Supabase Auth email templates (required operator action)

Wanzwei no longer treats an inbound GET of a confirmation URL as verification.
Scanners, Safe Links, and link previews consume one-time Supabase tokens if the
email uses `{{ .ConfirmationURL }}`, because that URL hits GoTrue `verify` on GET.

This cannot be completed from application code. Change the templates in the
Supabase Dashboard.

## 1. URL configuration

Project: the production Wanzwei Supabase project.

Authentication → URL Configuration:

- Site URL: `https://wanzwei.vercel.app`
- Additional Redirect URLs must include:
  - `https://wanzwei.vercel.app/auth/confirm`
  - `https://wanzwei.vercel.app/auth/callback`
  - `https://wanzwei.vercel.app/login`
  - `https://wanzwei.vercel.app/signup`
  - `https://wanzwei.vercel.app/reset-password`
  - `http://localhost:3000/auth/confirm`
  - `http://localhost:3000/auth/callback`

Keep any existing Google OAuth callback URLs.

## 2. Confirm signup template

Authentication → Email Templates → **Confirm signup**.

Replace the confirmation link. Do **not** use `{{ .ConfirmationURL }}`.

Exact href:

```
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup
```

Example:

```html
<h2>Confirm your email</h2>
<p>Open this page, then click Confirm email. Opening the link does not confirm the account by itself.</p>
<p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup">Confirm your email</a></p>
```

## 3. Reset password template

Authentication → Email Templates → **Reset password**.

Exact href:

```
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery
```

Example:

```html
<h2>Reset your password</h2>
<p>Open this page, then click Continue. Opening the link does not reset the password by itself.</p>
<p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery">Reset password</a></p>
```

## 4. Magic link (if enabled)

If Magic Link is enabled, use:

```
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=magiclink
```

Do not use `{{ .ConfirmationURL }}`.

## 5. What not to change

- Do not disable email confirmation.
- Do not switch Wanzwei off Supabase Auth.
- Do not put raw OTPs in logs or templates beyond Supabase’s `{{ .Token }}` if you keep the default OTP display; Wanzwei does not use a typed OTP field.
- Google OAuth still returns to `/auth/callback` with a `code`. That GET exchange is the OAuth redirect after the user completed Google, not an email scanner target.

## 6. Why this is required

Until these templates are saved, new confirmation emails can still be consumed by a GET to `https://<project>.supabase.co/auth/v1/verify?...`. The application-side landing page cannot intercept that request.
