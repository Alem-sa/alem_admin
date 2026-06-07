"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RelativeDate } from "@/components/relative-date";
import type { RecentFeedbackRow, UserLite } from "./types";

const DISLIKE = new Set([
  "down",
  "negative",
  "bad",
  "unhelpful",
  "thumbs_down",
  "0",
  "false",
]);

function isDislike(rating: string | null) {
  const r = (rating ?? "").toLowerCase();
  return r.startsWith("dislike") || DISLIKE.has(r);
}

export function RecentFeedbackTable({
  rows,
  users,
}: {
  rows: RecentFeedbackRow[];
  users: Record<string, UserLite>;
}) {
  if (rows.length === 0) {
    return (
      <p className="rounded-lg border border-dashed px-3 py-10 text-center text-sm text-muted-foreground">
        No feedback submitted yet.
      </p>
    );
  }

  // Only show the Note column if at least one row has a note.
  const hasNote = rows.some((r) => r.note && r.note.trim().length > 0);

  return (
    <div className="overflow-hidden rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Rating</TableHead>
            <TableHead>User</TableHead>
            {hasNote ? <TableHead>Note</TableHead> : null}
            <TableHead>Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => {
            const u = r.user_id ? users[r.user_id] : undefined;
            return (
              <TableRow key={r.id}>
                <TableCell>
                  <Badge variant={isDislike(r.rating) ? "destructive" : "secondary"}>
                    {r.rating ?? "—"}
                  </Badge>
                </TableCell>
                <TableCell>
                  {r.user_id ? (
                    <Link
                      href={`/users/${r.user_id}`}
                      className="text-primary hover:underline"
                    >
                      {u?.email ?? u?.display_name ?? "View user"}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                {hasNote ? (
                  <TableCell className="max-w-[18rem]">
                    <span className="line-clamp-2 text-muted-foreground">
                      {r.note || "—"}
                    </span>
                  </TableCell>
                ) : null}
                <TableCell>
                  <RelativeDate value={r.created_at} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
