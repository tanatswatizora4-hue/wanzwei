import { Button } from "@/components/ui/button";

export function ResendConfirmationForm({
  email,
  next,
  label = "Resend confirmation email",
}: {
  email?: string;
  next?: string;
  label?: string;
}) {
  if (!email) return null;

  return (
    <form action="/api/auth/resend-verification" method="post" className="mt-2">
      <input type="hidden" name="email" value={email} />
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <Button type="submit" size="sm" variant="secondary">
        {label}
      </Button>
    </form>
  );
}
