import { type Sector } from "@/types/database";
import { LANDSCAPE_CONFIG } from "@/lib/data/sector-landscape-config";

export interface LandscapePoint {
  ticker: string;
  name: string;
  x: number | null;
  y: number | null;
  z: number | null;
  score: number | null;
}

export function computeLandscapeData(
  sectorName: Sector,
  companies: { id: string; ticker: string; name: string; sector: Sector }[],
  latestMetrics: Record<string, Record<string, number>>,
  scores: Map<string, { totalScore: number | null }>
): { points: LandscapePoint[]; avgX: number; avgY: number } {
  const config = LANDSCAPE_CONFIG[sectorName];
  if (!config) return { points: [], avgX: 0, avgY: 0 };

  const sectorCompanies = companies.filter((c) => c.sector === sectorName);

  const points: LandscapePoint[] = [];
  const xValues: number[] = [];
  const yValues: number[] = [];

  for (const c of sectorCompanies) {
    const metrics = latestMetrics[c.id];
    if (!metrics) continue;

    const x = metrics[config.xMetric] ?? null;
    const y = metrics[config.yMetric] ?? null;
    const z = metrics[config.zMetric] ?? null;
    const scoreEntry = scores.get(c.id);

    if (x != null) xValues.push(x);
    if (y != null) yValues.push(y);

    // Only include points that have at least x and y
    if (x != null && y != null) {
      points.push({
        ticker: c.ticker,
        name: c.name,
        x,
        y,
        z,
        score: scoreEntry?.totalScore ?? null,
      });
    }
  }

  const avgX =
    xValues.length > 0
      ? xValues.reduce((s, v) => s + v, 0) / xValues.length
      : 0;
  const avgY =
    yValues.length > 0
      ? yValues.reduce((s, v) => s + v, 0) / yValues.length
      : 0;

  return { points, avgX, avgY };
}
