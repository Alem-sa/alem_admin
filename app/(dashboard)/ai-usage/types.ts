// Shapes for the AI usage page (migration 0003 views + ai_feedback).

export type AiUsageOverviewRow = {
  user_id: string;
  email: string | null;
  display_name: string | null;
  chat_count: number;
  message_count: number;
  last_chat_at: string | null;
  like_count: number;
  dislike_count: number;
};

export type AiUsageDailyRow = {
  day: string; // 'YYYY-MM-DD' (UTC), from the daily view
  chats_started: number;
  messages_sent: number;
  feedback_likes: number;
  feedback_dislikes: number;
};

// A daily row plus a short display label, after zero-filling the date range.
export type DailyPoint = AiUsageDailyRow & { label: string };

export type RecentFeedbackRow = {
  id: string;
  user_id: string | null;
  rating: string | null;
  note: string | null;
  created_at: string | null;
};

export type UserLite = { email: string | null; display_name: string | null };
