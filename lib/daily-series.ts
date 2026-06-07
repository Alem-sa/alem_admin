/**
 * Build a continuous, zero-filled daily series for the last `days` days in UTC,
 * merging in any matching rows from `rows` (keyed by their `day` = 'YYYY-MM-DD').
 * Days with no matching row get 0 for every requested key.
 *
 * UTC is used so the buckets line up with the SQL views, which truncate
 * created_at `at time zone 'UTC'`. Each point also gets a short `label`.
 */
export function buildDailySeries<K extends string>(
  rows: ReadonlyArray<{ day: string } & Partial<Record<K, number | null>>>,
  keys: readonly K[],
  days: number,
): Array<{ day: string; label: string } & Record<K, number>> {
  const byDay = new Map(rows.map((r) => [r.day, r]));
  const now = new Date();
  const todayUtc = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );

  const out: Array<{ day: string; label: string } & Record<K, number>> = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(todayUtc - i * 86_400_000);
    const day = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
    const row = byDay.get(day);
    const metrics = {} as Record<K, number>;
    for (const k of keys) metrics[k] = row?.[k] ?? 0;
    out.push({ day, label, ...metrics });
  }
  return out;
}
