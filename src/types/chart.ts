export interface ChartDataPoint {
  label: string;
  [key: string]: string | number | null;
}

export interface ChartConfig {
  [key: string]: {
    label: string;
    color: string;
  };
}

export interface SparklineData {
  values: number[];
  labels: string[];
}
