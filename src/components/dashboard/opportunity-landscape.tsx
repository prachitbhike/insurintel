"use client";

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  ReferenceLine,
  Label,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { type LandscapePoint } from "@/lib/metrics/landscape";
import { type LandscapeConfig } from "@/lib/data/sector-landscape-config";
import { formatMetricValue } from "@/lib/metrics/formatters";

interface OpportunityLandscapeProps {
  points: LandscapePoint[];
  avgX: number;
  avgY: number;
  config: LandscapeConfig;
  sectorName: string;
}

const chartConfig = {
  x: { label: "X Axis", color: "var(--chart-1)" },
  y: { label: "Y Axis", color: "var(--chart-2)" },
} satisfies ChartConfig;

function getScoreColor(score: number | null): string {
  if (score == null) return "var(--muted-foreground)";
  if (score >= 70) return "hsl(142 71% 45%)"; // emerald
  if (score >= 40) return "hsl(48 96% 53%)"; // yellow
  return "hsl(0 84% 60%)"; // red
}

function CustomDot(props: Record<string, unknown>) {
  const { cx, cy, payload } = props as {
    cx: number;
    cy: number;
    payload: LandscapePoint;
  };
  if (cx == null || cy == null) return null;

  const color = getScoreColor(payload.score);

  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r={8}
        fill={color}
        fillOpacity={0.6}
        stroke={color}
        strokeWidth={1.5}
      />
      <text
        x={cx + 12}
        y={cy + 3}
        fontSize={10}
        fontFamily="var(--font-mono, monospace)"
        fontWeight={600}
        fill="currentColor"
        className="fill-foreground"
      >
        {payload.ticker}
      </text>
    </g>
  );
}

function CustomTooltipContent({
  active,
  payload,
  config,
}: {
  active?: boolean;
  payload?: Array<{ payload: LandscapePoint }>;
  config: LandscapeConfig;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;

  return (
    <div className="rounded-lg border bg-background px-3 py-2 shadow-lg text-xs space-y-1">
      <p className="font-semibold">
        {p.ticker} <span className="font-normal text-muted-foreground">{p.name}</span>
      </p>
      <p>
        {config.xLabel}: <span className="font-mono">{formatMetricValue(config.xMetric, p.x)}</span>
      </p>
      <p>
        {config.yLabel}: <span className="font-mono">{formatMetricValue(config.yMetric, p.y)}</span>
      </p>
      {p.z != null && (
        <p>
          {config.zLabel}: <span className="font-mono">{formatMetricValue(config.zMetric, p.z)}</span>
        </p>
      )}
      {p.score != null && (
        <p>
          Score: <span className="font-mono font-semibold">{p.score}</span>
        </p>
      )}
    </div>
  );
}

export function OpportunityLandscape({
  points,
  avgX,
  avgY,
  config,
  sectorName,
}: OpportunityLandscapeProps) {
  if (points.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-display tracking-tight">
          Opportunity Landscape
        </CardTitle>
        <CardDescription className="text-xs">
          {sectorName} companies mapped by operational pain (X) vs momentum (Y). Bubble color = prospect score.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="w-full" style={{ height: 360 }}>
          <ScatterChart margin={{ top: 16, right: 48, bottom: 24, left: 16 }}>
            <XAxis
              type="number"
              dataKey="x"
              name={config.xLabel}
              tickLine={false}
              axisLine={{ className: "stroke-border" }}
              className="text-[10px] fill-muted-foreground"
              tickMargin={8}
            >
              <Label
                value={config.xLabel}
                position="bottom"
                offset={8}
                className="text-[11px] fill-muted-foreground"
              />
            </XAxis>
            <YAxis
              type="number"
              dataKey="y"
              name={config.yLabel}
              tickLine={false}
              axisLine={{ className: "stroke-border" }}
              className="text-[10px] fill-muted-foreground"
              tickMargin={4}
            >
              <Label
                value={config.yLabel}
                angle={-90}
                position="insideLeft"
                offset={-4}
                className="text-[11px] fill-muted-foreground"
              />
            </YAxis>
            <ZAxis
              type="number"
              dataKey="z"
              range={[80, 600]}
              name={config.zLabel}
            />
            <ReferenceLine
              x={avgX}
              strokeDasharray="4 4"
              className="stroke-border"
            >
              <Label
                value={config.quadrants.topLeft}
                position="insideTopLeft"
                className="text-[10px] fill-muted-foreground/60"
                offset={8}
              />
              <Label
                value={config.quadrants.topRight}
                position="insideTopRight"
                className="text-[10px] fill-muted-foreground/60"
                offset={8}
              />
            </ReferenceLine>
            <ReferenceLine
              y={avgY}
              strokeDasharray="4 4"
              className="stroke-border"
            >
              <Label
                value={config.quadrants.bottomLeft}
                position="insideBottomLeft"
                className="text-[10px] fill-muted-foreground/60"
                offset={8}
              />
              <Label
                value={config.quadrants.bottomRight}
                position="insideBottomRight"
                className="text-[10px] fill-muted-foreground/60"
                offset={8}
              />
            </ReferenceLine>
            <ChartTooltip
              content={
                <CustomTooltipContent
                  config={config}
                />
              }
            />
            <Scatter
              data={points}
              shape={<CustomDot />}
            />
          </ScatterChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
