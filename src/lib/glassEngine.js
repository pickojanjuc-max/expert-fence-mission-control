/**
 * Expert Fence — Glass Pool Fencing Calculator Engine
 * Ported from: expert-fence-app/src/lib/glass-engine.ts (v1.3.6)
 *
 * DO NOT modify calculation logic without explicit instruction from Nick.
 */

// ── SKU maps (direct from PHP) ─────────────────────────────────────────

const GATE_SKU_MAP = {
  750: "08SLG-0750",
  834: "08SLG-0834",
  890: "08SLG-0890",
  1000: "08SLG-1000",
};

const HINGE_GLASS = {
  polish: "PSC-S155-GG-P",
  satin: "PSC-S155-GG-S",
  black: "PSC-S155-GG-B",
};

const HINGE_WALL = {
  polish: "PSC-S155-W-P",
  satin: "PSC-S155-W-S",
  black: "PSC-S155-W-B",
};

const LATCH_MAP = {
  inline_glass_to_glass: {
    polish: "MR-FLGG-P",
    satin: "MR-FLGG-S",
    black: "MR-FLGG-B",
    matt_white: "MR-FLGG-MW",
  },
  corner_external: {
    polish: "MR-FL90E-P",
    satin: "MR-FL90E-S",
    black: "MR-FL90E-B",
    matt_white: "MR-FL90E-MW",
  },
  corner_internal: {
    polish: "MR-FL90I-P",
    satin: "MR-FL90I-S",
    black: "MR-FL90I-B",
    matt_white: "MR-FL90I-MW",
  },
  post_or_wall: {
    polish: "MR-WGL-P",
    satin: "MR-WGL-S",
    black: "MR-WGL-B",
    matt_white: "MR-WGL-MW",
  },
};

// ── Panel sizes: 200–2000 in 50mm increments ────────────────────────────

const PANEL_SIZES = [];
for (let s = 200; s <= 2000; s += 50) {
  PANEL_SIZES.push(s);
}

// ── Helper functions ────────────────────────────────────────────────────

/**
 * Calculate the number of gaps needed given panel quantity and mode.
 * @param {number} panelQty - Number of panels
 * @param {boolean} useStart - Whether to count start gap
 * @param {boolean} useEnd - Whether to count end gap
 * @returns {number} Number of gaps required
 */
function calcGapQty(panelQty, useStart, useEnd) {
  return Math.max(
    panelQty - 1 + (useStart ? 1 : 0) + (useEnd ? 1 : 0),
    1
  );
}

/**
 * Solve a single run configuration, finding valid panel layouts and gap distributions.
 * @param {Object} cfg - Run configuration
 * @returns {Object} Solved run with panel layout or error reason
 */
function solveRun(cfg) {
  const runLength = Number(cfg.length ?? 0);
  const maxPanel = Math.floor(cfg.max_panel ?? 1500);
  const minGap = Number(cfg.min_gap ?? 20);
  const maxGap = Number(cfg.max_gap ?? 50);
  const mode = String(cfg.gap_mode ?? "both");

  const useStart = mode === "both" || mode === "start_only";
  const useEnd = mode === "both" || mode === "end_only";

  const gateOn = Boolean(cfg.gate_on);
  const gateWidth = gateOn ? Number(cfg.gate_width ?? 0) : 0;

  const hingeTo = String(cfg.hinge_to ?? "glass");
  const latchBehaviour = String(
    cfg.latch_behaviour ?? "inline_glass_to_glass"
  );

  const hingeAllow = hingeTo === "wall" ? 22.0 : 10.0;
  let latchAllow;
  if (
    latchBehaviour === "corner_external" ||
    latchBehaviour === "corner_internal"
  ) {
    latchAllow = 15.0;
  } else if (latchBehaviour === "post_or_wall") {
    latchAllow = 22.0;
  } else {
    latchAllow = 9.0;
  }

  const gateOpening = gateOn ? gateWidth + hingeAllow + latchAllow : 0;

  const special = [];
  if (cfg.hinge_target) special.push(Math.floor(cfg.hinge_target));
  if (cfg.latch_target) special.push(Math.floor(cfg.latch_target));

  const allowed = PANEL_SIZES.filter((p) => p <= maxPanel).sort(
    (a, b) => b - a
  );

  for (
    let panelQty = Math.max(1, special.length + 1);
    panelQty < 30;
    panelQty++
  ) {
    const normalQty = panelQty - special.length;
    const gapQty = calcGapQty(panelQty, useStart, useEnd);

    for (const w of allowed) {
      const panelSum =
        special.reduce((a, b) => a + b, 0) + normalQty * w;

      const startFixed =
        useStart &&
        cfg.start_gap_override !== null &&
        cfg.start_gap_override !== undefined
          ? Number(cfg.start_gap_override)
          : null;
      const endFixed =
        useEnd &&
        cfg.end_gap_override !== null &&
        cfg.end_gap_override !== undefined
          ? Number(cfg.end_gap_override)
          : null;

      const fixedTotal = (startFixed ?? 0) + (endFixed ?? 0);
      const varGapQty = Math.max(
        gapQty -
          (startFixed !== null ? 1 : 0) -
          (endFixed !== null ? 1 : 0),
        0
      );

      const remainingForGaps =
        runLength - gateOpening - panelSum - fixedTotal;
      const internalGap =
        varGapQty > 0 ? remainingForGaps / varGapQty : 0;

      if (varGapQty === 0 && remainingForGaps < -0.000001) continue;
      if (varGapQty > 0 && !(internalGap >= minGap && internalGap <= maxGap))
        continue;

      const startGap = startFixed ?? (useStart ? internalGap : 0.0);
      const endGap = endFixed ?? (useEnd ? internalGap : 0.0);

      const widths = [...special, ...Array(normalQty).fill(w)].sort(
        (a, b) => b - a
      );

      return {
        ok: true,
        panel_qty: panelQty,
        panel_widths: widths,
        internal_gap: Math.round(internalGap * 100) / 100,
        start_gap: Math.round(startGap * 100) / 100,
        end_gap: Math.round(endGap * 100) / 100,
        gate_opening: Math.round(gateOpening * 100) / 100,
        hinge_to: hingeTo,
        latch_behaviour: latchBehaviour,
        gate_width: Math.floor(gateWidth),
        gate_on: gateOn,
      };
    }
  }

  return { ok: false, reason: "No valid layout with current constraints." };
}

/**
 * Main compute function: takes a payload and returns complete BOM.
 * @param {Object} payload - Configuration payload with runs and finishes
 * @returns {Object} ComputeResult with BOM, run summaries, and unsolved runs
 */
export function compute(payload) {
  const runs = payload.runs ?? [];
  const finishes = payload.finishes ?? {};

  if (runs.length === 0) {
    return { ok: false, error: "No runs provided." };
  }

  const runResults = [];
  const unsolved = [];
  const rows = [];

  runs.forEach((cfg, idx) => {
    const runName = "Run " + String.fromCharCode(65 + idx);
    const solved = solveRun(cfg);

    if (!solved.ok) {
      unsolved.push({
        run: runName,
        reason: solved.reason ?? "Unknown",
      });
      return;
    }

    const s = solved;

    runResults.push({
      run: runName,
      panels: s.panel_qty,
      internal_gap: s.internal_gap,
      start_gap: s.start_gap,
      end_gap: s.end_gap,
      gate_opening: s.gate_opening,
    });

    // Panel SKUs
    const counts = {};
    for (const w of s.panel_widths) {
      const sku = `12N-${String(Math.floor(w)).padStart(4, "0")}`;
      counts[sku] = (counts[sku] ?? 0) + 1;
    }
    for (const [sku, qty] of Object.entries(counts)) {
      rows.push({ SKU: sku, Description: "12mm toughened glass panel", Qty: qty });
    }

    // Spigots
    const spigotQty = s.panel_qty * 2;
    const finish = finishes.spigot_finish ?? "satin";
    const profile = finishes.spigot_profile ?? "Round";

    let spigotSku;
    let ringSku;

    if (profile === "Round") {
      spigotSku =
        ({ polish: "FR3150P", satin: "FR3150S", black: "FR3150B", matt_white: "FR3150MW" }[finish]) ?? "FR3150S";
      ringSku =
        ({ polish: "FR3151P", satin: "FR3151S", black: "FR3151B", matt_white: "FR3151MW" }[finish]) ?? "FR3151S";
    } else {
      spigotSku =
        ({ polish: "FS3150P", satin: "FS3150S", black: "FS3150B", matt_white: "FS3150MW" }[finish]) ?? "FS3150S";
      ringSku =
        ({ polish: "FS3151P", satin: "FS3151S", black: "FS3151B", matt_white: "FS3151MW" }[finish]) ?? "FS3151S";
    }

    rows.push({ SKU: spigotSku, Description: `${profile} spigot - ${finish}`, Qty: spigotQty });
    rows.push({ SKU: ringSku, Description: `${profile} cover ring - ${finish}`, Qty: spigotQty });

    // Fixings
    const fixingSku =
      (finishes.fixing_type ?? "S/S Coach Screws") === "S/S Coach Screws"
        ? "HW5235"
        : "HW5200";
    rows.push({
      SKU: fixingSku,
      Description: finishes.fixing_type ?? "S/S Coach Screws",
      Qty: spigotQty * 4,
    });

    // Gate components
    if (s.gate_on) {
      const gw = Math.floor(s.gate_width);
      rows.push({
        SKU: GATE_SKU_MAP[gw] ?? `08SLG-${String(gw).padStart(4, "0")}`,
        Description: "Gate leaf",
        Qty: 1,
      });

      const hingeMap = s.hinge_to === "wall" ? HINGE_WALL : HINGE_GLASS;
      const hingeSku = hingeMap[finish] ?? "";
      if (hingeSku) {
        rows.push({ SKU: hingeSku, Description: "Hinge set", Qty: 1 });
      }

      const latchSku = LATCH_MAP[s.latch_behaviour]?.[finish] ?? "";
      if (latchSku) {
        rows.push({ SKU: latchSku, Description: "Latch kit", Qty: 1 });
      }
    }

    // Extras
    if (finishes.extra_cleaner) {
      rows.push({ SKU: "EX-CLEANER", Description: "EnduroShield Glass Cleaner", Qty: 1 });
    }
    if (finishes.extra_stainless) {
      rows.push({ SKU: "EX-SS-TREAT", Description: "EnduroShield Stainless Treatment", Qty: 1 });
    }
    if (finishes.extra_sign) {
      rows.push({ SKU: "EX-RESUS", Description: "Resuscitation Sign", Qty: 1 });
    }
  });

  // Consolidate BOM rows
  const consolidated = {};
  for (const r of rows) {
    const key = `${r.SKU}|${r.Description}`;
    if (!consolidated[key]) {
      consolidated[key] = { SKU: r.SKU, Description: r.Description, Qty: 0 };
    }
    consolidated[key].Qty += r.Qty;
  }

  return {
    ok: true,
    run_summary: runResults,
    bom: Object.values(consolidated),
    unsolved,
  };
}

/**
 * Default payload matching PHP default_payload.
 * @returns {Object} Default configuration for a single run
 */
export function defaultPayload() {
  return {
    runs: [
      {
        length: 9230,
        max_panel: 1500,
        min_gap: 20,
        max_gap: 50,
        gap_mode: "both",
        gate_on: true,
        gate_width: 890,
        hinge_to: "glass",
        latch_behaviour: "inline_glass_to_glass",
        hinge_target: null,
        latch_target: null,
        start_gap_override: null,
        end_gap_override: null,
      },
    ],
    finishes: {
      spigot_profile: "Round",
      spigot_finish: "satin",
      fixing_type: "S/S Coach Screws",
      extra_cleaner: false,
      extra_stainless: false,
      extra_sign: false,
    },
  };
}

/**
 * Internal solve function — exported for component use.
 * Finds valid panel layout for a single run configuration.
 * @param {Object} cfg - Run configuration
 * @returns {Object} Solved run with panel layout or error
 */
export { solveRun };
