"use client";

import { useState, type ComponentProps } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton({
  className,
  variant = "outline",
}: {
  className?: string;
  variant?: ComponentProps<typeof Button>["variant"];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function signOut() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    // Clear the session cookie (done by signOut), then refresh server state.
    // The proxy will redirect the now-anonymous request to /login.
    router.replace("/login");
    router.refresh();
  }

  return (
    <Button
      type="button"
      variant={variant}
      className={className}
      onClick={signOut}
      disabled={loading}
    >
      <LogOut />
      {loading ? "Signing out…" : "Sign out"}
    </Button>
  );
}
