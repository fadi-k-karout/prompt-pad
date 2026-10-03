const RELATIVE = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

const DIVISIONS: { amount: number; unit: Intl.RelativeTimeFormatUnit }[] = [
  { amount: 60, unit: "second" },
  { amount: 60, unit: "minute" },
  { amount: 24, unit: "hour" },
  { amount: 7, unit: "day" },
  { amount: 4.34524, unit: "week" },
  { amount: 12, unit: "month" },
  { amount: Number.POSITIVE_INFINITY, unit: "year" },
];

/** Renders an epoch-millisecond timestamp as "3 days ago" / "in 2 hours". */
export function formatRelativeTime(
  timestamp: number,
  now = Date.now(),
): string {
  let duration = (timestamp - now) / 1000;
  for (const division of DIVISIONS) {
    if (Math.abs(duration) < division.amount) {
      return RELATIVE.format(Math.round(duration), division.unit);
    }
    duration /= division.amount;
  }
  return RELATIVE.format(Math.round(duration), "year");
}

/** Turns the composer's comma-separated tag field into a clean string array. */
export function parseTags(value: string): string[] {
  const seen = new Set<string>();
  for (const raw of value.split(",")) {
    const tag = raw.trim();
    if (tag) seen.add(tag);
  }
  return [...seen];
}
