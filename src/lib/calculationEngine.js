/**
 * Aluminium Fence Calculation Engine
 * Exact port of PHP calculate_quote_v5 + JS solveRunPanels/buildLayoutGeometry
 * from expert-fence-quote-calculator-v2.php
 */

import { STYLE_CONFIG, SHAPE_CORNER_DEFAULTS, SHAPE_DIRS } from './styleConfig.js';

// ─── Helpers ───────────────────────────────────────────────────────────────

function money(v) {
  return Math.round(parseFloat(v || 0) * 100) / 100;
}

/**
 * Colour variant SKU mapping — exact replica of PHP with_colour_variant()
 */
function withColourVariant(sku, colour) {
  let s = String(sku).toUpperCase();
  if (colour === 'White') {
    if (s.endsWith('-B')) return s.slice(0, -2) + '-W';
    if (s.endsWith('-MN')) return s.slice(0, -3) + '-W';
  }
  if (colour === 'Monument') {
    if (s.endsWith('-B')) return s.slice(0, -2) + '-MN';
  }
  return s;
}

// ─── Panel solver (client-side + server-side shared) ───────────────────────

/**
 * Solve panel layout for a single run.
 * Exact replica of both the JS solveRunPanels() and PHP panel-solving logic.
 *
 * @param {number} runLen - Total run length in mm
 * @param {boolean} hasGate - Whether this run has a gate
 * @param {string} gateMode - 'Start'|'End'|'Centre'|'Custom'|'-'
 * @param {number} gateAfterRaw - For Custom mode, gate after which panel #
 * @param {number} panelMax - Maximum panel width in mm
 * @param {number} gateOpening - Gate opening width in mm (1062)
 * @param {number} endOffset - Half post width in mm
 * @param {string} style - Style name (for future use)
 * @returns {{ panel_cc_available: number, panel_qty: number, gate_after: number|null }}
 */
export function solveRunPanels(runLen, hasGate, gateMode, gateAfterRaw, panelMax, gateOpening, endOffset, style) {
  const panelCC = Math.max(0, runLen - (2 * endOffset) - (hasGate ? gateOpening : 0));
  const qty = Math.max(1, Math.ceil(panelCC / panelMax));

  if (!hasGate) {
    return { panel_cc_available: panelCC, panel_qty: qty, gate_after: null };
  }

  if (gateMode === 'Centre') {
    // Checkpoint parity: centre gate uses symmetric half-span solve.
    const side = panelCC / 2;
    const panelsEach = Math.max(1, Math.ceil(side / panelMax));
    return { panel_cc_available: panelCC, panel_qty: panelsEach * 2, gate_after: panelsEach };
  }

  if (gateMode === 'Start') {
    return { panel_cc_available: panelCC, panel_qty: qty, gate_after: 0 };
  }

  // End or Custom
  const req = Number(gateAfterRaw || 1);
  const gateAfter = gateMode === 'Custom' ? Math.max(1, Math.min(req, qty)) : qty;
  return { panel_cc_available: panelCC, panel_qty: qty, gate_after: gateAfter };
}

// ─── Layout geometry builder (for SVG preview) ────────────────────────────

/**
 * Build coordinate geometry for shaped layouts.
 * Exact replica of JS buildLayoutGeometry().
 *
 * @param {Array} runs - Array of run objects { length_mm, gate, gate_mode, gate_after_panel }
 * @param {string} shape - 'Straight'|'L-shape'|'U-shape'|'Box'
 * @param {number} gateOpening - Gate opening width in mm
 * @param {number} panelMax - Maximum panel width in mm
 * @param {number} postWidth - Post width in mm
 * @param {string} style - Style name
 * @returns {{ post_points: number[][], gate_segments: object[], centre_segments: object[] }}
 */
export function buildLayoutGeometry(runs, shape, gateOpening, panelMax, postWidth, style) {
  const dirs = SHAPE_DIRS[shape] || [[1, 0]];
  let x = 0, y = 0;
  const endOffset = postWidth / 2;
  const postPoints = [[x, y]];
  const gateSegments = [];
  const centreSegments = [];

  runs.forEach((r, i) => {
    const d = dirs[Math.min(i, dirs.length - 1)];
    const runLen = Number(r.length_mm || 0);
    const hasGate = !!r.gate;
    const gateMode = r.gate_mode || (hasGate ? 'End' : '-');
    const solved = solveRunPanels(runLen, hasGate, gateMode, r.gate_after_panel, panelMax, gateOpening, endOffset, style);

    let chain = [];
    let gateIndex = null;

    if (hasGate && gateMode === 'Centre') {
      const panelsEachSide = Math.max(1, Math.floor(solved.panel_qty / 2));
      const each = (solved.panel_cc_available / 2) / panelsEachSide;
      chain = [...Array(panelsEachSide).fill(each), ...Array(panelsEachSide).fill(each)];
      gateIndex = panelsEachSide;
    } else {
      const each = solved.panel_cc_available / Math.max(1, solved.panel_qty);
      chain = Array(Math.max(1, solved.panel_qty)).fill(each);
      gateIndex = hasGate ? solved.gate_after : null;
    }

    chain.forEach((seg, idx2) => {
      // Gate at start (gate_after === 0)
      if (hasGate && gateIndex === 0 && idx2 === 0) {
        const gx2 = x + d[0] * gateOpening;
        const gy2 = y + d[1] * gateOpening;
        gateSegments.push({ x1: x, y1: y, x2: gx2, y2: gy2, mm: Math.round(gateOpening) });
        x = gx2;
        y = gy2;
        postPoints.push([x, y]);
      }

      // Panel segment
      const nx = x + d[0] * seg;
      const ny = y + d[1] * seg;
      centreSegments.push({ x1: x, y1: y, x2: nx, y2: ny, mm: Math.round(seg) });
      postPoints.push([nx, ny]);

      // Gate after this panel
      if (hasGate && gateIndex === idx2 + 1) {
        const gx2 = nx + d[0] * gateOpening;
        const gy2 = ny + d[1] * gateOpening;
        gateSegments.push({ x1: nx, y1: ny, x2: gx2, y2: gy2, mm: Math.round(gateOpening) });
        x = gx2;
        y = gy2;
        postPoints.push([x, y]);
      } else {
        x = nx;
        y = ny;
      }
    });
  });

  return { post_points: postPoints, gate_segments: gateSegments, centre_segments: centreSegments };
}

// ─── Full BOM calculation (server-side) ───────────────────────────────────

/**
 * Calculate complete bill of materials.
 * Exact port of PHP calculate_quote_v5().
 *
 * @param {object} params - { style, colour, mount, shape, runs, shared_corners?, panel_max_mm?, gate_opening_mm? }
 * @param {object} costs - Map of SKU -> { sell, cost } from cost_price_master.csv
 * @returns {object} Full quote response
 */
export function calculateQuoteV5(params, costs) {
  let style = params.style || 'Tubular';
  let colour = params.colour || 'Black';
  const mountChoice = params.mount || 'Surface';
  const shape = params.shape || 'Straight';
  let panelMaxMm = parseFloat(params.panel_max_mm || 0);
  let gateOpeningMm = parseFloat(params.gate_opening_mm || 0);
  let sharedCorners = params.shared_corners !== undefined ? parseInt(params.shared_corners) : -1;
  const runs = params.runs || [];

  // Validate style
  if (!STYLE_CONFIG[style]) style = 'Tubular';
  const cfg = STYLE_CONFIG[style];

  // Validate colour
  if (!cfg.colours.includes(colour)) colour = cfg.colours[0];

  // Mount type
  const mountType = mountChoice === 'Inground' ? 'concrete' : 'surface';

  // Defaults
  if (panelMaxMm <= 0) panelMaxMm = cfg.panel_max_mm;
  if (gateOpeningMm <= 0) gateOpeningMm = cfg.gate_cc_mm;

  // Project totals
  const project = {
    panels: 0,
    brackets: 0,
    gates: 0,
    gate_hardware_sets: 0,
    centre_gates: 0,
    centre_gate_extra_brackets: 0,
    gate_end_corner_reuse: 0,
  };

  const postWidthMm = cfg.post_width_mm;
  const endOffsetMm = postWidthMm / 2.0;

  // Filter valid runs
  const validRuns = runs.filter(r => parseFloat(r.length_mm || 0) > 0);
  const runCount = validRuns.length;

  // Shared corners
  if (sharedCorners < 0) {
    sharedCorners = SHAPE_CORNER_DEFAULTS[shape] !== undefined
      ? SHAPE_CORNER_DEFAULTS[shape]
      : Math.max(0, runCount - 1);
  }
  sharedCorners = Math.min(sharedCorners, runCount);

  const perRun = [];

  validRuns.forEach((r, idx) => {
    const runMm = parseFloat(r.length_mm || 0);
    const hasGate = !!r.gate;
    let gateMode = r.gate_mode || (hasGate ? 'End' : '-');
    const allowedModes = hasGate ? ['Start', 'End', 'Centre', 'Custom'] : ['-'];
    if (!allowedModes.includes(gateMode)) gateMode = hasGate ? 'End' : '-';

    const panelCCAvailable = Math.max(0, runMm - (2 * endOffsetMm) - (hasGate ? gateOpeningMm : 0));

    let panelQty, gateAfter;

    if (!hasGate) {
      panelQty = Math.max(1, Math.ceil(panelCCAvailable / panelMaxMm));
      gateAfter = null;
    } else if (gateMode === 'Centre') {
      const sideSpan = panelCCAvailable / 2.0;
      const panelsEach = Math.max(1, Math.ceil(sideSpan / panelMaxMm));
      panelQty = panelsEach * 2;
      gateAfter = panelsEach;
    } else {
      panelQty = Math.max(1, Math.ceil(panelCCAvailable / panelMaxMm));
      const requested = parseInt(r.gate_after_panel || 1);
      if (gateMode === 'Custom') {
        gateAfter = Math.max(1, Math.min(requested, panelQty));
      } else if (gateMode === 'Start') {
        gateAfter = 0;
      } else {
        gateAfter = panelQty; // End
      }
    }

    project.panels += panelQty;
    project.brackets += panelQty;

    if (hasGate) {
      project.gates += 1;
      project.gate_hardware_sets += 1;

      if (style === 'Barr' && gateMode === 'Centre') {
        project.centre_gates += 1;
        if (panelQty === 1) {
          project.centre_gate_extra_brackets += 1;
        }
      }

      // Corner reuse logic
      const isGateAtRunEnd = (gateMode === 'End') || (gateMode === 'Custom' && gateAfter === panelQty);
      const isGateAtRunStart = (gateMode === 'Start');
      const runHasRightSharedCorner = (idx < sharedCorners);
      let runHasLeftSharedCorner = (idx > 0) && ((idx - 1) < sharedCorners);

      // Box closed-loop: run 0 start is shared corner with last run
      if (shape === 'Box' && idx === 0 && sharedCorners >= 4) {
        runHasLeftSharedCorner = true;
      }

      if (style === 'Barr' && sharedCorners > 0) {
        if (isGateAtRunEnd && runHasRightSharedCorner) project.gate_end_corner_reuse += 1;
        if (isGateAtRunStart && runHasLeftSharedCorner) project.gate_end_corner_reuse += 1;
      }
    }

    perRun.push({
      run: idx + 1,
      length_mm: runMm,
      gate: hasGate ? 'Yes' : 'No',
      gate_mode: hasGate ? gateMode : '-',
      gate_after_panel: (hasGate && gateAfter != null) ? gateAfter : '-',
      panel_run_mm: Math.round(panelCCAvailable * 10) / 10,
      panel_qty: panelQty,
    });
  });

  // ── Post calculation ──────────────────────────────────────────────────
  // Checkpoint parity: base pre-corner posts = panels + runs.
  const standardPostsPreCorner = Math.max(0, project.panels + runCount);
  const regularPostsAfterCornerMerge = Math.max(0, standardPostsPreCorner - sharedCorners);
  let cornerPosts = Math.min(sharedCorners, regularPostsAfterCornerMerge);
  const cornerReuse = Math.min(cornerPosts, project.gate_end_corner_reuse);
  cornerPosts = Math.max(0, cornerPosts - cornerReuse);
  let standardPosts = Math.max(0, regularPostsAfterCornerMerge - cornerPosts);

  // ── SKU resolution ────────────────────────────────────────────────────
  const sk = cfg.skus;
  let panelSku = sk.panel;
  let gatePanelSku = sk.gate;
  let bracketSku = sk.bracket;
  let standardPostSku = sk.post_standard[mountType];
  let cornerPostSku = sk.post_corner[mountType];
  let gateLatchPostSku = sk.post_gate_heavy[mountType];
  let gateHingePostSku = null;
  let standardPostQty = standardPosts;

  // Tubular White Surface special case
  if (style === 'Tubular' && colour === 'White' && mountType === 'surface') {
    panelSku = withColourVariant(panelSku, colour);
    gatePanelSku = withColourVariant(gatePanelSku, colour);
    bracketSku = withColourVariant(bracketSku, colour);
    standardPostSku = 'XP-1300-BP-W';
    cornerPostSku = 'XP-1300-BP-W';
    gateLatchPostSku = 'XP-1300-BP-W';
  } else if (style === 'Tubular' && ['Monument', 'White'].includes(colour)) {
    panelSku = withColourVariant(panelSku, colour);
    gatePanelSku = withColourVariant(gatePanelSku, colour);
    bracketSku = withColourVariant(bracketSku, colour);
    standardPostSku = withColourVariant(standardPostSku, colour);
    cornerPostSku = withColourVariant(cornerPostSku, colour);
    gateLatchPostSku = withColourVariant(gateLatchPostSku, colour);
  }

  if (style === 'Barr') {
    if (colour === 'White') {
      panelSku = withColourVariant(panelSku, colour);
      gatePanelSku = withColourVariant(gatePanelSku, colour);
      bracketSku = withColourVariant(bracketSku, colour);
      standardPostSku = withColourVariant(standardPostSku, colour);
    }

    // Barr corner post follows mount-based SS family
    cornerPostSku = sk.post_corner[mountType];

    // Barr gate rule: dedicated hinge + latch posts, hinge side swaps one standard post
    standardPostQty = Math.max(0, standardPosts - project.gates);
    gateHingePostSku = (colour === 'White') ? 'XP-1300-BP-W' : 'SS-1300-BP-B';
    gateLatchPostSku = (colour === 'White') ? 'XP-1300-BP-W' : 'SS-1600-BP-B';
  }

  // ── BOM assembly ──────────────────────────────────────────────────────
  const bom = {};
  function add(sku, item, qty) {
    qty = parseFloat(qty || 0);
    if (qty <= 0) return;
    const key = sku.toUpperCase() + '::' + item;
    if (!bom[key]) bom[key] = { SKU: sku.toUpperCase(), Item: item, Qty: 0 };
    bom[key].Qty += qty;
  }

  // Panels
  add(panelSku, `${style} panel`, project.panels);

  // Brackets
  const bracketQty = project.brackets + (style === 'Barr' ? project.centre_gate_extra_brackets : 0);
  add(bracketSku, 'Panel bracket set', bracketQty);

  // Posts — merge if same SKU
  if (standardPostSku.toUpperCase() === cornerPostSku.toUpperCase()) {
    add(standardPostSku, 'Post', standardPostQty + cornerPosts);
  } else {
    add(standardPostSku, 'Standard post', standardPostQty);
    add(cornerPostSku, 'Corner post', cornerPosts);
  }

  // Gate
  add(gatePanelSku, 'Gate panel', project.gates);
  if (gateHingePostSku) add(gateHingePostSku, 'Gate hinge post', project.gates);
  add(gateLatchPostSku, 'Gate heavy post', project.gates);

  // Gate hardware
  if (colour === 'White') {
    add('TC-H-AT-2L-W', 'Gate hinges (white)', project.gates);
    add('ML-TL-W', 'Gate latch (white)', project.gates);
  } else {
    add(sk.gate_hardware, 'Gate hinge + latch set', project.gate_hardware_sets);
  }

  // ── Auto accessories (dress rings + cover plates) ─────────────────────
  let plainPostsQty = 0;
  let basePlatePostsQty = 0;
  let barrBasePlateQty = 0;
  let ssBasePlateQty = 0;
  let xpBasePlateQty = 0;

  Object.values(bom).forEach(row => {
    const s = row.SKU.toUpperCase();
    const q = parseFloat(row.Qty || 0);
    if (s.includes('-1800-') || s.includes('-2100-') || s.includes('XP-1800-FP') || s.includes('BR-1800-')) {
      plainPostsQty += q;
    }
    if (s.includes('1300-BP') || s.includes('1600-BP') || s.includes('1280-BP')) {
      basePlatePostsQty += q;
    }
    if (s.startsWith('BR-1280-BP')) barrBasePlateQty += q;
    if (s.startsWith('SS-1300-BP') || s.startsWith('SS-1600-BP')) ssBasePlateQty += q;
    if (s.startsWith('XP-1300-BP') || s.startsWith('XP-1600-BP') || s.startsWith('XP-1280-BP')) xpBasePlateQty += q;
  });

  if (style === 'Barr' && colour === 'White') {
    add('BR-DR-W', 'Dress ring (auto)', plainPostsQty);
    add('BR-DC-2P-W', 'Cover plate (auto)', barrBasePlateQty);
    add('XP-DC-2P-W', 'Cover plate (auto)', ssBasePlateQty + xpBasePlateQty);
  } else if (style === 'Barr') {
    add('BR-DR-B', 'Dress ring (auto)', plainPostsQty);
    add('BR-DC-2P-B', 'Cover plate (auto)', barrBasePlateQty);
    add('SS-DC-B', 'Cover plate (auto)', ssBasePlateQty + xpBasePlateQty);
  } else if (colour === 'White') {
    add('XP-DR-W', 'Dress ring (auto)', plainPostsQty);
    add('XP-DC-2P-W', 'Cover plate (auto)', basePlatePostsQty);
  } else {
    add('XP-DR-B', 'Dress ring (auto)', plainPostsQty);
    add('SS-DC-B', 'Cover plate (auto)', basePlatePostsQty);
  }

  // ── Pricing lookup ────────────────────────────────────────────────────
  const lines = [];
  let total = 0;
  const missing = [];

  Object.values(bom).forEach(row => {
    const sku = row.SKU.toUpperCase();
    const qty = parseFloat(row.Qty || 0);
    const sell = costs[sku] ? parseFloat(costs[sku].sell || 0) : 0;
    if (sell <= 0) missing.push(sku);
    const line = money(sell * qty);
    total += line;
    lines.push({
      Item: row.Item,
      SKU: sku,
      Qty: qty,
      'Unit Sell (ex GST)': money(sell),
      'Line Sell (ex GST)': line,
      img: costs[sku]?.img || '',
    });
  });

  // Sort by SKU
  lines.sort((a, b) => a.SKU.localeCompare(b.SKU));

  // Quote ID
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const quoteId = `Q-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

  return {
    quote_id: quoteId,
    style,
    colour,
    shape,
    mount: mountChoice,
    per_run: perRun,
    bom: lines,
    summary: {
      total_ex_gst: money(total),
      missing_pricing: [...new Set(missing)],
      material_lines: lines.length,
    },
  };
}
