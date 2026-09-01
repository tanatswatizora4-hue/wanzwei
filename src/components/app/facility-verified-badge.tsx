import { CheckCircle2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";

export function FacilityVerifiedBadge({ verified }: { verified: boolean }) {
  if (verified) {
    return (
      <Badge tone="success" withDot>
        <CheckCircle2 className="h-3 w-3" /> Verified Facility
      </Badge>
    );
  }

  return (
    <Badge tone="amber" withDot>
      Unverified
    </Badge>
  );
}
