'use client';
import React, { useRef, useEffect, useCallback } from 'react';

/**
 * Front-elevation SVG preview for the AIRE+ calculator.
 *
 * Shows each run as a scaled front view with:
 *   - Posts (dark vertical bars) at each post position
 *   - Vertical infill members (pickets or slats) between posts
 *   - Bottom rail at the base
 *   - Handrail at the top
 *   - Dimension lines: overall length (top) and height (left)
 *   - Bay width annotations between posts
 *   - Wall-end hatching for 'wall' end types
 *
 * Props:
 *   runs       — array of run config objects
 *   infillType — 'Slat' | 'Picket'  (default: 'Slat')
 *   fenceStyle — 'Full' | '3-Rail'  (default: 'Full')
 */

const POST_WIDTH_MM  = 50;
const BOTTOM_RAIL_H  = 16;   // mm visual height for bottom rail
const HANDRAIL_OFFSET = 15;  // mm from top for handrail centre

// Picket infill
const PICKET_PITCH_MM = 110;
const PICKET_W_MM     = 16.5;
// Slat infill
const SLAT_SLOT_W_MM  = 66;
const SLAT_GAP_MM     = 64;

export default function ElevationPreview({ runs, infillType = 'Slat', fenceStyle = 'Full' }) {
  const containerRef = useRef(null);

  const draw = useCallback(() => {
    if (!containerRef.current) return;

    const cw = Math.max(320, containerRef.current.clientWidth || 560);

    const activeRuns = (runs || []).filter(
      (r) => r.active !== false && Number(r.length || 0) > 0
    );

    // ── Empty state ─────────────────────────────────────────────────────────
    if (activeRuns.length === 0) {
      const ch = 200;
      containerRef.current.innerHTML =
        `<svg width="${cw}" height="${ch}" xmlns="http://www.w3.org/2000/svg" style="background:#f8fafc;">` +
        `<text x="${cw / 2}" y="${ch / 2}" fill="#94a3b8" font-family="Inter,system-ui,sans-serif" font-size="13" text-anchor="middle">Enter measurements to see layout preview</text>` +
        `</svg>`;
      return;
    }

    const isPicket = (infillType === 'Picket');

    // ── Per-run layout calculations ─────────────────────────────────────────
    const layouts = activeRuns.map((run) => {
      const runMM      = Math.max(300, run.length);
      const heightMM   = Math.max(300, run.height || 1080);
      const bgMM       = run.bottomGap !== undefined ? Math.max(0, run.bottomGap) : 65;
      const spanLimit  = Math.max(300, Math.min(1800, run.maxPostSpan || 1800));
      const bays       = Math.max(1, Math.ceil(runMM / spanLimit));

      const start = run.end1 || 'post';
      const end   = run.end2 || 'post';

      // Post x-positions (mm world coords)
      const bayCc = runMM / bays;
      const postXs = [];
      if (start !== 'wall') postXs.push(0);
      for (let i = 1; i < bays; i++) postXs.push(Math.round(i * bayCc));
      if (end !== 'wall') postXs.push(runMM);

      // Bay clear widths (left edge of each bay in mm)
      const baysInfo = [];
      for (let b = 0; b < bays; b++) {
        const bayStartMM = b * bayCc;
        // Clear width for member placement — same formula as aireBuilder
        let clearMM;
        if (start !== 'wall' && end !== 'wall') {
          const centreMM = Math.max(0, (runMM - 170) / Math.max(1, bays));
          clearMM = Math.max(0, centreMM - POST_WIDTH_MM);
        } else {
          clearMM = Math.max(0, bayCc - POST_WIDTH_MM);
        }

        // Member count + positions within bay
        let n, memberPositions; // x-offsets in mm from bay left edge (post left edge)
        const postLeft = bayStartMM + (start !== 'wall' || b > 0 ? POST_WIDTH_MM / 2 : 0);
        const clearStart = bayStartMM + (b === 0 && start !== 'wall' ? POST_WIDTH_MM : POST_WIDTH_MM / 2);

        if (isPicket) {
          n = Math.max(0, Math.floor(clearMM / PICKET_PITCH_MM));
          const usedMM   = n > 0 ? (n - 1) * PICKET_PITCH_MM + PICKET_W_MM : 0;
          const edgeMM   = n > 0 ? Math.max(0, (clearMM - usedMM) / 2) : 0;
          memberPositions = Array.from({ length: n }, (_, j) => ({
            xMM:  clearStart + edgeMM + j * PICKET_PITCH_MM,
            wMM:  PICKET_W_MM,
          }));
        } else {
          n = Math.max(0, Math.floor((clearMM + SLAT_GAP_MM) / (SLAT_SLOT_W_MM + SLAT_GAP_MM)));
          const usedMM   = n > 0 ? n * SLAT_SLOT_W_MM + (n - 1) * SLAT_GAP_MM : 0;
          const edgeMM   = n > 0 ? Math.max(0, (clearMM - usedMM) / 2) : 0;
          memberPositions = Array.from({ length: n }, (_, j) => ({
            xMM:  clearStart + edgeMM + j * (SLAT_SLOT_W_MM + SLAT_GAP_MM),
            wMM:  SLAT_SLOT_W_MM,
          }));
        }

        baysInfo.push({ bayStartMM, bayCc, clearMM, memberPositions });
      }

      return { run, runMM, heightMM, bgMM, bays, bayCc, postXs, baysInfo, start, end };
    });

    // ── Canvas dimensions ───────────────────────────────────────────────────
    const LEGEND_H   = 36;
    const TOP_PAD    = 28;
    const BOTTOM_PAD = 10;
    const LEFT_PAD   = 52;
    const RIGHT_PAD  = 20;
    const RUN_GAP    = 28;

    const drawableW = cw - LEFT_PAD - RIGHT_PAD;
    const runSections = layouts.map(({ runMM, heightMM }) => {
      const scaleX  = drawableW / runMM;
      const maxRunH = 200;
      const scaleY  = maxRunH / heightMM;
      const scale   = Math.min(scaleX, scaleY, 0.3);
      return { drawW: runMM * scale, drawH: heightMM * scale, scale };
    });

    const totalRunsH = runSections.reduce(
      (sum, s) => sum + TOP_PAD + s.drawH + RUN_GAP, 0
    );
    const ch = LEGEND_H + totalRunsH + BOTTOM_PAD;

    let svg = `<svg width="${cw}" height="${ch}" xmlns="http://www.w3.org/2000/svg" style="background:#f8fafc; font-family:Inter,system-ui,sans-serif;">`;
    svg += `<rect width="${cw}" height="${ch}" fill="#f8fafc"/>`;

    // Subtle grid
    for (let x = 0; x < cw; x += 24)
      svg += `<line x1="${x}" y1="0" x2="${x}" y2="${ch}" stroke="rgba(59,130,246,.05)" stroke-width="1"/>`;
    for (let y = 0; y < ch; y += 24)
      svg += `<line x1="0" y1="${y}" x2="${cw}" y2="${y}" stroke="rgba(59,130,246,.05)" stroke-width="1"/>`;

    // ── Legend ───────────────────────────────────────────────────────────────
    const lx = 12, ly = 18;
    svg += `<rect x="${lx}" y="${ly - 6}" width="8" height="12" fill="#1e293b" rx="1"/>`;
    svg += `<text x="${lx + 12}" y="${ly + 4}" fill="#475569" font-size="10">Post</text>`;

    const memberColour = isPicket ? '#92400e' : '#3b82f6';
    const memberLabel  = isPicket ? 'Picket' : 'Slat';
    svg += `<rect x="${lx + 56}" y="${ly - 6}" width="${isPicket ? 4 : 8}" height="12" fill="${memberColour}" opacity="0.8" rx="0.5"/>`;
    svg += `<text x="${lx + 70}" y="${ly + 4}" fill="#475569" font-size="10">${memberLabel}</text>`;

    svg += `<line x1="${lx + 120}" y1="${ly}" x2="${lx + 136}" y2="${ly}" stroke="#78716c" stroke-width="5" stroke-linecap="round"/>`;
    svg += `<text x="${lx + 142}" y="${ly + 4}" fill="#475569" font-size="10">Bottom Rail</text>`;

    svg += `<line x1="${lx + 220}" y1="${ly}" x2="${lx + 236}" y2="${ly}" stroke="#1e3a5f" stroke-width="4" stroke-linecap="round"/>`;
    svg += `<text x="${lx + 242}" y="${ly + 4}" fill="#475569" font-size="10">Handrail</text>`;

    // ── Draw each run ────────────────────────────────────────────────────────
    let yOffset = LEGEND_H;

    layouts.forEach(({ run, runMM, heightMM, bgMM, bays, bayCc, postXs, baysInfo, start, end }, i) => {
      const { drawW, drawH, scale } = runSections[i];

      const xOff = LEFT_PAD + (drawableW - drawW) / 2;
      const yTop  = yOffset + TOP_PAD;

      const tx = (xMM) => xOff + xMM * scale;
      const ty = (yMM) => yTop + (heightMM - yMM) * scale;

      // ── Run background ────────────────────────────────────────────────────
      svg += `<rect x="${tx(0)}" y="${ty(heightMM)}" width="${drawW}" height="${drawH}" fill="white" stroke="#e2e8f0" stroke-width="1" rx="2"/>`;

      // ── Bottom gap zone ───────────────────────────────────────────────────
      if (bgMM > 0) {
        svg += `<rect x="${tx(0)}" y="${ty(bgMM)}" width="${drawW}" height="${bgMM * scale}" fill="#fafafa" stroke="none"/>`;
        svg += `<text x="${tx(runMM) + 4}" y="${ty(bgMM / 2)}" fill="#9ca3af" font-size="9" dominant-baseline="middle">${bgMM}mm</text>`;
      }

      // ── Vertical infill members ───────────────────────────────────────────
      const memberTop    = heightMM - HANDRAIL_OFFSET - 10;   // just below handrail
      const memberBottom = bgMM + BOTTOM_RAIL_H + 2;          // just above bottom rail

      baysInfo.forEach(({ memberPositions }) => {
        memberPositions.forEach(({ xMM, wMM }) => {
          const pxW = Math.max(1.5, wMM * scale);
          const pxX = tx(xMM) - pxW / 2;
          const pxTop    = ty(memberTop);
          const pxBottom = ty(memberBottom);
          const pxH = Math.abs(pxBottom - pxTop);
          svg += `<rect x="${pxX}" y="${pxTop}" width="${pxW}" height="${Math.max(2, pxH)}" fill="${memberColour}" opacity="0.75" rx="0.5"/>`;
        });
      });

      // ── Bottom rail ───────────────────────────────────────────────────────
      const railH = Math.max(2.5, BOTTOM_RAIL_H * scale);
      svg += `<rect x="${tx(0)}" y="${ty(bgMM + BOTTOM_RAIL_H)}" width="${drawW}" height="${railH}" fill="#78716c" rx="0.5"/>`;

      // ── 3-Rail mid-rail ───────────────────────────────────────────────────
      if (fenceStyle === '3-Rail') {
        const midRailMM = bgMM + BOTTOM_RAIL_H + (heightMM - bgMM - BOTTOM_RAIL_H) * 0.45;
        svg += `<rect x="${tx(0)}" y="${ty(midRailMM + 8)}" width="${drawW}" height="${Math.max(2.5, 16 * scale)}" fill="#78716c" opacity="0.7" rx="0.5"/>`;
      }

      // ── Handrail ──────────────────────────────────────────────────────────
      svg += `<line x1="${tx(0)}" y1="${ty(heightMM - HANDRAIL_OFFSET)}" x2="${tx(runMM)}" y2="${ty(heightMM - HANDRAIL_OFFSET)}" stroke="#1e3a5f" stroke-width="3.5" stroke-linecap="round"/>`;

      // ── Posts (drawn on top of members) ───────────────────────────────────
      const postPxW = Math.max(3, POST_WIDTH_MM * scale);
      postXs.forEach((pxMM) => {
        svg += `<rect x="${tx(pxMM) - postPxW / 2}" y="${ty(heightMM)}" width="${postPxW}" height="${drawH}" fill="#1e293b" stroke="#475569" stroke-width="0.5" rx="1"/>`;
      });

      // ── Wall-end hatching ─────────────────────────────────────────────────
      const hatchLine = (x) => {
        for (let hMM = 0; hMM < heightMM; hMM += 80) {
          svg += `<line x1="${x - 6}" y1="${ty(hMM + 40)}" x2="${x + 6}" y2="${ty(hMM)}" stroke="#9ca3af" stroke-width="1.5"/>`;
        }
        svg += `<line x1="${x}" y1="${ty(0)}" x2="${x}" y2="${ty(heightMM)}" stroke="#9ca3af" stroke-width="2" stroke-dasharray="4 3"/>`;
      };
      if (start === 'wall') hatchLine(tx(0));
      if (end   === 'wall') hatchLine(tx(runMM));

      // ── Dimension line: total length (above run) ──────────────────────────
      const dimTopY = yTop - 16;
      const tickLen = 5;
      svg += `<line x1="${tx(0)}"     y1="${ty(heightMM) - 4}" x2="${tx(0)}"     y2="${dimTopY}" stroke="#94a3b8" stroke-width="0.5"/>`;
      svg += `<line x1="${tx(runMM)}" y1="${ty(heightMM) - 4}" x2="${tx(runMM)}" y2="${dimTopY}" stroke="#94a3b8" stroke-width="0.5"/>`;
      svg += `<line x1="${tx(0)}" y1="${dimTopY}" x2="${tx(runMM)}" y2="${dimTopY}" stroke="#64748b" stroke-width="0.75"/>`;
      svg += `<line x1="${tx(0)}"     y1="${dimTopY - tickLen / 2}" x2="${tx(0)}"     y2="${dimTopY + tickLen / 2}" stroke="#64748b" stroke-width="0.75"/>`;
      svg += `<line x1="${tx(runMM)}" y1="${dimTopY - tickLen / 2}" x2="${tx(runMM)}" y2="${dimTopY + tickLen / 2}" stroke="#64748b" stroke-width="0.75"/>`;
      const dimMidX = (tx(0) + tx(runMM)) / 2;
      svg += `<text x="${dimMidX}" y="${dimTopY - 4}" fill="#475569" font-size="10" font-weight="500" text-anchor="middle">${runMM}mm</text>`;
      svg += `<text x="${dimMidX}" y="${dimTopY + 10}" fill="#1e3a5f" font-size="10" font-weight="700" text-anchor="middle">Run ${run.label}</text>`;

      // ── Dimension line: height (left of run) ─────────────────────────────
      const dimLeftX = tx(0) - 20;
      svg += `<line x1="${tx(0) - 4}" y1="${ty(0)}"        x2="${dimLeftX + 4}" y2="${ty(0)}"        stroke="#94a3b8" stroke-width="0.5"/>`;
      svg += `<line x1="${tx(0) - 4}" y1="${ty(heightMM)}" x2="${dimLeftX + 4}" y2="${ty(heightMM)}" stroke="#94a3b8" stroke-width="0.5"/>`;
      svg += `<line x1="${dimLeftX}" y1="${ty(0)}" x2="${dimLeftX}" y2="${ty(heightMM)}" stroke="#64748b" stroke-width="0.75"/>`;
      svg += `<line x1="${dimLeftX - tickLen / 2}" y1="${ty(0)}"        x2="${dimLeftX + tickLen / 2}" y2="${ty(0)}"        stroke="#64748b" stroke-width="0.75"/>`;
      svg += `<line x1="${dimLeftX - tickLen / 2}" y1="${ty(heightMM)}" x2="${dimLeftX + tickLen / 2}" y2="${ty(heightMM)}" stroke="#64748b" stroke-width="0.75"/>`;
      const dimMidY = (ty(0) + ty(heightMM)) / 2;
      svg += `<text x="${dimLeftX - 6}" y="${dimMidY}" fill="#475569" font-size="10" font-weight="500" text-anchor="middle" dominant-baseline="middle" transform="rotate(-90,${dimLeftX - 6},${dimMidY})">${heightMM}mm H</text>`;

      // ── Bay width annotations ─────────────────────────────────────────────
      if (bays > 1 && drawW > 80) {
        for (let b = 0; b < bays; b++) {
          const bayMidX  = tx(b * bayCc + bayCc / 2);
          const bayLabelY = ty(heightMM) + drawH / 2;
          svg += `<text x="${bayMidX}" y="${bayLabelY}" fill="#94a3b8" font-size="9" text-anchor="middle" dominant-baseline="middle">${Math.round(bayCc)}mm</text>`;
        }
      }

      // ── Member count annotation ───────────────────────────────────────────
      if (drawH > 60 && baysInfo.length > 0) {
        const firstBayCount = baysInfo[0].memberPositions.length;
        svg += `<text x="${tx(runMM) + 5}" y="${ty(heightMM) + drawH / 2}" fill="#94a3b8" font-size="9" dominant-baseline="middle">${firstBayCount} ${memberLabel.toLowerCase()}s</text>`;
      }

      yOffset = yTop + drawH + RUN_GAP;
    });

    svg += `</svg>`;
    containerRef.current.innerHTML = svg;
  }, [runs, infillType, fenceStyle]);

  useEffect(() => { draw(); }, [draw]);
  useEffect(() => {
    const onResize = () => draw();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [draw]);

  return <div ref={containerRef} className="w-full" />;
}
