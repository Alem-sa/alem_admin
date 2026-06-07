import type { Metadata } from "next";

import { LoginForm } from "@/components/login-form";

export const metadata: Metadata = {
  title: "Sign in · Alem Admin",
};

/**
 * /login is the ONLY route reachable without a session. It lives outside the
 * (dashboard) route group, so it never runs the admin check. Middleware
 * redirects already-signed-in users away from here.
 */
export default function LoginPage() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/40 p-6">
      <LoginForm />
    </div>
  );
}
