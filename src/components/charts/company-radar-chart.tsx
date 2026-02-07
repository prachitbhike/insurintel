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

export interface RadarDimension {
  key: string;
  label: string;
  invert: boolean;
}

export interface RadarPeer {
  ticker: string;
  metrics: Record<string, number | null>;
}

interface CompanyRadarChartProps {
  focalTicker: string;
  peers: RadarPeer[];
  dimensions: RadarDimension[];
  sectorAvg?: Record<string, number | null>;
}

const PEER_COLORS = [
  "hsl(217 91% 60%)",
  "hsl(45 93% 47%)",
  "hsl(160 84% 39%)",
  "hsl(350 89% 60%)",
  "hsl(263 70% 50%)",
];

const FOCAL_COLOR = "var(--chart-1)";

function normalize(
  value: number | null,
  allValues: (number | null)[],
  invert: boolean,
): number {
  const valid = allValues.filter((v): v is number => v != null);
  if (valid.length === 0 || value == null) return 50;
  const min = Math.min(...valid);
  const max = Math.max(...valid);
  if (max === min) return 50;
  const norm = ((value - min) / (max - min)) * 100;
  return invert ? 100 - norm : norm;
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{
    value: number;
    name: string;
    payload: { dimension: string };
  }>;
}) {
  if (!active || !payload?.length) return null;
  const dimension = payload[0]?.payload?.dimension;
  return (
    <div className="rounded-lg border bg-background p-2.5 shadow-md text-xs space-y-1">
      <p className="font-medium">{dimension}</p>
      {payload.map((p) => (
        <p key={p.name}>
          <span className="font-mono">{p.name}:</span> {p.value.toFixed(0)}
        </p>
      ))}
    </div>
  );
}

const chartConfig: ChartConfig = {};

export function CompanyRadarChart({
  focalTicker,
  peers,
  dimensions,
}: CompanyRadarChartProps) {
  if (peers.length === 0 || dimensions.length === 0) return null;

  // Build radar data: one entry per dimension
  const radarData = dimensions.map((dim) => {
    const allValues = peers.map((p) => p.metrics[dim.key] ?? null);
    const entry: Record<string, string | number> = {
      dimension: dim.label,
    };
    for (const peer of peers) {
      const raw = peer.metrics[dim.key] ?? null;
      entry[peer.ticker] = normalize(raw, allValues, dim.invert);
    }
    return entry;
  });

  return (
    <ChartContainer
      config={chartConfig}
      className="w-full"
      style={{ height: 320 }}
    >
      <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
        <PolarGrid className="stroke-border/15" />
        <PolarAngleAxis
          dataKey="dimension"
          className="text-[10px] fill-muted-foreground"
          tick={{ fontSize: 10 }}
        />
        <PolarRadiusAxis
          angle={90}
          domain={[0, 100]}
          tick={false}
          axisLine={false}
        />
        <ChartTooltip content={<CustomTooltip />} />
        {peers.map((peer, i) => {
          const isFocal = peer.ticker === focalTicker;
          return (
            <Radar
              key={peer.ticker}
              name={peer.ticker}
              dataKey={peer.ticker}
              stroke={isFocal ? FOCAL_COLOR : PEER_COLORS[i % PEER_COLORS.length]}
              fill={isFocal ? FOCAL_COLOR : PEER_COLORS[i % PEER_COLORS.length]}
              fillOpacity={isFocal ? 0.25 : 0.05}
              strokeWidth={isFocal ? 3 : 1.5}
            />
          );
        })}
        <Legend
          wrapperStyle={{ fontSize: 11, fontFamily: "var(--font-mono)" }}
        />
      </RadarChart>
    </ChartContainer>
  );
}
