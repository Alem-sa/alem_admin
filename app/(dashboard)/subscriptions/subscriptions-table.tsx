"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  type ColumnDef,
  type FilterFn,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Search,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TooltipProvider } from "@/components/ui/tooltip";
import { RelativeDate } from "@/components/relative-date";
import { cn } from "@/lib/utils";
import type { SubscriptionRow } from "./types";

const PAGE_SIZE = 50;

const dash = <span className="text-muted-foreground">—</span>;

function statusVariant(state: string | null) {
  const s = (state ?? "").toLowerCase();
  if (/cancel|expired|churn|inactive/.test(s)) return "destructive" as const;
  if (/trial/.test(s)) return "outline" as const;
  return "secondary" as const;
}

// Search matches email or display name (case-insensitive).
const searchFilter: FilterFn<SubscriptionRow> = (row, _id, value) => {
  const q = String(value).toLowerCase().trim();
  if (!q) return true;
  const email = row.original.email?.toLowerCase() ?? "";
  const name = row.original.display_name?.toLowerCase() ?? "";
  return email.includes(q) || name.includes(q);
};

const columns: ColumnDef<SubscriptionRow>[] = [
  {
    accessorKey: "email",
    header: "User",
    cell: ({ getValue }) => {
      const v = getValue<string | null>();
      return v ? <span className="font-medium">{v}</span> : dash;
    },
  },
  {
    accessorKey: "plan",
    header: "Plan",
    cell: ({ getValue }) => getValue<string | null>() || dash,
  },
  {
    accessorKey: "subscription_state",
    header: "Status",
    cell: ({ getValue }) => {
      const s = getValue<string | null>();
      return s ? <Badge variant={statusVariant(s)}>{s}</Badge> : dash;
    },
  },
  {
    accessorKey: "period_start",
    header: "Period",
    cell: ({ row }) => {
      const { period_start, period_end } = row.original;
      if (!period_start && !period_end) return dash;
      return (
        <span className="flex items-center gap-1.5 whitespace-nowrap">
          <RelativeDate value={period_start} />
          <span className="text-muted-foreground">→</span>
          <RelativeDate value={period_end} />
        </span>
      );
    },
  },
  {
    accessorKey: "created_at",
    header: "Created",
    cell: ({ getValue }) => <RelativeDate value={getValue<string | null>()} />,
  },
];

export function SubscriptionsTable({ data }: { data: SubscriptionRow[] }) {
  const router = useRouter();
  const [sorting, setSorting] = useState<SortingState>([
    { id: "created_at", desc: true },
  ]);
  const [globalFilter, setGlobalFilter] = useState("");

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: searchFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: PAGE_SIZE } },
  });

  const total = data.length;
  const filtered = table.getFilteredRowModel().rows;
  const pageRows = table.getRowModel().rows;
  const { pageIndex, pageSize } = table.getState().pagination;
  const start = filtered.length === 0 ? 0 : pageIndex * pageSize + 1;
  const end = pageIndex * pageSize + pageRows.length;

  return (
    <TooltipProvider delay={150}>
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={globalFilter}
              onChange={(e) => {
                setGlobalFilter(e.target.value);
                table.setPageIndex(0);
              }}
              placeholder="Search email or name…"
              className="pl-8"
              aria-label="Search subscriptions"
            />
          </div>
          <p className="text-sm text-muted-foreground">
            {globalFilter
              ? `${filtered.length} of ${total} subscriptions`
              : `${total} ${total === 1 ? "subscription" : "subscriptions"}`}
          </p>
        </div>

        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((hg) => (
                <TableRow key={hg.id}>
                  {hg.headers.map((header) => {
                    const sorted = header.column.getIsSorted();
                    return (
                      <TableHead key={header.id}>
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className="inline-flex items-center gap-1.5 select-none hover:text-foreground"
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
              {pageRows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No subscriptions match “{globalFilter}”.
                  </TableCell>
                </TableRow>
              ) : (
                pageRows.map((row) => {
                  const userId = row.original.user_id;
                  return (
                    <TableRow
                      key={row.id}
                      tabIndex={userId ? 0 : undefined}
                      onClick={
                        userId ? () => router.push(`/users/${userId}`) : undefined
                      }
                      onKeyDown={
                        userId
                          ? (e) => {
                              if (e.key === "Enter")
                                router.push(`/users/${userId}`);
                            }
                          : undefined
                      }
                      className={cn(userId && "cursor-pointer")}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {start}–{end} of {filtered.length}
          </p>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Page {pageIndex + 1} of {Math.max(table.getPageCount(), 1)}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="size-4" />
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
