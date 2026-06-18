import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Bookmark,
  CalendarCheck,
  Clock,
  Flame,
  type LucideIcon,
  MessageSquare,
  Mic,
  UserX,
} from "lucide-react";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TooltipProvider } from "@/components/ui/tooltip";
import { RelativeDate } from "@/components/relative-date";
import { createAdminClient } from "@/lib/supabase/admin";
import { UserDetailTabs } from "./user-detail-tabs";
import type {
  AiChatRow,
  CheckinRow,
  DeviceRow,
  FeedbackCount,
  KhatmahRow,
  MemorizationRow,
  ReadingSessionRow,
  SubscriptionRow,
  UserProgressRow,
  WirdRow,
} from "./types";

export const metadata: Metadata = { title: "User · Alem Admin" };
export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const COUNT_TABLES = [
  "reading_sessions",
  "daily_checkins",
  "ai_chats",
  "bookmarks",
  "user_milestones",
] as const;

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;

  // A malformed id would make Postgres throw on the uuid cast — treat it as a
  // missing user instead of crashing.
  if (!UUID_RE.test(userId)) {
    return <NotFound />;
  }

  const admin = createAdminClient();

  // Fire every query in parallel (all service-role, all server-side).
  const [
    profileRes,
    authRes,
    progressRes,
    recentReadingRes,
    recentCheckinsRes,
    recentChatsRes,
    khatmahRes,
    memorizationRes,
    wirdsRes,
    devicesRes,
    feedbackRes,
    agentChatsRes,
    appSessionsRes,
    subscriptionRes,
    countsArr,
  ] = await Promise.all([
    admin.from("profiles").select("*").eq("id", userId).maybeSingle(),
    admin.auth.admin.getUserById(userId),
    admin.from("user_progress").select("*").eq("user_id", userId).maybeSingle(),
    admin
      .from("reading_sessions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10),
    admin
      .from("daily_checkins")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10),
    admin
      .from("ai_chats")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10),
    admin
      .from("khatmah_plans")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    admin
      .from("memorization_progress")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    admin
      .from("wirds")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    admin
      .from("user_devices")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    admin.from("ai_feedback").select("rating").eq("user_id", userId),
    // Phase 6 metrics. PostgREST aggregates are disabled, so each selects only
    // the one needed column and we aggregate in JS (data volumes are tiny).
    admin
      .from("ai_chat_messages")
      .select("ai_chats!inner(mode)")
      .eq("user_id", userId)
      .eq("role", "assistant"),
    admin
      .from("app_sessions")
      .select("duration_seconds")
      .eq("user_id", userId),
    admin.from("subscriptions").select("*").eq("user_id", userId).maybeSingle(),
    Promise.all(
      COUNT_TABLES.map((t) =>
        admin
          .from(t)
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId),
      ),
    ),
  ]);

  // The profile is the anchor. A real query error => error card; no row => 404-ish card.
  if (profileRes.error) {
    return <LoadError section="the user profile" message={profileRes.error.message} />;
  }
  if (!profileRes.data) {
    return <NotFound />;
  }

  const profile = profileRes.data as {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    created_at: string;
  };

  const authUser = authRes.data?.user ?? null;
  const email = authUser?.email ?? null;
  const signupAt = authUser?.created_at ?? profile.created_at;
  const lastSignInAt = authUser?.last_sign_in_at ?? null;

  const progress = (progressRes.data ?? null) as UserProgressRow | null;

  const counts = {
    reading_sessions: countsArr[0].count ?? 0,
    daily_checkins: countsArr[1].count ?? 0,
    ai_chats: countsArr[2].count ?? 0,
    bookmarks: countsArr[3].count ?? 0,
    user_milestones: countsArr[4].count ?? 0,
    khatmah_plans: (khatmahRes.data ?? []).length,
    memorization_progress: (memorizationRes.data ?? []).length,
    wirds: (wirdsRes.data ?? []).length,
  };

  // Group AI feedback by rating.
  const feedbackCounts: FeedbackCount[] = [];
  if (!feedbackRes.error && feedbackRes.data) {
    const tally = new Map<string, number>();
    for (const r of feedbackRes.data as { rating: string | null }[]) {
      const key = r.rating ?? "unknown";
      tally.set(key, (tally.get(key) ?? 0) + 1);
    }
    for (const [rating, count] of tally) feedbackCounts.push({ rating, count });
  }

  // AI usage by agent. general + tajweed are assistant-message counts per mode
  // (from agentChatsRes). tafseer = lifetime ai_messages_count minus those two,
  // which folds in the hold-on-ayah popup's tafseer replies (counted in
  // user_progress.ai_messages_count but not stored as chat messages). Floored
  // at 0. PostgREST aggregates are disabled, so we tally in JS; the !inner
  // embed types as an array but resolves to a single chat object at runtime.
  let generalCount = 0;
  let tajweedCount = 0;
  for (const r of (agentChatsRes.data ?? []) as Array<{
    ai_chats: { mode: string | null } | { mode: string | null }[] | null;
  }>) {
    const chat = Array.isArray(r.ai_chats) ? r.ai_chats[0] : r.ai_chats;
    const m = (chat?.mode ?? "").toLowerCase();
    if (m === "general") generalCount += 1;
    else if (m === "tajweed") tajweedCount += 1;
  }
  const lifetimeAiMessages = Number(progress?.ai_messages_count ?? 0);
  const agentCounts = {
    general: generalCount,
    tajweed: tajweedCount,
    tafseer: Math.max(0, lifetimeAiMessages - generalCount - tajweedCount),
  };

  // Hifz minutes — aligned with the app's "دقائق الحفظ" tile: the lifetime
  // user_progress.total_hifz_seconds counter (already fetched in progressRes).
  const hifzSeconds = Number(progress?.total_hifz_seconds ?? 0);

  // Time in app from app_sessions. Total time = sum of non-null
  // duration_seconds (a null duration just adds 0); session count = ALL rows,
  // including null-ended attempts (a session that didn't end cleanly).
  const appSessionRows = (appSessionsRes.data ?? []) as {
    duration_seconds: number | null;
  }[];
  const appSeconds = appSessionRows.reduce(
    (sum, r) => sum + (r.duration_seconds ?? 0),
    0,
  );
  const sessionCount = appSessionRows.length;

  // Subscription (admin Subscription section). RC-managed when a RevenueCat
  // subscription id is present.
  const subscriptionRow = (subscriptionRes.data ?? null) as SubscriptionRow | null;
  const subscription = {
    row: subscriptionRow,
    isRcManaged: Boolean(subscriptionRow?.revenuecat_subscription_id),
    error: subscriptionRes.error?.message ?? null,
  };

  return (
    <TooltipProvider delay={150}>
      <div className="space-y-6 p-8">
        <BackLink />

        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                {profile.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.avatar_url}
                    alt=""
                    className="size-14 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex size-14 items-center justify-center rounded-full bg-muted text-lg font-medium text-muted-foreground">
                    {(profile.display_name ?? email ?? "?")
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                )}
                <div>
                  <h1 className="text-xl font-semibold">
                    {profile.display_name || "Unnamed user"}
                  </h1>
                  <p className="text-sm text-muted-foreground">{email ?? "—"}</p>
                </div>
              </div>
              <div className="flex gap-8 text-sm">
                <div className="space-y-0.5">
                  <p className="text-muted-foreground">Signed up</p>
                  <RelativeDate value={signupAt} />
                </div>
                <div className="space-y-0.5">
                  <p className="text-muted-foreground">Last sign-in</p>
                  <RelativeDate value={lastSignInAt} />
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <Stat icon={Flame} label="Streak" value={num(progress?.current_streak)} />
          <Stat
            icon={MessageSquare}
            label="AI Chats"
            value={counts.ai_chats.toLocaleString()}
          />
          <Stat
            icon={Bookmark}
            label="Bookmarks"
            value={counts.bookmarks.toLocaleString()}
          />
          <Stat
            icon={CalendarCheck}
            label="Active Days"
            value={counts.daily_checkins.toLocaleString()}
          />
          <Stat
            icon={Mic}
            label="Hifz Minutes"
            value={formatMinutes(Math.floor(hifzSeconds / 60))}
          />
          <Stat
            icon={Clock}
            label="Time in app"
            value={
              sessionCount === 0 ? "Not tracked yet" : formatDuration(appSeconds)
            }
            sub={
              sessionCount === 0
                ? undefined
                : `${sessionCount.toLocaleString()} ${
                    sessionCount === 1 ? "session" : "sessions"
                  }`
            }
          />
        </div>

        {/* Tabs */}
        <UserDetailTabs
          data={{
            progress: {
              row: progress,
              error: progressRes.error?.message ?? null,
            },
            feedback: {
              counts: feedbackCounts,
              error: feedbackRes.error?.message ?? null,
            },
            counts,
            agentCounts,
            userId,
            subscription,
            recentReading: {
              rows: (recentReadingRes.data ?? []) as ReadingSessionRow[],
              error: recentReadingRes.error?.message ?? null,
            },
            recentCheckins: {
              rows: (recentCheckinsRes.data ?? []) as CheckinRow[],
              error: recentCheckinsRes.error?.message ?? null,
            },
            recentChats: {
              rows: (recentChatsRes.data ?? []) as AiChatRow[],
              error: recentChatsRes.error?.message ?? null,
            },
            khatmah: {
              rows: (khatmahRes.data ?? []) as KhatmahRow[],
              error: khatmahRes.error?.message ?? null,
            },
            memorization: {
              rows: (memorizationRes.data ?? []) as MemorizationRow[],
              error: memorizationRes.error?.message ?? null,
            },
            wirds: {
              rows: (wirdsRes.data ?? []) as WirdRow[],
              error: wirdsRes.error?.message ?? null,
            },
            devices: {
              rows: (devicesRes.data ?? []) as DeviceRow[],
              error: devicesRes.error?.message ?? null,
            },
          }}
        />
      </div>
    </TooltipProvider>
  );
}

// ----- helpers ---------------------------------------------------------------

function num(v: unknown) {
  const n = typeof v === "number" ? v : Number(v ?? 0);
  return Number.isFinite(n) ? n.toLocaleString() : "—";
}

/** Seconds -> "0m" / "42m" / "3h 42m" (rounded). */
function formatDuration(seconds: number) {
  const totalMin = Math.round(seconds / 60);
  if (totalMin < 60) return `${totalMin}m`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/** Whole minutes -> "0m" / "42m" / "3h 42m". */
function formatMinutes(minutes: number) {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function BackLink() {
  return (
    <Link
      href="/users"
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="size-4" />
      Back to users
    </Link>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardDescription className="flex items-center gap-1.5">
          <Icon className="size-3.5" />
          {label}
        </CardDescription>
        <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
        {sub ? (
          <CardDescription className="text-xs">{sub}</CardDescription>
        ) : null}
      </CardHeader>
    </Card>
  );
}

function NotFound() {
  return (
    <div className="space-y-6 p-8">
      <BackLink />
      <div className="mx-auto mt-6 max-w-md rounded-xl border p-8 text-center">
        <UserX className="mx-auto size-10 text-muted-foreground" />
        <h1 className="mt-3 text-xl font-semibold">User not found</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          No user matches this ID. They may have been deleted.
        </p>
      </div>
    </div>
  );
}

function LoadError({
  section,
  message,
}: {
  section: string;
  message: string;
}) {
  return (
    <div className="space-y-6 p-8">
      <BackLink />
      <div className="mx-auto mt-6 flex max-w-md items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-6">
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" />
        <div>
          <h1 className="font-semibold text-destructive">
            Couldn’t load {section}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{message}</p>
        </div>
      </div>
    </div>
  );
}
