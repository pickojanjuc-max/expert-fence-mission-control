/**
 * Custom Glass Calculator — BOM Builder
 *
 * Pricing sourced from QLD Local Custom Glass supplier file (updated April 2026).
 * These are supplier sell prices (Nick's cost). Nick's sell = cost × MARKUP.
 *
 * Thickness group 8–14mm covers 8mm, 10mm, and 12mm panels.
 *
 * Always-on processing per panel:
 *   - Heat Soak
 *   - Full CNC Polish (all edges)
 *   - 2mm Radius Polished corners × 4
 *
 * Optional processing per panel:
 *   - Drill holes: standard (0–44mm) or polished (≥32mm)
 *   - Cut outs: corner or flat polish
 *   - Shape surcharge: simple (1 raked edge) or complex
 */

export const MARKUP = 1.40;

// ── Supplier cost rates (8–14mm thickness group) ──────────────────────────────

export const GLASS_RATES = {
  // Glass panel cost per m²
  panel: {
    clear: 54.27,
    grey:  58.48,
    acid:  113.67,
  },
  // Processing — cost per unit (supplier sell = Nick's cost)
  heatSoak:             33.81,  // per m²
  cncPolish:            28.24,  // per LM of perimeter
  radiusCorner:          5.89,  // per corner (2mm radius polished)
  drillHoleStd:         10.71,  // per hole (0–44mm)
  drillHolePolished:    25.86,  // per hole (polished ≥32mm)
  cornerCutOut:         29.87,  // per corner cut out
  flatPolishCutOut:     71.51,  // per flat polish cut out
  simpleShape:          19.87,  // per panel (1 raked edge)
  complexShape:         27.54,  // per panel
};

export const GLASS_TYPE_LABELS = {
  clear: 'Clear Toughened',
  grey:  'Grey Toughened',
  acid:  'Acid Etched Toughened',
};

export const THICKNESS_OPTIONS = [8, 10, 12];

export const SHAPE_OPTIONS = {
  rectangular: { label: 'Rectangular',         surcharge: false },
  simple:      { label: 'Simple (1 raked edge)', surcharge: true  },
  complex:     { label: 'Complex shape',         surcharge: true  },
};

// ── Panel factory ─────────────────────────────────────────────────────────────

export function defaultGlassPanel(index = 0) {
  const labels = ['P1','P2','P3','P4','P5','P6','P7','P8','P9','P10','P11','P12','P13','P14','P15'];
  return {
    label:              labels[index] || `P${index + 1}`,
    qty:                1,
    heightMM:           1000,
    widthMM:            900,
    thickness:          10,
    glassType:          'clear',    // 'clear' | 'grey' | 'acid'
    shape:              'rectangular', // 'rectangular' | 'simple' | 'complex'
    drillHolesStd:      0,          // quantity — standard 0–44mm
    drillHolesPolished: 0,          // quantity — polished ≥32mm
    cornerCutOuts:      0,          // quantity
    flatPolishCutOuts:  0,          // quantity
  };
}

export const GLASS_DEFAULTS = {
  jobType: 'pool',   // 'pool' | 'balustrade' — for label only at this stage
};

// ── Per-panel cost breakdown ───────────────────────────────────────────────────

/**
 * Calculate cost for a single panel (before qty).
 * Returns a detailed breakdown object.
 */
export function panelCostBreakdown(panel) {
  const {
    heightMM = 1000,
    widthMM  = 900,
    thickness,
    glassType = 'clear',
    shape = 'rectangular',
    drillHolesStd = 0,
    drillHolesPolished = 0,
    cornerCutOuts = 0,
    flatPolishCutOuts = 0,
  } = panel;

  const areaSqm     = (heightMM * widthMM) / 1_000_000;
  const perimLM     = (2 * (heightMM + widthMM)) / 1000;

  const glassRate    = GLASS_RATES.panel[glassType] ?? GLASS_RATES.panel.clear;

  const glassCost    = areaSqm * glassRate;
  const heatSoak     = areaSqm * GLASS_RATES.heatSoak;
  const cncPolish    = perimLM * GLASS_RATES.cncPolish;
  const corners      = 4 * GLASS_RATES.radiusCorner;          // always 4 corners
  const shapeCharge  = shape === 'simple'   ? GLASS_RATES.simpleShape
                     : shape === 'complex'  ? GLASS_RATES.complexShape
                     : 0;
  const drillStd     = drillHolesStd     * GLASS_RATES.drillHoleStd;
  const drillPol     = drillHolesPolished * GLASS_RATES.drillHolePolished;
  const cutCorner    = cornerCutOuts     * GLASS_RATES.cornerCutOut;
  const cutFlat      = flatPolishCutOuts  * GLASS_RATES.flatPolishCutOut;

  const totalCost = glassCost + heatSoak + cncPolish + corners
                  + shapeCharge + drillStd + drillPol + cutCorner + cutFlat;
  const totalSell = totalCost * MARKUP;

  return {
    areaSqm:     round2(areaSqm),
    perimLM:     round2(perimLM),
    glassCost:   round2(glassCost),
    heatSoak:    round2(heatSoak),
    cncPolish:   round2(cncPolish),
    corners:     round2(corners),
    shapeCharge: round2(shapeCharge),
    drillStd:    round2(drillStd),
    drillPol:    round2(drillPol),
    cutCorner:   round2(cutCorner),
    cutFlat:     round2(cutFlat),
    totalCost:   round2(totalCost),
    totalSell:   round2(totalSell),
  };
}

// ── Main BOM builder ──────────────────────────────────────────────────────────

/**
 * Build full job summary from all panels.
 *
 * @param {object} opts
 *   panels  — array of panel objects
 *   jobType — 'pool' | 'balustrade'
 *
 * @returns {{ panels, totals, validation }}
 */
export function buildGlassBOM({ panels = [], jobType = 'pool' }) {
  const validation = [];

  if (panels.length === 0) {
    validation.push('No panels entered.');
  }

  let totalCost = 0;
  let totalSell = 0;
  let totalPanels = 0;
  let totalAreaSqm = 0;

  const panelResults = panels.map((p) => {
    const bd = panelCostBreakdown(p);
    const qty = Math.max(1, p.qty || 1);
    const lineCost = round2(bd.totalCost * qty);
    const lineSell = round2(bd.totalSell * qty);

    totalCost   += lineCost;
    totalSell   += lineSell;
    totalPanels += qty;
    totalAreaSqm += bd.areaSqm * qty;

    return {
      ...p,
      qty,
      breakdown:  bd,
      lineCost,
      lineSell,
    };
  });

  return {
    panels:    panelResults,
    jobType,
    totals: {
      panels:    totalPanels,
      areaSqm:   round2(totalAreaSqm),
      cost:      round2(totalCost),
      sell:      round2(totalSell),
    },
    validation,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function round2(n) {
  return Math.round(n * 100) / 100;
}
