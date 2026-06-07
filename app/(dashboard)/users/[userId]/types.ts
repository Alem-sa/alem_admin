// Shapes for the user detail page. Columns mirror the live schema verified via
// PostgREST introspection (project wryujrttqxoesahcxdys).

// user_progress has ~30 scalar columns; we render them generically as key/value.
export type UserProgressRow = {
  [key: string]: string | number | boolean | null;
};

export type FeedbackCount = { rating: string; count: number };

export type ReadingSessionRow = {
  id: string;
  created_at: string | null;
  surah_number: number | null;
  page_number: number | null;
  pages_read: number | null;
  xp_earned: number | null;
};

export type CheckinRow = {
  id: string;
  created_at: string | null;
  checkin_date: string | null;
  xp_earned: number | null;
  verses_read_today: number | null;
};

export type AiChatRow = {
  id: string;
  created_at: string | null;
  title: string | null;
  mode: string | null;
};

export type KhatmahRow = {
  id: string;
  name: string | null;
  current_page: number | null;
  total_pages: number | null;
  target_days: number | null;
  is_completed: boolean | null;
  last_read_date: string | null;
};

export type MemorizationRow = {
  id: string;
  surah_number: number | null;
  juz_number: number | null;
  completion_percentage: number | null;
  best_score: number | null;
  attempts_count: number | null;
  last_practiced_at: string | null;
};

export type WirdRow = {
  id: string;
  type: string | null;
  scope: string | null;
  is_enabled: boolean | null;
  daily_target: number | null;
  current_page: number | null;
  total_pages: number | null;
  frequency: string | null;
};

export type DeviceRow = {
  id: string;
  platform: string | null;
  onesignal_player_id: string | null;
  created_at: string | null;
};

export type UserCounts = {
  reading_sessions: number;
  daily_checkins: number;
  ai_chats: number;
  bookmarks: number;
  khatmah_plans: number;
  memorization_progress: number;
  wirds: number;
  user_milestones: number;
};

// Per-user AI chat counts by agent (ai_chats.mode = general/tafseer/tajweed).
export type AgentCounts = { general: number; tafseer: number; tajweed: number };

// Subset of the subscriptions row the admin Subscription section needs.
export type SubscriptionRow = {
  subscription_state: string | null;
  plan: string | null;
  period_start: string | null;
  period_end: string | null;
  revenuecat_subscription_id: string | null;
  revenuecat_environment: string | null;
  created_at: string | null;
  updated_at: string | null;
};

// Each section carries its own error so one failed query degrades just that
// section, naming it, rather than blanking the whole page.
type Section<T> = { rows: T; error: string | null };

export type UserDetailData = {
  progress: { row: UserProgressRow | null; error: string | null };
  feedback: { counts: FeedbackCount[]; error: string | null };
  counts: UserCounts;
  agentCounts: AgentCounts;
  userId: string;
  subscription: {
    row: SubscriptionRow | null;
    isRcManaged: boolean;
    error: string | null;
  };
  recentReading: Section<ReadingSessionRow[]>;
  recentCheckins: Section<CheckinRow[]>;
  recentChats: Section<AiChatRow[]>;
  khatmah: Section<KhatmahRow[]>;
  memorization: Section<MemorizationRow[]>;
  wirds: Section<WirdRow[]>;
  devices: Section<DeviceRow[]>;
};
