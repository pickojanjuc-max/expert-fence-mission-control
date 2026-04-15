import React from "react";
import { buildLayoutSequence } from "@/lib/solverEngine";

const PANEL_COLOR = "#3b82f6";
const PANEL_STROKE = "#1d4ed8";
const GATE_COLOR = "#ef4444";
const GATE_STROKE = "#b91c1c";
const GAP_COLOR = "#94a3b8";
const END_GAP_COLOR = "#f59e0b";
const DIM_LINE_COLOR = "#cbd5e1";

export default function RunPreview({
  widths,
  internalGap,
  startGap,
  endGap,
  useStart,
  useEnd,
  gateOpening,
  gateWidth = 0,
  hingeAllow = 0,
  latchAllow = 0,
  gatePlacement = "centre",
  endSide = "end",
  gateAfterPanel = 1,
}) {
  const seq = buildLayoutSequence(
    widths, internalGap, startGap, endGap,
    useStart, useEnd, gateOpening,
    gatePlacement, endSide, gateAfterPanel,
    gateWidth, hingeAllow, latchAllow
  );

  const totalValue = seq.reduce((a, s) => a + s.value, 0) || 1;
  const svgW = 900;
  const svgH = 110;
  const padX = 12;
  const usable = svgW - padX * 2;
  const scale = usable / totalValue;

  const PANEL_Y = 20;
  const PANEL_H = 28;
  const BASELINE_Y = PANEL_Y + PANEL_H;        // 48
  const DIM_Y = BASELINE_Y + 16;               // 64 — dim tick base
  const LABEL_Y = DIM_Y + 14;                  // 78 — gap label

  let x = padX;
  const elements = seq.map((item, i) => {
    const w = Math.max(item.value * scale, 3);
    const el = { ...item, x, w, idx: i };
    x += w;
    return el;
  });

  return (
    <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-auto" style={{ maxHeight: 120 }}>
      {/* Baseline */}
      <line x1={padX} y1={BASELINE_Y} x2={svgW - padX} y2={BASELINE_Y}
        stroke={DIM_LINE_COLOR} strokeWidth={1.5} />

      {elements.map((el) => {
        const cx = el.x + el.w / 2;

        if (el.kind === "PANEL") {
          return (
            <g key={el.idx}>
              <rect x={el.x} y={PANEL_Y} width={el.w} height={PANEL_H}
                rx={2} fill={PANEL_COLOR} stroke={PANEL_STROKE} strokeWidth={0.8} opacity={0.92} />
              {el.w > 18 && (
                <text x={cx} y={PANEL_Y + PANEL_H / 2 + 1} textAnchor="middle"
                  dominantBaseline="middle" fontSize={el.w > 50 ? "10" : "8"}
                  fontWeight="600" fill="white">
                  {Math.round(el.value)}
                </text>
              )}
            </g>
          );
        }

        if (el.kind === "GATE") {
          return (
            <g key={el.idx}>
              <rect x={el.x} y={PANEL_Y - 3} width={el.w} height={PANEL_H + 6}
                rx={3} fill={GATE_COLOR} stroke={GATE_STROKE} strokeWidth={1} opacity={0.9} />
              {el.w > 28 && (
                <text x={cx} y={PANEL_Y + PANEL_H / 2 + 1} textAnchor="middle"
                  dominantBaseline="middle" fontSize={el.w > 60 ? "9" : "7"}
                  fontWeight="700" fill="white">
                  {el.w > 60 ? `GATE ${Math.round(el.value)}` : "G"}
                </text>
              )}
            </g>
          );
        }

        // GAP / START_GAP / END_GAP
        const isEndGap = el.kind === "START_GAP" || el.kind === "END_GAP";
        const color = isEndGap ? END_GAP_COLOR : GAP_COLOR;
        const tickH = isEndGap ? 10 : 7;

        return (
          <g key={el.idx}>
            {/* Dim tick lines */}
            <line x1={el.x} y1={DIM_Y - tickH} x2={el.x} y2={DIM_Y + 2}
              stroke={color} strokeWidth={1} />
            <line x1={el.x + el.w} y1={DIM_Y - tickH} x2={el.x + el.w} y2={DIM_Y + 2}
              stroke={color} strokeWidth={1} />
            {/* Dim arrow line */}
            {el.w > 4 && (
              <line x1={el.x} y1={DIM_Y} x2={el.x + el.w} y2={DIM_Y}
                stroke={color} strokeWidth={1} strokeDasharray={isEndGap ? "none" : "2,2"} />
            )}
            {/* Label */}
            {el.w > 10 && (
              <text x={cx} y={LABEL_Y} textAnchor="middle"
                fontSize={isEndGap ? "8.5" : "8"} fontWeight={isEndGap ? "700" : "400"}
                fill={color}>
                {Math.round(el.value)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}