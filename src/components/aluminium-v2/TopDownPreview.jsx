import React, { useEffect, useRef, useCallback } from "react";
import { solveRunPanels, buildLayoutGeometry } from "@/lib/calculationEngine";
import { STYLE_CONFIG } from "@/lib/styleConfig";

/**
 * Top-down SVG preview for the Aluminium V2 calculator.
 * Ported from the original AluminiumCalculator's drawPreview() so the look
 * matches the production aluminium calc exactly: dimension lines, panel bars,
 * gate dashes, post squares, and a legend.
 */
export default function TopDownPreview({ shape, runs, selectedStyle = "Tubular" }) {
  const canvasRef = useRef(null);

  const panelMaxForStyle = (style) => STYLE_CONFIG[style]?.panel_max_mm ?? 2450;
  const postWidthForStyle = (style) => STYLE_CONFIG[style]?.post_width_mm ?? 50;

  const drawPreview = useCallback(() => {
    if (!canvasRef.current) return;

    const cw = Math.max(320, canvasRef.current.clientWidth || 520);
    const isStraight = shape === "Straight";
    const postWidth = postWidthForStyle(selectedStyle);
    const panelMax = panelMaxForStyle(selectedStyle);
    const gateOpening = 1062;

    const validRuns = (runs || []).filter((r) => Number(r.length_mm || 0) > 0);
    const validRunCount = validRuns.length;

    const runUnitHeight = 90;
    const gapBetweenRuns = 10;
    const contentHeight = validRunCount * runUnitHeight + Math.max(0, validRunCount - 1) * gapBetweenRuns;

    const minSvgHeight = 300;
    const sidePad = 20;
    const legendHeight = 40;
    const requiredHeight = legendHeight + contentHeight + sidePad * 2;
    const ch = isStraight ? Math.max(minSvgHeight, requiredHeight) : 340;

    let svg = `<svg width="${cw}" height="${ch}" xmlns="http://www.w3.org/2000/svg" style="background:#fff;">`;

    // Background gradient
    svg += `<defs><linearGradient id="bg" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#ffffff;stop-opacity:1"/>
      <stop offset="100%" style="stop-color:#f8fbff;stop-opacity:1"/>
    </linearGradient></defs>`;
    svg += `<rect width="${cw}" height="${ch}" fill="url(#bg)"/>`;

    // Subtle grid
    for (let x = 0; x < cw; x += 24) {
      svg += `<line x1="${x}" y1="0" x2="${x}" y2="${ch}" stroke="rgba(59,130,246,.08)" stroke-width="1"/>`;
    }
    for (let y = 0; y < ch; y += 24) {
      svg += `<line x1="0" y1="${y}" x2="${cw}" y2="${y}" stroke="rgba(59,130,246,.08)" stroke-width="1"/>`;
    }

    if (!validRuns.length) {
      svg += `<text x="${cw / 2}" y="${ch / 2}" fill="#64748b" font-family="Inter,system-ui,sans-serif" font-size="12" text-anchor="middle">No runs configured</text>`;
      svg += `</svg>`;
      canvasRef.current.innerHTML = svg;
      return;
    }

    if (isStraight) {
      const availableHeight = ch - legendHeight - sidePad * 2;
      const verticalOffset = legendHeight + sidePad + Math.max(0, (availableHeight - contentHeight) / 2);

      const maxLen = Math.max(...validRuns.map((r) => Number(r.length_mm || 0)), 1);
      const leftPad = 56;
      const rightPad = 24;
      const lineLenMax = Math.max(140, cw - leftPad - rightPad);

      validRuns.forEach((r, runNum) => {
        const y = verticalOffset + runNum * (runUnitHeight + gapBetweenRuns) + runUnitHeight / 2;
        const runMm = Number(r.length_mm || 0);
        const lenPx = Math.max(40, Math.round((runMm / maxLen) * lineLenMax));
        const x1 = leftPad;
        const x2 = x1 + lenPx;

        const hasGate = !!r.gate;
        const gateMode = r.gate_mode || (hasGate ? "End" : "-");
        const endOffset = postWidth / 2;
        const solved = solveRunPanels(runMm, hasGate, gateMode, r.gate_after_panel, panelMax, gateOpening, endOffset, selectedStyle);
        const panelCount = solved.panel_qty;
        const panelCC = solved.panel_cc_available;
        const gateAfter = solved.gate_after;

        let chain = [];
        let gateIndex = null;
        if (hasGate && gateMode === "Centre") {
          const panelsEachSide = Math.max(1, Math.floor(panelCount / 2));
          const each = (panelCC / 2) / panelsEachSide;
          chain = [...Array(panelsEachSide).fill(each), ...Array(panelsEachSide).fill(each)];
          gateIndex = panelsEachSide;
        } else {
          const each = panelCC / panelCount;
          chain = Array(panelCount).fill(each);
          gateIndex = hasGate ? gateAfter : null;
        }

        const runPosts = [];
        const panelSegments = [];
        const gateSegments = [];
        let xCoord = 0;
        runPosts.push(xCoord);

        chain.forEach((seg, idx) => {
          if (hasGate && gateIndex === 0 && idx === 0) {
            const gateStart = xCoord;
            xCoord += gateOpening;
            gateSegments.push({ start: gateStart, end: xCoord });
            runPosts.push(xCoord);
          }

          const panelStart = xCoord;
          xCoord += seg;
          panelSegments.push({ start: panelStart, end: xCoord });
          runPosts.push(xCoord);

          if (hasGate && gateIndex === idx + 1) {
            const gateStart = xCoord;
            xCoord += gateOpening;
            gateSegments.push({ start: gateStart, end: xCoord });
            runPosts.push(xCoord);
          }
        });

        panelSegments.forEach((seg) => {
          const px1 = x1 + (seg.start / runMm) * lenPx;
          const px2 = x1 + (seg.end / runMm) * lenPx;
          svg += `<line x1="${px1}" y1="${y}" x2="${px2}" y2="${y}" stroke="#1e3a5f" stroke-width="8" stroke-linecap="round"/>`;
        });

        gateSegments.forEach((seg) => {
          const gx1 = x1 + (seg.start / runMm) * lenPx;
          const gx2 = x1 + (seg.end / runMm) * lenPx;
          svg += `<line x1="${gx1}" y1="${y}" x2="${gx2}" y2="${y}" stroke="#f59e0b" stroke-width="6" stroke-dasharray="6 4" stroke-linecap="round"/>`;
        });

        runPosts.forEach((postCoord) => {
          const px = x1 + (postCoord / runMm) * lenPx;
          svg += `<rect x="${px - 5}" y="${y - 5}" width="10" height="10" fill="#1e293b" stroke="#64748b" stroke-width="1" rx="1.5"/>`;
        });

        const dimY = y - 20;
        const tickLen = 6;
        svg += `<line x1="${x1}" y1="${y - 8}" x2="${x1}" y2="${dimY}" stroke="#94a3b8" stroke-width="0.5"/>`;
        svg += `<line x1="${x2}" y1="${y - 8}" x2="${x2}" y2="${dimY}" stroke="#94a3b8" stroke-width="0.5"/>`;
        svg += `<line x1="${x1}" y1="${dimY}" x2="${x2}" y2="${dimY}" stroke="#64748b" stroke-width="0.75"/>`;
        svg += `<line x1="${x1}" y1="${dimY - tickLen / 2}" x2="${x1}" y2="${dimY + tickLen / 2}" stroke="#64748b" stroke-width="0.75"/>`;
        svg += `<line x1="${x2}" y1="${dimY - tickLen / 2}" x2="${x2}" y2="${dimY + tickLen / 2}" stroke="#64748b" stroke-width="0.75"/>`;
        const dimMid = (x1 + x2) / 2;
        svg += `<text x="${dimMid}" y="${dimY - 6}" fill="#475569" font-family="Inter,system-ui,sans-serif" font-size="10" font-weight="500" text-anchor="middle">${runMm}mm</text>`;
        svg += `<text x="${dimMid}" y="${dimY + 10}" fill="#1e3a5f" font-family="Inter,system-ui,sans-serif" font-size="10" font-weight="700" text-anchor="middle">Run ${runNum + 1}</text>`;
      });

      // Legend
      const lx = 10;
      const ly = 14;
      svg += `<line x1="${lx}" y1="${ly}" x2="${lx + 16}" y2="${ly}" stroke="#1e3a5f" stroke-width="4" stroke-linecap="round"/>`;
      svg += `<text x="${lx + 22}" y="${ly + 4}" fill="#475569" font-family="Inter,system-ui,sans-serif" font-size="10">Panel</text>`;
      svg += `<line x1="${lx + 68}" y1="${ly}" x2="${lx + 84}" y2="${ly}" stroke="#f59e0b" stroke-width="4" stroke-dasharray="4 3" stroke-linecap="round"/>`;
      svg += `<text x="${lx + 90}" y="${ly + 4}" fill="#475569" font-family="Inter,system-ui,sans-serif" font-size="10">Gate</text>`;
      svg += `<rect x="${lx + 128}" y="${ly - 5}" width="8" height="8" fill="#1e293b" stroke="#64748b" stroke-width="0.75" rx="1"/>`;
      svg += `<text x="${lx + 140}" y="${ly + 3}" fill="#475569" font-family="Inter,system-ui,sans-serif" font-size="10">Post</text>`;
    } else {
      // L-shape, U-shape, Box
      const geo = buildLayoutGeometry(runs, shape, gateOpening, panelMax, postWidth);
      const posts = geo.post_points;
      const panels = geo.centre_segments;
      const gates = geo.gate_segments;

      const all = [...posts, ...gates.map((g) => [g.x1, g.y1]), ...gates.map((g) => [g.x2, g.y2])];
      const xs = all.map((p) => p[0]);
      const ys = all.map((p) => p[1]);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      const spanX = Math.max(1, maxX - minX);
      const spanY = Math.max(1, maxY - minY);
      const pad = 80;
      const scale = Math.min((cw - pad * 2) / spanX, (ch - pad * 2) / spanY);
      const ox = pad + ((cw - pad * 2 - spanX * scale) / 2) - minX * scale;
      const oy = pad + ((ch - pad * 2 - spanY * scale) / 2) - minY * scale;
      const tx = (px) => ox + px * scale;
      const ty = (py) => oy + py * scale;

      const cx = posts.reduce((s, p) => s + tx(p[0]), 0) / posts.length;
      const cy = posts.reduce((s, p) => s + ty(p[1]), 0) / posts.length;

      if ((shape === "Box" || shape === "U-shape") && posts.length >= 3) {
        const polyPoints = posts.map((p) => `${tx(p[0])},${ty(p[1])}`).join(" ");
        svg += `<polygon points="${polyPoints}" fill="#f1f5f9" opacity="0.4"/>`;
      }

      panels.forEach((seg) => {
        svg += `<line x1="${tx(seg.x1)}" y1="${ty(seg.y1)}" x2="${tx(seg.x2)}" y2="${ty(seg.y2)}" stroke="#1e3a5f" stroke-width="8" stroke-linecap="round"/>`;
      });

      gates.forEach((g) => {
        svg += `<line x1="${tx(g.x1)}" y1="${ty(g.y1)}" x2="${tx(g.x2)}" y2="${ty(g.y2)}" stroke="#f59e0b" stroke-width="6" stroke-dasharray="6 4" stroke-linecap="round"/>`;
      });

      posts.forEach((p) => {
        const px = tx(p[0]);
        const py = ty(p[1]);
        svg += `<rect x="${px - 5}" y="${py - 5}" width="10" height="10" fill="#1e293b" stroke="#64748b" stroke-width="1" rx="1.5"/>`;
      });

      // Per-run dimension lines
      const dimOffset = 28;
      const tickLen = 6;
      let segIdx = 0;
      runs.forEach((r, runIdx) => {
        if (segIdx >= panels.length) return;
        const runMm = Number(r.length_mm || 0);
        if (runMm <= 0) { segIdx++; return; }

        const hasGate = !!r.gate;
        const gateMode = r.gate_mode || (hasGate ? "End" : "-");
        const solved = solveRunPanels(runMm, hasGate, gateMode, r.gate_after_panel, panelMax, gateOpening, postWidth / 2, selectedStyle);
        const firstSeg = panels[segIdx];
        if (!firstSeg) { segIdx += solved.panel_qty; return; }

        // Dimension line must span the WHOLE run (length_mm), regardless of
        // where panels and gates sit within it. Extend from the first panel's
        // start in world coords by runMm along the run's direction.
        const segDx = firstSeg.x2 - firstSeg.x1;
        const segDy = firstSeg.y2 - firstSeg.y1;
        const segLen = Math.sqrt(segDx * segDx + segDy * segDy);
        if (segLen < 1) { segIdx += solved.panel_qty; return; }
        const wux = segDx / segLen;
        const wuy = segDy / segLen;
        const endWorldX = firstSeg.x1 + wux * runMm;
        const endWorldY = firstSeg.y1 + wuy * runMm;

        const sx = tx(firstSeg.x1), sy = ty(firstSeg.y1);
        const ex = tx(endWorldX), ey = ty(endWorldY);

        const rdx = ex - sx, rdy = ey - sy;
        const rLen = Math.sqrt(rdx * rdx + rdy * rdy);
        if (rLen < 1) { segIdx += solved.panel_qty; return; }

        const ux = rdx / rLen, uy = rdy / rLen;
        let nx = -uy, ny = ux;
        const midSx = (sx + ex) / 2, midSy = (sy + ey) / 2;
        const toCentreX = cx - midSx, toCentreY = cy - midSy;
        if (nx * toCentreX + ny * toCentreY > 0) { nx = -nx; ny = -ny; }

        const d1x = sx + nx * dimOffset, d1y = sy + ny * dimOffset;
        const d2x = ex + nx * dimOffset, d2y = ey + ny * dimOffset;

        svg += `<line x1="${sx + nx * 8}" y1="${sy + ny * 8}" x2="${d1x}" y2="${d1y}" stroke="#94a3b8" stroke-width="0.5"/>`;
        svg += `<line x1="${ex + nx * 8}" y1="${ey + ny * 8}" x2="${d2x}" y2="${d2y}" stroke="#94a3b8" stroke-width="0.5"/>`;
        svg += `<line x1="${d1x}" y1="${d1y}" x2="${d2x}" y2="${d2y}" stroke="#64748b" stroke-width="0.75"/>`;
        svg += `<line x1="${d1x - ny * tickLen / 2}" y1="${d1y + nx * tickLen / 2}" x2="${d1x + ny * tickLen / 2}" y2="${d1y - nx * tickLen / 2}" stroke="#64748b" stroke-width="0.75"/>`;
        svg += `<line x1="${d2x - ny * tickLen / 2}" y1="${d2y + nx * tickLen / 2}" x2="${d2x + ny * tickLen / 2}" y2="${d2y - nx * tickLen / 2}" stroke="#64748b" stroke-width="0.75"/>`;

        const sideLabels = ["A", "B", "C", "D"];
        const sideLabel = sideLabels[runIdx % sideLabels.length];
        const angleDeg = Math.atan2(rdy, rdx) * (180 / Math.PI);
        const displayAngle = (angleDeg > 90 || angleDeg < -90) ? angleDeg + 180 : angleDeg;

        const measX = (d1x + d2x) / 2 + nx * 10;
        const measY = (d1y + d2y) / 2 + ny * 10;
        svg += `<text x="${measX}" y="${measY}" fill="#475569" font-family="Inter,system-ui,sans-serif" font-size="10" font-weight="500" text-anchor="middle" dominant-baseline="middle" transform="rotate(${displayAngle.toFixed(1)},${measX},${measY})">${runMm}mm</text>`;

        const sideX = (d1x + d2x) / 2 - nx * 10;
        const sideY = (d1y + d2y) / 2 - ny * 10;
        svg += `<text x="${sideX}" y="${sideY}" fill="#1e3a5f" font-family="Inter,system-ui,sans-serif" font-size="10" font-weight="700" text-anchor="middle" dominant-baseline="middle" transform="rotate(${displayAngle.toFixed(1)},${sideX},${sideY})">Side ${sideLabel}</text>`;

        segIdx += solved.panel_qty;
      });

      // Legend
      const lx = 10;
      const ly = ch - 16;
      svg += `<line x1="${lx}" y1="${ly}" x2="${lx + 16}" y2="${ly}" stroke="#1e3a5f" stroke-width="4" stroke-linecap="round"/>`;
      svg += `<text x="${lx + 22}" y="${ly + 4}" fill="#475569" font-family="Inter,system-ui,sans-serif" font-size="10">Panel</text>`;
      svg += `<line x1="${lx + 68}" y1="${ly}" x2="${lx + 84}" y2="${ly}" stroke="#f59e0b" stroke-width="4" stroke-dasharray="4 3" stroke-linecap="round"/>`;
      svg += `<text x="${lx + 90}" y="${ly + 4}" fill="#475569" font-family="Inter,system-ui,sans-serif" font-size="10">Gate</text>`;
      svg += `<rect x="${lx + 128}" y="${ly - 5}" width="8" height="8" fill="#1e293b" stroke="#64748b" stroke-width="0.75" rx="1"/>`;
      svg += `<text x="${lx + 140}" y="${ly + 3}" fill="#475569" font-family="Inter,system-ui,sans-serif" font-size="10">Post</text>`;
    }

    svg += `</svg>`;
    canvasRef.current.innerHTML = svg;
  }, [shape, runs, selectedStyle]);

  // Redraw on changes and on window resize so the SVG fills the column
  useEffect(() => { drawPreview(); }, [drawPreview]);
  useEffect(() => {
    const onResize = () => drawPreview();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [drawPreview]);

  return <div ref={canvasRef} className="w-full" />;
}
