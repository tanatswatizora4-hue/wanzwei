export const ANDROID_PACKAGE_ID = "app.wanzwei.android";
export const ANDROID_HOST = "wanzwei.vercel.app";
export const ANDROID_SITE = `https://${ANDROID_HOST}`;

const SHA256_FINGERPRINT =
  /^[0-9A-F]{2}(:[0-9A-F]{2}){31}$/;

export function normalizeSha256Fingerprint(fingerprint: string): string {
  const normalized = fingerprint.trim().toUpperCase();
  if (!SHA256_FINGERPRINT.test(normalized)) {
    throw new Error("SHA-256 fingerprint must be 32 colon-separated hex bytes");
  }
  return normalized;
}

/**
 * Android app signing certificates for Digital Asset Links.
 * Local upload/release cert first. Append the Play App Signing SHA-256 here
 * when Play Console provides it — do not replace this local fingerprint.
 */
export const ANDROID_SHA256_CERT_FINGERPRINTS = [
  "C0:14:72:F7:4F:1C:4D:B2:0E:8C:1A:A1:39:07:EB:67:24:23:4C:7C:BB:D3:DD:93:B3:A3:79:33:E1:28:FF:01",
] as const;

/**
 * Digital Asset Links served at /.well-known/assetlinks.json.
 */
export const digitalAssetLinks: Array<{
  relation: string[];
  target: {
    namespace: "android_app";
    package_name: string;
    sha256_cert_fingerprints: string[];
  };
}> = [
  {
    relation: ["delegate_permission/common.handle_all_urls"],
    target: {
      namespace: "android_app",
      package_name: ANDROID_PACKAGE_ID,
      sha256_cert_fingerprints: ANDROID_SHA256_CERT_FINGERPRINTS.map(
        normalizeSha256Fingerprint,
      ),
    },
  },
];

export function assetLinksWithSha256(...fingerprints: string[]) {
  const sha256_cert_fingerprints = [
    ...new Set(fingerprints.map(normalizeSha256Fingerprint)),
  ];
  return [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app" as const,
        package_name: ANDROID_PACKAGE_ID,
        sha256_cert_fingerprints,
      },
    },
  ];
}
