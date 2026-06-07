"use client";

import { format, formatDistanceToNow } from "date-fns";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * Renders a timestamp as relative text ("2 days ago") with the full absolute
 * date shown in a tooltip on hover. Must be used inside a <TooltipProvider>.
 */
export function RelativeDate({ value }: { value: string | null }) {
  if (!value) return <span className="text-muted-foreground">—</span>;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return <span className="text-muted-foreground">—</span>;
  }

  const relative = formatDistanceToNow(date, { addSuffix: true });
  const absolute = format(date, "PPpp"); // e.g. "Apr 29, 2025, 3:24:00 PM"

  return (
    <Tooltip>
      <TooltipTrigger
        render={(props) => (
          <span
            {...props}
            className="cursor-default underline decoration-dotted decoration-muted-foreground/40 underline-offset-4"
          >
            {relative}
          </span>
        )}
      />
      <TooltipContent>{absolute}</TooltipContent>
    </Tooltip>
  );
}
