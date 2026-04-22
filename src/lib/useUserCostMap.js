// ─────────────────────────────────────────────────────────────────────
// useUserCostMap(calculatorType)
//
// Returns a cost map for the current user, scoped to one calculator.
//
// Behaviour:
//   • Renders synchronously with the built-in defaults (COST_MAP) so the
//     calculator never blanks on first paint.
//   • Asynchronously fetches the user's products from /api/products and
//     overlays them on top of the defaults. Any SKU the user has saved
//     a custom price for wins; everything else falls back to defaults.
//   • Only the calculator passed in is fetched (one network call).
//
// This is the ONLY refactor needed to switch a calculator from "shared
// defaults" to "per-tenant pricing". A user can sign up with no products
// at all and get the same prices the app shipped with.
// ─────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { COST_MAP } from '@/lib/costData';

const MARKUP = 1.4; // keep in sync with costData.js

function buildOverlay(userProducts) {
  const overlay = {};
  for (const p of userProducts || []) {
    if (!p?.slot_key) continue;
    const key = String(p.slot_key).toUpperCase();
    const cost = Number(p.cost_price) || 0;
    overlay[key] = {
      sell: Math.round(cost * MARKUP * 100) / 100,
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
    fetch(`/api/products?calculator_type=${encodeURIComponent(calculatorType)}`)
      .then((r) => (r.ok ? r.json() : { products: [] }))
      .then((data) => {
        if (!alive) return;
        const overlay = buildOverlay(data.products);
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
