"use client";

import type { ReactNode } from "react";
import { format } from "date-fns";
import { AlertTriangle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RelativeDate } from "@/components/relative-date";
import { cn } from "@/lib/utils";
import { SubscriptionSection } from "./subscription-section";
import type { UserDetailData } from "./types";

// ----- small building blocks -------------------------------------------------

function humanize(key: string) {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatProgressValue(v: string | number | boolean | null) {
  if (v === null || v === undefined) return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "number") return v.toLocaleString();
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) {
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) return format(d, "PP");
  }
  return v;
}

function YesNo({ value }: { value: boolean | null }) {
  return value ? (
    <Badge variant="secondary">Yes</Badge>
  ) : (
    <span className="text-muted-foreground">No</span>
  );
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold">
        {title}
        {typeof count === "number" ? (
          <span className="ml-1.5 font-normal text-muted-foreground">
            ({count})
          </span>
        ) : null}
      </h3>
      {children}
    </section>
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

type Col<T> = {
  header: string;
  cell: (row: T) => ReactNode;
  numeric?: boolean;
};

function MiniTable<T>({
  columns,
  rows,
  rowKey,
  empty,
}: {
  columns: Col<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  empty: string;
}) {
  if (rows.length === 0) {
    return (
      <p className="rounded-lg border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
        {empty}
      </p>
    );
  }
  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((c) => (
              <TableHead key={c.header} className={cn(c.numeric && "text-right")}>
                {c.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={rowKey(row)}>
              {columns.map((c) => (
                <TableCell
                  key={c.header}
                  className={cn(c.numeric && "text-right tabular-nums")}
                >
                  {c.cell(row)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function Total({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold tabular-nums">
        {value.toLocaleString()}
      </p>
    </div>
  );
}

// ----- main ------------------------------------------------------------------

export function UserDetailTabs({ data }: { data: UserDetailData }) {
  return (
    <Tabs defaultValue="overview">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="activity">Activity</TabsTrigger>
        <TabsTrigger value="quran">Quran progress</TabsTrigger>
        <TabsTrigger value="devices">Devices</TabsTrigger>
      </TabsList>

      {/* Overview */}
      <TabsContent value="overview" className="space-y-6 pt-2">
        <Section title="Totals">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Total label="Reading sessions" value={data.counts.reading_sessions} />
            <Total label="Daily check-ins" value={data.counts.daily_checkins} />
            <Total label="AI chats" value={data.counts.ai_chats} />
            <Total label="Bookmarks" value={data.counts.bookmarks} />
            <Total label="Khatmah plans" value={data.counts.khatmah_plans} />
            <Total label="Memorization" value={data.counts.memorization_progress} />
            <Total label="Wirds" value={data.counts.wirds} />
            <Total label="Milestones" value={data.counts.user_milestones} />
          </div>
        </Section>

        <Section title="AI usage by agent">
          <div className="grid grid-cols-3 gap-3">
            <Total label="General" value={data.agentCounts.general} />
            <Total label="Tafseer" value={data.agentCounts.tafseer} />
            <Total label="Tajweed" value={data.agentCounts.tajweed} />
          </div>
        </Section>

        <SubscriptionSection
          userId={data.userId}
          subscription={data.subscription}
        />

        <Section title="AI feedback">
          {data.feedback.error ? (
            <SectionError section="AI feedback" message={data.feedback.error} />
          ) : data.feedback.counts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No AI feedback submitted.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {data.feedback.counts.map((c) => (
                <Badge key={c.rating} variant="secondary">
                  {humanize(c.rating)}: {c.count}
                </Badge>
              ))}
            </div>
          )}
        </Section>

        <Section title="Progress detail">
          {data.progress.error ? (
            <SectionError section="user progress" message={data.progress.error} />
          ) : !data.progress.row ? (
            <p className="text-sm text-muted-foreground">
              No progress record for this user.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-x-8 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(data.progress.row)
                .filter(([k]) => k !== "id" && k !== "user_id")
                .map(([k, v]) => (
                  <div
                    key={k}
                    className="flex items-center justify-between gap-4 border-b py-1.5 text-sm"
                  >
                    <span className="text-muted-foreground">{humanize(k)}</span>
                    <span className="font-medium tabular-nums">
                      {formatProgressValue(v)}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </Section>
      </TabsContent>

      {/* Activity */}
      <TabsContent value="activity" className="pt-2">
        <div className="grid gap-6 lg:grid-cols-3">
          <Section title="Recent reading" count={data.counts.reading_sessions}>
            {data.recentReading.error ? (
              <SectionError
                section="reading sessions"
                message={data.recentReading.error}
              />
            ) : (
              <MiniTable
                rows={data.recentReading.rows}
                rowKey={(r) => r.id}
                empty="No reading sessions."
                columns={[
                  { header: "When", cell: (r) => <RelativeDate value={r.created_at} /> },
                  { header: "Surah", cell: (r) => r.surah_number ?? "—", numeric: true },
                  { header: "Pages", cell: (r) => r.pages_read ?? 0, numeric: true },
                  { header: "XP", cell: (r) => r.xp_earned ?? 0, numeric: true },
                ]}
              />
            )}
          </Section>

          <Section title="Recent check-ins" count={data.counts.daily_checkins}>
            {data.recentCheckins.error ? (
              <SectionError
                section="check-ins"
                message={data.recentCheckins.error}
              />
            ) : (
              <MiniTable
                rows={data.recentCheckins.rows}
                rowKey={(r) => r.id}
                empty="No check-ins."
                columns={[
                  {
                    header: "When",
                    cell: (r) => <RelativeDate value={r.created_at ?? r.checkin_date} />,
                  },
                  { header: "XP", cell: (r) => r.xp_earned ?? 0, numeric: true },
                  {
                    header: "Verses",
                    cell: (r) => r.verses_read_today ?? 0,
                    numeric: true,
                  },
                ]}
              />
            )}
          </Section>

          <Section title="Recent AI chats" count={data.counts.ai_chats}>
            {data.recentChats.error ? (
              <SectionError section="AI chats" message={data.recentChats.error} />
            ) : (
              <MiniTable
                rows={data.recentChats.rows}
                rowKey={(r) => r.id}
                empty="No AI chats."
                columns={[
                  { header: "When", cell: (r) => <RelativeDate value={r.created_at} /> },
                  {
                    header: "Title",
                    cell: (r) => (
                      <span className="line-clamp-1">{r.title || "Untitled"}</span>
                    ),
                  },
                  {
                    header: "Mode",
                    cell: (r) =>
                      r.mode ? <Badge variant="outline">{r.mode}</Badge> : "—",
                  },
                ]}
              />
            )}
          </Section>
        </div>
      </TabsContent>

      {/* Quran progress */}
      <TabsContent value="quran" className="space-y-6 pt-2">
        <Section title="Khatmah plans" count={data.counts.khatmah_plans}>
          {data.khatmah.error ? (
            <SectionError section="khatmah plans" message={data.khatmah.error} />
          ) : (
            <MiniTable
              rows={data.khatmah.rows}
              rowKey={(r) => r.id}
              empty="No khatmah plans."
              columns={[
                { header: "Name", cell: (r) => r.name || "—" },
                {
                  header: "Progress",
                  cell: (r) => `${r.current_page ?? 0} / ${r.total_pages ?? 0}`,
                  numeric: true,
                },
                { header: "Target days", cell: (r) => r.target_days ?? "—", numeric: true },
                { header: "Completed", cell: (r) => <YesNo value={r.is_completed} /> },
                { header: "Last read", cell: (r) => <RelativeDate value={r.last_read_date} /> },
              ]}
            />
          )}
        </Section>

        <Section title="Memorization" count={data.counts.memorization_progress}>
          {data.memorization.error ? (
            <SectionError
              section="memorization progress"
              message={data.memorization.error}
            />
          ) : (
            <MiniTable
              rows={data.memorization.rows}
              rowKey={(r) => r.id}
              empty="No memorization progress."
              columns={[
                { header: "Surah", cell: (r) => r.surah_number ?? "—", numeric: true },
                { header: "Juz", cell: (r) => r.juz_number ?? "—", numeric: true },
                {
                  header: "Completion",
                  cell: (r) =>
                    r.completion_percentage != null
                      ? `${r.completion_percentage}%`
                      : "—",
                  numeric: true,
                },
                { header: "Best score", cell: (r) => r.best_score ?? "—", numeric: true },
                { header: "Attempts", cell: (r) => r.attempts_count ?? 0, numeric: true },
                {
                  header: "Last practiced",
                  cell: (r) => <RelativeDate value={r.last_practiced_at} />,
                },
              ]}
            />
          )}
        </Section>

        <Section title="Wirds" count={data.counts.wirds}>
          {data.wirds.error ? (
            <SectionError section="wirds" message={data.wirds.error} />
          ) : (
            <MiniTable
              rows={data.wirds.rows}
              rowKey={(r) => r.id}
              empty="No wirds."
              columns={[
                { header: "Type", cell: (r) => r.type || "—" },
                { header: "Scope", cell: (r) => r.scope || "—" },
                { header: "Enabled", cell: (r) => <YesNo value={r.is_enabled} /> },
                { header: "Daily target", cell: (r) => r.daily_target ?? "—", numeric: true },
                {
                  header: "Progress",
                  cell: (r) => `${r.current_page ?? 0} / ${r.total_pages ?? 0}`,
                  numeric: true,
                },
                { header: "Frequency", cell: (r) => r.frequency || "—" },
              ]}
            />
          )}
        </Section>
      </TabsContent>

      {/* Devices */}
      <TabsContent value="devices" className="pt-2">
        <Section title="Devices" count={data.devices.rows.length}>
          {data.devices.error ? (
            <SectionError section="devices" message={data.devices.error} />
          ) : (
            <MiniTable
              rows={data.devices.rows}
              rowKey={(r) => r.id}
              empty="No registered devices."
              columns={[
                {
                  header: "Platform",
                  cell: (r) =>
                    r.platform ? <Badge variant="outline">{r.platform}</Badge> : "—",
                },
                {
                  header: "Push token",
                  cell: (r) => <YesNo value={Boolean(r.onesignal_player_id)} />,
                },
                { header: "Added", cell: (r) => <RelativeDate value={r.created_at} /> },
              ]}
            />
          )}
        </Section>
      </TabsContent>
    </Tabs>
  );
}
