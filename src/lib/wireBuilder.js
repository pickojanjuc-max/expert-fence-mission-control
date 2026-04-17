/**
 * Stainless Wire Balustrade — BOM Builder
 *
 * Ported from ef-stainless-wire-calculator-plugin v1.0.0 (PHP).
 *
 * Two modes:
 *   Standard — opening = 972mm, 11 wires at 81mm centres, standard dropper posts (BW-5010-972D-BP-P)
 *   Custom   — any opening height, user sets wire count (or auto), optional custom droppers (BW-5010-1000BP-P)
 *
 * Per run:
 *   span_width_mm    — horizontal width of each run
 *   droppers         — max(0, ceil(span/1200) - 1) mid-span dropper posts
 *   fork_terminals   — one per wire (one end)
 *   rigging_screws   — one per wire (other end)
 *   lag_eye_screws   — two per wire (both ends)
 *
 * Wire roll supply:
 *   Smart mix of 100m and 305m rolls — minimises excess, then total roll count.
 */

// ── Constants (match PHP) ─────────────────────────────────────────────────────

export const STANDARD_OPENING_MM          = 972.0;
export const STANDARD_MIN_OPENING_MM      = 930.0;
export const STANDARD_MAX_OPENING_MM      = 972.0;
export const STANDARD_WIRE_COUNT          = 11;
export const STANDARD_CENTRES_MM          = 81.0;
export const MAX_WIRE_CENTRES_MM          = 84.0;
export const MAX_CUSTOM_DROPPER_OPENING_MM = 1000.0;
export const DROPPER_SPACING_MM           = 1200.0;  // max span between supports

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Minimum wires needed so centres ≤ 84mm.
 * Returns at least STANDARD_WIRE_COUNT (11).
 */
export function wireCountForOpening(openingMM) {
  const minWires = Math.ceil(openingMM / MAX_WIRE_CENTRES_MM) - 1;
  return Math.max(STANDARD_WIRE_COUNT, minWires);
}

/** Wire centres for given mode. Standard = fixed 81mm. Custom = opening/(count+1). */
export function wireCentresForOpening(openingMM, wireCount, mode) {
  if (mode === 'standard') return STANDARD_CENTRES_MM;
  return openingMM / (wireCount + 1);
}

/** Bottom gap for standard mode. */
export function bottomGapForStandard(openingMM, wireCount) {
  return openingMM - wireCount * STANDARD_CENTRES_MM;
}

/** Number of mid-span dropper posts needed for a run of given width. */
export function dropperCountForSpan(spanMM) {
  return Math.max(0, Math.ceil(spanMM / DROPPER_SPACING_MM) - 1);
}

/**
 * Optimal mix of 100m and 305m wire rolls.
 * Minimises excess, then total roll count.
 * Returns [roll100, roll305].
 */
export function rollSupply(totalWireM) {
  if (totalWireM <= 0)   return [0, 0];
  if (totalWireM <= 100) return [1, 0];
  if (totalWireM <= 305) return [0, 1];

  let best = null;
  const max305 = Math.ceil(totalWireM / 305) + 1;

  for (let r305 = 0; r305 <= max305; r305++) {
    const covered   = r305 * 305;
    const remaining = Math.max(0, totalWireM - covered);
    const r100      = remaining > 0 ? Math.ceil(remaining / 100) : 0;
    const supplied  = covered + r100 * 100;
    const excess    = supplied - totalWireM;
    const rolls     = r305 + r100;

    // PHP array comparison: [excess, rolls, r100, r305] — minimise lexicographically
    if (
      best === null ||
      excess < best[0] ||
      (excess === best[0] && rolls < best[1])
    ) {
      best = [excess, rolls, r100, r305];
    }
  }

  return [best[2], best[3]]; // [roll100, roll305]
}

// ── Main BOM builder ──────────────────────────────────────────────────────────

/**
 * Termination styles — controls which fittings are added per wire end.
 *
 *  'rigging-fork'  — rigging screw (one end) + fork terminal (other end) + 2× lag eye screws
 *  'lag-screw'     — lag screw threaded terminal L + R (ideal for timber posts, no lag eyes)
 *  'threaded'      — threaded terminal L + R + M6 nutsert L + R (for drilled/tapped post)
 */
export const TERMINATION_STYLES = {
  'rigging-fork': { label: 'Rigging screw & fork terminal',   note: 'Standard – steel/alum posts' },
  'lag-screw':    { label: 'Lag screw threaded terminals',     note: 'Ideal for timber posts' },
  'threaded':     { label: 'Threaded terminals (M6 nutsert)',  note: 'Drilled/tapped post' },
};

/**
 * Build BOM for all runs.
 *
 * @param {object} opts
 *   mode                   — 'standard' | 'custom'
 *   terminationStyle       — 'rigging-fork' | 'lag-screw' | 'threaded'
 *   runs                   — [{ spanMM, label, intermediatePostCount }]
 *   openingMM              — overall opening height (mm)
 *   wireAllowanceMM        — extra wire per run per wire (mm, default 0)
 *   selectedWireCount      — custom mode: user's wire count override (0 = auto)
 *   customDroppersRequired — custom mode: include dropper posts?
 *
 * @returns {{ consolidated, validation, perRun, summary }}
 */
export function buildWireBOM(opts) {
  const {
    mode                   = 'standard',
    terminationStyle       = 'rigging-fork',
    runs                   = [{ spanMM: 2400, label: 'A' }],
    openingMM: rawOpening  = STANDARD_OPENING_MM,
    wireAllowanceMM        = 0,
    selectedWireCount      = 0,
    customDroppersRequired = true,
  } = opts;

  const openingMM = rawOpening > 0 ? rawOpening : STANDARD_OPENING_MM;
  const validation = [];

  // Recommended wire count (compliance: ≤ 84mm centres)
  const recommendedWireCount = wireCountForOpening(openingMM);

  // Wire count in use
  const wireCount = mode === 'custom'
    ? Math.max(1, selectedWireCount > 0 ? selectedWireCount : recommendedWireCount)
    : wireCountForOpening(openingMM);

  if (mode === 'custom' && selectedWireCount > 0 && selectedWireCount < recommendedWireCount) {
    validation.push(`Selected wire count (${selectedWireCount}) is below the recommended ${recommendedWireCount} for 84mm max centres.`);
  }

  // Standard mode: outside dropper range
  const standardOutsideRange = mode === 'standard' && (
    openingMM < STANDARD_MIN_OPENING_MM || openingMM > STANDARD_MAX_OPENING_MM
  );
  if (standardOutsideRange) {
    validation.push('Opening outside standard dropper range (930–972mm) — dropper posts excluded.');
  }

  // Custom mode: opening too large for custom droppers
  const customDropperExceeds = mode === 'custom' && customDroppersRequired && openingMM > MAX_CUSTOM_DROPPER_OPENING_MM;
  if (customDropperExceeds) {
    validation.push('Opening exceeds 1000mm — custom dropper posts excluded.');
  }

  const wireCentres  = wireCentresForOpening(openingMM, wireCount, mode);
  const bottomGap    = mode === 'standard' ? bottomGapForStandard(openingMM, wireCount) : null;

  // ── Per-run calculations ────────────────────────────────────────────────
  const perRun = [];
  let totDroppers        = 0;
  let totTopPlates       = 0;
  let totCustomDroppers  = 0;
  let totCustomTopPlates = 0;
  // Style: rigging-fork
  let totForkTerminals   = 0;
  let totRiggingScrews   = 0;
  let totLagEyes         = 0;
  // Style: lag-screw
  let totLagScrewL       = 0;
  let totLagScrewR       = 0;
  // Style: threaded
  let totThreadedL       = 0;
  let totThreadedR       = 0;
  let totNutsertL        = 0;
  let totNutsertR        = 0;

  let totWireLengthM     = 0;

  for (const run of runs) {
    const spanMM              = Math.max(100, run.spanMM || 2400);
    const intermediatePosts   = Math.max(0, Math.floor(run.intermediatePostCount || 0));
    const subBayCount         = intermediatePosts + 1;
    const subBaySpanMM        = spanMM / subBayCount;

    // Droppers: each sub-bay assessed independently, then summed
    const customNoDroppers  = mode === 'custom' && !customDroppersRequired;
    const dropperSupported  = !standardOutsideRange && !customDropperExceeds && !customNoDroppers;
    const rawDroppers       = dropperSupported
      ? Array.from({ length: subBayCount }, () => dropperCountForSpan(subBaySpanMM))
          .reduce((sum, n) => sum + n, 0)
      : 0;
    const effectiveDroppers = rawDroppers;

    // Fittings — only at the two ends of the full run, not at intermediate posts
    // Quantities per run depend on termination style
    const forkTerminals = terminationStyle === 'rigging-fork' ? wireCount : 0;
    const riggingScrews = terminationStyle === 'rigging-fork' ? wireCount : 0;
    const lagEyes       = terminationStyle === 'rigging-fork' ? wireCount * 2 : 0;
    const lagScrewL     = terminationStyle === 'lag-screw'    ? wireCount : 0;
    const lagScrewR     = terminationStyle === 'lag-screw'    ? wireCount : 0;
    const threadedL     = terminationStyle === 'threaded'     ? wireCount : 0;
    const threadedR     = terminationStyle === 'threaded'     ? wireCount : 0;
    const nutsertL      = terminationStyle === 'threaded'     ? wireCount : 0;
    const nutsertR      = terminationStyle === 'threaded'     ? wireCount : 0;

    const wireLenPerWireMM = spanMM + wireAllowanceMM;
    const wireLengthM      = (wireCount * wireLenPerWireMM) / 1000;

    if (mode === 'standard') {
      totDroppers  += effectiveDroppers;
      totTopPlates += effectiveDroppers;
    } else {
      totCustomDroppers  += effectiveDroppers;
      totCustomTopPlates += effectiveDroppers;
    }

    totForkTerminals += forkTerminals;
    totRiggingScrews += riggingScrews;
    totLagEyes       += lagEyes;
    totLagScrewL     += lagScrewL;
    totLagScrewR     += lagScrewR;
    totThreadedL     += threadedL;
    totThreadedR     += threadedR;
    totNutsertL      += nutsertL;
    totNutsertR      += nutsertR;
    totWireLengthM   += wireLengthM;

    perRun.push({
      label:              run.label || String(perRun.length + 1),
      spanMM,
      openingMM,
      wireCount,
      wireCentresMM:      Math.round(wireCentres * 100) / 100,
      bottomGapMM:        bottomGap !== null ? Math.round(bottomGap * 100) / 100 : null,
      intermediatePosts,
      subBayCount,
      subBaySpanMM:       Math.round(subBaySpanMM),
      dropperCount:       effectiveDroppers,
      dropperSupported,
      forkTerminals,
      riggingScrews,
      lagEyes,
      lagScrewL,
      lagScrewR,
      threadedL,
      threadedR,
      nutsertL,
      nutsertR,
      wireLengthM:        Math.round(wireLengthM * 100) / 100,
    });
  }

  const [roll100, roll305] = rollSupply(totWireLengthM);

  // ── Assemble BOM ──────────────────────────────────────────────────────────
  const bom = new Map();

  function add(sku, desc, qty, unit = 'ea') {
    if (!sku || qty <= 0) return;
    const key = sku.toUpperCase();
    if (bom.has(key)) {
      bom.get(key).qty += qty;
    } else {
      bom.set(key, { sku, description: desc, qty, unit });
    }
  }

  // Wire rolls
  if (roll100 > 0) add('BW-S1193.2-100', 'Wire 1×19×3.2mm — 100m roll', roll100, 'roll');
  if (roll305 > 0) add('BW-S1193.2-305', 'Wire 1×19×3.2mm — 305m roll', roll305, 'roll');

  // Dropper posts
  if (totDroppers       > 0) add('BW-5010-972D-BP-P', 'Dropper post 972mm (standard)',   totDroppers,       'ea');
  if (totTopPlates      > 0) add('BW-5010-TP-P',       'Dropper top plate',               totTopPlates,      'ea');
  if (totCustomDroppers > 0) add('BW-5010-1000BP-P',   'Dropper post 1000mm (custom)',    totCustomDroppers, 'ea');
  if (totCustomTopPlates > 0) add('BW-5010-TP-P',      'Dropper top plate',               totCustomTopPlates, 'ea');

  // Fittings — vary by termination style
  // Style: rigging-fork
  add('BW-FTM5-3.2',   'Fork terminal M5 × 3.2mm',           totForkTerminals, 'ea');
  add('BW-RSM5-3.2',   'Rigging screw M5 × 3.2mm',           totRiggingScrews, 'ea');
  add('BW-M6X60-LS',   '6mm lag eye screw',                   totLagEyes,       'ea');
  // Style: lag-screw
  add('BW-M6LST-L',    'Lag screw terminal — LEFT',           totLagScrewL,     'ea');
  add('BW-M6LST-R',    'Lag screw terminal — RIGHT',          totLagScrewR,     'ea');
  // Style: threaded
  add('BW-TTM6-3.2-L', 'Threaded terminal — LEFT',            totThreadedL,     'ea');
  add('BW-TTM6-3.2-R', 'Threaded terminal — RIGHT',           totThreadedR,     'ea');
  add('BW-M6RIVNUT-L', 'M6 nutsert — LEFT',                   totNutsertL,      'ea');
  add('BW-M6RIVNUT-R', 'M6 nutsert — RIGHT',                  totNutsertR,      'ea');

  const consolidated = Array.from(bom.values());

  const summary = {
    wireCount,
    recommendedWireCount,
    wireCentresMM:    Math.round(wireCentres * 10) / 10,
    bottomGapMM:      bottomGap !== null ? Math.round(bottomGap * 10) / 10 : null,
    totalWireLengthM: Math.round(totWireLengthM * 100) / 100,
    roll100,
    roll305,
    mode,
    terminationStyle,
  };

  return { consolidated, validation, perRun, summary };
}

// ── Default run factory ───────────────────────────────────────────────────────

export function defaultWireRun(index = 0) {
  const labels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  return {
    label:                labels[index] || String(index + 1),
    spanMM:               2400,
    intermediatePostCount: 0,
  };
}

export const WIRE_DEFAULTS = {
  mode:                   'standard',      // 'standard' | 'custom'
  terminationStyle:       'rigging-fork',  // 'rigging-fork' | 'lag-screw' | 'threaded'
  openingMM:              972,
  wireAllowanceMM:        0,
  selectedWireCount:      11,
  customDroppersRequired: true,
};
