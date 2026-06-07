"use client";

import { type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RelativeDate } from "@/components/relative-date";

export type XpRow = { user_id: string; email: string | null; total_xp: number | null };
export type StreakRow = {
  user_id: string;
  email: string | null;
  current_streak: number | null;
};
export type RecentRow = {
  user_id: string;
  email: string | null;
  display_name: string | null;
  created_at: string | null;
};

const dash = <span className="text-muted-foreground">—</span>;

export function OverviewUserTables({
  topXp,
  topStreak,
  recent,
  error,
}: {
  topXp: XpRow[];
  topStreak: StreakRow[];
  recent: RecentRow[];
  error: string | null;
}) {
  const router = useRouter();
  const go = (id: string) => router.push(`/users/${id}`);
  const rowProps = (id: string) => ({
    tabIndex: 0,
    className: "cursor-pointer",
    onClick: () => go(id),
    onKeyDown: (e: KeyboardEvent<HTMLTableRowElement>) => {
      if (e.key === "Enter") go(id);
    },
  });

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>User rankings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
            <div>
              <p className="font-medium text-destructive">
                Couldn’t load user rankings
              </p>
              <p className="text-xs text-muted-foreground">
                Needs the{" "}
                <code className="font-mono">admin_user_overview</code> view
                (migration 0002). {error}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top 5 by XP</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right">XP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topXp.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="h-16 text-center text-muted-foreground">
                      No data.
                    </TableCell>
                  </TableRow>
                ) : (
                  topXp.map((r) => (
                    <TableRow key={r.user_id} {...rowProps(r.user_id)}>
                      <TableCell className="font-medium">{r.email ?? dash}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {(r.total_xp ?? 0).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top 5 by streak</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right">Streak</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topStreak.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="h-16 text-center text-muted-foreground">
                      No data.
                    </TableCell>
                  </TableRow>
                ) : (
                  topStreak.map((r) => (
                    <TableRow key={r.user_id} {...rowProps(r.user_id)}>
                      <TableCell className="font-medium">{r.email ?? dash}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {(r.current_streak ?? 0).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recently joined</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Display Name</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recent.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="h-16 text-center text-muted-foreground">
                    No users yet.
                  </TableCell>
                </TableRow>
              ) : (
                recent.map((r) => (
                  <TableRow key={r.user_id} {...rowProps(r.user_id)}>
                    <TableCell className="font-medium">{r.email ?? dash}</TableCell>
                    <TableCell>{r.display_name || dash}</TableCell>
                    <TableCell>
                      <RelativeDate value={r.created_at} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
