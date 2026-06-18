// Shared types + display helpers for the Feedback section.

// Stable category ids -> Arabic display labels (the dashboard must map these).
export const CATEGORY_LABELS: Record<string, string> = {
  technical_problem: "مشكلة تقنية",
  content_feedback: "ملاحظة على المحتوى",
  improvement_suggestion: "اقتراح تحسين",
  unclear: "شيء غير واضح",
  positive: "تجربة ممتازة",
};

/** Ordered for filter dropdowns: [id, arabicLabel]. */
export const CATEGORY_OPTIONS = Object.entries(CATEGORY_LABELS);

export function categoryLabel(id: string | null): string {
  if (!id) return "—";
  return CATEGORY_LABELS[id] ?? id;
}

export function platformLabel(p: string | null): string {
  if (!p) return "—";
  if (p === "ios") return "iOS";
  if (p === "android") return "Android";
  return p;
}

/** Local YYYY-MM-DD for export filenames. */
export function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Client-safe general feedback row. NOTE: holds a SIGNED screenshot URL (1h)
// or null — never the raw private-bucket path.
export type FeedbackRow = {
  id: string;
  category: string | null;
  message: string | null;
  platform: string | null;
  app_version: string | null;
  device_info: string | null;
  created_at: string | null;
  screenshot_signed_url: string | null;
};

export type TafseerFeedbackRow = {
  id: string;
  rating: string | null; // 'up' | 'down'
  comment: string | null;
  ai_response: string | null;
  surah_number: number | null;
  ayah_number: number | null;
  agent: string | null;
  platform: string | null;
  app_version: string | null;
  created_at: string | null;
};
