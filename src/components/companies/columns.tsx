"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectorBadge } from "@/components/dashboard/sector-badge";
import { Sparkline } from "@/components/charts/sparkline";
import { formatMetricValue } from "@/lib/metrics/formatters";
import { type CompanyListItem } from "@/types/company";

export const columns: ColumnDef<CompanyListItem>[] = [
  {
    accessorKey: "ticker",
    header: ({ column }) => (
      <Button
        variant="ghost"
        className="-ml-4"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Ticker
        <ArrowUpDown className="ml-1 h-3 w-3" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="font-semibold">{row.getValue("ticker")}</span>
    ),
  },
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => (
      <span className="text-muted-foreground max-w-[200px] truncate block">
        {row.getValue("name")}
      </span>
    ),
  },
  {
    accessorKey: "sector",
    header: "Sector",
    cell: ({ row }) => <SectorBadge sector={row.getValue("sector")} />,
    filterFn: (row, id, value: string[]) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: "combined_ratio",
    header: ({ column }) => (
      <Button
        variant="ghost"
        className="-ml-4"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Combined Ratio
        <ArrowUpDown className="ml-1 h-3 w-3" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="font-mono text-sm">
        {formatMetricValue("combined_ratio", row.getValue("combined_ratio"))}
      </span>
    ),
  },
  {
    accessorKey: "roe",
    header: ({ column }) => (
      <Button
        variant="ghost"
        className="-ml-4"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        ROE
        <ArrowUpDown className="ml-1 h-3 w-3" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="font-mono text-sm">
        {formatMetricValue("roe", row.getValue("roe"))}
      </span>
    ),
  },
  {
    accessorKey: "net_premiums_earned",
    header: ({ column }) => (
      <Button
        variant="ghost"
        className="-ml-4"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Premiums
        <ArrowUpDown className="ml-1 h-3 w-3" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="font-mono text-sm">
        {formatMetricValue(
          "net_premiums_earned",
          row.getValue("net_premiums_earned")
        )}
      </span>
    ),
  },
  {
    accessorKey: "eps",
    header: ({ column }) => (
      <Button
        variant="ghost"
        className="-ml-4"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        EPS
        <ArrowUpDown className="ml-1 h-3 w-3" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="font-mono text-sm">
        {formatMetricValue("eps", row.getValue("eps"))}
      </span>
    ),
  },
  {
    id: "sparkline",
    header: "3Y Trend",
    cell: ({ row }) => {
      const data = row.original.sparkline_data;
      if (!data || data.length === 0) return <span className="text-muted-foreground text-xs">N/A</span>;
      return <Sparkline data={data} />;
    },
  },
];
