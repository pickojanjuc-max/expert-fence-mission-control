// ─────────────────────────────────────────────────────────────────────
// useUserCostMap(calculatorType)
//
// Returns a cost map for the current user, scoped to one calculator.
//
// Behaviour:
//   • Renders synchronously with the built-in defaults (COST_MAP) so the
//     calculator never blanks on first paint.
//   • Asynchronously fetches the user's products + settings and overlays
//     them on top of the defaults. Per-SKU overrides win over the user's
//     default markup, which wins over the hardcoded fallback.
//   • Effective sell price for any overridden SKU:
//         cost × (1 + effectiveMarkupPct / 100)
//     where effectiveMarkupPct =
//         product.markup_pct
//         ?? settings.default_markup_pct
//         ?? FALLBACK_MARKUP_PCT (40)
//
// This is the ONLY refactor needed to switch a calculator from "shared
// defaults" to "per-tenant pricing". A user can sign up with no products
// at all and get the same prices the app shipped with.
// ─────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { COST_MAP } from '@/lib/costData';

const FALLBACK_MARKUP_PCT = 40; // matches the hardcoded MARKUP=1.4 in costData.js

function buildOverlay(userProducts, defaultMarkupPct) {
  const overlay = {};
  for (const p of userProducts || []) {
    if (!p?.slot_key) continue;
    const key = String(p.slot_key).toUpperCase();
    const cost = Number(p.cost_price) || 0;
    const markupPct = (p.markup_pct != null && Number.isFinite(Number(p.markup_pct)))
      ? Number(p.markup_pct)
      : defaultMarkupPct;
    const multiplier = 1 + markupPct / 100;
    overlay[key] = {
      sell: Math.round(cost * multiplier * 100) / 100,
      cost: Math.round(cost * 100) / 100,
      img: p.image_url || COST_MAP[key]?.img || '',
    };
  }
  return overlay;
}

export function useUserCostMap(calculatorType) {
  const [costMap, setCostMap] = useState(COST_MAP);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    if (!calculatorType) {
      setLoaded(true);
      return;
    }

    // Fetch products + settings together. Either failure falls back gracefully.
    Promise.all([
      fetch(`/api/products?calculator_type=${encodeURIComponent(calculatorType)}`)
        .then((r) => (r.ok ? r.json() : { products: [] }))
        .catch(() => ({ products: [] })),
      fetch(`/api/settings?calculator_type=${encodeURIComponent(calculatorType)}`)
        .then((r) => (r.ok ? r.json() : { settings: { default_markup_pct: FALLBACK_MARKUP_PCT } }))
        .catch(() => ({ settings: { default_markup_pct: FALLBACK_MARKUP_PCT } })),
    ])
      .then(([productsData, settingsData]) => {
        if (!alive) return;
        const defaultMarkupPct = Number(settingsData?.settings?.default_markup_pct);
        const safeDefault = Number.isFinite(defaultMarkupPct)
          ? defaultMarkupPct
          : FALLBACK_MARKUP_PCT;
        const overlay = buildOverlay(productsData.products, safeDefault);
        // Merge: defaults first, user overrides on top
        setCostMap({ ...COST_MAP, ...overlay });
        setLoaded(true);
      })
      .catch(() => {
        if (alive) setLoaded(true);
      });

    return () => {
      alive = false;
    };
  }, [calculatorType]);

  return { costMap, loaded };
}
