import { Button } from "@/components/ui/button";

export function ResendConfirmationForm({
  email,
  label = "Resend confirmation email",
}: {
  email?: string;
  label?: string;
}) {
  if (!email) return null;

  return (
    <form action="/api/auth/resend-verification" method="post" className="mt-2">
      <input type="hidden" name="email" value={email} />
      <Button type="submit" size="sm" variant="secondary">
        {label}
      </Button>
    </form>
  );
}
