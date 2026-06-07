"use client";

import { type ReactNode, useState, useTransition } from "react";
import { AlertTriangle, CreditCard, RadioTower } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RelativeDate } from "@/components/relative-date";
import { cn } from "@/lib/utils";
import {
  type ActionResult,
  endTrialEarly,
  grantPro,
  grantTrial,
  revokePro,
} from "@/app/actions/subscription";
import type { SubscriptionRow } from "./types";

type ActionKey = "grant_pro" | "grant_trial" | "revoke_pro" | "end_trial_early";

const STATE_STYLE: Record<string, { label: string; cls: string }> = {
  pro_active: { label: "Pro active", cls: "bg-green-600/15 text-green-700 dark:text-green-400" },
  trial: { label: "Trial", cls: "bg-blue-600/15 text-blue-700 dark:text-blue-400" },
  pro_cancelled: { label: "Pro cancelled", cls: "bg-amber-600/15 text-amber-700 dark:text-amber-500" },
  pro_expired: { label: "Pro expired", cls: "bg-muted text-muted-foreground" },
  free: { label: "Free", cls: "bg-muted text-muted-foreground" },
};

const ACTION_META: Record<
  ActionKey,
  { title: string; confirm: string; describe: (date: string) => string }
> = {
  grant_pro: {
    title: "Grant Pro",
    confirm: "Grant Pro",
    describe: (date) =>
      `Grant Pro until ${date}? This affects the user's access immediately and syncs to their app in real time.`,
  },
  grant_trial: {
    title: "Grant Trial",
    confirm: "Grant Trial",
    describe: () =>
      "Start a 14-day Pro trial? This affects the user's access immediately and syncs to their app in real time.",
  },
  revoke_pro: {
    title: "Revoke Pro",
    confirm: "Revoke Pro",
    describe: () =>
      "Revoke Pro and set this user back to Free? This affects their access immediately.",
  },
  end_trial_early: {
    title: "End Trial Early",
    confirm: "End Trial",
    describe: () =>
      "End this trial now and set the user back to Free? This affects their access immediately.",
  },
};

function daysRemaining(periodEnd: string | null): number | null {
  if (!periodEnd) return null;
  const ms = new Date(periodEnd).getTime() - Date.now();
  if (Number.isNaN(ms)) return null;
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

export function SubscriptionSection({
  userId,
  subscription,
}: {
  userId: string;
  subscription: {
    row: SubscriptionRow | null;
    isRcManaged: boolean;
    error: string | null;
  };
}) {
  const [active, setActive] = useState<ActionKey | null>(null);
  const [pending, startTransition] = useTransition();
  const [proDate, setProDate] = useState("2099-12-31");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const row = subscription.row;
  const state = row?.subscription_state ?? "free";
  const style = STATE_STYLE[state] ?? {
    label: state,
    cls: "bg-muted text-muted-foreground",
  };
  const remaining = daysRemaining(row?.period_end ?? null);

  const show = {
    grant_pro: state !== "pro_active",
    grant_trial: state === "free" || state === "pro_expired" || !row,
    revoke_pro: state === "pro_active" || state === "pro_cancelled",
    end_trial_early: state === "trial",
  };

  function open(key: ActionKey) {
    setError(null);
    setDone(false);
    setActive(key);
  }

  function close() {
    if (pending) return;
    setActive(null);
    setError(null);
  }

  function confirm() {
    const key = active;
    if (!key) return;
    setError(null);
    startTransition(async () => {
      const result: ActionResult =
        key === "grant_pro"
          ? await grantPro(userId, proDate)
          : key === "grant_trial"
            ? await grantTrial(userId)
            : key === "revoke_pro"
              ? await revokePro(userId)
              : await endTrialEarly(userId);

      if (result.success) {
        setActive(null);
        setDone(true);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="size-4" />
            Subscription
          </CardTitle>
          <Badge variant="secondary" className={cn(style.cls)}>
            {style.label}
          </Badge>
        </div>
        <CardDescription>
          Manual admin controls. Changes apply immediately.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {subscription.error ? (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
            <p className="text-muted-foreground">
              Couldn’t load subscription: {subscription.error}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
              <Detail label="Plan" value={row?.plan ?? "—"} />
              <Detail
                label="Period start"
                value={<RelativeDate value={row?.period_start ?? null} />}
              />
              <Detail
                label="Period end"
                value={<RelativeDate value={row?.period_end ?? null} />}
              />
              <Detail
                label="Days remaining"
                value={remaining == null ? "—" : `${remaining}`}
              />
            </div>

            {subscription.isRcManaged && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-500" />
                <p className="text-amber-800 dark:text-amber-200">
                  This subscription is managed by RevenueCat. Manual changes may
                  be overwritten by the next webhook.
                </p>
              </div>
            )}

            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <RadioTower className="size-3.5" />
              Actions sync to the user’s app in real time if it’s open.
            </p>

            {done && (
              <p className="text-sm font-medium text-green-700 dark:text-green-400">
                ✓ Subscription updated.
              </p>
            )}

            <div className="flex flex-wrap gap-2 pt-1">
              {show.grant_pro && (
                <Button size="sm" onClick={() => open("grant_pro")}>
                  Grant Pro
                </Button>
              )}
              {show.grant_trial && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => open("grant_trial")}
                >
                  Grant Trial
                </Button>
              )}
              {show.revoke_pro && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => open("revoke_pro")}
                >
                  Revoke Pro
                </Button>
              )}
              {show.end_trial_early && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => open("end_trial_early")}
                >
                  End Trial Early
                </Button>
              )}
            </div>
          </>
        )}
      </CardContent>

      <Dialog
        open={active !== null}
        onOpenChange={(o) => {
          if (!o) close();
        }}
      >
        <DialogContent>
          {active && (
            <>
              <DialogHeader>
                <DialogTitle>{ACTION_META[active].title}</DialogTitle>
                <DialogDescription>
                  {ACTION_META[active].describe(proDate)}
                </DialogDescription>
              </DialogHeader>

              {active === "grant_pro" && (
                <div className="space-y-1.5">
                  <Label htmlFor="pro-until">Pro until</Label>
                  <Input
                    id="pro-until"
                    type="date"
                    value={proDate}
                    onChange={(e) => setProDate(e.target.value)}
                    disabled={pending}
                  />
                  <p className="text-xs text-muted-foreground">
                    Default is effectively lifetime (2099-12-31).
                  </p>
                </div>
              )}

              {subscription.isRcManaged && (
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  Heads up: RevenueCat manages this subscription — the next
                  webhook may overwrite this change.
                </p>
              )}

              {error && <p className="text-sm text-destructive">{error}</p>}

              <DialogFooter>
                <Button variant="outline" onClick={close} disabled={pending}>
                  Cancel
                </Button>
                <Button
                  variant={
                    active === "revoke_pro" || active === "end_trial_early"
                      ? "destructive"
                      : "default"
                  }
                  onClick={confirm}
                  disabled={pending}
                >
                  {pending ? "Working…" : ACTION_META[active].confirm}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function Detail({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="font-medium">{value}</div>
    </div>
  );
}
