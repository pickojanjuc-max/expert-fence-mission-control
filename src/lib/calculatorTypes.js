// ────────────────────────────────────────────────────────────────────
// Single source of truth for calculator types.
//
// Any UI code that needs to map a `calculator_type` column value to a
// route, label, or icon MUST import from here. Do not scatter
// calculator-type maps across the codebase — we have been bitten by
// that pattern (custom-glass routing to the wrong calculator because
// one of several copies of the routing map was missing it).
//
// Also used as the canonical list of valid types that the DB CHECK
// constraint on project_calculations.calculator_type enforces.
// ────────────────────────────────────────────────────────────────────

export const CALCULATOR_TYPES = [
  'glass',
  'aluminium',
  'balustrade',
  'wire',
  'aire',
  'custom-glass',
];

export const CALCULATOR_ROUTES = {
  glass: '/calculator/glass',
  aluminium: '/calculator/aluminium',
  balustrade: '/calculator/balustrade',
  wire: '/calculator/wire',
  aire: '/calculator/aire',
  'custom-glass': '/calculator/custom-glass',
};

export const CALCULATOR_LABELS = {
  glass: 'Glass Pool Fencing',
  aluminium: 'Aluminium Fencing',
  balustrade: 'Glass Balustrade',
  wire: 'Stainless Wire Balustrade',
  aire: 'AIRE+ Balustrade',
  'custom-glass': 'Custom Glass',
};

export const CALCULATOR_ICONS = {
  glass: '🔷',
  aluminium: '🔶',
  balustrade: '🟦',
  wire: '🔩',
  aire: '🟫',
  'custom-glass': '🪟',
};

// Safe accessor helpers. If you hit the fallback it means a new
// calculator type was added without being registered here — add it
// above rather than changing these defaults.

export function routeForCalculatorType(type) {
  return CALCULATOR_ROUTES[type] || null;
}

export function labelForCalculatorType(type) {
  return CALCULATOR_LABELS[type] || type || 'Calculator';
}

export function iconForCalculatorType(type) {
  return CALCULATOR_ICONS[type] || '📐';
}
