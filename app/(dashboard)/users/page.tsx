import type { Metadata } from "next";
import { AlertTriangle } from "lucide-react";

import { createAdminClient } from "@/lib/supabase/admin";
import { UsersTable } from "./users-table";
import type { UserOverviewRow } from "./types";

export const metadata: Metadata = { title: "Users · Alem Admin" };

// Admin data must always be fresh, never statically cached.
export const dynamic = "force-dynamic";

export default async function UsersPage() {
  // Service-role read (server-only). RLS is bypassed; this never runs in the
  // browser. The admin_user_overview view is granted to service_role only.
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("admin_user_overview")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Users</h1>
        <p className="text-muted-foreground">
          All registered users and their engagement stats.
        </p>
      </header>

      {error ? (
        <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" />
          <div className="space-y-1">
            <p className="font-medium text-destructive">Couldn’t load users</p>
            <p className="text-muted-foreground">
              The query to{" "}
              <code className="font-mono text-xs">admin_user_overview</code>{" "}
              failed. Make sure migration{" "}
              <code className="font-mono text-xs">
                0002_create_admin_user_overview.sql
              </code>{" "}
              has been run in the Supabase SQL editor.
            </p>
            <p className="text-xs text-muted-foreground">
              Details: {error.message}
            </p>
          </div>
        </div>
      ) : (
        <UsersTable data={(data ?? []) as UserOverviewRow[]} />
      )}
    </div>
  );
}
