"use client";

import { useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const dash = <span className="text-muted-foreground">—</span>;

/**
 * Truncated text that opens the full content in a dialog when it overflows.
 * `dir="rtl"` is applied to Arabic fields so they render right-to-left both
 * in the cell and inside the dialog.
 */
export function ExpandableText({
  text,
  limit,
  dir = "ltr",
  title = "Details",
}: {
  text: string | null;
  limit: number;
  dir?: "ltr" | "rtl";
  title?: string;
}) {
  const [open, setOpen] = useState(false);
  if (!text || text.trim() === "") return dash;

  const isRtl = dir === "rtl";
  const overflow = text.length > limit;
  const shown = overflow ? text.slice(0, limit).trimEnd() + "…" : text;

  if (!overflow) {
    return (
      <span dir={dir} className={cn("block", isRtl && "text-right")}>
        {shown}
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        dir={dir}
        onClick={() => setOpen(true)}
        title="Click to view full text"
        className={cn(
          "block max-w-[28ch] cursor-pointer truncate hover:underline",
          isRtl ? "text-right" : "text-left",
        )}
      >
        {shown}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <div
            dir={dir}
            className={cn(
              "max-h-[60vh] overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed",
              isRtl && "text-right",
            )}
          >
            {text}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Screenshot thumbnail (signed URL) that opens full-size in a dialog. */
export function ScreenshotCell({ url }: { url: string | null }) {
  const [open, setOpen] = useState(false);
  if (!url) return dash;

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt="Feedback screenshot"
          className="size-14 rounded-md border object-cover transition-opacity hover:opacity-80"
        />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Screenshot</DialogTitle>
          </DialogHeader>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt="Feedback screenshot"
            className="max-h-[70vh] w-full rounded-md object-contain"
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
