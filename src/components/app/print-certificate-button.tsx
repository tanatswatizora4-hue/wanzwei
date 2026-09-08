"use client";

export function PrintCertificateButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="mt-8 text-[13px] font-medium text-[color:var(--color-brand-600)] print:hidden"
    >
      Print / save as PDF
    </button>
  );
}
