import React, { useState, useEffect, useRef, useCallback } from 'react';
import { calculateQuoteV5, solveRunPanels, buildLayoutGeometry } from '@/lib/calculationEngine';
import { COST_MAP } from '@/lib/costData';
import { STYLE_CONFIG, STYLE_DEFS, SHAPE_MAP, MOUNT_TYPES, GATE_MODES } from '@/lib/styleConfig';
import SaveProjectModal from '@/components/SaveProjectModal';

/**
 * AluminiumCalculator — Complete React port of expert-fence-quote-calculator-v2.php
 * Standalone component with all UI features, SVG preview, PDF generation, and API integration.
 */

// ── Session persistence ──────────────────────────────────────────────
const AL_STORAGE_KEY = "ef_aluminium_calc_state";

function loadSavedAlState() {
  try {
    const raw = typeof window !== "undefined" && sessionStorage.getItem(AL_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function saveAlState(state) {
  try {
    if (typeof window !== "undefined") {
      sessionStorage.setItem(AL_STORAGE_KEY, JSON.stringify(state));
    }
  } catch { /* ignore */ }
}

export default function AluminiumCalculator({
  apiBase = '/api',
}) {
  // ─── State (defaults only — sessionStorage restored after hydration) ────
  const [selectedStyle, setSelectedStyle] = useState('Tubular');
  const [colour, setColour] = useState('Black');
  const [mount, setMount] = useState('Surface');
  const [shape, setShape] = useState('Straight');
  const [runs, setRuns] = useState([{ length_mm: 6000, gate: true, gate_mode: 'End', gate_after_panel: 1 }]);
  const [autoCalc, setAutoCalc] = useState(true);
  const [lastQuote, setLastQuote] = useState(null);
  const [errors, setErrors] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [svgKey, setSvgKey] = useState(0);

  // ── Project save/load state ──────────────────────────────────────────
  const [projectId, setProjectId] = useState(null);
  const [projectName, setProjectName] = useState("");
  const [calculationId, setCalculationId] = useState(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [hydrated, setHydrated] = useState(false);

  const autoCalcTimer = useRef(null);
  const canvasRef = useRef(null);

  // Restore sessionStorage state after hydration (avoids server/client mismatch)
  useEffect(() => {
    const saved = loadSavedAlState();
    if (saved) {
      if (saved.selectedStyle) setSelectedStyle(saved.selectedStyle);
      if (saved.colour) setColour(saved.colour);
      if (saved.mount) setMount(saved.mount);
      if (saved.shape) setShape(saved.shape);
      if (saved.runs) setRuns(saved.runs);
      if (saved.projectId) setProjectId(saved.projectId);
      if (saved.projectName) setProjectName(saved.projectName);
      if (saved.calculationId) setCalculationId(saved.calculationId);
    }
    setHydrated(true);
  }, []);

  // Save session state on every change (only after hydration)
  useEffect(() => {
    if (!hydrated) return;
    saveAlState({ selectedStyle, colour, mount, shape, runs, projectId, projectName, calculationId });
  }, [selectedStyle, colour, mount, shape, runs, projectId, projectName, calculationId, hydrated]);

  // Load calculation from URL param on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const calcId = params.get("calc");
    if (calcId) {
      fetch(`/api/calculations/${calcId}`)
        .then((r) => r.json())
        .then((data) => {
          if (!data.calculation) return;
          const s = data.calculation.calculator_state || {};
          if (s.selectedStyle) setSelectedStyle(s.selectedStyle);
          if (s.colour) setColour(s.colour);
          if (s.mount) setMount(s.mount);
          if (s.shape) setShape(s.shape);
          if (s.runs) setRuns(s.runs);
          setProjectId(data.project.id);
          setProjectName(data.project.name);
          setCalculationId(data.calculation.id);
        })
        .catch(() => {});
    } else {
      // Legacy: load by project id
      const loadId = params.get("project");
      if (!loadId) return;
      fetch(`/api/projects/${loadId}`)
        .then((r) => r.json())
        .then((data) => {
          if (!data.project) return;
          const p = data.project;
          const calc = p.calculations?.find((c) => c.calculator_type === "aluminium");
          const s = calc?.calculator_state || p.calculator_state || {};
          if (s.selectedStyle) setSelectedStyle(s.selectedStyle);
          if (s.colour) setColour(s.colour);
          if (s.mount) setMount(s.mount);
          if (s.shape) setShape(s.shape);
          if (s.runs) setRuns(s.runs);
          setProjectId(p.id);
          setProjectName(p.name);
          if (calc) setCalculationId(calc.id);
        })
        .catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleProjectSaved({ projectId: pid, projectName: pname, calculationId: cid }) {
    setProjectId(pid);
    setProjectName(pname);
    if (cid) setCalculationId(cid);
    setSaveMsg("Saved");
    setTimeout(() => setSaveMsg(""), 2000);
  }

  // ─── Helpers ────────────────────────────────────────────────────────────

  function money(v) {
    return '$' + Number(v || 0).toFixed(2);
  }

  function esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function trackEvent(name, params) {
    if (typeof window.gtag === 'function') {
      window.gtag('event', name, { calculator_type: 'fencing_quote', ...params });
    }
  }

  // ─── Style & Config Logic ───────────────────────────────────────────────

  const panelMaxForStyle = (style) => {
    const cfg = STYLE_CONFIG[style];
    return cfg ? cfg.panel_max_mm : 2450;
  };

  const allowedColoursForStyle = (style) => {
    const cfg = STYLE_CONFIG[style];
    return cfg ? cfg.colours : ['Black'];
  };

  const postWidthForStyle = (style) => {
    const cfg = STYLE_CONFIG[style];
    return cfg ? cfg.post_width_mm : 50;
  };

  // ─── Run Management ─────────────────────────────────────────────────────

  const updateRun = (index, updates) => {
    setRuns((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], ...updates };
      return updated;
    });
  };

  const addRun = () => {
    if (shape !== 'Straight' || runs.length >= 5) return;
    setRuns((prev) => [...prev, { length_mm: 6000, gate: false, gate_mode: 'End', gate_after_panel: 1 }]);
  };

  const deleteRun = (index) => {
    if (runs.length <= 1) return;
    setRuns((prev) => prev.filter((_, i) => i !== index));
  };

  const syncBoxOppositeLengths = useCallback((changedIndex) => {
    if (shape !== 'Box' || runs.length !== 4) return;
    const opposite = changedIndex === 0 ? 2 : changedIndex === 2 ? 0 : changedIndex === 1 ? 3 : changedIndex === 3 ? 1 : -1;
    if (opposite < 0) return;
    const sourceLen = runs[changedIndex].length_mm;
    if (runs[opposite].length_mm !== sourceLen) {
      updateRun(opposite, { length_mm: sourceLen });
    }
  }, [shape, runs]);

  const getMaxPanelsForRun = (index) => {
    const r = runs[index];
    if (!r) return 1;
    const runMm = r.length_mm || 0;
    const hasGate = !!r.gate;
    const postWidth = postWidthForStyle(selectedStyle);
    const endOffset = postWidth / 2;
    const gateOpening = 1062;
    const panelMax = panelMaxForStyle(selectedStyle);
    const panelCC = Math.max(0, runMm - 2 * endOffset - (hasGate ? gateOpening : 0));
    return Math.max(1, Math.ceil(panelCC / panelMax));
  };

  // ─── Shape Changes ──────────────────────────────────────────────────────

  const changeShape = (newShape) => {
    setShape(newShape);
    const runMap = { Straight: 1, 'L-shape': 2, 'U-shape': 3, Box: 4 };
    const targetRunCount = runMap[newShape] || 1;
    let newRuns = [...runs];
    while (newRuns.length < targetRunCount) {
      newRuns.push({ length_mm: 6000, gate: false, gate_mode: 'End', gate_after_panel: 1 });
    }
    while (newRuns.length > targetRunCount) {
      newRuns.pop();
    }
    if (newShape === 'Straight' && newRuns.length === 0) {
      newRuns = [{ length_mm: 6000, gate: true, gate_mode: 'End', gate_after_panel: 1 }];
    }
    setRuns(newRuns);
  };

  // ─── Colour Sync ────────────────────────────────────────────────────────

  useEffect(() => {
    const allowed = allowedColoursForStyle(selectedStyle);
    if (!allowed.includes(colour)) {
      setColour(allowed[0]);
    }
  }, [selectedStyle, colour]);

  // ─── Auto-Calculate ─────────────────────────────────────────────────────

  const runCalculation = useCallback(async () => {
    setErrors('');
    const runCount = runs.filter((r) => r.length_mm > 0).length;
    const payload = {
      style: selectedStyle,
      colour,
      mount,
      shape,
      runs,
      shared_corners: { Straight: 0, 'L-shape': 1, 'U-shape': 2, Box: 4 }[shape] ?? Math.max(0, runCount - 1),
    };

    try {
      const response = await fetch(`${apiBase}/quote/calculate-v5`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Quote API error ${response.status}: ${text.slice(0, 180)}`);
      }

      const data = await response.json();
      setLastQuote(data);
      trackEvent('calculate_quote', {
        quote_id: data.quote_id || '',
        quote_value: Number(data.summary?.total_ex_gst || 0),
        value: Number(data.summary?.total_ex_gst || 0),
        currency: 'AUD',
        fence_type: selectedStyle,
      });
    } catch (err) {
      setErrors(`Error: ${err.message}`);
    }
  }, [selectedStyle, colour, mount, shape, runs, apiBase]);

  const scheduleAutoCalc = useCallback(() => {
    if (!autoCalc) return;
    if (autoCalcTimer.current) clearTimeout(autoCalcTimer.current);
    autoCalcTimer.current = setTimeout(() => {
      runCalculation();
    }, 350);
  }, [autoCalc, runCalculation]);

  // ─── SVG Preview ────────────────────────────────────────────────────────

  const drawPreview = useCallback(() => {
    if (!canvasRef.current) return;

    const cw = Math.max(320, canvasRef.current.clientWidth || 520);
    const isStraight = shape === 'Straight';
    const postWidth = postWidthForStyle(selectedStyle);
    const panelMax = panelMaxForStyle(selectedStyle);
    const gateOpening = 1062;

    const validRuns = runs.filter((r) => Number(r.length_mm || 0) > 0);
    const validRunCount = validRuns.length;

    const runUnitHeight = 90;
    const labelHeight = 20;
    const dimHeight = 18;
    const gapBetweenRuns = 10;
    const contentHeight = validRunCount * runUnitHeight + (validRunCount - 1) * gapBetweenRuns;

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

    // STRAIGHT RUNS DRAWING
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

        // Solve panels
        const hasGate = !!r.gate;
        const gateMode = r.gate_mode || (hasGate ? 'End' : '-');
        const endOffset = postWidth / 2;
        const solved = solveRunPanels(runMm, hasGate, gateMode, r.gate_after_panel, panelMax, gateOpening, endOffset, selectedStyle);
        const panelCount = solved.panel_qty;
        const panelCC = solved.panel_cc_available;
        const gateAfter = solved.gate_after;

        // Build panel chain
        let chain = [];
        let gateIndex = null;
        if (hasGate && gateMode === 'Centre') {
          const panelsEachSide = Math.max(1, Math.floor(panelCount / 2));
          const each = (panelCC / 2) / panelsEachSide;
          chain = [...Array(panelsEachSide).fill(each), ...Array(panelsEachSide).fill(each)];
          gateIndex = panelsEachSide;
        } else {
          const each = panelCC / panelCount;
          chain = Array(panelCount).fill(each);
          gateIndex = hasGate ? gateAfter : null;
        }

        // Build post positions + segment info
        const runPosts = [];
        const panelSegments = [];
        const gateSegments = [];
        let xCoord = 0;
        runPosts.push(xCoord);

        chain.forEach((seg, idx) => {
          if (hasGate && gateIndex === 0 && idx === 0) {
            const gateStart = xCoord;
            xCoord += gateOpening;
            gateSegments.push({ start: gateStart, end: xCoord, mm: Math.round(gateOpening) });
            runPosts.push(xCoord);
          }

          const panelStart = xCoord;
          xCoord += seg;
          panelSegments.push({ start: panelStart, end: xCoord, mm: Math.round(seg) });
          runPosts.push(xCoord);

          if (hasGate && gateIndex === idx + 1) {
            const gateStart = xCoord;
            xCoord += gateOpening;
            gateSegments.push({ start: gateStart, end: xCoord, mm: Math.round(gateOpening) });
            runPosts.push(xCoord);
          }
        });

        // Draw panels (dark blue bars)
        panelSegments.forEach((seg) => {
          const px1 = x1 + (seg.start / runMm) * lenPx;
          const px2 = x1 + (seg.end / runMm) * lenPx;
          svg += `<line x1="${px1}" y1="${y}" x2="${px2}" y2="${y}" stroke="#1e3a5f" stroke-width="8" stroke-linecap="round"/>`;
        });

        // Draw gates (amber dashed)
        gateSegments.forEach((seg) => {
          const gx1 = x1 + (seg.start / runMm) * lenPx;
          const gx2 = x1 + (seg.end / runMm) * lenPx;
          svg += `<line x1="${gx1}" y1="${y}" x2="${gx2}" y2="${y}" stroke="#f59e0b" stroke-width="6" stroke-dasharray="6 4" stroke-linecap="round"/>`;
        });

        // Draw posts (dark squares)
        runPosts.forEach((postCoord) => {
          const px = x1 + (postCoord / runMm) * lenPx;
          svg += `<rect x="${px - 5}" y="${y - 5}" width="10" height="10" fill="#1e293b" stroke="#64748b" stroke-width="1" rx="1.5"/>`;
        });

        // Dimension line above the run (matching shaped layout style)
        const dimY = y - 20;
        const tickLen = 6;
        // Extension lines from fence to dimension line
        svg += `<line x1="${x1}" y1="${y - 8}" x2="${x1}" y2="${dimY}" stroke="#94a3b8" stroke-width="0.5"/>`;
        svg += `<line x1="${x2}" y1="${y - 8}" x2="${x2}" y2="${dimY}" stroke="#94a3b8" stroke-width="0.5"/>`;
        // Dimension line
        svg += `<line x1="${x1}" y1="${dimY}" x2="${x2}" y2="${dimY}" stroke="#64748b" stroke-width="0.75"/>`;
        // Tick marks
        svg += `<line x1="${x1}" y1="${dimY - tickLen / 2}" x2="${x1}" y2="${dimY + tickLen / 2}" stroke="#64748b" stroke-width="0.75"/>`;
        svg += `<line x1="${x2}" y1="${dimY - tickLen / 2}" x2="${x2}" y2="${dimY + tickLen / 2}" stroke="#64748b" stroke-width="0.75"/>`;
        // Measurement above the dimension line
        const dimMid = (x1 + x2) / 2;
        svg += `<text x="${dimMid}" y="${dimY - 6}" fill="#475569" font-family="Inter,system-ui,sans-serif" font-size="10" font-weight="500" text-anchor="middle">${runMm}mm</text>`;
        // Run label below the dimension line
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
      // SHAPED LAYOUTS (L-shape, U-shape, Box)
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

      // Compute centre of the shape for inside/outside detection
      const cx = posts.reduce((s, p) => s + tx(p[0]), 0) / posts.length;
      const cy = posts.reduce((s, p) => s + ty(p[1]), 0) / posts.length;

      // Interior fill
      if ((shape === 'Box' || shape === 'U-shape') && posts.length >= 3) {
        const polyPoints = posts.map((p) => `${tx(p[0])},${ty(p[1])}`).join(' ');
        svg += `<polygon points="${polyPoints}" fill="#f1f5f9" opacity="0.4"/>`;
      }

      // Panel lines
      panels.forEach((seg) => {
        svg += `<line x1="${tx(seg.x1)}" y1="${ty(seg.y1)}" x2="${tx(seg.x2)}" y2="${ty(seg.y2)}" stroke="#1e3a5f" stroke-width="8" stroke-linecap="round"/>`;
      });

      // Gate lines
      gates.forEach((g) => {
        svg += `<line x1="${tx(g.x1)}" y1="${ty(g.y1)}" x2="${tx(g.x2)}" y2="${ty(g.y2)}" stroke="#f59e0b" stroke-width="6" stroke-dasharray="6 4" stroke-linecap="round"/>`;
      });

      // Posts
      posts.forEach((p) => {
        const px = tx(p[0]);
        const py = ty(p[1]);
        svg += `<rect x="${px - 5}" y="${py - 5}" width="10" height="10" fill="#1e293b" stroke="#64748b" stroke-width="1" rx="1.5"/>`;
      });

      // ── Architectural dimension lines per run ──
      // Each run gets one clean dimension line offset outside the shape
      const dimOffset = 28; // px offset from the fence line
      const tickLen = 6;    // perpendicular tick length

      let segIdx = 0;
      runs.forEach((r, runIdx) => {
        if (segIdx >= panels.length) return;
        const runMm = Number(r.length_mm || 0);
        if (runMm <= 0) { segIdx++; return; }

        const hasGate = !!r.gate;
        const gateMode = r.gate_mode || (hasGate ? 'End' : '-');
        const solved = solveRunPanels(runMm, hasGate, gateMode, r.gate_after_panel, panelMax, gateOpening, postWidth / 2, selectedStyle);
        const lastSegIdx = Math.min(segIdx + solved.panel_qty - 1, panels.length - 1);
        const firstSeg = panels[segIdx];
        const lastSeg = panels[lastSegIdx];

        // Run start and end points in screen coords
        const sx = tx(firstSeg.x1), sy = ty(firstSeg.y1);
        const ex = tx(lastSeg.x2), ey = ty(lastSeg.y2);

        // Direction of this run
        const rdx = ex - sx, rdy = ey - sy;
        const rLen = Math.sqrt(rdx * rdx + rdy * rdy);
        if (rLen < 1) { segIdx += solved.panel_qty; return; }

        // Unit direction along the run
        const ux = rdx / rLen, uy = rdy / rLen;
        // Perpendicular — point AWAY from shape centre
        let nx = -uy, ny = ux;
        const midSx = (sx + ex) / 2, midSy = (sy + ey) / 2;
        const toCentreX = cx - midSx, toCentreY = cy - midSy;
        if (nx * toCentreX + ny * toCentreY > 0) { nx = -nx; ny = -ny; }

        // Dimension line endpoints (offset from the run)
        const d1x = sx + nx * dimOffset, d1y = sy + ny * dimOffset;
        const d2x = ex + nx * dimOffset, d2y = ey + ny * dimOffset;

        // Extension lines (from fence to dimension line)
        svg += `<line x1="${sx + nx * 8}" y1="${sy + ny * 8}" x2="${d1x}" y2="${d1y}" stroke="#94a3b8" stroke-width="0.5"/>`;
        svg += `<line x1="${ex + nx * 8}" y1="${ey + ny * 8}" x2="${d2x}" y2="${d2y}" stroke="#94a3b8" stroke-width="0.5"/>`;

        // Dimension line itself
        svg += `<line x1="${d1x}" y1="${d1y}" x2="${d2x}" y2="${d2y}" stroke="#64748b" stroke-width="0.75"/>`;

        // Tick marks at each end (perpendicular to the dimension line)
        svg += `<line x1="${d1x - ny * tickLen / 2}" y1="${d1y + nx * tickLen / 2}" x2="${d1x + ny * tickLen / 2}" y2="${d1y - nx * tickLen / 2}" stroke="#64748b" stroke-width="0.75"/>`;
        svg += `<line x1="${d2x - ny * tickLen / 2}" y1="${d2y + nx * tickLen / 2}" x2="${d2x + ny * tickLen / 2}" y2="${d2y - nx * tickLen / 2}" stroke="#64748b" stroke-width="0.75"/>`;

        // Label text — "Side A — 6000mm"
        const sideLabels = ['A', 'B', 'C', 'D'];
        const sideLabel = sideLabels[runIdx % sideLabels.length];
        // Rotate text to follow the dimension line direction
        const angleDeg = Math.atan2(rdy, rdx) * (180 / Math.PI);
        const displayAngle = (angleDeg > 90 || angleDeg < -90) ? angleDeg + 180 : angleDeg;

        // Measurement on the outside of the dimension line (away from shape)
        const measX = (d1x + d2x) / 2 + nx * 10;
        const measY = (d1y + d2y) / 2 + ny * 10;
        svg += `<text x="${measX}" y="${measY}" fill="#475569" font-family="Inter,system-ui,sans-serif" font-size="10" font-weight="500" text-anchor="middle" dominant-baseline="middle" transform="rotate(${displayAngle.toFixed(1)},${measX},${measY})">${runMm}mm</text>`;

        // Side label on the inside of the dimension line (toward shape)
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

  // ─── Trigger redraw on dependencies ─────────────────────────────────────

  useEffect(() => {
    drawPreview();
  }, [drawPreview, svgKey]);

  // ─── PDF Generation ─────────────────────────────────────────────────────

  const validateCustomerDetails = () => {
    if (!customerName.trim()) {
      setErrors('Customer name is required.');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerEmail)) {
      setErrors('Valid customer email is required.');
      return false;
    }
    const digits = customerPhone.replace(/\D/g, '');
    if (digits.length < 8) {
      setErrors('Valid customer phone is required.');
      return false;
    }
    return true;
  };

  const generatePdf = async () => {
    if (!lastQuote) return;
    if (!validateCustomerDetails()) return;

    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      let y = 42;
      const left = 40;
      const right = 555;
      const lineH = 16;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text('Expert Fence Quote', left, y);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Quote: ${lastQuote.quote_id || ''}`, right, y, { align: 'right' });
      y += 18;
      doc.text(`Date: ${new Date().toLocaleDateString()}`, right, y, { align: 'right' });
      y += 18;
      doc.text(`Customer: ${customerName}`, left, y);
      y += 14;
      doc.text(`Email: ${customerEmail}`, left, y);
      y += 14;
      doc.text(`Phone: ${customerPhone}`, left, y);
      y += 14;
      doc.text(
        `Project: ${lastQuote.style || ''} • ${lastQuote.colour || ''} • ${lastQuote.shape || ''} • ${lastQuote.mount || ''}`,
        left,
        y
      );
      y += 18;

      doc.setFont('helvetica', 'bold');
      doc.text('Item', left, y);
      doc.text('Qty', 320, y, { align: 'right' });
      doc.text('Unit (ex)', 430, y, { align: 'right' });
      doc.text('Line (ex)', 540, y, { align: 'right' });
      y += 8;
      doc.line(left, y, 555, y);
      y += 14;
      doc.setFont('helvetica', 'normal');

      (lastQuote.bom || []).forEach((li) => {
        if (y > 760) {
          doc.addPage();
          y = 42;
        }
        doc.text(String(li.Item || ''), left, y, { maxWidth: 250 });
        doc.text(String(Number(li.Qty || 0)), 320, y, { align: 'right' });
        doc.text(`$${Number(li['Unit Sell (ex GST)'] || 0).toFixed(2)}`, 430, y, { align: 'right' });
        doc.text(`$${Number(li['Line Sell (ex GST)'] || 0).toFixed(2)}`, 540, y, { align: 'right' });
        y += lineH;
      });

      y += 6;
      doc.line(left, y, 555, y);
      y += 18;
      doc.setFont('helvetica', 'bold');
      doc.text('Estimated total (ex GST)', 430, y, { align: 'right' });
      doc.text(`$${Number(lastQuote.summary?.total_ex_gst || 0).toFixed(2)}`, 540, y, { align: 'right' });
      y += 14;
      doc.setFont('helvetica', 'normal');
      doc.text(`Material lines: ${Number(lastQuote.summary?.material_lines || 0)}`, left, y);

      const safeName = customerName.replace(/[^a-z0-9\-_]+/gi, '_');
      doc.save(`quote_${safeName}_${lastQuote.quote_id || 'draft'}.pdf`);
      trackEvent('generate_pdf', {
        quote_id: lastQuote.quote_id || '',
        quote_value: Number(lastQuote.summary?.total_ex_gst || 0),
        fence_type: selectedStyle,
      });
      setErrors('');
    } catch (err) {
      setErrors(`PDF generation error: ${err.message}`);
    }
  };

  // ─── Email Quote ────────────────────────────────────────────────────────

  const emailQuote = async () => {
    if (!lastQuote) return;
    if (!validateCustomerDetails()) return;

    try {
      const response = await fetch(`${apiBase}/quote/email-quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: customerEmail,
          customer_name: customerName,
          customer_phone: customerPhone,
          quote: lastQuote,
        }),
      });

      const data = await response.json();
      if (response.ok && data.ok) {
        alert('Quote emailed successfully. Open your email and choose a delivery option.');
        trackEvent('email_quote', {
          quote_id: lastQuote.quote_id || '',
          quote_value: Number(lastQuote.summary?.total_ex_gst || 0),
          email_domain: customerEmail.split('@')[1]?.toLowerCase() || '',
          fence_type: selectedStyle,
        });
      } else {
        setErrors('Email failed. Check server configuration.');
      }
    } catch (err) {
      setErrors(`Email error: ${err.message}`);
    }
  };

  // ─── Effects ────────────────────────────────────────────────────────────

  useEffect(() => {
    drawPreview();
  }, [drawPreview]);

  useEffect(() => {
    scheduleAutoCalc();
  }, [runs, selectedStyle, colour, mount, shape, scheduleAutoCalc]);

  // ─── Render ─────────────────────────────────────────────────────────────

  const isStraight = shape === 'Straight';
  const allowedColours = allowedColoursForStyle(selectedStyle);
  const canAddRun = isStraight && runs.length < 5;
  const validRuns = runs.filter((r) => r.length_mm > 0);

  return (
    <div
      style={{
        fontFamily: 'Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif',
        maxWidth: '1180px',
        padding: '18px',
        border: '1px solid #e6e8ef',
        borderRadius: '16px',
        background: 'linear-gradient(180deg,#ffffff 0%,#fbfcff 100%)',
        boxShadow: '0 8px 24px rgba(16,24,40,.06)',
        margin: '0 auto',
      }}
    >
      {/* Save Project Modal */}
      <SaveProjectModal
        show={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onSaved={handleProjectSaved}
        calculatorType="aluminium"
        calculatorState={{ selectedStyle, colour, mount, shape, runs }}
        bomSnapshot={lastQuote ? { bom: lastQuote.bom, summary: lastQuote.summary } : null}
        currentProjectId={projectId}
        currentProjectName={projectName}
        currentCalculationId={calculationId}
      />

      {/* Header with title + save button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '24px', lineHeight: 1.2, fontWeight: 800, letterSpacing: '-0.02em', color: '#0f172a' }}>
            Fence Estimator — Visual Builder
            {projectName && <span style={{ color: '#9ca3af', fontWeight: 400, fontSize: '16px', marginLeft: '10px' }}>— {projectName}</span>}
          </h3>
          <p style={{ margin: '6px 0 0', color: '#555' }}>Pick a style, set your runs, see the layout, then get instant estimate.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          {saveMsg && <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 500 }}>{saveMsg}</span>}
          <button
            onClick={() => setShowSaveModal(true)}
            style={{
              padding: '8px 14px', fontSize: '13px', fontWeight: 600, color: '#fff',
              backgroundColor: '#10b981', border: 'none', borderRadius: '6px',
              cursor: 'pointer', transition: 'background-color 0.15s', whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => { e.target.style.backgroundColor = '#059669'; }}
            onMouseLeave={(e) => { e.target.style.backgroundColor = '#10b981'; }}
          >
            {projectId ? "Save" : "Save Project"}
          </button>
        </div>
      </div>

      {/* Step 1: Style Cards */}
      <div style={{ marginTop: '18px', marginBottom: '10px', fontWeight: 700, fontSize: '15px', color: '#0f172a' }}>
        Step 1) Choose style
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3,minmax(0,1fr))',
          gap: '10px',
          marginBottom: '18px',
        }}
      >
        {STYLE_DEFS.map((s) => (
          <div
            key={s.name}
            onClick={() => setSelectedStyle(s.name)}
            style={{
              border: selectedStyle === s.name ? '2px solid #1d4ed8' : '1px solid #dde2ee',
              borderRadius: '12px',
              padding: '8px',
              cursor: 'pointer',
              background: selectedStyle === s.name ? '#eff6ff' : '#fff',
              transition: 'all 0.15s ease',
            }}
          >
            <img src={s.img} alt={s.name} style={{ width: '100%', height: '78px', objectFit: 'contain', borderRadius: '8px', background: '#f8fafc' }} />
            <div style={{ fontWeight: 700, marginTop: '6px' }}>{s.name}</div>
            <div style={{ fontSize: '12px', color: '#666' }}>{s.blurb}</div>
          </div>
        ))}
      </div>

      {/* Step 2: Configure */}
      <div style={{ marginBottom: '10px', fontWeight: 700, fontSize: '15px', color: '#0f172a' }}>
        Step 2) Configure project
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '18px' }}>
        {/* Colour */}
        <div>
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Colour</div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {allowedColours.map((c) => (
              <label key={c} style={{ display: 'inline-flex', gap: '6px', alignItems: 'center', padding: '2px 6px', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                <input type="radio" checked={colour === c} onChange={() => setColour(c)} />
                {c}
              </label>
            ))}
          </div>
        </div>

        {/* Mount */}
        <div>
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Install</div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {MOUNT_TYPES.map((m) => (
              <label key={m} style={{ display: 'inline-flex', gap: '6px', alignItems: 'center', padding: '2px 6px', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                <input type="radio" checked={mount === m} onChange={() => setMount(m)} />
                {m}
              </label>
            ))}
          </div>
        </div>

        {/* Shape */}
        <div>
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Shape</div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {Object.keys(SHAPE_MAP).map((sh) => (
              <label key={sh} style={{ display: 'inline-flex', gap: '6px', alignItems: 'center', padding: '2px 6px', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                <input type="radio" checked={shape === sh} onChange={() => changeShape(sh)} />
                {sh}
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Main Grid: Runs + Preview */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 0.75fr', gap: '16px', marginBottom: '18px' }}>
        {/* Runs Section */}
        <div>
          <div style={{ marginBottom: '10px', fontWeight: 700, fontSize: '15px', color: '#0f172a', marginTop: 0 }}>
            Step 3) Runs + gates
          </div>
          <div style={{ display: 'grid', gap: '10px', marginBottom: '10px' }}>
            {runs.map((r, idx) => {
              const maxPanels = getMaxPanelsForRun(idx);
              const runLabel = isStraight ? `Run ${idx + 1}` : ['A', 'B', 'C', 'D'][idx] || `Run ${idx + 1}`;
              const runPrefix = isStraight ? 'Run' : 'Side';
              return (
                <div
                  key={idx}
                  style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                    padding: '12px',
                    background: '#fff',
                    boxShadow: '0 1px 2px rgba(16,24,40,.04)',
                  }}
                >
                  {!isStraight && runs.length > 1 && (
                    <button
                      onClick={() => deleteRun(idx)}
                      style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '16px',
                        padding: '4px',
                        color: '#dc2626',
                        lineHeight: 1,
                      }}
                      title="Delete run"
                    >
                      🗑
                    </button>
                  )}
                  <strong style={{ display: 'block', marginBottom: '8px', fontSize: '13px' }}>
                    {runPrefix} {runLabel}
                  </strong>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ fontSize: '12px', color: '#6b7280' }}>Length (mm)</label>
                    <input
                      type="number"
                      min="500"
                      step="10"
                      value={r.length_mm}
                      onChange={(e) => {
                        const newLen = Number(e.target.value);
                        updateRun(idx, { length_mm: newLen });
                        syncBoxOppositeLengths(idx);
                      }}
                      style={{
                        width: '120px',
                        height: '40px',
                        border: '1px solid #d0d5dd',
                        borderRadius: '10px',
                        padding: '0 12px',
                        background: '#fff',
                        color: '#111827',
                        fontSize: '14px',
                      }}
                    />
                    <label style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                      <input
                        type="checkbox"
                        checked={r.gate}
                        onChange={(e) => updateRun(idx, { gate: e.target.checked })}
                      />
                      Gate
                    </label>
                  </div>

                  {r.gate && (
                    <>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center', marginTop: '8px', marginBottom: '8px' }}>
                        {GATE_MODES.map((m) => (
                          <label key={m} style={{ display: 'inline-flex', gap: '4px', alignItems: 'center', padding: '4px 8px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '12px' }}>
                            <input
                              type="radio"
                              name={`gate_mode_${idx}`}
                              value={m}
                              checked={r.gate_mode === m}
                              onChange={(e) => updateRun(idx, { gate_mode: e.target.value })}
                            />
                            {m}
                          </label>
                        ))}
                      </div>

                      {r.gate_mode === 'Custom' && (
                        <div style={{ marginTop: '8px' }}>
                          <label style={{ fontSize: '12px', color: '#6b7280' }}>Gate after panel # (max {maxPanels})</label>
                          <input
                            type="number"
                            min="1"
                            max={maxPanels}
                            step="1"
                            value={r.gate_after_panel}
                            onChange={(e) => updateRun(idx, { gate_after_panel: Number(e.target.value) })}
                            style={{
                              width: '120px',
                              height: '40px',
                              border: '1px solid #d0d5dd',
                              borderRadius: '10px',
                              padding: '0 12px',
                              background: '#fff',
                              color: '#111827',
                              fontSize: '14px',
                              marginTop: '4px',
                            }}
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {canAddRun && (
            <button
              onClick={addRun}
              style={{
                width: '100%',
                border: '2px dashed #d0d5dd',
                background: '#f9fafb',
                color: '#374151',
                fontWeight: 600,
                padding: '10px',
                borderRadius: '10px',
                cursor: 'pointer',
                marginBottom: '10px',
              }}
            >
              + Add Run
            </button>
          )}

          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '10px', fontSize: '13px', color: '#374151' }}>
            <input type="checkbox" checked={autoCalc} onChange={(e) => setAutoCalc(e.target.checked)} />
            Auto-update quote
          </label>

          {errors && (
            <div style={{ marginTop: '10px', color: '#b00020', fontWeight: 600, fontSize: '13px' }}>
              {errors}
            </div>
          )}
        </div>

        {/* Canvas */}
        <div>
          <div style={{ marginBottom: '10px', fontWeight: 700, fontSize: '15px', color: '#0f172a', marginTop: 0 }}>
            Live layout preview
          </div>
          <div
            ref={canvasRef}
            style={{
              width: '100%',
              height: 'auto',
              minHeight: '300px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              background: '#fff',
              overflow: 'hidden',
            }}
          />
        </div>
      </div>

      {/* Results Table */}
      {lastQuote && lastQuote.bom && (
        <>
          <table
            style={{
              width: '100%',
              borderCollapse: 'separate',
              borderSpacing: 0,
              fontSize: '14px',
              background: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '10px',
              overflow: 'hidden',
              marginBottom: '14px',
            }}
          >
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={{ textAlign: 'center', padding: '10px', borderBottom: '1px solid #eef2f7', fontWeight: 700, color: '#0f172a', width: '52px' }}></th>
                <th style={{ textAlign: 'left', padding: '10px', borderBottom: '1px solid #eef2f7', fontWeight: 700, color: '#0f172a' }}>Item</th>
                <th style={{ textAlign: 'left', padding: '10px', borderBottom: '1px solid #eef2f7', fontWeight: 700, color: '#0f172a' }}>SKU</th>
                <th style={{ textAlign: 'right', padding: '10px', borderBottom: '1px solid #eef2f7', fontWeight: 700, color: '#0f172a' }}>Qty</th>
                <th style={{ textAlign: 'right', padding: '10px', borderBottom: '1px solid #eef2f7', fontWeight: 700, color: '#0f172a' }}>Unit (ex)</th>
                <th style={{ textAlign: 'right', padding: '10px', borderBottom: '1px solid #eef2f7', fontWeight: 700, color: '#0f172a' }}>Line (ex)</th>
              </tr>
            </thead>
            <tbody>
              {lastQuote.bom.map((li, i) => (
                <tr key={i}>
                  <td style={{ padding: '6px 10px', borderBottom: '1px solid #eef2f7', textAlign: 'center', width: '52px' }}>
                    {li.img ? (
                      <img
                        src={li.img}
                        alt={li.SKU}
                        style={{ width: '36px', height: '36px', objectFit: 'contain', borderRadius: '4px', border: '1px solid #e5e7eb' }}
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <span style={{ display: 'inline-block', width: '36px', height: '36px', background: '#f1f5f9', borderRadius: '4px', border: '1px solid #e5e7eb' }} />
                    )}
                  </td>
                  <td style={{ padding: '10px', borderBottom: '1px solid #eef2f7' }}>{esc(li.Item)}</td>
                  <td style={{ padding: '10px', borderBottom: '1px solid #eef2f7', fontSize: '12px', color: '#6b7280' }}>{esc(li.SKU)}</td>
                  <td style={{ padding: '10px', borderBottom: '1px solid #eef2f7', textAlign: 'right' }}>{Number(li.Qty)}</td>
                  <td style={{ padding: '10px', borderBottom: '1px solid #eef2f7', textAlign: 'right' }}>{money(li['Unit Sell (ex GST)'])}</td>
                  <td style={{ padding: '10px', borderBottom: '1px solid #eef2f7', textAlign: 'right', fontWeight: 600 }}>{money(li['Line Sell (ex GST)'])}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ padding: '14px', background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: '12px', marginBottom: '14px', maxWidth: '520px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span>Estimated total (ex GST)</span>
              <strong>{money(lastQuote.summary?.total_ex_gst)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Material lines</span>
              <strong>{lastQuote.summary?.material_lines || 0}</strong>
            </div>
          </div>

          {lastQuote.summary?.missing_pricing && lastQuote.summary.missing_pricing.length > 0 && (
            <div style={{ padding: '10px', background: '#fef2f2', color: '#991b1b', borderRadius: '8px', marginBottom: '14px', fontSize: '12px' }}>
              Missing pricing: {lastQuote.summary.missing_pricing.join(', ')}
            </div>
          )}
        </>
      )}

      {/* Customer Details — hidden for embeddable version, kept for future use
      <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ fontWeight: 700, fontSize: '15px', color: '#0f172a', marginTop: 0 }}>
          Final step) Customer details + email quote
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Customer name *"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            style={{
              width: '180px',
              height: '40px',
              border: '1px solid #d0d5dd',
              borderRadius: '10px',
              padding: '0 12px',
              background: '#fff',
              color: '#111827',
              fontSize: '14px',
            }}
          />
          <input
            type="email"
            placeholder="Customer email *"
            value={customerEmail}
            onChange={(e) => setCustomerEmail(e.target.value)}
            style={{
              width: '240px',
              height: '40px',
              border: '1px solid #d0d5dd',
              borderRadius: '10px',
              padding: '0 12px',
              background: '#fff',
              color: '#111827',
              fontSize: '14px',
            }}
          />
          <input
            type="tel"
            placeholder="Customer phone *"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            style={{
              width: '180px',
              height: '40px',
              border: '1px solid #d0d5dd',
              borderRadius: '10px',
              padding: '0 12px',
              background: '#fff',
              color: '#111827',
              fontSize: '14px',
            }}
          />
          <button
            onClick={generatePdf}
            style={{
              height: '40px',
              padding: '0 14px',
              borderRadius: '10px',
              border: '1px solid #d0d5dd',
              background: '#111827',
              color: '#fff',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Generate PDF Quote
          </button>
          <button
            onClick={emailQuote}
            style={{
              height: '40px',
              padding: '0 14px',
              borderRadius: '10px',
              border: '1px solid #d0d5dd',
              background: '#111827',
              color: '#fff',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Email My Quote
          </button>
        </div>
        <div style={{ padding: '10px', border: '1px solid #e5e7eb', borderRadius: '8px', background: '#f9fafb', color: '#374151', fontSize: '13px', lineHeight: 1.45 }}>
          <strong>Happy with your estimate?</strong>
          <br />
          1) Email your quote now
          <br />
          2) Review your quote details
          <br />
          3) Click <strong>Proceed with Order</strong> in the email to request manual confirmation
          <span style={{ color: '#6b7280', display: 'block', marginTop: '6px' }}>No payment is taken online at this stage. Orders are manually reviewed to confirm final pricing, shipping and availability.</span>
        </div>
      </div>
      */}
    </div>
  );
}
