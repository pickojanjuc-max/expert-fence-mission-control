import React from "react";

export default function ProjectPreview({ runs }) {
  if (!runs || runs.length === 0) return null;
  const total = runs.reduce((a, r) => a + (r.length || 0), 0) || 1;
  const svgWidth = 800;
  const svgHeight = 80;
  const padding = 20;
  const usable = svgWidth - padding * 2;
  const gapPx = 12;
  const totalGaps = (runs.length - 1) * gapPx;
  const scale = (usable - totalGaps) / total;

  let x = padding;
  const segments = runs.map((r, i) => {
    const w = Math.max(r.length * scale, 30);
    const seg = { x, w, label: `Run ${String.fromCharCode(65 + i)}`, length: r.length };
    x += w + gapPx;
    return seg;
  });

  return (
    <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto" style={{ maxHeight: 80 }}>
      {segments.map((s, i) => (
        <g key={i}>
          <rect x={s.x} y={28} width={s.w} height={8} rx={4} fill="hsl(var(--primary))" opacity={0.85} />
          <text x={s.x + s.w / 2} y={22} textAnchor="middle" fontSize="11" fontWeight="600" fill="hsl(var(--foreground))">
            {s.label}
          </text>
          <text x={s.x + s.w / 2} y={54} textAnchor="middle" fontSize="10" fill="hsl(var(--muted-foreground))">
            {s.length}mm
          </text>
        </g>
      ))}
    </svg>
  );
}