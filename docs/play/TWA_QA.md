# TWA / Android device QA

Production origin: https://wanzwei.vercel.app  
Package: `app.wanzwei.android`  
Wrapper: Trusted Web Activity (Chrome Custom Tabs). Not Capacitor. Not a
product WebView.

Digital Asset Links must include the **Play App Signing** SHA-256 before the
URL bar disappears. Until then, the app still opens the site.

Do not mutate important production hiring or verification data merely for
visual QA. Use a dedicated review/test account.

## Google OAuth (keep current web flow)

Browser (already in use):

1. Open https://wanzwei.vercel.app/login
2. Continue with Google
3. `/api/auth/google` → Supabase → Google → `/auth/callback`
4. Session cookie exists; role routing uses DB role / `app_metadata.role`

Installed TWA:

1. Sign in with Google from the installed app
2. Account chooser appears (Chrome Custom Tabs / Google account picker)
3. Callback returns into Wanzwei (`wanzwei.vercel.app/auth/callback`) and the
   TWA resumes (App Links + DAL)
4. Confirm session cookie (signed-in dashboard)
5. Confirm a second protected navigation still succeeds
6. Confirm role routing (professional / facility / admin dashboards)
7. Confirm a non-admin cannot open `/admin/*` even with `next=/admin`

Do not add native Google Sign-In.

## Email confirmation and recovery

Confirmation and recovery emails use the **safe** landing:

email → `https://wanzwei.vercel.app/auth/confirm` GET page → explicit human
POST → verification → login or reset.

Opening the link in Android must **not** auto-verify. The GET page must still
show Confirm email / Continue, and must not call `verifyOtp` until POST.

1. Sign up with email; open the confirmation link on the device
2. App Links should open `/auth/confirm` (not auto-consume)
3. Tap Confirm email; then sign in
4. Request password reset; open the recovery link on `/auth/confirm?next=/reset-password`
5. Tap Continue, then complete `/reset-password` inside the TWA
6. Logout from the sidebar; login again

## File uploads

1. Professional Documents: choose PDF, JPG, PNG via the system document picker
2. Upload succeeds; signed URL “Open” works
3. Cancel the picker without crashing
4. `target=_blank` opens a Chrome Custom Tab overlay and does not require
   leaving the TWA permanently
5. Confirm AndroidManifest still has no `CAMERA` or `READ_MEDIA_*` permission

## Account deletion

1. Settings → Security → Delete account
2. Confirmation copy is visible
3. Wrong email / wrong `DELETE` / wrong password is rejected
4. Success signs out and shows `/login?account=deleted`

## Layout (all three roles)

Professional: dashboard, jobs, application, verification, CPD, Marketplace, profile  
Facility: dashboard, jobs, applicants, emergency surfaces, Marketplace, settings  
Admin: dashboard, verification, CPD, Marketplace  

Check drawer, back navigation, external links, keyboard, dialogs, scrolling,
tables, file picker, orientation, safe areas, logout.
