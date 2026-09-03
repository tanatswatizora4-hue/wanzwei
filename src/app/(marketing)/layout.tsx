import { MedicalBackground } from "@/components/app/medical-background";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-dvh overflow-x-hidden">
      <MedicalBackground variant="marketing" />
      {children}
    </div>
  );
}
