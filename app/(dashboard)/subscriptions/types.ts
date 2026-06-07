// One row of admin_subscriptions_overview (migration 0005): every subscriptions
// column plus email + display_name. Only the fields the UI uses are typed; the
// stream_*/revenuecat_* id columns exist on the view but aren't displayed.
export type SubscriptionRow = {
  id: string;
  user_id: string | null;
  subscription_state: string | null;
  plan: string | null;
  period_start: string | null;
  period_end: string | null;
  trial_start_date: string | null;
  trial_end_date: string | null;
  created_at: string | null;
  updated_at: string | null;
  email: string | null;
  display_name: string | null;
};
