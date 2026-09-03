# Android TWA project

Hand-maintained Trusted Web Activity using Android Browser Helper 2.7.3
(Bubblewrap-compatible `twa-manifest.json`). Package `app.wanzwei.android`,
host `wanzwei.vercel.app`, start URL `/`, `targetSdk` 36, AGP 8.9.1 / Gradle 8.11.1.

The Android wrapper opens the existing production website. It does not
reimplement Wanzwei, does not use a product WebView, and does not replace
web auth with a native Google Sign-In SDK.

## Build

From `android/`:

```
.\gradlew.bat bundleRelease
```

Release signing reads `android/keystore.properties` if present. If it is
missing, Gradle signs the AAB with the **debug** keystore so a local bundle
file can be produced. Play Console upload requires a dedicated upload key
and Play App Signing. Do not commit `*.jks` / `keystore.properties`.

## Play App Signing / Digital Asset Links

Two different certificates exist after Play App Signing is enabled:

- **Upload key certificate** — the local keystore used to sign the AAB you
  upload. Play verifies this on upload.
- **App signing key certificate** — the key Play uses to sign what users
  install. **This** SHA-256 must appear in
  `https://wanzwei.vercel.app/.well-known/assetlinks.json`.

Until Play App Signing exists, `digitalAssetLinks` is `[]`. Do not invent a
fingerprint.

### One operator action after Play App Signing exists

1. Create an upload keystore locally (never git):

```
keytool -genkeypair -v -keystore android/upload-keystore.jks -alias upload -keyalg RSA -keysize 2048 -validity 10000
```

Copy `android/keystore.properties.example` to `android/keystore.properties`
and fill store/key passwords. Rebuild `bundleRelease`.

2. Create the Play app `app.wanzwei.android`, enable Play App Signing, and
   upload the AAB to **internal testing** (do not submit production).

3. In Play Console → Setup → App integrity, copy the **App signing key
   certificate** SHA-256 (colon-separated hex). Do not use the upload-key
   fingerprint unless Play shows they are identical.

4. Insert that fingerprint with `assetLinksWithSha256` in
   `src/lib/android/assetlinks.ts` and deploy so
   `https://wanzwei.vercel.app/.well-known/assetlinks.json` is no longer `[]`.

## Service worker

Chrome TWA installability does **not** require an application service worker
when a web app manifest is present. Wanzwei ships **no** application-level
fetch interceptor. Do not restore `public/sw.js` or `clients.claim()`.

## Apply database migration

`supabase/migrations/0010_account_soft_delete.sql` must be applied on
production Postgres **before or with** the account-deletion deploy.
Production `0009` is CPD/marketplace and must not be reused as a deletion
migration. Shipping `users.deleted_at` queries before `0010` will break
user lookups.

## Local machine notes

`android/local.properties` is gitignored. Point `sdk.dir` at the Android SDK
(example: `C:/Users/<you>/AppData/Local/Android/Sdk`). Gradle 8.11 / AGP 8.9
need **JDK 17**. `compileSdk` and
`targetSdk` remain **36**; install `platforms;android-36` if the SDK only has
a newer platform folder.
