/**
 * Whole seconds -> a compact "time in app" label: "0m" / "42m" / "3h 42m".
 *
 * Mirrors the user-detail page's local formatter, kept here so client
 * components (users table, overview rankings) can share it without importing
 * from a page module. Minutes are floored (a partial minute rounds down).
 */
export function formatDuration(seconds: number): string {
  const totalMin = Math.floor(seconds / 60);
  if (totalMin < 60) return `${totalMin}m`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}
