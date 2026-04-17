/**
 * AIRE+ Horizontal Slat Balustrade — BOM Builder
 *
 * Ported from ef-air-materials-calculator-plugin-v1.0.4 (PHP).
 *
 * Key system specs (AIRE+ horizontal slat — different from AIR vertical):
 *   - 50×50mm posts, max 1800mm post centres
 *   - 65×16.5mm HORIZONTAL slats, 9mm gap between slats → 74mm pitch
 *   - Default bottom gap: 88mm (ground to underside of first slat)
 *   - Post types: Base Plate (AR-1050-FPBP), Core Drill (AR-5800-FP cut to height)
 *   - Handrail: Oval (A50-5800-OHR) or Rectangular (A50-5800-RHR) — 5800mm stock
 *   - Slat stock: XP-6100-S65 — 6100mm stock, cut to bay clear width
 *   - Bottom rail: AR-5800-BR — 5800mm stock
 *   - Insert: AR-3022-INS-65 — 3022mm stock (for 65mm slats)
 *   - Colours: B (Satin Black), MN (Monument), W (Pearl White), M (Mill)
 *   - SKUs: most are base + colour suffix, e.g. AR-1050-FPBP-B
 *           Mounting plates: AR-PLATE-{col}-2PK
 */

// ── Physical constants (from PHP plugin + AIRE+ catalogue) ────────────────────

const MAX_SPAN_MM         = 1800.0;
const SLAT_PITCH_MM       = 74.0;     // 65mm face + 9mm gap
const SLAT_STOCK_MM       = 6100.0;   // XP-6100-S65
const BOT_RAIL_STOCK_MM   = 5800.0;   // AR-5800-BR
const INSERT_STOCK_MM     = 3022.0;   // AR-3022-INS-65
const HANDRAIL_STOCK_MM   = 5800.0;   // A50-5800-OHR / RHR
const FULL_POST_STOCK_MM  = 5800.0;   // AR-5800-FP (core drill, cut to height)

// Handrail overhang each side past end post
const HR_OVERHANG_MM = 85.0;

// Post width (50mm sq) — deducted to get clear bay width
const POST_WIDTH_MM = 50.0;

// Setout deduction: total run deducted to convert run length → post-to-post span basis
// (2 × 85mm end overhang = 170mm, same as PHP source)
const RUN_END_DEDUCT_MM = 170.0;

// ── Bin-packing (matches PHP optimize_stock_cuts) ─────────────────────────────

function optimizeStockCuts(cutLengthsMM, stockLengthMM, minUsableOffcutMM = 0) {
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

// ── Setout: slat layout per bay (HORIZONTAL slat version) ─────────────────────
//
// For HORIZONTAL slats: slats run bay-width, stacked by height.
//   - Clear height = overall_height - bottom_gap
//   - Slat rows    = floor(clear_height / SLAT_PITCH)
//   - Slat cut len = clear_mm (clear bay width)
//
// Returns per-bay layout info + total slat pieces + cut lengths for bin-packing.

function buildSetout(runs, style, bottomGap) {
  const bayRows = [];
  let totalSlats = 0;
  const slatCutLengths = [];   // one entry per slat piece (for stock optimisation)
  const insertCutLengths = [];
  const bottomCutLengths = [];

  for (const run of runs) {
    if (!run.active || run.length <= 0) continue;

    const runMM    = Math.max(300, run.length);
    const heightMM = Math.max(300, run.height || 1000);
    const bgMM     = Math.max(0,   run.bottomGap !== undefined ? run.bottomGap : bottomGap);
    const spanLimit = Math.max(300, Math.min(MAX_SPAN_MM, run.maxPostSpan || MAX_SPAN_MM));

    const bays   = Math.max(1, Math.ceil(runMM / spanLimit));
    const bayCc  = runMM / bays;  // bay centre-to-centre

    // Setout: clear per bay (from PHP — deduct 170mm total, then 50mm per bay for posts)
    // Simplified for AIRE+: clear = bay_cc - POST_WIDTH_MM
    const clearMM = Math.max(50, bayCc - POST_WIDTH_MM);

    // Horizontal slat rows per bay (height-based, not width-based)
    const clearHeight = Math.max(0, heightMM - bgMM);
    const slatRows = Math.max(0, Math.floor(clearHeight / SLAT_PITCH_MM));

    for (let bay = 1; bay <= bays; bay++) {
      bayRows.push({ run: run.label, bay, bayCc: Math.round(bayCc, 1), clearMM: Math.round(clearMM, 1), slatRows });
      totalSlats += slatRows;

      // One slat piece per row per bay, cut to clearMM
      for (let s = 0; s < slatRows; s++) slatCutLengths.push(clearMM);

      // One insert per bay (for 3022mm stock)
      const insertLanes = style === '3-rail' ? 2 : 1;
      for (let i = 0; i < insertLanes; i++) insertCutLengths.push(clearMM);

      const botLanes = style === '3-rail' ? 2 : 1;
      for (let i = 0; i < botLanes; i++) bottomCutLengths.push(clearMM);
    }
  }

  return { bayRows, totalSlats, slatCutLengths, insertCutLengths, bottomCutLengths };
}

// ── Per-run post & rail counts (ported from PHP compute_engine) ───────────────

function computeRunCounts(run, style) {
  const runMM    = Math.max(300, run.length);
  const spanLimit = Math.max(300, Math.min(MAX_SPAN_MM, run.maxPostSpan || MAX_SPAN_MM));
  const bays     = Math.max(1, Math.ceil(runMM / spanLimit));
  const bayCc    = runMM / bays;

  // End types: 'post' | 'half_post' | 'wall'
  const start = run.end1 || 'post';
  const end   = run.end2 || 'post';

  const startPost = start === 'wall' ? 0 : 1;
  const endPost   = end   === 'wall' ? 0 : 1;
  const halfPosts = (start === 'half_post' ? 1 : 0) + (end === 'half_post' ? 1 : 0);
  const fullPosts = Math.max(0, (bays - 1) + startPost + endPost - halfPosts);

  const bottomRails = style === '3-rail' ? bays * 2 : bays;

  // Connection points = (rails × 2 ends each) — for mounting plates
  const connectionPoints = bottomRails * 2;

  // Open ends (get end cap + bracket)
  const wallEnds = (start === 'wall' ? 1 : 0) + (end === 'wall' ? 1 : 0);
  const openEnds = Math.max(0, 2 - wallEnds);

  // Handrail mm for this run (bay_cc × bays as per PHP)
  const handrailMM = bays * bayCc;

  return { bays, bayCc, fullPosts, halfPosts, bottomRails, connectionPoints, openEnds, wallEnds, handrailMM };
}

// ── Main BOM builder ──────────────────────────────────────────────────────────

/**
 * Build full BOM for all active runs.
 *
 * @param {Array}  runs  - array of run config objects
 * @param {object} opts  - { colour, handrailType, postType, style }
 * @returns {{ consolidated: Array, validation: Array, setout: Array }}
 */
export function buildAireBOM(runs, opts) {
  const { colour = 'B', handrailType = 'Oval', postType = 'BasePlate', style = 'Full' } = opts;
  const col       = colour;
  const styleKey  = style === '3-Rail' ? '3-rail' : 'full';
  const bottomGap = 88;  // AIRE+ system default (mm)

  const validation = [];
  const activeRuns = runs.filter((r) => r.active !== false && r.length > 0);

  if (activeRuns.length === 0) return { consolidated: [], validation: [], setout: [] };

  // ── Aggregate counts across all runs ────────────────────────────────────
  let totalFullPosts       = 0;
  let totalHalfPosts       = 0;
  let totalConnectionPts   = 0;
  let totalOpenEnds        = 0;
  let totalWallEnds        = 0;
  let totalBays            = 0;
  let totalHandrailMM      = 0;
  let screwUnits           = 0;  // for AR-SCR-BR-50PK
  let tekUnits             = 0;  // for SS-TS-50-SS304
  let cskUnits             = 0;  // for CSK-12GX50-50PK

  for (const run of activeRuns) {
    const rc = computeRunCounts(run, styleKey);
    totalFullPosts     += rc.fullPosts;
    totalHalfPosts     += rc.halfPosts;
    totalConnectionPts += rc.connectionPoints;
    totalOpenEnds      += rc.openEnds;
    totalWallEnds      += rc.wallEnds;
    totalBays          += rc.bays;
    totalHandrailMM    += rc.handrailMM;

    // Screws per run (from PHP: full=4/bay tek=1/bay csk=8/bay; 3-rail=8/bay tek=0 csk=16/bay)
    if (styleKey === 'full') {
      screwUnits += rc.bays * 4;
      tekUnits   += rc.bays * 1;
      cskUnits   += rc.bays * 8;
    } else {
      screwUnits += rc.bays * 8;
      tekUnits   += 0;
      cskUnits   += rc.bays * 16;
    }

    // Validation
    if (run.maxPostSpan > 1800) {
      validation.push(`Run ${run.label}: max post span exceeds 1800mm certification limit.`);
    }
  }

  // Shared corners reduction (optional — subtract from post total)
  const cornerReduction = Math.min(opts.sharedCorners || 0, totalFullPosts);
  totalFullPosts -= cornerReduction;

  // ── Setout: slat cut lists + stock optimisation ──────────────────────────
  const setout = buildSetout(activeRuns, styleKey, bottomGap);

  // Slat stock (6100mm, cut to clear bay width)
  const slatStocks   = optimizeStockCuts(setout.slatCutLengths,   SLAT_STOCK_MM, 0).stocks;
  // Insert stock (3022mm)
  const insertStocks = optimizeStockCuts(setout.insertCutLengths, INSERT_STOCK_MM, styleKey === 'picket' ? 110 : 130).stocks;
  // Bottom rail stock (5800mm)
  const brStocks     = optimizeStockCuts(setout.bottomCutLengths, BOT_RAIL_STOCK_MM, 0).stocks;
  // Handrail stock (5800mm)
  const hrStocks     = Math.ceil(totalHandrailMM / HANDRAIL_STOCK_MM);

  // Post stock for core drill (cut from 5800mm, height + 100mm embed depth)
  let cdPostStocks = 0;
  if (postType === 'CoreDrill') {
    // Use height of first active run as representative (posts are all same height)
    const repHeight = activeRuns[0]?.height || 1000;
    const cdCutMM   = repHeight + 100;
    const cdPerStock = Math.max(1, Math.floor(FULL_POST_STOCK_MM / cdCutMM));
    cdPostStocks = Math.ceil(totalFullPosts / cdPerStock);
  }

  // ── Spacers per bay (full style only — 1 pack of 20 per bay, per PHP) ───
  const spacerPacksQty = styleKey === 'full' ? totalBays : 0;

  // ── Mounting plates: ceil(connection_points / 2) ─────────────────────────
  const mountPlatesQty = roundPack(totalConnectionPts, 2);

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

  // Posts
  if (postType === 'BasePlate') {
    add(`AR-1050-FPBP-${col}`, totalFullPosts, '1050mm Post with Base Plate', 'ea');
    if (totalHalfPosts > 0) {
      add(`A50-1400D-HALF`, totalHalfPosts, '1400mm Half Post', 'ea');
    }
    // Domical covers (1 per post — base plate + half posts)
    add(`XP-DC-2P-${col}`, totalFullPosts + totalHalfPosts, 'Domical Post Cover', 'ea');
  } else {
    // Core drill: cut from 5800mm stock
    add(`AR-5800-FP-${col}`, cdPostStocks, 'Full Post 5800mm (Core Drill)', 'length');
    // Dress rings: 2 per post (top + bottom)
    add(`XP-DR-${col}`, (totalFullPosts + totalHalfPosts) * 2, 'Dress Ring', 'ea');
  }

  // Bottom rail
  add(`AR-5800-BR-${col}`, brStocks, 'Bottom Rail 5800mm', 'length');

  // Bottom rail insert (for 65mm horizontal slats)
  add(`AR-3022-INS-65-${col}`, insertStocks, 'Bottom Rail Insert 3022mm', 'ea');

  // Slats (6100mm stock, cut to bay width)
  add(`XP-6100-S65-${col}`, slatStocks, '65×16.5mm Horizontal Slat 6100mm', 'length');

  // Handrail
  if (handrailType === 'Rectangular') {
    add(`A50-5800-RHR-${col}`, hrStocks, 'Rectangular Handrail 5800mm', 'length');
  } else {
    add(`A50-5800-OHR-${col}`, hrStocks, 'Oval Handrail 5800mm', 'length');
  }

  // End caps (for open/free ends)
  if (totalOpenEnds > 0) {
    if (handrailType === 'Rectangular') {
      add(`A50-ECA-R-${col}`, totalOpenEnds, 'Rectangular Handrail End Cap', 'ea');
    } else {
      add(`A50-ECA-O-${col}`, totalOpenEnds, 'Oval Handrail End Cap', 'ea');
    }
    // Bracket packs for open ends (offset bracket at each free end)
    const bktPacks = roundPack(totalOpenEnds, 2);
    if (handrailType === 'Rectangular') {
      add(`A50-BRACKET-R-${col}-2PK`, bktPacks, 'Offset Bracket Rect (2pk)', 'pk');
    } else {
      add(`A50-BRACKET-O-${col}-2PK`, bktPacks, 'Offset Bracket Oval (2pk)', 'pk');
    }
  }

  // Wall posts/wallplates — count of ends going into wall
  if (totalWallEnds > 0) {
    add(`A50-WP-${col}`, totalWallEnds, 'Wall Post/Plate', 'ea');
  }

  // Spacers (pack of 20)
  if (spacerPacksQty > 0) {
    add(`AR-SPACER-65MM-${col}`, spacerPacksQty, 'Top Spacer 65mm (pk/20)', 'pk');
  }

  // Mounting plates (pack of 2)
  if (mountPlatesQty > 0) {
    add(`AR-PLATE-${col}-2PK`, mountPlatesQty, 'Bottom Rail Mounting Plate (2pk)', 'pk');
  }

  // Screws
  const brScrewPacks = roundPack(screwUnits, 50);
  if (brScrewPacks > 0) add(`AR-SCR-BR-50PK-${col}`, brScrewPacks, 'Bottom Rail Screws (pk/50)', 'pk');

  if (tekUnits > 0) {
    const tekPacks = roundPack(tekUnits, 50);
    add('SS-TS-50-SS304', tekPacks, 'Tek Screws SS304 (pk/50)', 'pk');
  }

  if (cskUnits > 0) {
    const cskPacks = roundPack(cskUnits, 50);
    add('CSK-12GX50-50PK', cskPacks, 'CSK Screws 12g×50 (pk/50)', 'pk');
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
    height:      1000,
    bottomGap:   88,
    end1:        'post',      // 'post' | 'half_post' | 'wall'
    end2:        'post',
    maxPostSpan: 1800,
  };
}

export const AIRE_DEFAULTS = {
  colour:      'B',
  handrailType:'Oval',
  postType:    'BasePlate',
  style:       'Full',
  sharedCorners: 0,
};
