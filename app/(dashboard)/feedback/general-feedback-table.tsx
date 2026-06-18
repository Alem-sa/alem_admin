"use client";

import { useMemo, useState } from "react";
import {
  type ColumnDef,
  type SortingFn,
  type SortingState,
  flexRender,
  getCoreRowModel,
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
  MessageSquareText,
  Search,
} from "lucide-react";
import { format } from "date-fns";
import * as XLSX from "xlsx";

import { Badge } from "@/components/ui/badge";
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
import { RelativeDate } from "@/components/relative-date";
import { ExpandableText, ScreenshotCell } from "./feedback-cells";
import {
  CATEGORY_OPTIONS,
  categoryLabel,
  type FeedbackRow,
  platformLabel,
  todayStr,
} from "./types";

const PAGE_SIZE = 50;

const dateSort: SortingFn<FeedbackRow> = (a, b, id) => {
  const av = a.getValue<string | null>(id);
  const bv = b.getValue<string | null>(id);
  return (av ? Date.parse(av) : 0) - (bv ? Date.parse(bv) : 0);
};

const columns: ColumnDef<FeedbackRow>[] = [
  {
    accessorKey: "created_at",
    header: "Created",
    sortingFn: dateSort,
    cell: ({ getValue }) => <RelativeDate value={getValue<string | null>()} />,
  },
  {
    accessorKey: "category",
    header: "Category",
    cell: ({ getValue }) => (
      <Badge variant="secondary">{categoryLabel(getValue<string | null>())}</Badge>
    ),
  },
  {
    accessorKey: "message",
    header: "Message",
    enableSorting: false,
    cell: ({ getValue }) => (
      <ExpandableText
        text={getValue<string | null>()}
        limit={120}
        dir="rtl"
        title="Message"
      />
    ),
  },
  {
    accessorKey: "screenshot_signed_url",
    header: "Screenshot",
    enableSorting: false,
    cell: ({ getValue }) => <ScreenshotCell url={getValue<string | null>()} />,
  },
  {
    accessorKey: "platform",
    header: "Platform",
    cell: ({ getValue }) => platformLabel(getValue<string | null>()),
  },
  {
    accessorKey: "app_version",
    header: "App Version",
    cell: ({ getValue }) => getValue<string | null>() ?? "—",
  },
  {
    accessorKey: "device_info",
    header: "Device Info",
    enableSorting: false,
    cell: ({ getValue }) => (
      <ExpandableText text={getValue<string | null>()} limit={40} title="Device info" />
    ),
  },
];

export function GeneralFeedbackTable({ rows }: { rows: FeedbackRow[] }) {
  const [category, setCategory] = useState("all");
  const [platform, setPlatform] = useState("all");
  const [search, setSearch] = useState("");
  const [sorting, setSorting] = useState<SortingState>([
    { id: "created_at", desc: true },
  ]);

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (category !== "all" && r.category !== category) return false;
        if (platform !== "all" && (r.platform ?? "") !== platform) return false;
        if (search.trim()) {
          const q = search.toLowerCase();
          if (!(r.message ?? "").toLowerCase().includes(q)) return false;
        }
        return true;
      }),
    [rows, category, platform, search],
  );

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: PAGE_SIZE } },
  });

  function handleExport() {
    const data = table.getSortedRowModel().rows.map((r) => {
      const u = r.original;
      return {
        Created: u.created_at
          ? format(new Date(u.created_at), "yyyy-MM-dd HH:mm")
          : "",
        Category: categoryLabel(u.category),
        Message: u.message ?? "",
        Screenshot: u.screenshot_signed_url ?? "",
        Platform: platformLabel(u.platform),
        "App Version": u.app_version ?? "",
        "Device Info": u.device_info ?? "",
      };
    });
    const ws = XLSX.utils.json_to_sheet(data, {
      header: [
        "Created",
        "Category",
        "Message",
        "Screenshot",
        "Platform",
        "App Version",
        "Device Info",
      ],
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Feedback");
    XLSX.writeFile(wb, `alem-feedback-${todayStr()}.xlsx`);
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-16 text-center">
        <MessageSquareText className="size-8 text-muted-foreground" />
        <p className="font-medium">No feedback yet</p>
        <p className="text-sm text-muted-foreground">
          User feedback will appear here.
        </p>
      </div>
    );
  }

  const pageRows = table.getRowModel().rows;
  const { pageIndex, pageSize } = table.getState().pagination;
  const total = filtered.length;
  const start = total === 0 ? 0 : pageIndex * pageSize + 1;
  const end = pageIndex * pageSize + pageRows.length;

  return (
    <div className="space-y-4">
      {/* Filters + export */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={category}
            onValueChange={(v) => {
              setCategory(v ?? "all");
              table.setPageIndex(0);
            }}
          >
            <SelectTrigger className="w-[190px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {CATEGORY_OPTIONS.map(([id, label]) => (
                <SelectItem key={id} value={id}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={platform}
            onValueChange={(v) => {
              setPlatform(v ?? "all");
              table.setPageIndex(0);
            }}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All platforms</SelectItem>
              <SelectItem value="ios">iOS</SelectItem>
              <SelectItem value="android">Android</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative w-full sm:w-56">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                table.setPageIndex(0);
              }}
              placeholder="Search message…"
              className="pl-8"
              aria-label="Search feedback messages"
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <p className="whitespace-nowrap text-sm text-muted-foreground">
            {total} {total === 1 ? "entry" : "entries"}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={total === 0}
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
                  const sorted = header.column.getIsSorted();
                  return (
                    <TableHead key={header.id}>
                      {header.column.getCanSort() ? (
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
                      ) : (
                        flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )
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
                  No feedback matches the current filters.
                </TableCell>
              </TableRow>
            ) : (
              pageRows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="align-top">
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
          Showing {start}–{end} of {total}
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
