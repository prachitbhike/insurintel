"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { type TimeseriesPoint } from "@/types/company";

interface PainChartProps {
  timeseries: Record<string, TimeseriesPoint[]>;
  sector: string;
  sectorAvgCombinedRatio: number | null;
  sectorAvgMLR: number | null;
  sectorAvgROE: number | null;
}

const LOSS_COLOR = "hsl(0 72% 51%)";
const EXPENSE_COLOR = "hsl(199 89% 48%)";

const pcConfig: ChartConfig = {
  loss_ratio: { label: "Loss Ratio", color: LOSS_COLOR },
  expense_ratio: { label: "Expense Ratio", color: EXPENSE_COLOR },
};

const healthConfig: ChartConfig = {
  medical_loss_ratio: { label: "Medical Loss Ratio", color: "hsl(263 70% 50%)" },
};

const roeConfig: ChartConfig = {
  roe: { label: "Return on Equity", color: "var(--chart-1)" },
};

/* Direct label rendered at the last data point of each area.
   Cast as AreaDot at call site to satisfy Recharts' strict SVGElement generic. */
function areaEndLabel(label: string, color: string, dataLen: number) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (props: any): React.ReactElement<SVGElement> => {
    const cx = props.cx ?? props.x;
    const cy = props.cy ?? props.y;
    const index = props.index;
    if (index !== dataLen - 1 || cx == null || cy == null) {
      return <g /> as React.ReactElement<SVGElement>;
    }
    return (
      <text
        x={cx + 8}
        y={cy}
        fill={color}
        fontSize={10}
        dominantBaseline="middle"
        style={{ fontFamily: "var(--font-mono)", fontWeight: 500 }}
      >
        {label}
      </text>
    ) as React.ReactElement<SVGElement>;
  };
}

export function PainChart({
  timeseries,
  sector,
  sectorAvgCombinedRatio,
  sectorAvgMLR,
  sectorAvgROE,
}: PainChartProps) {
  if (sector === "P&C" || sector === "Reinsurance" || sector === "Mortgage Insurance") {
    return (
      <CombinedRatioChart
        timeseries={timeseries}
        sectorAvg={sectorAvgCombinedRatio}
      />
    );
  }

  if (sector === "Health") {
    return (
      <MLRChart timeseries={timeseries} sectorAvg={sectorAvgMLR} />
    );
  }

  // Life / Brokers / Title: ROE trend
  return <ROEChart timeseries={timeseries} sectorAvg={sectorAvgROE} />;
}

function CombinedRatioChart({
  timeseries,
  sectorAvg,
}: {
  timeseries: Record<string, TimeseriesPoint[]>;
  sectorAvg: number | null;
}) {
  const lossData = (timeseries["loss_ratio"] ?? []).filter(
    (p) => p.fiscal_quarter == null,
  );
  const expenseData = (timeseries["expense_ratio"] ?? []).filter(
    (p) => p.fiscal_quarter == null,
  );

  const years = [
    ...new Set([
      ...lossData.map((d) => d.fiscal_year),
      ...expenseData.map((d) => d.fiscal_year),
    ]),
  ].sort();

  const lossMap = new Map(lossData.map((d) => [d.fiscal_year, d.value]));
  const expenseMap = new Map(expenseData.map((d) => [d.fiscal_year, d.value]));

  const chartData = years.map((year) => ({
    year: `FY${year}`,
    loss_ratio: lossMap.get(year) ?? 0,
    expense_ratio: expenseMap.get(year) ?? 0,
  }));

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
        No underwriting data available.
      </div>
    );
  }

  return (
    <ChartContainer config={pcConfig} className="w-full h-full">
      <AreaChart
        data={chartData}
        margin={{ top: 12, right: 72, left: 0, bottom: 4 }}
      >
        <defs>
          <linearGradient id="painGradLoss" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={LOSS_COLOR} stopOpacity={0.4} />
            <stop offset="95%" stopColor={LOSS_COLOR} stopOpacity={0.08} />
          </linearGradient>
          <linearGradient id="painGradExpense" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={EXPENSE_COLOR} stopOpacity={0.4} />
            <stop offset="95%" stopColor={EXPENSE_COLOR} stopOpacity={0.08} />
          </linearGradient>
        </defs>
        <CartesianGrid
          vertical={false}
          strokeDasharray="2 6"
          className="stroke-border/15"
        />
        <XAxis
          dataKey="year"
          tickLine={false}
          axisLine={false}
          className="text-xs fill-muted-foreground"
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          className="text-xs fill-muted-foreground"
          tickFormatter={(v: number) => `${v}%`}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value, name) => {
                const v = value as number;
                const label = name === "loss_ratio" ? "Loss Ratio" : "Expense Ratio";
                return `${label}: ${v.toFixed(1)}%`;
              }}
            />
          }
        />
        <ReferenceLine
          y={100}
          stroke="var(--muted-foreground)"
          strokeDasharray="4 4"
          strokeWidth={1}
          label={{
            value: "Breakeven",
            position: "insideTopRight",
            className: "text-[10px] fill-muted-foreground",
          }}
        />
        {sectorAvg != null && (
          <ReferenceLine
            y={sectorAvg}
            stroke="var(--chart-3)"
            strokeDasharray="6 3"
            strokeWidth={1.5}
            label={{
              value: `Sector Avg ${sectorAvg.toFixed(1)}%`,
              position: "insideTopRight",
              className: "text-[11px] fill-foreground/70 font-mono",
            }}
          />
        )}
        <Area
          type="monotone"
          dataKey="loss_ratio"
          stackId="cr"
          stroke={LOSS_COLOR}
          fill="url(#painGradLoss)"
          strokeWidth={2}
          dot={areaEndLabel("Losses", LOSS_COLOR, chartData.length)}
          activeDot={false}
        />
        <Area
          type="monotone"
          dataKey="expense_ratio"
          stackId="cr"
          stroke={EXPENSE_COLOR}
          fill="url(#painGradExpense)"
          strokeWidth={2}
          dot={areaEndLabel("Expenses", EXPENSE_COLOR, chartData.length)}
          activeDot={false}
        />
      </AreaChart>
    </ChartContainer>
  );
}

function MLRChart({
  timeseries,
  sectorAvg,
}: {
  timeseries: Record<string, TimeseriesPoint[]>;
  sectorAvg: number | null;
}) {
  const mlrData = (timeseries["medical_loss_ratio"] ?? [])
    .filter((p) => p.fiscal_quarter == null)
    .sort((a, b) => a.fiscal_year - b.fiscal_year);

  const chartData = mlrData.map((d) => ({
    year: `FY${d.fiscal_year}`,
    medical_loss_ratio: d.value,
  }));

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
        No MLR data available.
      </div>
    );
  }

  return (
    <ChartContainer config={healthConfig} className="w-full h-full">
      <AreaChart
        data={chartData}
        margin={{ top: 12, right: 16, left: 0, bottom: 4 }}
      >
        <defs>
          <linearGradient id="painGradMLR" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(263 70% 50%)" stopOpacity={0.35} />
            <stop offset="95%" stopColor="hsl(263 70% 50%)" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="2 6" className="stroke-border/15" />
        <XAxis dataKey="year" tickLine={false} axisLine={false} className="text-xs fill-muted-foreground" />
        <YAxis tickLine={false} axisLine={false} className="text-xs fill-muted-foreground" tickFormatter={(v: number) => `${v}%`} domain={["auto", "auto"]} />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value) => {
                const v = value as number;
                return `MLR: ${v.toFixed(1)}% (${(100 - v).toFixed(1)}% admin margin)`;
              }}
            />
          }
        />
        <ReferenceLine y={85} stroke="var(--muted-foreground)" strokeDasharray="4 4" strokeWidth={1} label={{ value: "ACA 85%", position: "insideTopRight", className: "text-[10px] fill-muted-foreground" }} />
        {sectorAvg != null && (
          <ReferenceLine
            y={sectorAvg}
            stroke="var(--chart-3)"
            strokeDasharray="6 3"
            strokeWidth={1.5}
            label={{
              value: `Sector Avg ${sectorAvg.toFixed(1)}%`,
              position: "insideTopRight",
              className: "text-[11px] fill-foreground/70 font-mono",
            }}
          />
        )}
        <Area type="monotone" dataKey="medical_loss_ratio" stroke="hsl(263 70% 50%)" fill="url(#painGradMLR)" strokeWidth={2} />
      </AreaChart>
    </ChartContainer>
  );
}

function ROEChart({
  timeseries,
  sectorAvg,
}: {
  timeseries: Record<string, TimeseriesPoint[]>;
  sectorAvg: number | null;
}) {
  const roeData = (timeseries["roe"] ?? [])
    .filter((p) => p.fiscal_quarter == null)
    .sort((a, b) => a.fiscal_year - b.fiscal_year);

  const chartData = roeData.map((d) => ({
    year: `FY${d.fiscal_year}`,
    roe: d.value,
  }));

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
        No ROE data available.
      </div>
    );
  }

  return (
    <ChartContainer config={roeConfig} className="w-full h-full">
      <AreaChart
        data={chartData}
        margin={{ top: 12, right: 16, left: 0, bottom: 4 }}
      >
        <defs>
          <linearGradient id="painGradROE" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.35} />
            <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="2 6" className="stroke-border/15" />
        <XAxis dataKey="year" tickLine={false} axisLine={false} className="text-xs fill-muted-foreground" />
        <YAxis tickLine={false} axisLine={false} className="text-xs fill-muted-foreground" tickFormatter={(v: number) => `${v.toFixed(0)}%`} />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value) => `ROE: ${(value as number).toFixed(1)}%`}
            />
          }
        />
        {sectorAvg != null && (
          <ReferenceLine
            y={sectorAvg}
            stroke="var(--chart-3)"
            strokeDasharray="6 3"
            strokeWidth={1.5}
            label={{
              value: `Sector Avg ${sectorAvg.toFixed(1)}%`,
              position: "insideTopRight",
              className: "text-[11px] fill-foreground/70 font-mono",
            }}
          />
        )}
        <Area type="monotone" dataKey="roe" stroke="var(--chart-1)" fill="url(#painGradROE)" strokeWidth={2} />
      </AreaChart>
    </ChartContainer>
  );
}
