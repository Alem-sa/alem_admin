"use client";

import { useMemo, useState } from "react";
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
  Download,
  Search,
  Users as UsersIcon,
} from "lucide-react";
import * as XLSX from "xlsx";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/format-duration";
import type { UserOverviewRow } from "./types";

const PAGE_SIZE = 50;

// Right-aligned, monospaced numeric columns.
const NUMERIC = new Set([
  "total_xp",
  "current_streak",
  "tafseer_chat_count",
  "general_chat_count",
  "tajweed_chat_count",
  "ai_chat_count",
  "total_app_seconds",
  "rag_tafseer_count",
  "hifz_minutes",
  "bookmark_count",
]);

// Excel export: human-readable header in the displayed column order.
const EXPORT_HEADERS = [
  "Email",
  "Display Name",
  "XP",
  "Streak",
  "Tafseer Agent",
  "General Agent",
  "Tajweed Agent",
  "Total AI Messages",
  "Time in App",
  "RAG Tafseer",
  "Hifz Minutes",
  "Bookmarks",
] as const;

// Activity-window filter options. `days` = null means "All time" (no filter).
const ACTIVITY_WINDOWS: { value: string; label: string; days: number | null }[] = [
  { value: "all", label: "All time", days: null },
  { value: "7", label: "Last 7 days", days: 7 },
  { value: "14", label: "Last 14 days", days: 14 },
  { value: "30", label: "Last 30 days", days: 30 },
  { value: "90", label: "Last 90 days", days: 90 },
];

// Global search: match email OR display name only (case-insensitive).
const searchFilter: FilterFn<UserOverviewRow> = (row, _id, value) => {
  const q = String(value).toLowerCase().trim();
  if (!q) return true;
  const email = row.original.email?.toLowerCase() ?? "";
  const name = row.original.display_name?.toLowerCase() ?? "";
  return email.includes(q) || name.includes(q);
};

// Numeric sort so number columns sort numerically (not lexicographically).
const numberSort: SortingFn<UserOverviewRow> = (a, b, id) =>
  (a.getValue<number | null>(id) ?? 0) - (b.getValue<number | null>(id) ?? 0);

const dash = <span className="text-muted-foreground">—</span>;
const num = (v: number | null | undefined) => (v ?? 0).toLocaleString();

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
    accessorKey: "total_xp",
    header: "XP",
    sortingFn: numberSort,
    cell: ({ getValue }) => num(getValue<number | null>()),
  },
  {
    accessorKey: "current_streak",
    header: "Streak",
    sortingFn: numberSort,
    cell: ({ getValue }) => num(getValue<number | null>()),
  },
  {
    accessorKey: "tafseer_chat_count",
    header: "Tafseer Agent",
    sortingFn: numberSort,
    cell: ({ getValue }) => num(getValue<number | null>()),
  },
  {
    accessorKey: "general_chat_count",
    header: "General Agent",
    sortingFn: numberSort,
    cell: ({ getValue }) => num(getValue<number | null>()),
  },
  {
    accessorKey: "tajweed_chat_count",
    header: "Tajweed Agent",
    sortingFn: numberSort,
    cell: ({ getValue }) => num(getValue<number | null>()),
  },
  {
    accessorKey: "ai_chat_count",
    header: "Total AI Messages",
    sortingFn: numberSort,
    cell: ({ getValue }) => num(getValue<number | null>()),
  },
  {
    accessorKey: "total_app_seconds",
    header: "Time in App",
    sortingFn: numberSort,
    cell: ({ getValue }) => formatDuration(Number(getValue<number | null>() ?? 0)),
  },
  {
    accessorKey: "rag_tafseer_count",
    header: "RAG Tafseer",
    sortingFn: numberSort,
    cell: ({ getValue }) => num(getValue<number | null>()),
  },
  {
    accessorKey: "hifz_minutes",
    header: "Hifz Minutes",
    sortingFn: numberSort,
    cell: ({ getValue }) => num(getValue<number | null>()),
  },
  {
    accessorKey: "bookmark_count",
    header: "Bookmarks",
    sortingFn: numberSort,
    cell: ({ getValue }) => num(getValue<number | null>()),
  },
];

export function UsersTable({ data }: { data: UserOverviewRow[] }) {
  const router = useRouter();
  const [sorting, setSorting] = useState<SortingState>([
    { id: "total_xp", desc: true },
  ]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [activityWindow, setActivityWindow] = useState("all");

  // Activity filter: keep only users whose last_activity_at falls inside the
  // selected window. This changes WHICH USERS are shown, never their (lifetime)
  // column values. Combined (AND) with the search box below.
  const activityRows = useMemo(() => {
    const win = ACTIVITY_WINDOWS.find((w) => w.value === activityWindow);
    if (!win || win.days === null) return data;
    const cutoff = Date.now() - win.days * 86_400_000;
    return data.filter((u) => {
      if (!u.last_activity_at) return false;
      const t = Date.parse(u.last_activity_at);
      return !Number.isNaN(t) && t >= cutoff;
    });
  }, [data, activityWindow]);

  const table = useReactTable({
    data: activityRows,
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
  const filterActive = activityWindow !== "all" || globalFilter.trim() !== "";

  // Export ALL currently-filtered rows (search-respecting, not paginated), in
  // the displayed sort order. Generated entirely client-side.
  function handleExport() {
    const rows = table.getSortedRowModel().rows.map((r) => {
      const u = r.original;
      return {
        Email: u.email ?? "",
        "Display Name": u.display_name ?? "",
        XP: u.total_xp ?? 0,
        Streak: u.current_streak ?? 0,
        "Tafseer Agent": u.tafseer_chat_count ?? 0,
        "General Agent": u.general_chat_count ?? 0,
        "Tajweed Agent": u.tajweed_chat_count ?? 0,
        "Total AI Messages": u.ai_chat_count ?? 0,
        "Time in App": Math.floor(Number(u.total_app_seconds ?? 0) / 60),
        "RAG Tafseer": u.rag_tafseer_count ?? 0,
        "Hifz Minutes": u.hifz_minutes ?? 0,
        Bookmarks: u.bookmark_count ?? 0,
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows, {
      header: [...EXPORT_HEADERS],
    });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Users");

    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const win = ACTIVITY_WINDOWS.find((w) => w.value === activityWindow);
    const slug = win && win.days !== null ? `-last-${win.days}-days` : "";
    XLSX.writeFile(workbook, `alem-users${slug}-${today}.xlsx`);
  }

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
    <div className="space-y-4">
      {/* Search + activity filter + count + export */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-full flex-col gap-3 sm:max-w-md sm:flex-row sm:items-center">
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
          <Select
            value={activityWindow}
            onValueChange={(v) => {
              setActivityWindow(v ?? "all");
              table.setPageIndex(0);
            }}
          >
            <SelectTrigger className="w-full sm:w-[150px]" aria-label="Filter by activity">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ACTIVITY_WINDOWS.map((w) => (
                <SelectItem key={w.value} value={w.value}>
                  {w.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground">
            {filterActive
              ? `Showing ${filteredRows.length} of ${totalUsers} users`
              : `${totalUsers} ${totalUsers === 1 ? "user" : "users"}`}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={filteredRows.length === 0}
          >
            <Download className="size-4" />
            Download Excel
          </Button>
        </div>
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
                  {globalFilter
                    ? `No users match “${globalFilter}”.`
                    : "No users in the selected time window."}
                </TableCell>
              </TableRow>
            ) : (
              pageRows.map((row) => (
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
  );
}
