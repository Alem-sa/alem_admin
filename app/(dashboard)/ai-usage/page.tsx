import type { Metadata } from "next";
import {
  AlertTriangle,
  type LucideIcon,
  MessageSquare,
  MessagesSquare,
  Percent,
  Sigma,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TooltipProvider } from "@/components/ui/tooltip";
import { createAdminClient } from "@/lib/supabase/admin";
import { ActivityChart } from "./activity-chart";
import { FeedbackChart } from "./feedback-chart";
import { RecentFeedbackTable } from "./recent-feedback-table";
import { TopUsersTable } from "./top-users-table";
import type {
  AiUsageDailyRow,
  AiUsageOverviewRow,
  DailyPoint,
  RecentFeedbackRow,
  UserLite,
} from "./types";

export const metadata: Metadata = { title: "AI Usage · Alem Admin" };
export const dynamic = "force-dynamic";

const DAYS = 30;

export default async function AiUsagePage() {
  const admin = createAdminClient();

  const [overviewRes, dailyRes, feedbackRes] = await Promise.all([
    admin.from("admin_ai_usage_overview").select("*"),
    admin
      .from("admin_ai_usage_daily")
      .select("*")
      .order("day", { ascending: true }),
    admin
      .from("ai_feedback")
      .select("id,user_id,rating,note,created_at")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  // Both analytics views come from migration 0003. If both are missing, show
  // the run-migration hint instead of a broken page.
  if (overviewRes.error && dailyRes.error) {
    return <MigrationNeeded message={overviewRes.error.message} />;
  }

  const overviewRows = (overviewRes.data ?? []) as AiUsageOverviewRow[];
  const dailyRows = (dailyRes.data ?? []) as AiUsageDailyRow[];
  const recentFeedback = (feedbackRes.data ?? []) as RecentFeedbackRow[];

  // All-time totals, summed from the daily view.
  const totalChats = sum(dailyRows, "chats_started");
  const totalMessages = sum(dailyRows, "messages_sent");
  const totalLikes = sum(dailyRows, "feedback_likes");
  const totalDislikes = sum(dailyRows, "feedback_dislikes");
  const avg = totalChats > 0 ? (totalMessages / totalChats).toFixed(1) : "—";
  const ratioDen = totalLikes + totalDislikes;
  const likeRatio =
    ratioDen > 0 ? `${Math.round((totalLikes / ratioDen) * 100)}%` : "—";

  // Zero-filled last-30-days series (UTC days, to match the view's bucketing).
  const series = buildSeries(dailyRows, DAYS);

  // Top users + a user lookup for the recent-feedback table (both from overview).
  const topUsers = [...overviewRows]
    .sort((a, b) => b.chat_count - a.chat_count)
    .slice(0, 20);
  const users: Record<string, UserLite> = {};
  for (const r of overviewRows) {
    users[r.user_id] = { email: r.email, display_name: r.display_name };
  }

  return (
    <TooltipProvider delay={150}>
      <div className="space-y-6 p-8">
        <header>
          <h1 className="text-2xl font-semibold">AI Usage</h1>
          <p className="text-muted-foreground">
            Chats, messages and feedback across all users.
          </p>
        </header>

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <Stat icon={MessageSquare} label="Total chats" value={totalChats.toLocaleString()} />
          <Stat icon={MessagesSquare} label="Total messages" value={totalMessages.toLocaleString()} />
          <Stat icon={Sigma} label="Avg msgs / chat" value={avg} />
          <Stat icon={ThumbsUp} label="Likes" value={totalLikes.toLocaleString()} />
          <Stat icon={ThumbsDown} label="Dislikes" value={totalDislikes.toLocaleString()} />
          <Stat icon={Percent} label="Like ratio" value={likeRatio} />
        </div>

        {/* Activity chart (full width) */}
        <Card>
          <CardHeader>
            <CardTitle>Activity (last {DAYS} days)</CardTitle>
            <CardDescription>Chats started and messages sent per day.</CardDescription>
          </CardHeader>
          <CardContent>
            {dailyRes.error ? (
              <SectionError section="daily activity" message={dailyRes.error.message} />
            ) : (
              <ActivityChart data={series} />
            )}
          </CardContent>
        </Card>

        {/* Feedback chart + recent feedback (side by side) */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Feedback (last {DAYS} days)</CardTitle>
              <CardDescription>Likes vs dislikes per day.</CardDescription>
            </CardHeader>
            <CardContent>
              {dailyRes.error ? (
                <SectionError section="daily feedback" message={dailyRes.error.message} />
              ) : (
                <FeedbackChart data={series} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent feedback</CardTitle>
              <CardDescription>Latest 20 submissions.</CardDescription>
            </CardHeader>
            <CardContent>
              {feedbackRes.error ? (
                <SectionError section="recent feedback" message={feedbackRes.error.message} />
              ) : (
                <RecentFeedbackTable rows={recentFeedback} users={users} />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Top users (bottom) */}
        <Card>
          <CardHeader>
            <CardTitle>Top users by chats</CardTitle>
            <CardDescription>Most active AI users (top 20).</CardDescription>
          </CardHeader>
          <CardContent>
            {overviewRes.error ? (
              <SectionError section="top users" message={overviewRes.error.message} />
            ) : (
              <TopUsersTable data={topUsers} />
            )}
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}

// ----- helpers ---------------------------------------------------------------

type NumericDailyKey =
  | "chats_started"
  | "messages_sent"
  | "feedback_likes"
  | "feedback_dislikes";

function sum(rows: AiUsageDailyRow[], key: NumericDailyKey) {
  let total = 0;
  for (const r of rows) total += r[key] ?? 0;
  return total;
}

function buildSeries(rows: AiUsageDailyRow[], days: number): DailyPoint[] {
  const byDay = new Map(rows.map((r) => [r.day, r]));
  const now = new Date();
  const todayUtc = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );

  const out: DailyPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(todayUtc - i * 86_400_000);
    const day = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
    const row = byDay.get(day);
    out.push({
      day,
      label,
      chats_started: row?.chats_started ?? 0,
      messages_sent: row?.messages_sent ?? 0,
      feedback_likes: row?.feedback_likes ?? 0,
      feedback_dislikes: row?.feedback_dislikes ?? 0,
    });
  }
  return out;
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardDescription className="flex items-center gap-1.5">
          <Icon className="size-3.5" />
          {label}
        </CardDescription>
        <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}

function SectionError({
  section,
  message,
}: {
  section: string;
  message: string;
}) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
      <div>
        <p className="font-medium text-destructive">Couldn’t load {section}</p>
        <p className="text-xs text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

function MigrationNeeded({ message }: { message: string }) {
  return (
    <div className="p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">AI Usage</h1>
        <p className="text-muted-foreground">
          Chats, messages and feedback across all users.
        </p>
      </header>
      <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" />
        <div className="space-y-1">
          <p className="font-medium text-destructive">AI usage views not found</p>
          <p className="text-muted-foreground">
            Run migration{" "}
            <code className="font-mono text-xs">
              0003_create_admin_ai_usage_overview.sql
            </code>{" "}
            in the Supabase SQL editor to create{" "}
            <code className="font-mono text-xs">admin_ai_usage_overview</code> and{" "}
            <code className="font-mono text-xs">admin_ai_usage_daily</code>.
          </p>
          <p className="text-xs text-muted-foreground">Details: {message}</p>
        </div>
      </div>
    </div>
  );
}
