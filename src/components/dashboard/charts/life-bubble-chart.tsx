"use client";

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
import { formatCurrency } from "@/lib/metrics/formatters";

export interface LifeBubbleItem {
  ticker: string;
  name: string;
  totalAssets: number;
  roe: number;
  netIncome: number | null;
  score: number | null;
}

interface LifeBubbleChartProps {
  data: LifeBubbleItem[];
  avgAssets: number;
  avgRoe: number;
}

const chartConfig = {
  bubble: {
    label: "Company",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

function scoreToColor(score: number | null): string {
  if (score == null) return "hsl(var(--muted-foreground))";
  if (score >= 70) return "var(--positive)";
  if (score >= 40) return "hsl(45 93% 47%)";
  return "var(--negative)";
}

function CustomDot(props: Record<string, unknown>) {
  const { cx, cy, payload } = props as {
    cx: number;
    cy: number;
    payload: LifeBubbleItem;
  };
  if (!cx || !cy) return null;

  const color = scoreToColor(payload.score);
  const r = payload.netIncome != null
    ? Math.max(8, Math.min(28, Math.sqrt(Math.abs(payload.netIncome) / 1e7)))
    : 12;

  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={color} fillOpacity={0.6} stroke={color} strokeWidth={1.5} />
      <text
        x={cx}
        y={cy - r - 4}
        textAnchor="middle"
        className="fill-foreground text-[10px] font-mono font-medium"
      >
        {payload.ticker}
      </text>
    </g>
  );
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: LifeBubbleItem }> }) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border bg-background p-2.5 shadow-md text-xs space-y-1">
      <p className="font-mono font-bold">{d.ticker} <span className="font-normal text-muted-foreground">{d.name}</span></p>
      <p>Total Assets: {formatCurrency(d.totalAssets)}</p>
      <p>ROE: {d.roe.toFixed(1)}%</p>
      {d.netIncome != null && <p>Net Income: {formatCurrency(d.netIncome)}</p>}
      {d.score != null && <p>Score: {d.score}/100</p>}
    </div>
  );
}

export function LifeBubbleChart({ data, avgAssets, avgRoe }: LifeBubbleChartProps) {
  if (data.length === 0) return null;

  const zRange: [number, number] = [200, 2500];

  return (
    <ChartContainer config={chartConfig} className="w-full" style={{ height: 380 }}>
      <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
        <CartesianGrid strokeDasharray="2 6" className="stroke-border/15" />
        <XAxis
          type="number"
          dataKey="totalAssets"
          tickLine={false}
          axisLine={false}
          className="text-[10px] fill-muted-foreground"
          tickFormatter={(v: number) => formatCurrency(v)}
        >
          <Label value="Total Assets" position="bottom" offset={0} className="text-[11px] fill-muted-foreground" />
        </XAxis>
        <YAxis
          type="number"
          dataKey="roe"
          tickLine={false}
          axisLine={false}
          className="text-[10px] fill-muted-foreground"
          tickFormatter={(v: number) => `${v.toFixed(0)}%`}
        >
          <Label value="ROE (%)" angle={-90} position="insideLeft" offset={10} className="text-[11px] fill-muted-foreground" />
        </YAxis>
        <ZAxis
          type="number"
          dataKey="netIncome"
          range={zRange}
        />
        {avgAssets > 0 && (
          <ReferenceLine
            x={avgAssets}
            strokeDasharray="4 4"
            className="stroke-muted-foreground/40"
          />
        )}
        {avgRoe !== 0 && (
          <ReferenceLine
            y={avgRoe}
            strokeDasharray="4 4"
            className="stroke-muted-foreground/40"
          />
        )}
        <ChartTooltip content={<CustomTooltip />} />
        <Scatter
          data={data}
          shape={<CustomDot />}
        />
      </ScatterChart>
    </ChartContainer>
  );
}
