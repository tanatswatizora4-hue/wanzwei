import { z } from "zod";

export function parseUuid(id: string): string | null {
  const parsed = z.uuid().safeParse(id);
  return parsed.success ? parsed.data : null;
}
