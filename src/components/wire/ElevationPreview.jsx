'use client';
import React, { useRef, useEffect, useCallback } from 'react';
import { dropperCountForSpan, DROPPER_SPACING_MM } from '@/lib/wireBuilder';

/**
 * Front-elevation SVG preview for the Wire calculator.
 *
 * For each run, draws:
 *   - End posts (dark vertical bars)
 *   - Dropper posts (lighter vertical bars) at ~1200mm intervals
 *   - Horizontal wire lines at correct centres
 *   - Bottom gap zone
 *   - Dimension lines
 *
 * Props:
 *   runs           — [{ spanMM, label }]
 *   summary        — { wireCount, wireCentresMM, bottomGapMM }
 *   openingMM      — overall opening height (mm)
 */

export default function WireElevationPreview({ runs, summary, openingMM = 972 }) {
  const containerRef = useRef(null);

  const draw = useCallback(() => {
    if (!containerRef.current) return;

    const cw = Math.max(320, containerRef.current.clientWidth || 560);
    const activeRuns = (runs || []).filter((r) => r.spanMM > 0);

    if (activeRuns.length === 0 || !summary) {
      containerRef.current.innerHTML =
        `<svg width="${cw}" height="180" xmlns="http://www.w3.org/2000/svg" style="background:#f8fafc;">` +
        `<text x="${cw / 2}" y="90" fill="#94a3b8" font-family="Inter,system-ui,sans-serif" font-size="13" text-anchor="middle">Enter measurements to see layout preview</text>` +
        `</svg>`;
      return;
    }

    const { wireCount = 11, wireCentresMM = 81, bottomGapMM = 81 } = summary;

    const LEGEND_H   = 36;
    const TOP_PAD    = 28;
    const BOTTOM_PAD = 10;
    const LEFT_PAD   = 52;
    const RIGHT_PAD  = 24;
    const RUN_GAP    = 28;
    const POST_W_MM  = 50;   // visual post width in mm

    const drawableW = cw - LEFT_PAD - RIGHT_PAD;

    const runSections = activeRuns.map(({ spanMM }) => {
      const runMM  = Math.max(300, spanMM);
      const scaleX = drawableW / runMM;
      const maxH   = 180;
      const scaleY = maxH / openingMM;
      const scale  = Math.min(scaleX, scaleY, 0.45);
      return { drawW: runMM * scale, drawH: openingMM * scale, scale, runMM };
    });

    const totalRunsH = runSections.reduce(
      (sum, s) => sum + TOP_PAD + s.drawH + RUN_GAP, 0
    );
    const ch = LEGEND_H + totalRunsH + BOTTOM_PAD;

    let svg = `<svg width="${cw}" height="${ch}" xmlns="http://www.w3.org/2000/svg" style="background:#f8fafc; font-family:Inter,system-ui,sans-serif;">`;
    svg += `<rect width="${cw}" height="${ch}" fill="#f8fafc"/>`;

    // Grid
    for (let x = 0; x < cw; x += 24)
      svg += `<line x1="${x}" y1="0" x2="${x}" y2="${ch}" stroke="rgba(59,130,246,.04)" stroke-width="1"/>`;
    for (let y = 0; y < ch; y += 24)
      svg += `<line x1="0" y1="${y}" x2="${cw}" y2="${y}" stroke="rgba(59,130,246,.04)" stroke-width="1"/>`;

    // Legend
    const lx = 12, ly = 18;
    svg += `<rect x="${lx}" y="${ly - 6}" width="6" height="12" fill="#1e293b" rx="1"/>`;
    svg += `<text x="${lx + 10}" y="${ly + 4}" fill="#475569" font-size="10">End post</text>`;

    svg += `<rect x="${lx + 68}" y="${ly - 6}" width="4" height="12" fill="#7c3aed" opacity="0.7" rx="1"/>`;
    svg += `<text x="${lx + 76}" y="${ly + 4}" fill="#475569" font-size="10">Dropper post</text>`;

    svg += `<line x1="${lx + 168}" y1="${ly}" x2="${lx + 184}" y2="${ly}" stroke="#0ea5e9" stroke-width="1.5" stroke-linecap="round"/>`;
    svg += `<text x="${lx + 188}" y="${ly + 4}" fill="#475569" font-size="10">Wire</text>`;

    // Runs
    let yOffset = LEGEND_H;

    activeRuns.forEach((run, i) => {
      const { drawW, drawH, scale, runMM } = runSections[i];
      const xOff = LEFT_PAD + (drawableW - drawW) / 2;
      const yTop = yOffset + TOP_PAD;

      const tx = (xMM) => xOff + xMM * scale;
      const ty = (yMM) => yTop + (openingMM - yMM) * scale; // y-flip

      // Background
      svg += `<rect x="${tx(0)}" y="${ty(openingMM)}" width="${drawW}" height="${drawH}" fill="white" stroke="#e2e8f0" stroke-width="1" rx="2"/>`;

      // Bottom gap zone
      if (bottomGapMM > 0) {
        svg += `<rect x="${tx(0)}" y="${ty(bottomGapMM)}" width="${drawW}" height="${bottomGapMM * scale}" fill="#f8fafc" stroke="none"/>`;
        svg += `<text x="${tx(runMM) + 4}" y="${ty(bottomGapMM / 2) + 3}" fill="#94a3b8" font-size="9">${Math.round(bottomGapMM)}mm</text>`;
      }

      // Wire lines
      for (let w = 1; w <= wireCount; w++) {
        const wYmm = bottomGapMM + w * wireCentresMM;
        const wY   = ty(wYmm);
        svg += `<line x1="${tx(0)}" y1="${wY}" x2="${tx(runMM)}" y2="${wY}" stroke="#0ea5e9" stroke-width="1.2" stroke-linecap="round"/>`;
      }

      // Dropper posts
      const dropperCount = dropperCountForSpan(runMM);
      const postPxW = Math.max(2.5, POST_W_MM * scale);
      if (dropperCount > 0) {
        const interval = runMM / (dropperCount + 1);
        for (let d = 1; d <= dropperCount; d++) {
          const dxMM = d * interval;
          svg += `<rect x="${tx(dxMM) - postPxW / 4}" y="${ty(openingMM)}" width="${Math.max(2, postPxW / 2)}" height="${drawH}" fill="#7c3aed" opacity="0.55" rx="0.5"/>`;
        }
      }

      // End posts (on top)
      const endPostW = Math.max(3.5, POST_W_MM * scale);
      svg += `<rect x="${tx(0) - endPostW / 2}" y="${ty(openingMM)}" width="${endPostW}" height="${drawH}" fill="#1e293b" rx="1"/>`;
      svg += `<rect x="${tx(runMM) - endPostW / 2}" y="${ty(openingMM)}" width="${endPostW}" height="${drawH}" fill="#1e293b" rx="1"/>`;

      // Dimension: total span (above)
      const dimTopY = yTop - 16;
      svg += `<line x1="${tx(0)}" y1="${ty(openingMM) - 3}" x2="${tx(0)}" y2="${dimTopY}" stroke="#94a3b8" stroke-width="0.5"/>`;
      svg += `<line x1="${tx(runMM)}" y1="${ty(openingMM) - 3}" x2="${tx(runMM)}" y2="${dimTopY}" stroke="#94a3b8" stroke-width="0.5"/>`;
      svg += `<line x1="${tx(0)}" y1="${dimTopY}" x2="${tx(runMM)}" y2="${dimTopY}" stroke="#64748b" stroke-width="0.75"/>`;
      svg += `<line x1="${tx(0)}" y1="${dimTopY - 3}" x2="${tx(0)}" y2="${dimTopY + 3}" stroke="#64748b" stroke-width="0.75"/>`;
      svg += `<line x1="${tx(runMM)}" y1="${dimTopY - 3}" x2="${tx(runMM)}" y2="${dimTopY + 3}" stroke="#64748b" stroke-width="0.75"/>`;
      const midX = (tx(0) + tx(runMM)) / 2;
      svg += `<text x="${midX}" y="${dimTopY - 4}" fill="#475569" font-size="10" font-weight="500" text-anchor="middle">${runMM}mm</text>`;
      svg += `<text x="${midX}" y="${dimTopY + 10}" fill="#1e3a5f" font-size="10" font-weight="700" text-anchor="middle">Run ${run.label}</text>`;

      // Dimension: height (left)
      const dimLeftX = tx(0) - 18;
      svg += `<line x1="${tx(0) - 3}" y1="${ty(0)}" x2="${dimLeftX + 3}" y2="${ty(0)}" stroke="#94a3b8" stroke-width="0.5"/>`;
      svg += `<line x1="${tx(0) - 3}" y1="${ty(openingMM)}" x2="${dimLeftX + 3}" y2="${ty(openingMM)}" stroke="#94a3b8" stroke-width="0.5"/>`;
      svg += `<line x1="${dimLeftX}" y1="${ty(0)}" x2="${dimLeftX}" y2="${ty(openingMM)}" stroke="#64748b" stroke-width="0.75"/>`;
      svg += `<line x1="${dimLeftX - 3}" y1="${ty(0)}" x2="${dimLeftX + 3}" y2="${ty(0)}" stroke="#64748b" stroke-width="0.75"/>`;
      svg += `<line x1="${dimLeftX - 3}" y1="${ty(openingMM)}" x2="${dimLeftX + 3}" y2="${ty(openingMM)}" stroke="#64748b" stroke-width="0.75"/>`;
      const midY = (ty(0) + ty(openingMM)) / 2;
      svg += `<text x="${dimLeftX - 5}" y="${midY}" fill="#475569" font-size="10" font-weight="500" text-anchor="middle" dominant-baseline="middle" transform="rotate(-90,${dimLeftX - 5},${midY})">${openingMM}mm</text>`;

      // Wire count annotation
      svg += `<text x="${tx(runMM) + 5}" y="${ty(openingMM) + drawH / 2}" fill="#94a3b8" font-size="9" dominant-baseline="middle">${wireCount} wires</text>`;

      yOffset = yTop + drawH + RUN_GAP;
    });

    svg += `</svg>`;
    containerRef.current.innerHTML = svg;
  }, [runs, summary, openingMM]);

  useEffect(() => { draw(); }, [draw]);
  useEffect(() => {
    const onResize = () => draw();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [draw]);

  return <div ref={containerRef} className="w-full" />;
}
