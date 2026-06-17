import { formatDistanceToNowStrict } from "date-fns";

export function timeAgo(value: string | number | Date) {
  try {
    const d = typeof value === "string" ? new Date(value) : value;
    return formatDistanceToNowStrict(d, { addSuffix: false }).replace(
      / (.).+/,
      (m, c) => c,
    );
  } catch {
    return "";
  }
}

export function timeAgoLong(value: string | number | Date) {
  try {
    const d = typeof value === "string" ? new Date(value) : value;
    return formatDistanceToNowStrict(d, { addSuffix: true });
  } catch {
    return "";
  }
}

export function compactNumber(n: number) {
  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}

export function money(n: number, currency = "USD") {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(n);
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}
