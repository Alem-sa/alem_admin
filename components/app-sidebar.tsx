"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CreditCard,
  LayoutDashboard,
  MessageSquareText,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { SignOutButton } from "@/components/sign-out-button";

type NavItem = { label: string; href: string; icon: LucideIcon };

// Placeholder destinations — the data pages arrive in later phases.
const NAV: NavItem[] = [
  { label: "Overview", href: "/", icon: LayoutDashboard },
  { label: "Users", href: "/users", icon: Users },
  { label: "AI Usage", href: "/ai-usage", icon: Sparkles },
  { label: "Feedback", href: "/feedback", icon: MessageSquareText },
  { label: "Subscriptions", href: "/subscriptions", icon: CreditCard },
];

export function AppSidebar({
  userEmail,
  role,
}: {
  userEmail: string;
  role: string;
}) {
  const pathname = usePathname();

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground">
      <div className="px-5 py-4">
        <p className="text-lg font-semibold">Alem Admin</p>
        <p className="text-xs text-muted-foreground">Internal dashboard</p>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2">
        {NAV.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-3">
        <div className="mb-3 px-2">
          <p className="truncate text-sm font-medium" title={userEmail}>
            {userEmail}
          </p>
          <p className="text-xs capitalize text-muted-foreground">{role}</p>
        </div>
        <SignOutButton className="w-full justify-start" />
      </div>
    </aside>
  );
}
