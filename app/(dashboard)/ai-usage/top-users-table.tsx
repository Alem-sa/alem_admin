"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RelativeDate } from "@/components/relative-date";
import { cn } from "@/lib/utils";
import type { AiUsageOverviewRow } from "./types";

const NUMERIC = new Set([
  "chat_count",
  "message_count",
  "like_count",
  "dislike_count",
]);

const dash = <span className="text-muted-foreground">—</span>;

const columns: ColumnDef<AiUsageOverviewRow>[] = [
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ getValue }) => {
      const v = getValue<string | null>();
      return v ? <span className="font-medium">{v}</span> : dash;
    },
  },
  {
    accessorKey: "display_name",
    header: "Display Name",
    cell: ({ getValue }) => getValue<string | null>() || dash,
  },
  {
    accessorKey: "chat_count",
    header: "Chats",
    cell: ({ getValue }) => getValue<number>().toLocaleString(),
  },
  {
    accessorKey: "message_count",
    header: "Messages",
    cell: ({ getValue }) => getValue<number>().toLocaleString(),
  },
  {
    accessorKey: "like_count",
    header: "Likes",
    cell: ({ getValue }) => getValue<number>().toLocaleString(),
  },
  {
    accessorKey: "dislike_count",
    header: "Dislikes",
    cell: ({ getValue }) => getValue<number>().toLocaleString(),
  },
  {
    accessorKey: "last_chat_at",
    header: "Last Chat",
    cell: ({ getValue }) => <RelativeDate value={getValue<string | null>()} />,
  },
];

export function TopUsersTable({ data }: { data: AiUsageOverviewRow[] }) {
  const router = useRouter();
  const [sorting, setSorting] = useState<SortingState>([
    { id: "chat_count", desc: true },
  ]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (data.length === 0) {
    return (
      <p className="rounded-lg border border-dashed px-3 py-10 text-center text-sm text-muted-foreground">
        No AI usage yet.
      </p>
    );
  }

  return (
    <div className="rounded-xl border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((hg) => (
            <TableRow key={hg.id}>
              {hg.headers.map((header) => {
                const isNum = NUMERIC.has(header.column.id);
                const sorted = header.column.getIsSorted();
                return (
                  <TableHead key={header.id} className={cn(isNum && "text-right")}>
                    <button
                      type="button"
                      onClick={header.column.getToggleSortingHandler()}
                      className={cn(
                        "inline-flex items-center gap-1.5 select-none hover:text-foreground",
                        isNum && "flex-row-reverse",
                      )}
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                      {sorted === "asc" ? (
                        <ArrowUp className="size-3.5" />
                      ) : sorted === "desc" ? (
                        <ArrowDown className="size-3.5" />
                      ) : (
                        <ChevronsUpDown className="size-3.5 text-muted-foreground/60" />
                      )}
                    </button>
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow
              key={row.id}
              tabIndex={0}
              onClick={() => router.push(`/users/${row.original.user_id}`)}
              onKeyDown={(e) => {
                if (e.key === "Enter")
                  router.push(`/users/${row.original.user_id}`);
              }}
              className="cursor-pointer"
            >
              {row.getVisibleCells().map((cell) => (
                <TableCell
                  key={cell.id}
                  className={cn(
                    NUMERIC.has(cell.column.id) && "text-right tabular-nums",
                  )}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
