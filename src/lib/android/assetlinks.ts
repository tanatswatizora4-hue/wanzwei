export const ANDROID_PACKAGE_ID = "app.wanzwei.android";
export const ANDROID_HOST = "wanzwei.vercel.app";
export const ANDROID_SITE = `https://${ANDROID_HOST}`;

/**
 * Digital Asset Links served at /.well-known/assetlinks.json.
 *
 * Empty until the Play App Signing certificate SHA-256 is inserted.
 * Do not invent a fingerprint.
 */
export const digitalAssetLinks: Array<{
  relation: string[];
  target: {
    namespace: "android_app";
    package_name: string;
    sha256_cert_fingerprints: string[];
  };
}> = [];

export function assetLinksWithSha256(fingerprint: string) {
  const normalized = fingerprint.trim().toUpperCase();
  if (!/^[0-9A-F]{2}(:[0-9A-F]{2}){31}$/.test(normalized)) {
    throw new Error("SHA-256 fingerprint must be 32 colon-separated hex bytes");
  }
  return [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app" as const,
        package_name: ANDROID_PACKAGE_ID,
        sha256_cert_fingerprints: [normalized],
      },
    },
  ];
}
