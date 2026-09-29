/**
 * Score over time as an inline SVG line: one hue, 2px stroke, 8px markers, baseline grid only.
 * Each point carries a native tooltip; the table beside it is the accessible view.
 */
export interface TrendPoint {
  id: string;
  label: string;
  value: number;
}

export function TrendChart({ points, max = 10 }: { points: TrendPoint[]; max?: number }) {
  if (points.length < 2) {
    return <p className="text-muted-foreground text-sm">A trend needs at least two scored calls.</p>;
  }
  const w = 640;
  const h = 200;
  const padX = 12;
  const padY = 14;
  const x = (i: number) => padX + (i / (points.length - 1)) * (w - padX * 2);
  const y = (v: number) => h - padY - (v / max) * (h - padY * 2);
  const d = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full" role="img" aria-label="Score over time">
      {[2.5, 5, 7.5].map((g) => (
        <g key={g}>
          <line x1={padX} x2={w - padX} y1={y(g)} y2={y(g)} className="stroke-border" strokeWidth={1} />
          <text x={w - padX} y={y(g) - 4} textAnchor="end" className="fill-muted-foreground font-mono text-[10px]">
            {g}
          </text>
        </g>
      ))}
      <line x1={padX} x2={w - padX} y1={y(0)} y2={y(0)} className="stroke-border" strokeWidth={1} />
      <path d={d} fill="none" className="stroke-foreground" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => (
        <g key={p.id}>
          <circle cx={x(i)} cy={y(p.value)} r={4} className="fill-foreground stroke-card" strokeWidth={2} />
          <circle cx={x(i)} cy={y(p.value)} r={12} fill="transparent">
            <title>
              {p.label}: {p.value.toFixed(1)}
            </title>
          </circle>
        </g>
      ))}
    </svg>
  );
}
