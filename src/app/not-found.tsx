import Link from "next/link";
import { Logo } from "@/components/app/logo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="border-b border-[color:var(--color-border-default)] bg-white">
        <div className="mx-auto max-w-6xl px-6 py-4">
          <Link href="/">
            <Logo />
          </Link>
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="max-w-md text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[color:var(--color-brand-600)]">
            404 · page not found
          </p>
          <h1 className="mt-3 text-[36px] font-semibold tracking-tight">
            We couldn&apos;t find that page.
          </h1>
          <p className="mt-3 text-[14px] text-[color:var(--color-ink-500)]">
            The link may be broken, or the page may have moved. Try heading back
            to the dashboard.
          </p>
          <div className="mt-6 flex items-center justify-center gap-2">
            <Button asChild>
              <Link href="/">Back to home</Link>
            </Button>
            <Button variant="secondary" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
