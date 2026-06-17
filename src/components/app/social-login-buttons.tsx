"use client";

import { toast } from "sonner";

export function SocialLoginButtons() {
  const onClick = (provider: "Google" | "Microsoft") => () => {
    toast.info(`${provider} sign-in isn't connected yet.`, {
      description: "Use email and password below.",
    });
  };

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <button
        type="button"
        onClick={onClick("Google")}
        className="flex h-9 items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-[color:var(--color-border-default)] bg-white text-[13px] font-medium text-[color:var(--color-ink-700)] hover:bg-[color:var(--color-surface-muted)]"
      >
        <GoogleMark /> Google
      </button>
      <button
        type="button"
        onClick={onClick("Microsoft")}
        className="flex h-9 items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-[color:var(--color-border-default)] bg-white text-[13px] font-medium text-[color:var(--color-ink-700)] hover:bg-[color:var(--color-surface-muted)]"
      >
        <MicrosoftMark /> Microsoft
      </button>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M21.6 12.23c0-.68-.06-1.36-.18-2H12v3.79h5.4a4.64 4.64 0 0 1-2.02 3.04v2.52h3.26c1.91-1.76 3.01-4.36 3.01-7.35z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.97-.9 6.62-2.42l-3.26-2.52c-.9.6-2.05.96-3.36.96-2.58 0-4.77-1.74-5.55-4.08H3.07v2.6A10 10 0 0 0 12 22z"
      />
      <path
        fill="#FBBC05"
        d="M6.45 13.94a6.01 6.01 0 0 1 0-3.88V7.46H3.07a10 10 0 0 0 0 9.08l3.38-2.6z"
      />
      <path
        fill="#EA4335"
        d="M12 6c1.47 0 2.79.5 3.83 1.5l2.87-2.87C16.97 3.05 14.7 2 12 2A10 10 0 0 0 3.07 7.46l3.38 2.6C7.23 7.74 9.42 6 12 6z"
      />
    </svg>
  );
}

function MicrosoftMark() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden>
      <rect width="10" height="10" x="1.5" y="1.5" fill="#F25022" />
      <rect width="10" height="10" x="12.5" y="1.5" fill="#7FBA00" />
      <rect width="10" height="10" x="1.5" y="12.5" fill="#00A4EF" />
      <rect width="10" height="10" x="12.5" y="12.5" fill="#FFB900" />
    </svg>
  );
}
