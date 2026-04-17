/**
 * AIRE+ Balustrade — BOM Builder
 *
 * Ported from ef-air-materials-calculator-plugin v0.1.2 (PHP).
 *
 * Supports two infill types:
 *   Picket  — AR-5600-PB  vertical pickets, 110mm horizontal pitch
 *   Slat    — XP-6100-S65 vertical slats, 66mm face + 64mm gap = 130mm pitch
 *
 * Two mount types:
 *   BasePlate — AR-1050-FPBP (post + base plate)
 *   FaceMount — AR-1500-FMLR (face-mounted bracket)
 *
 * Two styles:
 *   Full    — single bottom rail per bay
 *   3-Rail  — double bottom rail per bay
 *
 * Member sizing (matches PHP compute_engine + build_setout):
 *   member_height = overall_height − bottom_gap − 20mm
 *   (3-rail deducts an extra 50mm for mid-rail)
 *   yield_per_stick = floor(stock_mm / member_height)
 *   Pickets ordered in packs of 4; slats ordered individually.
 */

// ── Physical constants ─────────────────────────────────────────────────────────

const MAX_SPAN_MM         = 1800.0;

// Picket infill
const PICKET_PITCH_MM     = 110.0;    // horizontal spacing between pickets
const PICKET_W_MM         = 16.5;     // picket face width (AR-5600-PB)
const PICKET_STOCK_MM     = 5600.0;   // AR-5600-PB stock length
const PICKET_PACK_QTY     = 4;        // pickets sold in packs of 4

// Slat infill
const SLAT_SLOT_W_MM      = 66.0;     // slat slot width
const SLAT_GAP_MM         = 64.0;     // gap between slats
const SLAT_STOCK_MM       = 6100.0;   // XP-6100-S65 stock length

// Rail / handrail stock
const BOT_RAIL_STOCK_MM   = 5800.0;   // AR-5800-BR
const INSERT_STOCK_MM     = 3022.0;   // AR-3022-INS-65 (slat) / AR-3250-INS-16 stock ~ 3022
const HANDRAIL_STOCK_MM   = 5800.0;   // A50-5800-OHR / RHR

// Post / geometry
const POST_WIDTH_MM       = 50.0;
const TOP_RAIL_HEIGHT_MM  = 50.0;     // mid-rail deduction for 3-rail style
const MEMBER_CLEAR_MM     = 20.0;     // clearance above bottom gap for member height

// ── Bin-packing (matches PHP optimize_stock_cuts) ─────────────────────────────

function optimizeStockCuts(cutLengthsMM, stockLengthMM) {
  const pieces = cutLengthsMM.map(Number).filter((x) => x > 0).sort((a, b) => b - a);
  const bins = [];

  for (const piece of pieces) {
    let placed = false;
    for (const bin of bins) {
      if (bin.remaining >= piece) {
        bin.cuts.push(piece);
        bin.remaining -= piece;
        placed = true;
        break;
      }
    }
    if (!placed) {
      bins.push({ cuts: [piece], remaining: stockLengthMM - piece });
    }
  }

  return { stocks: bins.length };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function roundPack(units, packSize) {
  return Math.max(0, Math.ceil(Math.max(0, units) / Math.max(1, packSize)));
}

// ── Setout: member layout per bay (VERTICAL members) ──────────────────────────
//
// Members (pickets or slats) run vertically.
// n per bay = based on BAY CLEAR WIDTH.
// Member cut length = based on RUN HEIGHT.
//
// For picket: n = floor(clear_mm / 110)
// For slat:   n = floor((clear_mm + 64) / (66 + 64))
//
// Returns: bayRows, totalMembers, insertCutLengths, bottomCutLengths

function buildSetout(runs, styleKey, infillKey, defaultBg = 65) {
  const bayRows = [];
  let totalMembers = 0;
  const insertCutLengths = [];
  const bottomCutLengths = [];
  const insertLanes = styleKey === '3-rail' ? 2 : 1;
  const botLanes    = styleKey === '3-rail' ? 2 : 1;

  for (const run of runs) {
    if (!run.active || run.length <= 0) continue;

    const runMM     = Math.max(300, run.length);
    const bgMM      = run.bottomGap !== undefined ? Math.max(0, run.bottomGap) : defaultBg;
    const spanLimit = Math.max(300, Math.min(MAX_SPAN_MM, run.maxPostSpan || MAX_SPAN_MM));
    const bays      = Math.max(1, Math.ceil(runMM / spanLimit));

    const start = run.end1 || 'post';
    const end   = run.end2 || 'post';

    // Bay clear width — matches PHP build_setout logic
    let clearMM;
    if (start !== 'wall' && end !== 'wall') {
      // Both ends have posts: deduct 170mm (85mm overhang each end) then divide by bays
      const centreMM = Math.max(0, (runMM - 170.0) / Math.max(1, bays));
      clearMM = Math.max(0, centreMM - POST_WIDTH_MM);
    } else {
      const bayCc = runMM / bays;
      clearMM = Math.max(0, bayCc - POST_WIDTH_MM);
    }

    // Members per bay (based on clear width)
    let n;
    if (infillKey === 'picket') {
      n = Math.max(1, Math.floor(clearMM / PICKET_PITCH_MM));
    } else {
      // slat: vertical slats with slot_w=66mm, gap=64mm
      n = Math.max(1, Math.floor((clearMM + SLAT_GAP_MM) / (SLAT_SLOT_W_MM + SLAT_GAP_MM)));
    }

    // Layout offsets for preview
    let usedMM, edgeMM;
    if (infillKey === 'picket') {
      usedMM = (n - 1) * PICKET_PITCH_MM + PICKET_W_MM;
      edgeMM = Math.max(0, (clearMM - usedMM) / 2);
    } else {
      usedMM = n * SLAT_SLOT_W_MM + (n - 1) * SLAT_GAP_MM;
      edgeMM = Math.max(0, (clearMM - usedMM) / 2);
    }

    const bayCc = runMM / bays;

    for (let bay = 1; bay <= bays; bay++) {
      bayRows.push({
        run:     run.label,
        bay,
        bayCc:   Math.round(bayCc * 10) / 10,
        clearMM: Math.round(clearMM * 10) / 10,
        members: n,
        pitch:   infillKey === 'picket' ? PICKET_PITCH_MM : (SLAT_SLOT_W_MM + SLAT_GAP_MM),
        leftOffset:  Math.round(edgeMM * 10) / 10,
        rightOffset: Math.round(edgeMM * 10) / 10,
      });
      totalMembers += n;

      for (let i = 0; i < insertLanes; i++) insertCutLengths.push(clearMM);
      for (let i = 0; i < botLanes;    i++) bottomCutLengths.push(clearMM);
    }
  }

  return { bayRows, totalMembers, insertCutLengths, bottomCutLengths };
}

// ── Per-run post & rail counts (ported from PHP compute_engine) ───────────────

function computeRunCounts(run, styleKey) {
  const runMM     = Math.max(300, run.length);
  const spanLimit = Math.max(300, Math.min(MAX_SPAN_MM, run.maxPostSpan || MAX_SPAN_MM));
  const bays      = Math.max(1, Math.ceil(runMM / spanLimit));
  const bayCc     = runMM / bays;

  const start = run.end1 || 'post';
  const end   = run.end2 || 'post';

  const startPost = start === 'wall' ? 0 : 1;
  const endPost   = end   === 'wall' ? 0 : 1;
  const halfPosts = (start === 'half_post' ? 1 : 0) + (end === 'half_post' ? 1 : 0);
  const fullPosts = Math.max(0, (bays - 1) + startPost + endPost - halfPosts);

  const bottomRails    = styleKey === '3-rail' ? bays * 2 : bays;
  const connectionPts  = bottomRails * 2;

  const wallEnds = (start === 'wall' ? 1 : 0) + (end === 'wall' ? 1 : 0);
  const openEnds = Math.max(0, 2 - wallEnds);

  const handrailMM = bays * bayCc;

  return { bays, bayCc, fullPosts, halfPosts, bottomRails, connectionPts, openEnds, wallEnds, handrailMM };
}

// ── Main BOM builder ──────────────────────────────────────────────────────────

/**
 * Build full BOM for all active runs.
 *
 * @param {Array}  runs  - array of run config objects
 * @param {object} opts  - { colour, handrailType, mountType, infillType, fenceStyle, sharedCorners }
 * @returns {{ consolidated: Array, validation: Array, setout: Array }}
 */
export function buildAireBOM(runs, opts) {
  const {
    colour       = 'B',
    handrailType = 'Oval',
    mountType    = 'BasePlate',   // 'BasePlate' | 'FaceMount'
    infillType   = 'Slat',        // 'Slat' | 'Picket'
    fenceStyle   = 'Full',        // 'Full' | '3-Rail'
    sharedCorners = 0,
  } = opts;

  const col        = colour;
  const styleKey   = fenceStyle === '3-Rail' ? '3-rail' : 'full';
  const infillKey  = infillType === 'Picket' ? 'picket' : 'slat';
  const defaultBg  = 65;  // matches PHP $bg = 65

  const validation = [];
  const activeRuns = runs.filter((r) => r.active !== false && r.length > 0);

  if (activeRuns.length === 0) return { consolidated: [], validation: [], setout: [] };

  // ── Infill-specific SKU selection ────────────────────────────────────────
  const insertSKUBase = infillKey === 'picket' ? 'AR-3250-INS-16' : 'AR-3022-INS-65';
  const spacerSKUBase = infillKey === 'picket' ? 'AR-SPACER-93MM' : 'AR-SPACER-65MM';
  const memberSKUBase = infillKey === 'picket' ? 'AR-5600-PB'     : 'XP-6100-S65';
  const memberStock   = infillKey === 'picket' ? PICKET_STOCK_MM  : SLAT_STOCK_MM;

  // ── Aggregate counts across all runs ────────────────────────────────────
  let totalFullPosts     = 0;
  let totalHalfPosts     = 0;
  let totalConnectionPts = 0;
  let totalOpenEnds      = 0;
  let totalWallEnds      = 0;
  let totalBays          = 0;
  let totalHandrailMM    = 0;
  let screwUnits         = 0;
  let tekUnits           = 0;
  let cskUnits           = 0;

  for (const run of activeRuns) {
    const rc = computeRunCounts(run, styleKey);
    totalFullPosts     += rc.fullPosts;
    totalHalfPosts     += rc.halfPosts;
    totalConnectionPts += rc.connectionPts;
    totalOpenEnds      += rc.openEnds;
    totalWallEnds      += rc.wallEnds;
    totalBays          += rc.bays;
    totalHandrailMM    += rc.handrailMM;

    if (styleKey === 'full') {
      screwUnits += rc.bays * 4;
      tekUnits   += rc.bays * 1;
      cskUnits   += rc.bays * 8;
    } else {
      screwUnits += rc.bays * 8;
      cskUnits   += rc.bays * 16;
    }

    if (run.maxPostSpan > 1800) {
      validation.push(`Run ${run.label}: max post span exceeds 1800mm certification limit.`);
    }
  }

  // Shared corners reduction
  const cornerReduction = Math.min(sharedCorners || 0, totalFullPosts);
  totalFullPosts -= cornerReduction;

  // ── Setout: member layout + stock calculation ────────────────────────────
  const setout = buildSetout(activeRuns, styleKey, infillKey, defaultBg);

  // Member height (cut from stock) — use first active run's height
  const repRun    = activeRuns[0];
  const repH      = Math.max(500, repRun.height || 1000);
  const repBg     = repRun.bottomGap !== undefined ? Math.max(0, repRun.bottomGap) : defaultBg;
  const memberH   = styleKey === '3-rail'
    ? Math.max(1, Math.round(repH - repBg - TOP_RAIL_HEIGHT_MM - MEMBER_CLEAR_MM))
    : Math.max(1, Math.round(repH - repBg - MEMBER_CLEAR_MM));

  const yieldPerStick    = Math.max(1, Math.floor(memberStock / memberH));
  const requiredSticks   = Math.ceil(setout.totalMembers / yieldPerStick);
  // Pickets come in packs of 4; slats ordered individually
  const orderSticks = infillKey === 'picket'
    ? Math.ceil(requiredSticks / PICKET_PACK_QTY) * PICKET_PACK_QTY
    : requiredSticks;

  // Insert stock (3022mm cut to bay clear width)
  const insertStocks = optimizeStockCuts(setout.insertCutLengths, INSERT_STOCK_MM).stocks;
  // Bottom rail stock (5800mm)
  const brStocks     = optimizeStockCuts(setout.bottomCutLengths, BOT_RAIL_STOCK_MM).stocks;
  // Handrail stock
  const hrStocks     = Math.ceil(totalHandrailMM / HANDRAIL_STOCK_MM);

  // ── Mounting plates: ceil(connection_pts / 2) ─────────────────────────────
  const mountPlatesQty = roundPack(totalConnectionPts, 2);

  // ── Spacers per bay (full style only, 1 per bay per PHP) ─────────────────
  const spacerQty = styleKey === 'full' ? totalBays : 0;

  // ── Assemble BOM ──────────────────────────────────────────────────────────
  const bom = new Map();

  function add(skuStr, qty, desc, unit = 'ea') {
    if (!skuStr || qty <= 0) return;
    const key = skuStr.toUpperCase();
    if (bom.has(key)) {
      bom.get(key).qty += qty;
    } else {
      bom.set(key, { sku: skuStr, description: desc, qty, unit });
    }
  }

  // ── Posts ─────────────────────────────────────────────────────────────────
  if (mountType === 'FaceMount') {
    add(`AR-1500-FMLR-${col}`, totalFullPosts, 'Face Mount Post 1500mm', 'ea');
  } else {
    // BasePlate (default)
    add(`AR-1050-FPBP-${col}`, totalFullPosts, '1050mm Post with Base Plate', 'ea');
    // Domical covers — one per post (base plate posts only)
    add(`XP-DC-2P-${col}`, totalFullPosts + totalHalfPosts, 'Domical Post Cover', 'ea');
  }
  if (totalHalfPosts > 0) {
    add(`A50-1400D-HALF`, totalHalfPosts, '1400mm Half Post', 'ea');
  }

  // ── Bottom rail ───────────────────────────────────────────────────────────
  add(`AR-5800-BR-${col}`, brStocks, 'Bottom Rail 5800mm', 'length');

  // ── Bottom rail insert ────────────────────────────────────────────────────
  add(`${insertSKUBase}-${col}`, insertStocks, `Bottom Rail Insert (${infillKey})`, 'ea');

  // ── Infill members (pickets or slats) ─────────────────────────────────────
  if (infillKey === 'picket') {
    add(`${memberSKUBase}-${col}`, orderSticks, 'Picket 5600mm', 'ea');
  } else {
    add(`${memberSKUBase}-${col}`, orderSticks, '65mm Vertical Slat 6100mm', 'length');
  }

  // ── Handrail ──────────────────────────────────────────────────────────────
  if (handrailType === 'Rectangular') {
    add(`A50-5800-RHR-${col}`, hrStocks, 'Rectangular Handrail 5800mm', 'length');
  } else {
    add(`A50-5800-OHR-${col}`, hrStocks, 'Oval Handrail 5800mm', 'length');
  }

  // ── End caps + brackets (open ends) ──────────────────────────────────────
  if (totalOpenEnds > 0) {
    if (handrailType === 'Rectangular') {
      add(`A50-ECA-R-${col}`, totalOpenEnds, 'Rectangular Handrail End Cap', 'ea');
      add(`A50-BRACKET-R-${col}-2PK`, roundPack(totalOpenEnds, 2), 'Offset Bracket Rect (2pk)', 'pk');
    } else {
      add(`A50-ECA-O-${col}`, totalOpenEnds, 'Oval Handrail End Cap', 'ea');
      add(`A50-BRACKET-O-${col}-2PK`, roundPack(totalOpenEnds, 2), 'Offset Bracket Oval (2pk)', 'pk');
    }
  }

  // ── Wall posts/plates ─────────────────────────────────────────────────────
  if (totalWallEnds > 0) {
    add(`A50-WP-${col}`, totalWallEnds, 'Wall Post/Plate', 'ea');
  }

  // ── Spacers ───────────────────────────────────────────────────────────────
  if (spacerQty > 0) {
    add(`${spacerSKUBase}-${col}`, spacerQty, `Top Spacer (pk/20)`, 'pk');
  }

  // ── Mounting plates (pack of 2) ───────────────────────────────────────────
  if (mountPlatesQty > 0) {
    add(`AR-PLATE-${col}-2PK`, mountPlatesQty, 'Bottom Rail Mounting Plate (2pk)', 'pk');
  }

  // ── Fixings ───────────────────────────────────────────────────────────────
  const brScrewPacks = roundPack(screwUnits, 50);
  if (brScrewPacks > 0) add(`AR-SCR-BR-50PK-${col}`, brScrewPacks, 'Bottom Rail Screws (pk/50)', 'pk');

  if (tekUnits > 0) {
    add('SS-TS-50-SS304', roundPack(tekUnits, 50), 'Tek Screws SS304 (pk/50)', 'pk');
  }

  if (cskUnits > 0) {
    add('CSK-12GX50-50PK', roundPack(cskUnits, 50), 'CSK Screws 12g×50 (pk/50)', 'pk');
  }

  const consolidated = Array.from(bom.values());

  return { consolidated, validation, setout: setout.bayRows };
}

// ── Default run config ────────────────────────────────────────────────────────

export function defaultAireRun(index = 0) {
  const labels = ['A', 'B', 'C', 'D', 'E', 'F'];
  return {
    label:       labels[index] || String(index + 1),
    active:      index === 0,
    length:      4200,
    height:      1080,
    bottomGap:   65,
    end1:        'post',
    end2:        'post',
    maxPostSpan: 1800,
  };
}

export const AIRE_DEFAULTS = {
  colour:       'B',
  handrailType: 'Oval',
  mountType:    'BasePlate',   // 'BasePlate' | 'FaceMount'
  infillType:   'Slat',        // 'Slat' | 'Picket'
  fenceStyle:   'Full',        // 'Full' | '3-Rail'
  sharedCorners: 0,
};
