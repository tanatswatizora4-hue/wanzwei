import "server-only";

import { broadcastTypeLabel } from "@/lib/broadcasts/criteria";
import type {
  BroadcastMatchCandidate,
  BroadcastType,
  WorkforceBroadcastRecord,
} from "@/lib/broadcasts/network-types";
import { sendWorkforceBroadcastEmail } from "@/lib/email/notifications";
import { batchWithoutDropping } from "@/lib/emergency/match-candidates";
import { createNotification } from "@/lib/repos/notifications";

export async function deliverWorkforceBroadcast(input: {
  broadcast: WorkforceBroadcastRecord;
  facilityName: string;
  professionals: BroadcastMatchCandidate[];
}): Promise<void> {
  const kind = input.broadcast.type === "emergency" ? "emergency" : "match";
  const typeLabel = broadcastTypeLabel(input.broadcast.type);
  const title =
    input.broadcast.type === "emergency"
      ? `Emergency: ${input.broadcast.title}`
      : input.broadcast.title;
  const body = `${input.facilityName} sent you a ${typeLabel.toLowerCase()}.`;

  const batches = batchWithoutDropping(input.professionals, 25);
  for (const batch of batches) {
    await Promise.all(
      batch.map(async (professional) => {
        await createNotification({
          userId: professional.id,
          title,
          body,
          kind,
        });
        if (input.broadcast.type === "emergency") return;
        await sendWorkforceBroadcastEmail({
          to: professional.email,
          professionalName: professional.name,
          facilityName: input.facilityName,
          title: input.broadcast.title,
          message: input.broadcast.message,
          typeLabel,
          location: input.broadcast.location,
        });
      }),
    );
  }
}

export function notificationKindForBroadcast(
  type: BroadcastType,
): "emergency" | "match" {
  return type === "emergency" ? "emergency" : "match";
}
