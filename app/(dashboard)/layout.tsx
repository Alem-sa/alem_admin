import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { AccessDenied } from "@/components/access-denied";
import { AppSidebar } from "@/components/app-sidebar";
import { requireAdmin } from "@/lib/supabase/require-admin";

/**
 * Layout for every route in the (dashboard) group — i.e. the whole dashboard.
 * The AUTHORITATIVE page-render gate. It uses the SAME requireAdmin() check
 * that every mutating server action re-runs (see lib/supabase/require-admin.ts).
 *
 * NOTE: this gate only protects page *rendering*. Server actions are not
 * covered by it and must call requireAdmin() themselves.
 */
export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const check = await requireAdmin();

  if (!check.ok) {
    // No valid session -> login; otherwise show the access-denied page.
    if (check.reason === "no-session") {
      redirect("/login");
    }
    return <AccessDenied email={check.email} reason={check.reason} />;
  }

  return (
    <div className="flex min-h-svh">
      <AppSidebar userEmail={check.email ?? ""} role={check.role} />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
