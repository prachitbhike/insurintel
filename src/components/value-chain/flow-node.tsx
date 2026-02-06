import { formatCurrency } from "@/lib/metrics/formatters";
import { cn } from "@/lib/utils";

interface FlowNodeProps {
  label: string;
  amount: number | null;
  desc: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  color?: string;
  onClick?: () => void;
}

export function FlowNode({
  label,
  amount,
  desc,
  x,
  y,
  width = 160,
  height = 70,
  color = "var(--chart-1)",
  onClick,
}: FlowNodeProps) {
  return (
    <g
      transform={`translate(${x}, ${y})`}
      className={cn("cursor-pointer", onClick && "hover:opacity-80")}
      onClick={onClick}
    >
      <rect
        width={width}
        height={height}
        rx={8}
        fill="var(--card)"
        stroke={color}
        strokeWidth={2}
        className="transition-colors"
      />
      <text
        x={width / 2}
        y={22}
        textAnchor="middle"
        className="fill-foreground text-[11px] font-semibold"
      >
        {label}
      </text>
      <text
        x={width / 2}
        y={42}
        textAnchor="middle"
        className="fill-foreground text-[13px] font-bold font-mono"
      >
        {amount != null ? formatCurrency(amount) : "—"}
      </text>
      <text
        x={width / 2}
        y={58}
        textAnchor="middle"
        className="fill-muted-foreground text-[9px]"
      >
        {desc}
      </text>
    </g>
  );
}
