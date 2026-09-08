/**
 * QR-ready hook for certificate verification.
 *
 * A maintained encoder (`qrcode`, `uqr`, or equivalent) should be wired here
 * to return an SVG for `certificateVerifyUrl(certificateId)`. QR encodes
 * that URL at render time, so no schema/migration change is required.
 *
 * Blocked in this environment: local npm TLS certificate-chain failure
 * (`UNABLE_TO_VERIFY_LEAF_SIGNATURE`). Do not disable TLS to work around it.
 * Callers must use the printed public verification URL until an encoder is added.
 */
export function certificateQrSvg(url: string): string | null {
  void url;
  return null;
}

export function isCertificateQrAvailable(): boolean {
  return false;
}
