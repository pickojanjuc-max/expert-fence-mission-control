import React from "react";
import { buildLayoutSequence } from "@/lib/solverEngine";

// ─── Canvas ────────────────────────────────────────────────────────────────────
const SVG_W = 900;
const SVG_H = 620;

// ─── Geometry constants ────────────────────────────────────────────────────────
const PANEL_DEPTH  = 6;    // glass panel visual thickness in top-down view (px)
const GATE_DEPTH   = 6;    // gate same thickness as panel
const SPIGOT_W     = 4;    // spigot footprint width (along run)
const SPIGOT_H     = 12;   // spigot footprint depth (perpendicular)
const SPIGOT_INSET = 20;   // from panel end to spigot centre (run direction, px)

// ─── Colour palette ────────────────────────────────────────────────────────────
const C = {
  glassFill:    "#1e3a5f",
  glassStroke:  "#1e3a5f",
  gateFill:     "#f59e0b",
  gateStroke:   "#f59e0b",
  spigotBase:   "#1e293b",
  spigotPin:    "#1e293b",
  poolFill:     "transparent",
  poolStroke:   "transparent",
  poolBand:     "transparent",
  gapFill:      "rgba(245,158,11,0.10)",
  gapStroke:    "#d97706",
  hingeFill:    "rgba(59,130,246,0.08)",
  hingeStroke:  "#3b82f6",
  latchFill:    "rgba(239,68,68,0.08)",
  latchStroke:  "#ef4444",
  dim:          "#64748b",
  label:        "#1e293b",
  swing:        "rgba(245,158,11,0.10)",
  swingStroke:  "#f59e0b",
};

// ─── Scale helper ──────────────────────────────────────────────────────────────
function useScale(runs, shape) {
  if (!runs || runs.length === 0) return {};
  const runA = runs[0]?.length || 1000;
  const runB = runs[1]?.length || runA;
  const margin = 110;
  const availW = SVG_W - margin * 2;
  const availH = SVG_H - margin * 2;
  let scale, poolW, poolH;
  if (shape === "Straight") {
    const straightRuns = runs.slice(0, 4);
    const longest = Math.max(...straightRuns.map((r) => Number(r?.length || 0)), runA);
    poolW = availW;
    poolH = Math.min(availH * 0.55, 260);
    scale = poolW / Math.max(longest, 1);
  } else {
    const scaleByW = availW / runA;
    const scaleByH = availH / runB;
    scale = Math.min(scaleByW, scaleByH);
    poolW = runA * scale;
    poolH = runB * scale;
  }
  const poolX = (SVG_W - poolW) / 2;
  const poolY = (SVG_H - poolH) / 2;
  return { scale, poolW, poolH, poolX, poolY };
}

// ─── Spigot component ──────────────────────────────────────────────────────────
// Circular base plate + pin — represents real spigot footprint in top-down view.
function Spigots({ x, y, w, vertical }) {
  if (vertical) {
    const cx = x + PANEL_DEPTH / 2;
    return (
      <g>
        {[y + SPIGOT_INSET, y + w - SPIGOT_INSET].map((cy, i) => (
          <rect
            key={i}
            x={cx - SPIGOT_H / 2}
            y={cy - SPIGOT_W / 2}
            width={SPIGOT_H}
            height={SPIGOT_W}
            rx={1}
            fill={C.spigotBase}
            stroke="#111827"
            strokeWidth={0.5}
          />
        ))}
      </g>
    );
  }
  const cy = y + PANEL_DEPTH / 2;
  return (
    <g>
      {[x + SPIGOT_INSET, x + w - SPIGOT_INSET].map((cx, i) => (
        <rect
          key={i}
          x={cx - SPIGOT_W / 2}
          y={cy - SPIGOT_H / 2}
          width={SPIGOT_W}
          height={SPIGOT_H}
          rx={1}
          fill={C.spigotBase}
          stroke="#111827"
          strokeWidth={0.5}
        />
      ))}
    </g>
  );
}

// ─── Dimension line ────────────────────────────────────────────────────────────
function DimLine({ x1, y1, x2, y2, label, vertical }) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={C.dim} strokeWidth={0.8} />
      {vertical ? (
        <>
          <line x1={x1 - 4} y1={y1} x2={x1 + 4} y2={y1} stroke={C.dim} strokeWidth={0.8} />
          <line x1={x2 - 4} y1={y2} x2={x2 + 4} y2={y2} stroke={C.dim} strokeWidth={0.8} />
          <text x={mx - 10} y={my} textAnchor="middle" dominantBaseline="middle"
            fontSize={10} fill={C.dim} fontFamily="Inter, sans-serif" fontWeight="500"
            transform={`rotate(-90, ${mx - 10}, ${my})`}
            stroke="white" strokeWidth={2.5} paintOrder="stroke">
            {label}
          </text>
        </>
      ) : (
        <>
          <line x1={x1} y1={y1 - 4} x2={x1} y2={y1 + 4} stroke={C.dim} strokeWidth={0.8} />
          <line x1={x2} y1={y2 - 4} x2={x2} y2={y2 + 4} stroke={C.dim} strokeWidth={0.8} />
          <text x={mx} y={my - 10} textAnchor="middle" dominantBaseline="middle"
            fontSize={10} fill={C.dim} fontFamily="Inter, sans-serif" fontWeight="500"
            stroke="white" strokeWidth={2.5} paintOrder="stroke">
            {label}
          </text>
        </>
      )}
    </g>
  );
}

// ─── Panel/gap label with white halo for legibility ────────────────────────────
function FloatLabel({ x, y, text, anchor = "middle", size = 11 }) {
  return (
    <text x={x} y={y} textAnchor={anchor} dominantBaseline="middle"
      fontSize={size} fill={C.label} fontFamily="Inter, sans-serif" fontWeight="600"
      stroke="white" strokeWidth={3} paintOrder="stroke">
      {text}
    </text>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function TopDownPreview({ runs, solvedRuns, shape, intersectionMap }) {
  const { scale, poolW, poolH, poolX, poolY } = useScale(runs, shape);
  if (!poolW) return null;

  // Render in three layers for correct z-ordering:
  //   backgrounds → fence elements → text labels
  const backgrounds = [];
  const elements    = [];
  const labels      = [];

  // ── Pool background for shaped layouts (L / U / Box) ──────────────────────
  if (shape !== "Straight") {
    // Keep shaped background neutral for v1.3.6-style parity.
  }

  // ── renderH: draw a horizontal run ────────────────────────────────────────
  function renderH(run, solved, runIdx, anchorY, flipLabel = false, labelPrefix = "Side") {
    if (!solved?.ok) return;
    const totalMM  = run.length;
    const svgTotal = totalMM * scale;
    const barY     = anchorY;
    const startX   = poolX;

    // No straight-run pool band in parity mode.

    // Dimension line
    const shouldFlipDim = labelPrefix === "Run" ? false : flipLabel;
    const dimY = shouldFlipDim ? barY + PANEL_DEPTH + 22 : barY - 22;
    elements.push(
      <DimLine key={`dimh-${runIdx}`}
        x1={startX} y1={dimY} x2={startX + svgTotal} y2={dimY}
        label={`${totalMM}mm`} />
    );

    // Build sequence — identical parameters to current version
    const useStart = solved.startGap > 0;
    const useEnd   = solved.endGap > 0;
    const gateAfterPanel     = solved.gateAfterPanel ?? run.gateAfterPanel;
    const effectiveEndSide   = solved?.effectiveEndSide || run.endSide || "end";
    const previewEndSide     = effectiveEndSide;
    const effectiveGatePlacement = solved.isCornerGate ? "end" : (run.gateOn ? run.gatePlacement : "none");

    const seq = buildLayoutSequence(
      solved.panelWidths, solved.internalGap, solved.startGap, solved.endGap,
      useStart, useEnd, solved.gateOpening,
      effectiveGatePlacement,
      previewEndSide, gateAfterPanel,
      run.gateWidth   || 0,
      run.hingeAllow  || 0,
      run.latchAllow  || 0
    );

    let curX     = startX;
    let panelIdx = 0;
    let gateX = null, gateWidth = null;

    // Panel dimension labels sit outside the spigot footprint
    const shouldFlipPanelLabel = labelPrefix === "Run" ? false : flipLabel;
    const labelOffsetY = shouldFlipPanelLabel
      ? -(PANEL_DEPTH / 2 + 6 + 11)
      :  (PANEL_DEPTH / 2 + 6 + 11);

    seq.forEach((item, i) => {
      const sw = item.value * scale;

      if (item.kind === "PANEL") {
        elements.push(
          <g key={`ph-${runIdx}-${panelIdx}`}>
            {/* Glass panel — translucent fill + strong edge */}
            <rect x={curX} y={barY} width={sw} height={PANEL_DEPTH}
              fill={C.glassFill} stroke={C.glassStroke} strokeWidth={1.2} rx={1} />
            {/* Spigot footprints */}
            <Spigots x={curX} y={barY} w={sw} />
            {/* Panel width label */}
            <FloatLabel x={curX + sw / 2} y={barY + PANEL_DEPTH / 2 + labelOffsetY}
              text={`${item.value}`} />
          </g>
        );
        panelIdx++;

      } else if (item.kind === "GATE") {
        gateX     = curX;
        gateWidth = sw;
        const shouldFlipGateLabel = labelPrefix === "Run" ? false : flipLabel;
        elements.push(
          <g key={`gate-h-${runIdx}-${i}`}>
            {/* Gate panel — amber */}
            <rect x={curX} y={barY} width={sw} height={GATE_DEPTH}
              fill={C.gateFill} stroke={C.gateStroke} strokeWidth={1.2} rx={1} />
            {/* Gate label */}
            <text x={curX + sw / 2}
              y={shouldFlipGateLabel ? barY - 6 - 10 : barY + GATE_DEPTH + 6 + 10}
              textAnchor="middle" dominantBaseline="middle"
              fontSize={8} fill={C.gateStroke} fontWeight="700" fontFamily="Inter, sans-serif"
              stroke="white" strokeWidth={2.5} paintOrder="stroke">
              GATE {item.value}mm
            </text>
          </g>
        );

      } else if (["START_GAP", "END_GAP", "GAP"].includes(item.kind)) {
        // Render panel/wall gaps as amber-tinted zones
        const gapW = Math.max(sw, 1.5);
        elements.push(
          <g key={`gap-h-${runIdx}-${i}`}>
            <rect x={curX} y={barY} width={gapW} height={PANEL_DEPTH}
              fill={C.gapFill} stroke={C.gapStroke} strokeWidth={0.5} strokeDasharray="2,2" />
            {/* Label only if gap is wide enough to read */}
            {sw > 20 && (
              <text x={curX + sw / 2} y={barY + PANEL_DEPTH / 2}
                textAnchor="middle" dominantBaseline="middle"
                fontSize={7} fill={C.gapStroke} fontWeight="700" fontFamily="Inter, sans-serif">
                {item.value}
              </text>
            )}
          </g>
        );

      } else if (["HINGE_GAP", "LATCH_GAP"].includes(item.kind)) {
        // Hinge and latch clearances — color-coded (blue/red) to show hardware rule
        const col  = item.kind === "HINGE_GAP" ? C.hingeStroke : C.latchStroke;
        const fill = item.kind === "HINGE_GAP" ? C.hingeFill   : C.latchFill;
        const gapW = Math.max(sw, 2);
        elements.push(
          <rect key={`gap-h-${runIdx}-${i}`}
            x={curX} y={barY} width={gapW} height={PANEL_DEPTH}
            fill={fill} stroke={col} strokeWidth={0.8} strokeDasharray="2,2" />
        );
      }

      curX += sw;
    });

    // Gate swing visualization — filled sweep + leaf line + dashed arc
    if (run.gateOn && gateX !== null && gateWidth !== null) {
      const gateLeafMM  = Number(run?.gateWidth || solved?.gateWidth || solved?.gateOpening || 0);
      const arcRadius   = Math.max(gateLeafMM * scale, gateWidth || 0);
      const wallHinge   = run?.hingeTo === "wall" && run?.latchBehaviour !== "post_or_wall";
      let hingeAtStart  = wallHinge ? (previewEndSide === "start") : (previewEndSide === "end");
      const hingePointX = hingeAtStart ? gateX : gateX + gateWidth;
      const latchSign   = hingeAtStart ? 1 : -1;
      const shouldFlipGate = labelPrefix === "Run" ? false : flipLabel;
      const perpSign    = shouldFlipGate ? -1 : 1;
      const leafEndX    = hingePointX;
      const leafEndY    = barY + perpSign * arcRadius;
      const latchEndX   = hingePointX + latchSign * arcRadius;
      const latchEndY   = barY;
      const sweepFlag   = (perpSign * latchSign === -1) ? 1 : 0;

      // Filled sweep area
      elements.push(
        <path key={`swing-fill-h-${runIdx}`}
          d={`M ${hingePointX} ${barY} L ${leafEndX} ${leafEndY} A ${arcRadius} ${arcRadius} 0 0 ${sweepFlag} ${latchEndX} ${latchEndY} Z`}
          fill={C.swing} stroke="none" />
      );
      // Gate leaf
      elements.push(
        <line key={`leaf-h-${runIdx}`}
          x1={hingePointX} y1={barY} x2={leafEndX} y2={leafEndY}
          stroke={C.swingStroke} strokeWidth={2} strokeLinecap="round" opacity={0.9} />
      );
      // Swing arc
      elements.push(
        <path key={`arc-h-${runIdx}`}
          d={`M ${leafEndX} ${leafEndY} A ${arcRadius} ${arcRadius} 0 0 ${sweepFlag} ${latchEndX} ${latchEndY}`}
          stroke={C.swingStroke} strokeWidth={1.5} strokeDasharray="5,3"
          fill="none" opacity={0.6} />
      );
    }

    // Run / Side label
    const sideX = startX + svgTotal / 2;
    const sideY = labelPrefix === "Run"
      ? barY - 6 - 44
      : (flipLabel ? barY - 6 - 58 : barY + PANEL_DEPTH + 6 + 56);
    const labelText = labelPrefix === "Run"
      ? `${labelPrefix} ${runIdx + 1}`
      : `Side ${String.fromCharCode(65 + runIdx)}`;
    labels.push(
      <text key={`lbl-h-${runIdx}`} x={sideX} y={sideY}
        textAnchor="middle" fontSize={12} fill={C.label} fontWeight="700"
        fontFamily="Inter, sans-serif">
        {labelText}
      </text>
    );
  }

  // ── renderV: draw a vertical run ──────────────────────────────────────────
  function renderV(run, solved, runIdx, anchorX, anchorY) {
    if (!solved?.ok) return;
    const totalMM  = run.length;
    const svgTotal = totalMM * scale;
    const startY   = anchorY - svgTotal;
    const barX     = anchorX;

    // Dimension line
    const dimX = barX - 22;
    elements.push(
      <DimLine key={`dimv-${runIdx}`}
        x1={dimX} y1={startY} x2={dimX} y2={anchorY}
        label={`${totalMM}mm`} vertical />
    );

    // Build sequence — identical parameters to current version
    const useStart = solved.startGap > 0;
    const useEnd   = solved.endGap > 0;
    const gateAfterPanel         = solved.gateAfterPanel ?? run.gateAfterPanel;
    const effectiveEndSide       = solved?.effectiveEndSide || run.endSide || "end";
    const effectiveGatePlacement = solved.isCornerGate ? "end" : (run.gateOn ? run.gatePlacement : "none");

    const seq = buildLayoutSequence(
      solved.panelWidths, solved.internalGap, solved.startGap, solved.endGap,
      useStart, useEnd, solved.gateOpening,
      effectiveGatePlacement,
      effectiveEndSide, gateAfterPanel,
      run.gateWidth   || 0,
      run.hingeAllow  || 0,
      run.latchAllow  || 0
    );

    let curY     = startY;
    let panelIdx = 0;
    let gateY = null, gateHeight = null;

    // Label offset: push outside the fence on the correct side
    const labelOffsetX = barX < SVG_W / 2
      ? -(PANEL_DEPTH / 2 + 6 + 11)
      :  (PANEL_DEPTH / 2 + 6 + 11);

    seq.forEach((item, i) => {
      const sh = item.value * scale;

      if (item.kind === "PANEL") {
        elements.push(
          <g key={`pv-${runIdx}-${panelIdx}`}>
            <rect x={barX} y={curY} width={PANEL_DEPTH} height={sh}
              fill={C.glassFill} stroke={C.glassStroke} strokeWidth={1.2} rx={1} />
            <Spigots x={barX} y={curY} w={sh} vertical />
            <FloatLabel
              x={barX + PANEL_DEPTH / 2 + labelOffsetX}
              y={curY + sh / 2}
              text={`${item.value}`} />
          </g>
        );
        panelIdx++;

      } else if (item.kind === "GATE") {
        gateY      = curY;
        gateHeight = sh;
        elements.push(
          <g key={`gate-v-${runIdx}-${i}`}>
            <rect x={barX} y={curY} width={GATE_DEPTH} height={sh}
              fill={C.gateFill} stroke={C.gateStroke} strokeWidth={1.2} rx={1} />
            <text x={barX + GATE_DEPTH + 10} y={curY + sh / 2}
              dominantBaseline="middle" fontSize={8} fill={C.gateStroke}
              fontWeight="700" fontFamily="Inter, sans-serif"
              stroke="white" strokeWidth={2.5} paintOrder="stroke">
              GATE {item.value}mm
            </text>
          </g>
        );

      } else if (["START_GAP", "END_GAP", "GAP"].includes(item.kind)) {
        const gapH = Math.max(sh, 1.5);
        elements.push(
          <g key={`gap-v-${runIdx}-${i}`}>
            <rect x={barX} y={curY} width={PANEL_DEPTH} height={gapH}
              fill={C.gapFill} stroke={C.gapStroke} strokeWidth={0.5} strokeDasharray="2,2" />
            {sh > 20 && (
              <text x={barX + PANEL_DEPTH / 2} y={curY + sh / 2}
                textAnchor="middle" dominantBaseline="middle"
                fontSize={7} fill={C.gapStroke} fontWeight="700" fontFamily="Inter, sans-serif"
                transform={`rotate(-90, ${barX + PANEL_DEPTH / 2}, ${curY + sh / 2})`}>
                {item.value}
              </text>
            )}
          </g>
        );

      } else if (["HINGE_GAP", "LATCH_GAP"].includes(item.kind)) {
        const col  = item.kind === "HINGE_GAP" ? C.hingeStroke : C.latchStroke;
        const fill = item.kind === "HINGE_GAP" ? C.hingeFill   : C.latchFill;
        const gapH = Math.max(sh, 2);
        elements.push(
          <rect key={`gap-v-${runIdx}-${i}`}
            x={barX} y={curY} width={PANEL_DEPTH} height={gapH}
            fill={fill} stroke={col} strokeWidth={0.8} strokeDasharray="2,2" />
        );
      }

      curY += sh;
    });

    // Gate swing — identical geometry to current version
    if (run.gateOn && gateY !== null && gateHeight !== null) {
      const gateLeafMM  = Number(run?.gateWidth || solved?.gateWidth || solved?.gateOpening || 0);
      const arcRadius   = Math.max(gateLeafMM * scale, gateHeight || 0);
      const wallHinge   = run?.hingeTo === "wall" && run?.latchBehaviour !== "post_or_wall";
      const hingeAtStart = wallHinge ? (effectiveEndSide === "start") : (effectiveEndSide === "end");
      const hingePointY = hingeAtStart ? gateY : gateY + gateHeight;
      const latchSign   = hingeAtStart ? 1 : -1;
      const perpSign    = barX < SVG_W / 2 ? -1 : 1;
      const leafEndX    = barX + perpSign * arcRadius;
      const leafEndY    = hingePointY;
      const latchEndX   = barX;
      const latchEndY   = hingePointY + latchSign * arcRadius;
      const sweepFlag   = (perpSign * latchSign === 1) ? 1 : 0;

      // Filled sweep area
      elements.push(
        <path key={`swing-fill-v-${runIdx}`}
          d={`M ${barX} ${hingePointY} L ${leafEndX} ${leafEndY} A ${arcRadius} ${arcRadius} 0 0 ${sweepFlag} ${latchEndX} ${latchEndY} Z`}
          fill={C.swing} stroke="none" />
      );
      // Gate leaf
      elements.push(
        <line key={`leaf-v-${runIdx}`}
          x1={barX} y1={hingePointY} x2={leafEndX} y2={leafEndY}
          stroke={C.swingStroke} strokeWidth={2} strokeLinecap="round" opacity={0.9} />
      );
      // Swing arc
      elements.push(
        <path key={`arc-v-${runIdx}`}
          d={`M ${leafEndX} ${leafEndY} A ${arcRadius} ${arcRadius} 0 0 ${sweepFlag} ${latchEndX} ${latchEndY}`}
          stroke={C.swingStroke} strokeWidth={1.5} strokeDasharray="5,3"
          fill="none" opacity={0.6} />
      );
    }

    const labelX = barX - 58;
    const labelY = startY + svgTotal / 2;
    labels.push(
      <text key={`lbl-v-${runIdx}`} x={labelX} y={labelY}
        textAnchor="middle" dominantBaseline="middle"
        fontSize={12} fill={C.label} fontWeight="700" fontFamily="Inter, sans-serif"
        transform={`rotate(-90, ${labelX}, ${labelY})`}>
        Side {String.fromCharCode(65 + runIdx)}
      </text>
    );
  }

  // ── Shape routing — identical to current version ───────────────────────────
  const cornerY = poolY + poolH;

  if (shape === "Straight") {
    const straightRuns   = runs.slice(0, 4);
    const straightSolved = solvedRuns.slice(0, 4);
    const runSpacing        = 120;
    const numRuns           = straightRuns.length;
    const totalStackHeight  = (numRuns - 1) * runSpacing;
    const centreY           = poolY + poolH / 2;
    const stackStartY       = centreY - totalStackHeight / 2;
    straightRuns.forEach((run, idx) => {
      const y         = stackStartY + idx * runSpacing;
      const flipLabel = idx % 2 === 1;
      renderH(run, straightSolved[idx], idx, y, flipLabel, "Run");
    });
  } else if (shape === "L-shape") {
    renderH(runs[0], solvedRuns[0], 0, cornerY);
    if (runs[1]) renderV(runs[1], solvedRuns[1], 1, poolX, cornerY);
  } else if (shape === "U-shape") {
    renderH(runs[0], solvedRuns[0], 0, cornerY);
    if (runs[1]) renderV(runs[1], solvedRuns[1], 1, poolX, cornerY);
    if (runs[2]) renderV(runs[2], solvedRuns[2], 2, poolX + poolW - PANEL_DEPTH, cornerY);
  } else if (shape === "Box") {
    renderH(runs[0], solvedRuns[0], 0, cornerY);
    if (runs[1]) renderV(runs[1], solvedRuns[1], 1, poolX, cornerY);
    if (runs[2]) renderV(runs[2], solvedRuns[2], 2, poolX + poolW - PANEL_DEPTH, cornerY);
    if (runs[3]) renderH(runs[3], solvedRuns[3], 3, poolY, true);
  }

  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="flex-1 w-full flex items-center justify-center overflow-auto">
        <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full h-full max-h-full"
          style={{ maxWidth: "100%", background: "#f8fafc", borderRadius: 8 }}>

          {/* Layer 1: backgrounds (pool area, pool bands) */}
          {backgrounds}

          {/* Layer 2: fence elements (panels, gates, gaps, spigots, swings) */}
          {elements}

          {/* Layer 3: text labels */}
          {labels}

        </svg>
      </div>
    </div>
  );
}
