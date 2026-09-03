import type { CourseEnrolmentStatus } from "@/lib/types";

export function creditsFromCompletedEnrolments(
  items: Array<{ status: CourseEnrolmentStatus; credits: number }>,
): number {
  return items.reduce((sum, item) => {
    if (item.status !== "completed") return sum;
    return sum + (Number.isFinite(item.credits) ? item.credits : 0);
  }, 0);
}

export function cpdCreditProgress(
  earned: number,
  target: number | null | undefined,
): {
  earned: number;
  target: number | null;
  pct: number | null;
  remaining: number | null;
} {
  const safeEarned = Number.isFinite(earned) ? Math.max(0, earned) : 0;
  if (target == null || !Number.isFinite(target) || target <= 0) {
    return { earned: safeEarned, target: null, pct: null, remaining: null };
  }
  return {
    earned: safeEarned,
    target,
    pct: Math.min(100, Math.round((safeEarned / target) * 100)),
    remaining: Math.max(0, target - safeEarned),
  };
}
