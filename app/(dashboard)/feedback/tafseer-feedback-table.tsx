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
  Flag,
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
import { cn } from "@/lib/utils";
import { ExpandableText } from "./feedback-cells";
import { platformLabel, type TafseerFeedbackRow, todayStr } from "./types";

const PAGE_SIZE = 50;

const dateSort: SortingFn<TafseerFeedbackRow> = (a, b, id) => {
  const av = a.getValue<string | null>(id);
  const bv = b.getValue<string | null>(id);
  return (av ? Date.parse(av) : 0) - (bv ? Date.parse(bv) : 0);
};

const numberSort: SortingFn<TafseerFeedbackRow> = (a, b, id) =>
  (a.getValue<number | null>(id) ?? 0) - (b.getValue<number | null>(id) ?? 0);

function RatingBadge({ rating }: { rating: string | null }) {
  if (rating === "up")
    return (
      <Badge
        variant="secondary"
        className="bg-green-600/15 text-green-700 dark:text-green-400"
      >
        👍 Up
      </Badge>
    );
  if (rating === "down") return <Badge variant="destructive">👎 Down</Badge>;
  return <span className="text-muted-foreground">—</span>;
}

const columns: ColumnDef<TafseerFeedbackRow>[] = [
  {
    accessorKey: "created_at",
    header: "Created",
    sortingFn: dateSort,
    cell: ({ getValue }) => <RelativeDate value={getValue<string | null>()} />,
  },
  {
    accessorKey: "rating",
    header: "Rating",
    cell: ({ getValue }) => <RatingBadge rating={getValue<string | null>()} />,
  },
  {
    accessorKey: "comment",
    header: "Comment",
    enableSorting: false,
    cell: ({ getValue }) => (
      <ExpandableText
        text={getValue<string | null>()}
        limit={100}
        dir="rtl"
        title="Comment"
      />
    ),
  },
  {
    accessorKey: "surah_number",
    header: "Ayah",
    sortingFn: numberSort,
    cell: ({ row }) => {
      const { surah_number, ayah_number } = row.original;
      if (surah_number == null && ayah_number == null)
        return <span className="text-muted-foreground">—</span>;
      return (
        <span className="tabular-nums">
          {surah_number ?? "?"}:{ayah_number ?? "?"}
        </span>
      );
    },
  },
  {
    accessorKey: "agent",
    header: "Agent",
    cell: ({ getValue }) => getValue<string | null>() ?? "—",
  },
  {
    accessorKey: "ai_response",
    header: "AI Response",
    enableSorting: false,
    cell: ({ getValue }) => (
      <ExpandableText
        text={getValue<string | null>()}
        limit={80}
        dir="rtl"
        title="AI response"
      />
    ),
  },
  {
    accessorKey: "platform",
    header: "Platform",
    cell: ({ getValue }) => platformLabel(getValue<string | null>()),
  },
];

export function TafseerFeedbackTable({ rows }: { rows: TafseerFeedbackRow[] }) {
  const [rating, setRating] = useState("all");
  const [agent, setAgent] = useState("all");
  const [surah, setSurah] = useState("");
  const [search, setSearch] = useState("");
  const [actionableOnly, setActionableOnly] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([
    { id: "created_at", desc: true },
  ]);

  // Agent options come from the actual data.
  const agentOptions = useMemo(
    () =>
      Array.from(
        new Set(rows.map((r) => r.agent).filter((a): a is string => !!a)),
      ).sort(),
    [rows],
  );

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (rating !== "all" && (r.rating ?? "") !== rating) return false;
        if (agent !== "all" && (r.agent ?? "") !== agent) return false;
        if (surah.trim()) {
          const n = Number(surah);
          if (Number.isFinite(n) && r.surah_number !== n) return false;
        }
        if (
          actionableOnly &&
          !(r.rating === "down" && (r.comment ?? "").trim() !== "")
        ) {
          return false;
        }
        if (search.trim()) {
          const q = search.toLowerCase();
          if (!(r.comment ?? "").toLowerCase().includes(q)) return false;
        }
        return true;
      }),
    [rows, rating, agent, surah, actionableOnly, search],
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
        Rating: u.rating === "up" ? "Up" : u.rating === "down" ? "Down" : "",
        Comment: u.comment ?? "",
        Ayah: `${u.surah_number ?? ""}:${u.ayah_number ?? ""}`,
        Agent: u.agent ?? "",
        "AI Response": u.ai_response ?? "",
        Platform: platformLabel(u.platform),
      };
    });
    const ws = XLSX.utils.json_to_sheet(data, {
      header: [
        "Created",
        "Rating",
        "Comment",
        "Ayah",
        "Agent",
        "AI Response",
        "Platform",
      ],
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tafseer Feedback");
    XLSX.writeFile(wb, `alem-tafseer-feedback-${todayStr()}.xlsx`);
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-16 text-center">
        <MessageSquareText className="size-8 text-muted-foreground" />
        <p className="font-medium">No tafseer ratings yet</p>
        <p className="text-sm text-muted-foreground">
          Thumbs up/down on tafseer answers will appear here.
        </p>
      </div>
    );
  }

  const resetPage = () => table.setPageIndex(0);
  const pageRows = table.getRowModel().rows;
  const { pageIndex, pageSize } = table.getState().pagination;
  const total = filtered.length;
  const start = total === 0 ? 0 : pageIndex * pageSize + 1;
  const end = pageIndex * pageSize + pageRows.length;

  return (
    <div className="space-y-4">
      {/* Filters + export */}
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={rating}
            onValueChange={(v) => {
              setRating(v ?? "all");
              resetPage();
            }}
          >
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All ratings</SelectItem>
              <SelectItem value="up">👍 Up</SelectItem>
              <SelectItem value="down">👎 Down</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={agent}
            onValueChange={(v) => {
              setAgent(v ?? "all");
              resetPage();
            }}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All agents</SelectItem>
              {agentOptions.map((a) => (
                <SelectItem key={a} value={a}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="number"
            min={1}
            max={114}
            value={surah}
            onChange={(e) => {
              setSurah(e.target.value);
              resetPage();
            }}
            placeholder="Surah #"
            className="w-24"
            aria-label="Filter by surah number"
          />
          <div className="relative w-full sm:w-52">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                resetPage();
              }}
              placeholder="Search comment…"
              className="pl-8"
              aria-label="Search tafseer comments"
            />
          </div>
          <Button
            variant={actionableOnly ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setActionableOnly((v) => !v);
              resetPage();
            }}
            title="Show only thumbs-down feedback that includes a comment"
          >
            <Flag className="size-4" />
            Actionable only
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <p className="whitespace-nowrap text-sm text-muted-foreground">
            {total} {total === 1 ? "rating" : "ratings"}
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
                  No ratings match the current filters.
                </TableCell>
              </TableRow>
            ) : (
              pageRows.map((row) => (
                <TableRow
                  key={row.id}
                  className={cn(
                    row.original.rating === "down" &&
                      (row.original.comment ?? "").trim() !== "" &&
                      "bg-destructive/5",
                  )}
                >
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
