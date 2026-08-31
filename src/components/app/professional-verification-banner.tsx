import Link from "next/link";
import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ProfessionalVerificationBanner() {
  return (
    <div className="mb-6 flex flex-col gap-3 rounded-[var(--radius-lg)] border border-amber-200 bg-amber-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-amber-100 text-amber-800">
          <Shield className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-[13.5px] font-semibold text-[color:var(--color-ink-900)]">
            Account verification: Not verified
          </p>
          <p className="mt-0.5 text-[12.5px] text-[color:var(--color-ink-600)]">
            You can browse the app now. Submit your HPA registration to apply
            for jobs and accept locum shifts.
          </p>
        </div>
      </div>
      <Button size="sm" asChild className="shrink-0">
        <Link href="/professional/settings">Submit credentials</Link>
      </Button>
    </div>
  );
}
