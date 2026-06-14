/** One row of the `admin_user_overview` view (see migration 0002). */
export type UserOverviewRow = {
  user_id: string;
  email: string | null;
  display_name: string | null;
  created_at: string; // ISO timestamp
  last_activity_at: string | null; // ISO timestamp, null if no activity yet
  total_xp: number | null;
  current_streak: number | null;
  ai_chat_count: number;
  bookmark_count: number;
  tafseer_chat_count: number;
  general_chat_count: number;
  tajweed_chat_count: number;
  hifz_minutes: number;
};
