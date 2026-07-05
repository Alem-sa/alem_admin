import type { Metadata } from "next";
import {
  AlertTriangle,
  CalendarRange,
  Clock,
  Flame,
  type LucideIcon,
  MessageSquare,
  UserPlus,
  Users,
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
import { buildDailySeries } from "@/lib/daily-series";
import { MetricChart } from "./_home/metric-chart";
import {
  type AiMessagesRow,
  OverviewUserTables,
  type RecentRow,
  type TimeRow,
} from "./_home/overview-user-tables";

export const metadata: Metadata = { title: "Overview · Alem Admin" };
export const dynamic = "force-dynamic";

const DAYS = 30;

type OverviewUserRow = {
  user_id: string;
  email: string | null;
  display_name: string | null;
  ai_chat_count: number | null;
  total_app_seconds: number | null;
  created_at: string | null;
};

type DailyRow = { day: string; new_signups: number; dau: number };
type ActivityRow = { user_id: string | null; created_at: string | null };

export default async function OverviewPage() {
  const admin = createAdminClient();

  const cutoff7 = new Date(Date.now() - 7 * 86_400_000).toISOString();

  const [
    totalUsersRes,
    newUsersRes,
    aiMessagesRes,
    appSessionsRes,
    streakRes,
    readRes,
    checkRes,
    chatActRes,
    overviewRes,
    dailyRes,
  ] = await Promise.all([
    admin.from("profiles").select("*", { count: "exact", head: true }),
    admin
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("created_at", cutoff7),
    // Total AI Messages: sum the lifetime per-user counter. PostgREST
    // aggregates are disabled, so fetch the column and sum in JS. Matches the
    // users-list "Total AI Messages" column (includes popup tafseer replies).
    admin.from("user_progress").select("ai_messages_count"),
    // Total Minutes: all-time app-usage seconds (non-null), summed in JS.
    admin
      .from("app_sessions")
      .select("duration_seconds")
      .not("duration_seconds", "is", null),
    admin
      .from("user_progress")
      .select("*", { count: "exact", head: true })
      .gt("current_streak", 0),
    admin.from("reading_sessions").select("user_id,created_at").gte("created_at", cutoff7),
    admin.from("daily_checkins").select("user_id,created_at").gte("created_at", cutoff7),
    admin.from("ai_chats").select("user_id,created_at").gte("created_at", cutoff7),
    admin
      .from("admin_user_overview")
      .select("user_id,email,display_name,ai_chat_count,total_app_seconds,created_at"),
    admin.from("admin_overview_daily").select("*").order("day", { ascending: true }),
  ]);

  // WAU: distinct active users across the 3 activity tables over the last 7
  // days, deduped in JS (fine at current data volume).
  const activity: ActivityRow[] = [
    ...((readRes.data ?? []) as ActivityRow[]),
    ...((checkRes.data ?? []) as ActivityRow[]),
    ...((chatActRes.data ?? []) as ActivityRow[]),
  ];
  const wauSet = new Set<string>();
  for (const r of activity) {
    if (r.user_id) wauSet.add(r.user_id);
  }

  // Total AI Messages = sum of the lifetime per-user counter across all users.
  const totalAiMessages = (
    (aiMessagesRes.data ?? []) as { ai_messages_count: number | null }[]
  ).reduce((sum, r) => sum + (r.ai_messages_count ?? 0), 0);

  // Total Minutes = all-time app-usage seconds / 60, floored to a whole minute.
  const totalSessionSeconds = (
    (appSessionsRes.data ?? []) as { duration_seconds: number | null }[]
  ).reduce((sum, r) => sum + (r.duration_seconds ?? 0), 0);
  const totalMinutes = Math.floor(totalSessionSeconds / 60);

  const stats = {
    totalUsers: totalUsersRes.count ?? 0,
    newUsers: newUsersRes.count ?? 0,
    wau: wauSet.size,
    activeStreaks: streakRes.count ?? 0,
  };

  // Charts (migration 0004) — zero-filled 30-day UTC series.
  const dailyRows = (dailyRes.data ?? []) as DailyRow[];
  const series = buildDailySeries(dailyRows, ["new_signups", "dau"] as const, DAYS);

  // Tables (admin_user_overview). total_app_seconds is a bigint — coerce to a
  // number before sorting/formatting.
  const overviewRows = (overviewRes.data ?? []) as OverviewUserRow[];
  const topTime: TimeRow[] = [...overviewRows]
    .map((r) => ({
      user_id: r.user_id,
      email: r.email,
      total_app_seconds: Number(r.total_app_seconds ?? 0),
    }))
    .sort((a, b) => b.total_app_seconds - a.total_app_seconds)
    .slice(0, 5);
  const topAiMessages: AiMessagesRow[] = [...overviewRows]
    .map((r) => ({
      user_id: r.user_id,
      email: r.email,
      ai_chat_count: Number(r.ai_chat_count ?? 0),
    }))
    .sort((a, b) => b.ai_chat_count - a.ai_chat_count)
    .slice(0, 5);
  const recent: RecentRow[] = [...overviewRows]
    .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""))
    .slice(0, 10)
    .map((r) => ({
      user_id: r.user_id,
      email: r.email,
      display_name: r.display_name,
      created_at: r.created_at,
    }));

  return (
    <TooltipProvider delay={150}>
      <div className="space-y-6 p-8">
        <header>
          <h1 className="text-2xl font-semibold">Overview</h1>
          <p className="text-muted-foreground">A snapshot of the whole platform.</p>
        </header>

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <Stat icon={Users} label="Total users" value={stats.totalUsers} />
          <Stat icon={UserPlus} label="New (7d)" value={stats.newUsers} />
          <Stat icon={Clock} label="Total Minutes" value={formatMinutes(totalMinutes)} />
          <Stat icon={CalendarRange} label="WAU (7d)" value={stats.wau} />
          <Stat icon={MessageSquare} label="Total AI Messages" value={totalAiMessages} />
          <Stat icon={Flame} label="Active streaks" value={stats.activeStreaks} />
        </div>

        {/* Charts */}
        {dailyRes.error ? (
          <Card>
            <CardHeader>
              <CardTitle>Trends (last {DAYS} days)</CardTitle>
            </CardHeader>
            <CardContent>
              <MigrationCard message={dailyRes.error.message} />
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>New signups</CardTitle>
                <CardDescription>Last {DAYS} days.</CardDescription>
              </CardHeader>
              <CardContent>
                <MetricChart
                  data={series}
                  dataKey="new_signups"
                  name="New signups"
                  color="#6366f1"
                  kind="area"
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Active users (DAU)</CardTitle>
                <CardDescription>Last {DAYS} days.</CardDescription>
              </CardHeader>
              <CardContent>
                <MetricChart
                  data={series}
                  dataKey="dau"
                  name="DAU"
                  color="#0ea5e9"
                  kind="bar"
                />
              </CardContent>
            </Card>
          </div>
        )}

        {/* User tables */}
        <OverviewUserTables
          topTime={topTime}
          topAiMessages={topAiMessages}
          recent={recent}
          error={overviewRes.error?.message ?? null}
        />
      </div>
    </TooltipProvider>
  );
}

// ----- helpers ---------------------------------------------------------------

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: number | string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardDescription className="flex items-center gap-1.5">
          <Icon className="size-3.5" />
          {label}
        </CardDescription>
        <CardTitle className="text-2xl tabular-nums">
          {typeof value === "number" ? value.toLocaleString() : value}
        </CardTitle>
      </CardHeader>
    </Card>
  );
}

/** Whole minutes -> "0m" / "42m" / "3h 42m" (mirrors the user-detail helper). */
function formatMinutes(minutes: number) {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function MigrationCard({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
      <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" />
      <div className="space-y-1">
        <p className="font-medium text-destructive">Charts unavailable</p>
        <p className="text-muted-foreground">
          Run migration{" "}
          <code className="font-mono text-xs">
            0004_create_admin_overview_daily.sql
          </code>{" "}
          in the Supabase SQL editor to create{" "}
          <code className="font-mono text-xs">admin_overview_daily</code>.
        </p>
        <p className="text-xs text-muted-foreground">Details: {message}</p>
      </div>
    </div>
  );
}
