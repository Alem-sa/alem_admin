import { ShieldAlert } from "lucide-react";

import { SignOutButton } from "@/components/sign-out-button";

/**
 * Shown when a user is authenticated but not authorized (not in admin_users),
 * or when the admin lookup itself failed. Rendered INSTEAD of the dashboard,
 * so a non-admin never sees any dashboard chrome or data.
 */
export function AccessDenied({
  email,
  reason = "not-admin",
}: {
  email?: string | null;
  reason?: "not-admin" | "lookup-failed";
}) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      <ShieldAlert className="size-12 text-destructive" />
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Access denied</h1>
        <p className="max-w-md text-muted-foreground">
          {reason === "lookup-failed"
            ? "We couldn't verify your admin access right now. Please try again, or contact another administrator."
            : "You're signed in, but this account isn't authorized to use the Alem admin dashboard."}
        </p>
      </div>
      {email ? (
        <p className="text-sm text-muted-foreground">
          Signed in as{" "}
          <span className="font-medium text-foreground">{email}</span>
        </p>
      ) : null}
      <SignOutButton />
    </div>
  );
}
