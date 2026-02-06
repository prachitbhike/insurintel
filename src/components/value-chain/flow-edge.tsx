interface FlowEdgeProps {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color?: string;
  animated?: boolean;
}

export function FlowEdge({
  x1,
  y1,
  x2,
  y2,
  color = "var(--border)",
  animated = false,
}: FlowEdgeProps) {
  const midX = (x1 + x2) / 2;

  const d = `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;

  return (
    <>
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeOpacity={0.4}
      />
      {animated && (
        <circle r={3} fill={color} opacity={0.8}>
          <animateMotion dur="3s" repeatCount="indefinite" path={d} />
        </circle>
      )}
    </>
  );
}
