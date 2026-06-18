"use client";

import { AlertTriangle } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TooltipProvider } from "@/components/ui/tooltip";
import { GeneralFeedbackTable } from "./general-feedback-table";
import { TafseerFeedbackTable } from "./tafseer-feedback-table";
import type { FeedbackRow, TafseerFeedbackRow } from "./types";

function SectionError({
  section,
  message,
}: {
  section: string;
  message: string;
}) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
      <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" />
      <div>
        <p className="font-medium text-destructive">Couldn’t load {section}</p>
        <p className="text-xs text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

export function FeedbackTabs({
  feedback,
  feedbackError,
  tafseer,
  tafseerError,
}: {
  feedback: FeedbackRow[];
  feedbackError: string | null;
  tafseer: TafseerFeedbackRow[];
  tafseerError: string | null;
}) {
  return (
    <TooltipProvider delay={150}>
      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">Feedback</TabsTrigger>
          <TabsTrigger value="tafseer">Tafseer Feedback</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="pt-2">
          {feedbackError ? (
            <SectionError section="feedback" message={feedbackError} />
          ) : (
            <GeneralFeedbackTable rows={feedback} />
          )}
        </TabsContent>

        <TabsContent value="tafseer" className="pt-2">
          {tafseerError ? (
            <SectionError section="tafseer feedback" message={tafseerError} />
          ) : (
            <TafseerFeedbackTable rows={tafseer} />
          )}
        </TabsContent>
      </Tabs>
    </TooltipProvider>
  );
}
