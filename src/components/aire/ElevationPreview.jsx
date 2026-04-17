'use client';
import React, { useRef, useEffect, useCallback } from 'react';

/**
 * Front-elevation SVG preview for the AIRE+ Horizontal Slat calculator.
 *
 * Shows each run as a scaled front view with:
 *   - Posts (dark vertical bars) at each post position
 *   - Horizontal slat rows at 74mm pitch (65mm face + 9mm gap)
 *   - Bottom rail at the base
 *   - Handrail at the top
 *   - Dimension lines: overall length (top) and height (left)
 *   - Bay width annotations between posts
 *   - Wall-end hatching for 'wall' end types
 */

const SLAT_PITCH_MM  = 74;   // 65mm face + 9mm gap
const SLAT_FACE_MM   = 65;   // visible slat height
const POST_WIDTH_MM  = 50;
const DEFAULT_BG_MM  = 88;

export default function ElevationPreview({ runs }) {
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

    // ── Per-run layout calculations ─────────────────────────────────────────
    const layouts = activeRuns.map((run) => {
      const runMM     = Math.max(300, run.length);
      const heightMM  = Math.max(300, run.height || 1000);
      const bgMM      = run.bottomGap !== undefined ? Math.max(0, run.bottomGap) : DEFAULT_BG_MM;
      const spanLimit = Math.max(300, Math.min(1800, run.maxPostSpan || 1800));
      const bays      = Math.max(1, Math.ceil(runMM / spanLimit));
      const bayCc     = runMM / bays;

      const clearHeight = heightMM - bgMM;
      const slatRows    = Math.max(0, Math.floor(clearHeight / SLAT_PITCH_MM));

      const start = run.end1 || 'post';
      const end   = run.end2 || 'post';

      // Post x-positions in mm (world coords)
      const postXs = [];
      if (start !== 'wall') postXs.push(0);
      for (let i = 1; i < bays; i++) postXs.push(Math.round(i * bayCc));
      if (end !== 'wall') postXs.push(runMM);

      return { run, runMM, heightMM, bgMM, bays, bayCc, slatRows, postXs, start, end };
    });

    // ── Canvas dimensions ───────────────────────────────────────────────────
    const LEGEND_H   = 36;
    const TOP_PAD    = 28;   // space above each run for length dimension
    const BOTTOM_PAD = 10;
    const LEFT_PAD   = 52;   // space for height dimension label
    const RIGHT_PAD  = 20;
    const RUN_GAP    = 28;   // vertical gap between runs

    // Aspect ratio: scale each run so height ≤ 180px, cap so wide runs don't get tiny
    const drawableW = cw - LEFT_PAD - RIGHT_PAD;
    const runSections = layouts.map(({ runMM, heightMM }) => {
      const scaleX  = drawableW / runMM;
      const maxRunH = 200;
      const scaleY  = maxRunH / heightMM;
      const scale   = Math.min(scaleX, scaleY, 0.3); // never bigger than 0.3 px/mm
      return { drawW: runMM * scale, drawH: heightMM * scale, scale };
    });

    const totalRunsH = runSections.reduce(
      (sum, s) => sum + TOP_PAD + s.drawH + RUN_GAP, 0
    );
    const ch = LEGEND_H + totalRunsH + BOTTOM_PAD;

    let svg = `<svg width="${cw}" height="${ch}" xmlns="http://www.w3.org/2000/svg" style="background:#f8fafc; font-family:Inter,system-ui,sans-serif;">`;

    // Background rect
    svg += `<rect width="${cw}" height="${ch}" fill="#f8fafc"/>`;

    // Subtle grid
    for (let x = 0; x < cw; x += 24)
      svg += `<line x1="${x}" y1="0" x2="${x}" y2="${ch}" stroke="rgba(59,130,246,.05)" stroke-width="1"/>`;
    for (let y = 0; y < ch; y += 24)
      svg += `<line x1="0" y1="${y}" x2="${cw}" y2="${y}" stroke="rgba(59,130,246,.05)" stroke-width="1"/>`;

    // ── Legend ───────────────────────────────────────────────────────────────
    const lx = 12, ly = 18;
    // Post
    svg += `<rect x="${lx}" y="${ly - 6}" width="8" height="12" fill="#1e293b" rx="1"/>`;
    svg += `<text x="${lx + 12}" y="${ly + 4}" fill="#475569" font-size="10">Post</text>`;
    // Slat
    svg += `<rect x="${lx + 60}" y="${ly - 4}" width="16" height="8" fill="#3b82f6" opacity="0.7" rx="1"/>`;
    svg += `<text x="${lx + 82}" y="${ly + 4}" fill="#475569" font-size="10">Slat</text>`;
    // Bottom rail
    svg += `<line x1="${lx + 120}" y1="${ly}" x2="${lx + 136}" y2="${ly}" stroke="#78716c" stroke-width="5" stroke-linecap="round"/>`;
    svg += `<text x="${lx + 142}" y="${ly + 4}" fill="#475569" font-size="10">Bottom Rail</text>`;
    // Handrail
    svg += `<line x1="${lx + 220}" y1="${ly}" x2="${lx + 236}" y2="${ly}" stroke="#1e3a5f" stroke-width="4" stroke-linecap="round"/>`;
    svg += `<text x="${lx + 242}" y="${ly + 4}" fill="#475569" font-size="10">Handrail</text>`;

    // ── Draw each run ────────────────────────────────────────────────────────
    let yOffset = LEGEND_H;

    layouts.forEach(({ run, runMM, heightMM, bgMM, bays, bayCc, slatRows, postXs, start, end }, i) => {
      const { drawW, drawH, scale } = runSections[i];

      // Centre run horizontally
      const xOff = LEFT_PAD + (drawableW - drawW) / 2;
      const yTop  = yOffset + TOP_PAD;  // top-left corner of run box

      // Coordinate transforms: x left→right, y bottom→top (flip for SVG)
      const tx = (xMM) => xOff + xMM * scale;
      const ty = (yMM) => yTop + (heightMM - yMM) * scale;

      // ── Run background ────────────────────────────────────────────────────
      svg += `<rect x="${tx(0)}" y="${ty(heightMM)}" width="${drawW}" height="${drawH}" fill="white" stroke="#e2e8f0" stroke-width="1" rx="2"/>`;

      // ── Bottom gap zone (subtle fill) ─────────────────────────────────────
      if (bgMM > 0) {
        svg += `<rect x="${tx(0)}" y="${ty(bgMM)}" width="${drawW}" height="${bgMM * scale}" fill="#fafafa" stroke="none"/>`;
        // Bottom gap annotation
        svg += `<text x="${tx(runMM) + 4}" y="${ty(bgMM / 2)}" fill="#9ca3af" font-size="9" dominant-baseline="middle">${bgMM}mm</text>`;
      }

      // ── Slat rows ─────────────────────────────────────────────────────────
      for (let s = 0; s < slatRows; s++) {
        const slatBottomMM = bgMM + s * SLAT_PITCH_MM;
        const slatTopMM    = slatBottomMM + SLAT_FACE_MM;
        const slatH        = SLAT_FACE_MM * scale;
        svg += `<rect x="${tx(0)}" y="${ty(slatTopMM)}" width="${drawW}" height="${Math.max(1.5, slatH)}" fill="#3b82f6" opacity="0.65" rx="0.5"/>`;
      }

      // ── Bottom rail (at y ≈ 0 to 16mm, heavier bar) ──────────────────────
      const railH = Math.max(2.5, 16 * scale);
      svg += `<rect x="${tx(0)}" y="${ty(16)}" width="${drawW}" height="${railH}" fill="#78716c" rx="0.5"/>`;

      // ── Handrail (at y = heightMM - 30 to heightMM) ──────────────────────
      svg += `<line x1="${tx(0)}" y1="${ty(heightMM - 15)}" x2="${tx(runMM)}" y2="${ty(heightMM - 15)}" stroke="#1e3a5f" stroke-width="3.5" stroke-linecap="round"/>`;

      // ── Posts ─────────────────────────────────────────────────────────────
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

      // ── Bay width annotations (between middle posts) ──────────────────────
      if (bays > 1 && drawW > 80) {
        for (let b = 0; b < bays; b++) {
          const bayStartMM = b * bayCc;
          const bayEndMM   = (b + 1) * bayCc;
          const bayMidX    = tx(bayStartMM + bayCc / 2);
          const bayLabelY  = ty(heightMM) + drawH / 2;
          svg += `<text x="${bayMidX}" y="${bayLabelY}" fill="#94a3b8" font-size="9" text-anchor="middle" dominant-baseline="middle">${Math.round(bayCc)}mm</text>`;
        }
      }

      // ── Slat count annotation (right side) ───────────────────────────────
      if (drawH > 60) {
        svg += `<text x="${tx(runMM) + 5}" y="${ty(heightMM) + drawH / 2}" fill="#94a3b8" font-size="9" dominant-baseline="middle">${slatRows} slats</text>`;
      }

      yOffset = yTop + drawH + RUN_GAP;
    });

    svg += `</svg>`;
    containerRef.current.innerHTML = svg;
  }, [runs]);

  useEffect(() => { draw(); }, [draw]);
  useEffect(() => {
    const onResize = () => draw();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [draw]);

  return <div ref={containerRef} className="w-full" />;
}
