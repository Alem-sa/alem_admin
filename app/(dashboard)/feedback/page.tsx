import type { Metadata } from "next";

import { createAdminClient } from "@/lib/supabase/admin";
import { getDevAccountIds, excludeDevAccounts } from "@/lib/dev-accounts";
import { FeedbackTabs } from "./feedback-tabs";
import type { FeedbackRow, TafseerFeedbackRow } from "./types";

export const metadata: Metadata = { title: "Feedback · Alem Admin" };
export const dynamic = "force-dynamic";

const LIMIT = 1000;

type RawFeedback = {
  id: string;
  category: string | null;
  message: string | null;
  screenshot_url: string | null;
  app_version: string | null;
  platform: string | null;
  device_info: string | null;
  created_at: string | null;
};

export default async function FeedbackPage() {
  const admin = createAdminClient();

  // Exclude test/dev accounts from both feedback tables (they'd otherwise
  // pollute the lists + Excel exports). No-op until dev_accounts is populated.
  const devIds = await getDevAccountIds();

  const [fbRes, tfRes] = await Promise.all([
    excludeDevAccounts(
      admin
        .from("feedback")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(LIMIT),
      devIds,
    ),
    excludeDevAccounts(
      admin
        .from("tafseer_feedback")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(LIMIT),
      devIds,
    ),
  ]);

  const rawFb = (fbRes.data ?? []) as RawFeedback[];

  // Sign private-bucket screenshot paths in a single batch call. The raw path
  // is NEVER passed to the client — only the 1-hour signed URL is. Failures
  // degrade to null (cell renders "—"); they never crash the page.
  const paths = rawFb
    .map((r) => r.screenshot_url)
    .filter((p): p is string => !!p);
  const signed = new Map<string, string>();
  if (paths.length > 0) {
    try {
      const { data, error } = await admin.storage
        .from("feedback-screenshots")
        .createSignedUrls(paths, 3600);
      if (error) {
        console.error("createSignedUrls failed:", error.message);
      } else if (data) {
        data.forEach((s, i) => {
          if (s.signedUrl && !s.error) signed.set(paths[i], s.signedUrl);
          else if (s.error)
            console.error("signed url error for", paths[i], s.error);
        });
      }
    } catch (e) {
      console.error("createSignedUrls threw:", e);
    }
  }

  const feedback: FeedbackRow[] = rawFb.map((r) => ({
    id: r.id,
    category: r.category,
    message: r.message,
    platform: r.platform,
    app_version: r.app_version,
    device_info: r.device_info,
    created_at: r.created_at,
    screenshot_signed_url: r.screenshot_url
      ? (signed.get(r.screenshot_url) ?? null)
      : null,
  }));

  const tafseer = (tfRes.data ?? []) as TafseerFeedbackRow[];

  return (
    <div className="space-y-6 p-8">
      <header>
        <h1 className="text-2xl font-semibold">Feedback</h1>
        <p className="text-muted-foreground">
          User feedback and tafseer AI ratings.
        </p>
      </header>
      <FeedbackTabs
        feedback={feedback}
        feedbackError={fbRes.error?.message ?? null}
        tafseer={tafseer}
        tafseerError={tfRes.error?.message ?? null}
      />
    </div>
  );
}
