"use client";

import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Legend,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart";

export interface ReinsuranceRadarItem {
  ticker: string;
  name: string;
  combinedRatio: number | null;
  lossRatio: number | null;
  expenseRatio: number | null;
  roe: number | null;
  premiumGrowth: number | null;
}

interface ReinsuranceRadarChartProps {
  data: ReinsuranceRadarItem[];
}

const COLORS = [
  "hsl(45 93% 47%)",   // amber
  "var(--positive)",  // emerald
  "hsl(217 91% 60%)",  // blue
  "var(--negative)",    // red
];

const DIMENSIONS = [
  { key: "combinedRatio", label: "CR Discipline", invert: true },
  { key: "lossRatio", label: "Loss Selection", invert: true },
  { key: "expenseRatio", label: "Expense Control", invert: true },
  { key: "roe", label: "ROE", invert: false },
  { key: "premiumGrowth", label: "Growth", invert: false },
] as const;

function normalize(
  value: number | null,
  allValues: (number | null)[],
  invert: boolean
): number {
  const valid = allValues.filter((v): v is number => v != null);
  if (valid.length === 0 || value == null) return 50;
  const min = Math.min(...valid);
  const max = Math.max(...valid);
  if (max === min) return 50;
  const norm = ((value - min) / (max - min)) * 100;
  return invert ? 100 - norm : norm;
}

const chartConfig: ChartConfig = {};

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ value: number; name: string; dataKey: string; payload: { dimension: string } }> }) {
  if (!active || !payload?.length) return null;
  const dimension = payload[0]?.payload?.dimension;
  return (
    <div className="rounded-lg border bg-background p-2.5 shadow-md text-xs space-y-1">
      <p className="font-medium">{dimension}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.name ? undefined : undefined }}>
          <span className="font-mono">{p.name}:</span> {p.value.toFixed(0)}
        </p>
      ))}
    </div>
  );
}

export function ReinsuranceRadarChart({ data }: ReinsuranceRadarChartProps) {
  if (data.length === 0) return null;

  // Build radar-shaped data: one entry per dimension, with a key per company
  const radarData = DIMENSIONS.map((dim) => {
    const allValues = data.map(
      (d) => d[dim.key as keyof ReinsuranceRadarItem] as number | null
    );
    const entry: Record<string, string | number> = {
      dimension: dim.label,
    };
    for (const company of data) {
      const raw = company[dim.key as keyof ReinsuranceRadarItem] as number | null;
      entry[company.ticker] = normalize(raw, allValues, dim.invert);
    }
    return entry;
  });

  return (
    <ChartContainer config={chartConfig} className="w-full" style={{ height: 380 }}>
      <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
        <PolarGrid className="stroke-border/15" />
        <PolarAngleAxis
          dataKey="dimension"
          className="text-[11px] fill-muted-foreground"
          tick={{ fontSize: 11 }}
        />
        <PolarRadiusAxis
          angle={90}
          domain={[0, 100]}
          tick={false}
          axisLine={false}
        />
        <ChartTooltip content={<CustomTooltip />} />
        {data.map((company, i) => (
          <Radar
            key={company.ticker}
            name={company.ticker}
            dataKey={company.ticker}
            stroke={COLORS[i % COLORS.length]}
            fill={COLORS[i % COLORS.length]}
            fillOpacity={0.15}
            strokeWidth={2}
          />
        ))}
        <Legend
          wrapperStyle={{ fontSize: 11, fontFamily: "var(--font-mono)" }}
        />
      </RadarChart>
    </ChartContainer>
  );
}
