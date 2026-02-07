"use client";

import { useMemo, useState } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  ReferenceLine,
  Label,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPercent, formatCurrency } from "@/lib/metrics/formatters";
import { cn } from "@/lib/utils";
import { type OpportunityMapItem } from "@/lib/queries/pc-dashboard";

interface OpportunityMapProps {
  data: OpportunityMapItem[];
  sectorAvgLossRatio: number;
  excludedTickers: string[];
}

const chartConfig = {
  bubble: {
    label: "Carrier",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

const SUB_SECTOR_COLORS: Record<string, string> = {
  "Commercial Lines": "hsl(220 70% 55%)",
  "Personal Lines": "hsl(150 60% 45%)",
  Specialty: "hsl(40 80% 55%)",
  Diversified: "hsl(280 50% 55%)",
};

function getSubSectorColor(subSector: string | null): string {
  if (!subSector) return "hsl(220 70% 55%)";
  return SUB_SECTOR_COLORS[subSector] ?? "hsl(220 70% 55%)";
}

function CustomDot(props: Record<string, unknown>) {
  const { cx, cy, payload } = props as {
    cx: number;
    cy: number;
    payload: OpportunityMapItem;
  };
  if (!cx || !cy) return null;

  const color = getSubSectorColor(payload.sub_sector);
  // Size based on net premiums — sqrt scale
  const r = Math.max(
    10,
    Math.min(32, Math.sqrt(payload.netPremiums / 5e8))
  );

  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill={color}
        fillOpacity={0.5}
        stroke={color}
        strokeWidth={1.5}
      />
      <text
        x={cx}
        y={cy - r - 4}
        textAnchor="middle"
        className="fill-foreground text-[11px] font-mono font-medium"
      >
        {payload.ticker}
      </text>
    </g>
  );
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: OpportunityMapItem }>;
}) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;

  return (
    <div className="rounded-lg border bg-background p-2.5 shadow-md text-xs space-y-1">
      <p className="font-mono font-bold">
        {d.ticker}{" "}
        <span className="font-normal text-muted-foreground">{d.name}</span>
      </p>
      {d.sub_sector && (
        <p className="text-muted-foreground">{d.sub_sector}</p>
      )}
      <p>
        Avg Loss Ratio:{" "}
        <span className="font-mono">{formatPercent(d.avgLossRatio, 1)}</span>
      </p>
      <p>
        Volatility (StdDev):{" "}
        <span className="font-mono">{formatPercent(d.stdDevLossRatio, 2)}</span>
      </p>
      <p>
        Net Premiums:{" "}
        <span className="font-mono">{formatCurrency(d.netPremiums)}</span>
      </p>
      {d.prospectScore != null && (
        <p>
          Prospect Score:{" "}
          <span className="font-mono font-semibold">{d.prospectScore}/100</span>
        </p>
      )}
    </div>
  );
}

export function OpportunityMap({
  data,
  sectorAvgLossRatio,
  excludedTickers,
}: OpportunityMapProps) {
  const [activeSubSectors, setActiveSubSectors] = useState<Set<string>>(
    new Set()
  );

  // Get all unique sub-sectors
  const subSectors = useMemo(() => {
    const set = new Set<string>();
    for (const d of data) {
      if (d.sub_sector) set.add(d.sub_sector);
    }
    return Array.from(set).sort();
  }, [data]);

  // Filter by active sub-sectors (empty = show all)
  const filteredData = useMemo(
    () =>
      activeSubSectors.size === 0
        ? data
        : data.filter(
            (d) => d.sub_sector && activeSubSectors.has(d.sub_sector)
          ),
    [data, activeSubSectors]
  );

  // Median volatility for reference line
  const medianVolatility = useMemo(() => {
    const vols = data
      .map((d) => d.stdDevLossRatio)
      .sort((a, b) => a - b);
    if (vols.length === 0) return 3;
    const mid = Math.floor(vols.length / 2);
    return vols.length % 2 !== 0
      ? vols[mid]
      : (vols[mid - 1] + vols[mid]) / 2;
  }, [data]);

  const toggleSubSector = (ss: string) => {
    setActiveSubSectors((prev) => {
      const next = new Set(prev);
      if (next.has(ss)) {
        next.delete(ss);
      } else {
        next.add(ss);
      }
      return next;
    });
  };

  if (data.length === 0) {
    return (
      <Card className="rounded-sm">
        <CardContent className="py-12 text-center text-muted-foreground">
          No opportunity map data available.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-sm">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-base">
              Loss Ratio Opportunity Map
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              X = average loss ratio (FY2021-2024) · Y = volatility (std dev) ·
              Bubble size = net premiums
            </p>
          </div>
          {/* Sub-sector legend / filter */}
          <div className="flex flex-wrap gap-2">
            {subSectors.map((ss) => {
              const isActive =
                activeSubSectors.size === 0 || activeSubSectors.has(ss);
              return (
                <button
                  key={ss}
                  onClick={() => toggleSubSector(ss)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-sm px-2 py-1 text-[11px] font-medium border transition-all",
                    isActive
                      ? "border-border bg-card"
                      : "border-transparent bg-muted/30 opacity-50"
                  )}
                >
                  <div
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: getSubSectorColor(ss) }}
                  />
                  {ss}
                </button>
              );
            })}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Quadrant labels */}
          <div className="absolute top-2 left-14 text-[10px] text-muted-foreground/40 font-medium pointer-events-none z-10">
            High pain, volatile
          </div>
          <div className="absolute top-2 right-4 text-[10px] text-muted-foreground/40 font-medium pointer-events-none z-10">
            Low pain, volatile
          </div>
          <div className="absolute bottom-8 left-14 text-[10px] text-muted-foreground/40 font-medium pointer-events-none z-10">
            Efficient &amp; predictable
          </div>
          <div className="absolute bottom-8 right-4 text-[10px] text-muted-foreground/40 font-medium pointer-events-none z-10">
            Low pain, stable
          </div>

          <ChartContainer
            config={chartConfig}
            className="w-full"
            style={{ height: 420 }}
          >
            <ScatterChart
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            >
              <CartesianGrid
                strokeDasharray="2 6"
                className="stroke-border/15"
              />
              <XAxis
                type="number"
                dataKey="avgLossRatio"
                tickLine={false}
                axisLine={false}
                className="text-[11px] fill-muted-foreground"
                tickFormatter={(v: number) => `${v.toFixed(0)}%`}
              >
                <Label
                  value="Avg Loss Ratio (%)"
                  position="bottom"
                  offset={0}
                  className="text-[11px] fill-muted-foreground"
                />
              </XAxis>
              <YAxis
                type="number"
                dataKey="stdDevLossRatio"
                tickLine={false}
                axisLine={false}
                className="text-[11px] fill-muted-foreground"
                tickFormatter={(v: number) => `${v.toFixed(1)}%`}
              >
                <Label
                  value="Volatility (StdDev)"
                  angle={-90}
                  position="insideLeft"
                  offset={10}
                  className="text-[11px] fill-muted-foreground"
                />
              </YAxis>
              <ZAxis
                type="number"
                dataKey="netPremiums"
                range={[200, 3000]}
              />
              {/* Vertical: sector avg loss ratio */}
              <ReferenceLine
                x={sectorAvgLossRatio}
                strokeDasharray="4 4"
                className="stroke-muted-foreground/40"
              />
              {/* Horizontal: median volatility */}
              <ReferenceLine
                y={medianVolatility}
                strokeDasharray="4 4"
                className="stroke-muted-foreground/40"
              />
              <ChartTooltip content={<CustomTooltip />} />
              <Scatter data={filteredData} shape={<CustomDot />} />
            </ScatterChart>
          </ChartContainer>
        </div>

        {/* Footnotes */}
        {excludedTickers.length > 0 && (
          <p className="text-[11px] text-muted-foreground mt-2">
            Not shown: {excludedTickers.join(", ")} — insufficient loss ratio
            data (&lt;2 years)
          </p>
        )}
      </CardContent>
    </Card>
  );
}
