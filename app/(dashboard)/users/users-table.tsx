"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  type ColumnDef,
  type FilterFn,
  type SortingFn,
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
  Users as UsersIcon,
} from "lucide-react";

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
import type { UserOverviewRow } from "./types";

const PAGE_SIZE = 50;

// Right-aligned, monospaced numeric columns.
const NUMERIC = new Set([
  "total_xp",
  "current_streak",
  "ai_chat_count",
  "bookmark_count",
]);

// Global search: match email OR display name only (case-insensitive).
const searchFilter: FilterFn<UserOverviewRow> = (row, _id, value) => {
  const q = String(value).toLowerCase().trim();
  if (!q) return true;
  const email = row.original.email?.toLowerCase() ?? "";
  const name = row.original.display_name?.toLowerCase() ?? "";
  return email.includes(q) || name.includes(q);
};

// Explicit sorters so nulls behave predictably (treated as oldest / zero).
const dateSort: SortingFn<UserOverviewRow> = (a, b, id) => {
  const av = a.getValue<string | null>(id);
  const bv = b.getValue<string | null>(id);
  return (av ? Date.parse(av) : 0) - (bv ? Date.parse(bv) : 0);
};

const numberSort: SortingFn<UserOverviewRow> = (a, b, id) =>
  (a.getValue<number | null>(id) ?? 0) - (b.getValue<number | null>(id) ?? 0);

const dash = <span className="text-muted-foreground">—</span>;

const columns: ColumnDef<UserOverviewRow>[] = [
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
    accessorKey: "created_at",
    header: "Signed Up",
    sortingFn: dateSort,
    cell: ({ getValue }) => <RelativeDate value={getValue<string | null>()} />,
  },
  {
    accessorKey: "last_activity_at",
    header: "Last Active",
    sortingFn: dateSort,
    cell: ({ getValue }) => <RelativeDate value={getValue<string | null>()} />,
  },
  {
    accessorKey: "total_xp",
    header: "XP",
    sortingFn: numberSort,
    cell: ({ getValue }) => (getValue<number | null>() ?? 0).toLocaleString(),
  },
  {
    accessorKey: "current_streak",
    header: "Streak",
    sortingFn: numberSort,
    cell: ({ getValue }) => getValue<number | null>() ?? 0,
  },
  {
    accessorKey: "ai_chat_count",
    header: "AI Chats",
    sortingFn: numberSort,
    cell: ({ getValue }) => getValue<number>(),
  },
  {
    accessorKey: "bookmark_count",
    header: "Bookmarks",
    sortingFn: numberSort,
    cell: ({ getValue }) => getValue<number>(),
  },
];

export function UsersTable({ data }: { data: UserOverviewRow[] }) {
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

  const totalUsers = data.length;

  // Empty data set: no users at all.
  if (totalUsers === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-16 text-center">
        <UsersIcon className="size-8 text-muted-foreground" />
        <p className="font-medium">No users yet</p>
        <p className="text-sm text-muted-foreground">
          Registered users will appear here.
        </p>
      </div>
    );
  }

  const filteredRows = table.getFilteredRowModel().rows;
  const pageRows = table.getRowModel().rows;
  const { pageIndex, pageSize } = table.getState().pagination;
  const start = filteredRows.length === 0 ? 0 : pageIndex * pageSize + 1;
  const end = pageIndex * pageSize + pageRows.length;

  return (
    <TooltipProvider delay={150}>
      <div className="space-y-4">
        {/* Search + total count */}
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
              aria-label="Search users"
            />
          </div>
          <p className="text-sm text-muted-foreground">
            {globalFilter
              ? `${filteredRows.length} of ${totalUsers} users`
              : `${totalUsers} ${totalUsers === 1 ? "user" : "users"}`}
          </p>
        </div>

        {/* Table */}
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((hg) => (
                <TableRow key={hg.id}>
                  {hg.headers.map((header) => {
                    const isNumeric = NUMERIC.has(header.column.id);
                    const sorted = header.column.getIsSorted();
                    return (
                      <TableHead
                        key={header.id}
                        className={cn(isNumeric && "text-right")}
                      >
                        {header.isPlaceholder ? null : (
                          <button
                            type="button"
                            onClick={header.column.getToggleSortingHandler()}
                            className={cn(
                              "inline-flex items-center gap-1.5 select-none hover:text-foreground",
                              isNumeric && "flex-row-reverse",
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
                        )}
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
                    No users match “{globalFilter}”.
                  </TableCell>
                </TableRow>
              ) : (
                pageRows.map((row) => (
                  <TableRow
                    key={row.id}
                    tabIndex={0}
                    onClick={() =>
                      router.push(`/users/${row.original.user_id}`)
                    }
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
                          NUMERIC.has(cell.column.id) &&
                            "text-right tabular-nums",
                        )}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {start}–{end} of {filteredRows.length}
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
