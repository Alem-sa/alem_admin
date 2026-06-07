import type { Metadata } from "next";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  type LucideIcon,
  CreditCard,
  Hourglass,
  Percent,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createAdminClient } from "@/lib/supabase/admin";
import { SubscriptionsTable } from "./subscriptions-table";
import type { SubscriptionRow } from "./types";

export const metadata: Metadata = { title: "Subscriptions · Alem Admin" };
export const dynamic = "force-dynamic";

export default async function SubscriptionsPage() {
  const admin = createAdminClient();

  const [countRes, overviewRes, usersCountRes] = await Promise.all([
    admin.from("subscriptions").select("*", { count: "exact", head: true }),
    admin
      .from("admin_subscriptions_overview")
      .select("*")
      .order("created_at", { ascending: false }),
    admin.from("profiles").select("*", { count: "exact", head: true }),
  ]);

  // Can't even read the base table.
  if (countRes.error) {
    return (
      <Frame>
        <SectionError section="subscriptions" message={countRes.error.message} />
      </Frame>
    );
  }

  const total = countRes.count ?? 0;

  // Likely current state: empty table -> one clean centered card. This works
  // even before migration 0005, because it reads the base table count.
  if (total === 0) {
    return (
      <Frame>
        <EmptyState />
      </Frame>
    );
  }

  // There ARE rows but the joined view is missing -> run migration 0005.
  if (overviewRes.error) {
    return (
      <Frame>
        <MigrationNeeded message={overviewRes.error.message} />
      </Frame>
    );
  }

  const rows = (overviewRes.data ?? []) as SubscriptionRow[];
  const totalUsers = usersCountRes.count ?? 0;

  // Status-value matching is heuristic: the table was empty when this was
  // written, so the exact `subscription_state` strings couldn't be observed.
  const isActive = (s: string | null) => /active|subscribed|paid/.test(low(s));
  const isCanceled = (s: string | null) =>
    /cancel|expired|churn|inactive/.test(low(s));
  const isTrial = (r: SubscriptionRow) =>
    /trial/.test(low(r.subscription_state)) ||
    (!!r.trial_end_date && Date.parse(r.trial_end_date) >= Date.now());

  const cutoff30 = Date.now() - 30 * 86_400_000;
  const active = rows.filter((r) => isActive(r.subscription_state)).length;
  const trial = rows.filter(isTrial).length;
  const canceled30 = rows.filter(
    (r) =>
      isCanceled(r.subscription_state) &&
      r.updated_at &&
      Date.parse(r.updated_at) >= cutoff30,
  ).length;
  const conversion =
    totalUsers > 0 ? `${Math.round((active / totalUsers) * 100)}%` : "—";

  // Data-driven breakdowns (always correct, whatever values appear).
  const byStatus = tally(rows, (r) => r.subscription_state);
  const byPlan = tally(rows, (r) => r.plan);

  // MRR is intentionally omitted: subscriptions has no price/amount column.
  return (
    <Frame>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <Stat icon={BadgeCheck} label="Active" value={active} />
        <Stat icon={Hourglass} label="Trial" value={trial} />
        <Stat icon={XCircle} label="Canceled (30d)" value={canceled30} />
        <Stat icon={CreditCard} label="Total ever" value={total} />
        <Stat icon={Percent} label="Conversion" value={conversion} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Breakdown title="By status" items={byStatus} tone="status" />
        <Breakdown title="By plan" items={byPlan} tone="plan" />
      </div>

      <SubscriptionsTable data={rows} />
    </Frame>
  );
}

// ----- helpers ---------------------------------------------------------------

const low = (s: string | null) => (s ?? "").toLowerCase();

function tally(
  rows: SubscriptionRow[],
  pick: (r: SubscriptionRow) => string | null,
): [string, number][] {
  const m = new Map<string, number>();
  for (const r of rows) {
    const k = pick(r) ?? "unknown";
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

function Frame({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-6 p-8">
      <header>
        <h1 className="text-2xl font-semibold">Subscriptions</h1>
        <p className="text-muted-foreground">Billing status across all users.</p>
      </header>
      {children}
    </div>
  );
}

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

function Breakdown({
  title,
  items,
  tone,
}: {
  title: string;
  items: [string, number][];
  tone: "status" | "plan";
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No data.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {items.map(([label, count]) => (
              <Badge
                key={label}
                variant={tone === "status" ? statusVariant(label) : "secondary"}
                className="gap-1.5"
              >
                {label}
                <span className="tabular-nums opacity-70">{count}</span>
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function statusVariant(state: string) {
  const s = state.toLowerCase();
  if (/cancel|expired|churn|inactive/.test(s)) return "destructive" as const;
  if (/trial/.test(s)) return "outline" as const;
  return "secondary" as const;
}

function EmptyState() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="max-w-md text-center">
        <CardContent className="flex flex-col items-center gap-3 py-10">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted">
            <CreditCard className="size-6 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">No subscriptions yet</h2>
            <p className="text-sm text-muted-foreground">
              This page will populate once subscription billing is live in the
              app.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MigrationNeeded({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
      <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" />
      <div className="space-y-1">
        <p className="font-medium text-destructive">Subscriptions view not found</p>
        <p className="text-muted-foreground">
          Run migration{" "}
          <code className="font-mono text-xs">
            0005_create_admin_subscriptions_overview.sql
          </code>{" "}
          in the Supabase SQL editor to create{" "}
          <code className="font-mono text-xs">admin_subscriptions_overview</code>.
        </p>
        <p className="text-xs text-muted-foreground">Details: {message}</p>
      </div>
    </div>
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
