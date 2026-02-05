"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  type ColumnFiltersState,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, X } from "lucide-react";
import { columns } from "./columns";
import { type CompanyListItem } from "@/types/company";
import { type Sector } from "@/types/database";

const ALL_SECTORS: Sector[] = ["P&C", "Life", "Health", "Reinsurance", "Brokers"];

interface CompaniesTableProps {
  data: CompanyListItem[];
  initialSectorFilter?: string[];
}

export function CompaniesTable({ data, initialSectorFilter }: CompaniesTableProps) {
  const router = useRouter();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>(
    initialSectorFilter?.length
      ? [{ id: "sector", value: initialSectorFilter }]
      : []
  );
  const [globalFilter, setGlobalFilter] = useState("");

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: "includesString",
    state: { sorting, columnFilters, globalFilter },
    initialState: { pagination: { pageSize: 20 } },
  });

  const activeSectors =
    (columnFilters.find((f) => f.id === "sector")?.value as string[]) ?? [];

  const toggleSector = (sector: string) => {
    const current = activeSectors;
    const next = current.includes(sector)
      ? current.filter((s) => s !== sector)
      : [...current, sector];

    if (next.length === 0) {
      setColumnFilters((prev) => prev.filter((f) => f.id !== "sector"));
    } else {
      setColumnFilters((prev) => [
        ...prev.filter((f) => f.id !== "sector"),
        { id: "sector", value: next },
      ]);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by ticker or name..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-9 w-full sm:w-72"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {ALL_SECTORS.map((sector) => (
            <Badge
              key={sector}
              variant={activeSectors.includes(sector) ? "default" : "outline"}
              className="cursor-pointer select-none"
              onClick={() => toggleSector(sector)}
            >
              {sector}
            </Badge>
          ))}
          {activeSectors.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() =>
                setColumnFilters((prev) =>
                  prev.filter((f) => f.id !== "sector")
                )
              }
            >
              <X className="mr-1 h-3 w-3" /> Clear
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer"
                  onClick={() =>
                    router.push(`/companies/${row.original.ticker}`)
                  }
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  No companies found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {table.getFilteredRowModel().rows.length} companies
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
