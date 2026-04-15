import {
  GATE_SKU_MAP,
  HINGE_GLASS,
  HINGE_WALL,
  LATCH_MAP,
  SPIGOT_SKUS,
  PANEL_SIZES,
  BALUSTRADE_PANEL_PREFIX,
  BALUSTRADE_SPIGOT_SKUS,
  BALUSTRADE_COVER_PLATE_SKUS,
  BALUSTRADE_HANDRAIL_RAIL_SKUS_5800,
  BALUSTRADE_HANDRAIL_RAIL_LENGTH_MM,
  BALUSTRADE_HANDRAIL_INLINE_JOINER_SKUS,
  BALUSTRADE_HANDRAIL_90_JOINER_SKUS,
  BALUSTRADE_HANDRAIL_WALL_PLATE_SKUS,
} from "./skuMaps";
import { solveRun } from "./solverEngine";

function getShapePairs(shape, runCount) {
  const pairs = [];

  if (shape === "U-shape" && runCount >= 3) {
    pairs.push([1, "start", 2, "end"]);
    pairs.push([1, "end", 3, "start"]);
  } else if (shape === "Box" && runCount >= 4) {
    // Must match UI corner mapping in RunSetupPanel:
    // A: start=A-B, end=C-A
    // B: end=A-B, start=B-D
    // C: end=C-A, start=D-C
    // D: start=B-D, end=D-C
    pairs.push([1, "start", 2, "end"]); // A-B
    pairs.push([2, "start", 4, "start"]); // B-D
    pairs.push([4, "end", 3, "start"]); // D-C
    pairs.push([3, "end", 1, "end"]); // C-A
  } else if (runCount > 1) {
    for (let i = 1; i < runCount; i++) {
      pairs.push([i, "start", i + 1, "end"]);
    }
  }

  return pairs;
}

export function solveRunFromConfig(cfg, intersectionMap, runIdx, shape = undefined, allRuns = undefined) {
  const mode = cfg.gapMode;
  let useStart = mode === "both" || mode === "start_only";
  let useEnd = mode === "both" || mode === "end_only";

  if (intersectionMap[runIdx]?.start && cfg.startCornerOverride > 0) useStart = true;
  if (intersectionMap[runIdx]?.end && cfg.endCornerOverride > 0) useEnd = true;

  const effectiveEndSide = cfg.endSide || "end";

  if (cfg.gateOn && cfg.gatePlacement === "end") {
    if (effectiveEndSide === "start") useStart = false;
    else useEnd = false;
  }

  let startGapOverride = cfg.startGapOverrideOn && useStart ? cfg.startGapOverride : null;
  let endGapOverride = cfg.endGapOverrideOn && useEnd ? cfg.endGapOverride : null;

  const isCornerGate = cfg.gateOn && cfg.gatePlacement === "end" && cfg.latchBehaviour === "corner_external";

  // General corner-latch rule:
  // if ANY adjacent run is corner-latch at a shared corner,
  // this run gets -6 at the corresponding intersecting end.
  if (shape && Array.isArray(allRuns) && intersectionMap) {
    const pairs = getShapePairs(shape, allRuns.length);

    for (const [r1, e1, r2, e2] of pairs) {
      // only consider active/shared intersections
      if (!intersectionMap[r1]?.[e1] || !intersectionMap[r2]?.[e2]) continue;

      let otherRunIdx = null;
      let otherEnd = null;
      let myEnd = null;

      if (runIdx === r1) {
        otherRunIdx = r2;
        otherEnd = e2;
        myEnd = e1;
      } else if (runIdx === r2) {
        otherRunIdx = r1;
        otherEnd = e1;
        myEnd = e2;
      } else {
        continue;
      }

      const other = allRuns[otherRunIdx - 1];
      if (!other?.gateOn) continue;
      if (other?.latchBehaviour !== "corner_external") continue;

      const otherSelectedEnd = (other?.endSide || "end");
      if (otherSelectedEnd !== otherEnd) continue;

      if (myEnd === "start") {
        useStart = true;
        startGapOverride = -6;
      } else if (myEnd === "end") {
        useEnd = true;
        endGapOverride = -6;
      }
    }
  }

  return {
    solved: solveRun({
      runLength: cfg.length,
      maxPanel: cfg.maxPanel,
      minGap: cfg.minGap,
      maxGap: cfg.maxGap,
      useStartGap: useStart,
      useEndGap: useEnd,
      gateWidth: cfg.gateOn ? cfg.gateWidth : 0,
      hingeAllow: cfg.gateOn ? cfg.hingeAllow : 0,
      latchAllow: cfg.gateOn ? cfg.latchAllow : 0,
      gatePlacement: cfg.gateOn ? cfg.gatePlacement : "end",
      gateAfterPanel: cfg.gateAfterPanel || 1,
      endSide: effectiveEndSide,
      hingeTarget: (cfg.hingeTargetOn && cfg.hingeTo !== "wall") ? cfg.hingeTarget : null,
      hingeToWall: cfg.gateOn && cfg.hingeTo === "wall",
      latchTarget: cfg.latchTargetOn ? cfg.latchTarget : null,
      startGapOverride,
      endGapOverride,
      mixPanels: cfg.mixPanels || false,
      cornerGate: isCornerGate,
    }),
    useStart,
    useEnd,
    isCornerGate,
    effectiveEndSide,
  };
}

export function buildBOM(runs, finishes, intersectionMap, shape, options = {}) {
  const { skuFamily = "glass_pool" } = options;
  const isBalustrade = skuFamily === "balustrade";
  const rows = [];
  const unsolved = [];
  const runSummary = [];

  runs.forEach((cfg, idx) => {
    const runIdx = idx + 1;
    const runLabel = `Run ${String.fromCharCode(65 + idx)}`;
    const { solved, isCornerGate, effectiveEndSide } = solveRunFromConfig(cfg, intersectionMap, runIdx, shape, runs);

    if (!solved.ok) {
      unsolved.push({ run: runLabel, reason: solved.reason });
      return;
    }

    runSummary.push({
      run: runLabel,
      panels: solved.panelQty,
      internalGap: solved.internalGap,
      startGap: solved.startGap,
      endGap: solved.endGap,
      gateOpening: solved.gateOpening,
    });

    // Glass panels — hinge panel gets its own line item
    const hingePanel = solved.hingePanel;
    const hingeSku = hingePanel ? `12NH-${String(hingePanel).padStart(4, "0")}` : null;
    let hingeAdded = false;

    const counts = {};
    for (let i = 0; i < (solved.panelWidths || []).length; i++) {
      let w = solved.panelWidths[i];

      // Change 2: Corner panel +6mm width adjustment
      if (isCornerGate && cfg.gateOn && cfg.gatePlacement === "end") {
        // Determine which panel is the corner panel based on gate position
        // latch panel is FIRST when gate is at start, LAST when gate is at end
        const latchPanelIdx = effectiveEndSide === "start" ? 0 : (solved.panelWidths.length - 1);
        if (i === latchPanelIdx) {
          // Find nearest PANEL_SIZES value for w + 6
          const targetWidth = w + 6;
          let bestSize = PANEL_SIZES[0];
          let bestDiff = Math.abs(targetWidth - bestSize);
          for (const size of PANEL_SIZES) {
            const diff = Math.abs(targetWidth - size);
            if (diff < bestDiff) {
              bestDiff = diff;
              bestSize = size;
            }
          }
          w = bestSize;
        }
      }

      const sku = isBalustrade
        ? `${BALUSTRADE_PANEL_PREFIX}${String(w).padStart(4, "0")}`
        : `12N-${String(w).padStart(4, "0")}`;
      // Reserve one instance of the hinge panel SKU for its own line (pool fencing only)
      if (!isBalustrade && !hingeAdded && hingeSku && sku === hingeSku) {
        hingeAdded = true;
        continue;
      }
      counts[sku] = (counts[sku] || 0) + 1;
    }
    const panelDescription = isBalustrade
      ? "SUMMIT Frameless Balustrade panel 970H"
      : "12mm toughened glass panel";
    for (const [sku, qty] of Object.entries(counts)) {
      rows.push({ run: runLabel, sku, qty, description: panelDescription });
    }
    if (!isBalustrade && hingeSku) {
      rows.push({ run: runLabel, sku: hingeSku, qty: 1, description: "12mm toughened glass panel — hinge panel" });
    }

    // Spigots + cover plates/rings
    const spigotQty = (solved.panelQty || 0) * 2;
    if (isBalustrade) {
      const colour = finishes.spigotColour || "Satin";
      const spigotSku = BALUSTRADE_SPIGOT_SKUS[colour] || "";
      const coverSku = BALUSTRADE_COVER_PLATE_SKUS[colour] || "";
      if (spigotSku) rows.push({ run: runLabel, sku: spigotSku, qty: spigotQty, description: `MADRID base-plated spigot - ${colour}` });
      if (coverSku) rows.push({ run: runLabel, sku: coverSku, qty: spigotQty, description: `MADRID domical cover - ${colour}` });
    } else {
      const finish = finishes.spigotFinish || "satin";
      const profile = finishes.spigotProfile || "Round";
      const spigotSku = SPIGOT_SKUS[profile]?.spigot?.[finish] || "";
      const ringSku = SPIGOT_SKUS[profile]?.ring?.[finish] || "";
      if (spigotSku) rows.push({ run: runLabel, sku: spigotSku, qty: spigotQty, description: `${profile} spigot - ${finish}` });
      if (ringSku) rows.push({ run: runLabel, sku: ringSku, qty: spigotQty, description: `${profile} dress ring - ${finish}` });
    }

    // Gate components (pool fencing only; balustrade has no gates)
    if (!isBalustrade && cfg.gateOn) {
      const gateFinish = finishes.spigotFinish || "satin";
      const gateSku = GATE_SKU_MAP[cfg.gateWidth] || `08SLG-${String(cfg.gateWidth).padStart(4, "0")}`;
      rows.push({ run: runLabel, sku: gateSku, qty: 1, description: "Gate leaf" });

      const hingeSkus = cfg.hingeTo === "wall" ? HINGE_WALL : HINGE_GLASS;
      const hsku = hingeSkus[gateFinish] || "";
      if (hsku) rows.push({ run: runLabel, sku: hsku, qty: 1, description: "Hinge set" });

      // Change 4: Use correct corner gate latch SKU or fall back to latchBehaviour
      const latchBehaviour = isCornerGate && ["corner_external", "corner_internal"].includes(cfg.latchBehaviour)
        ? cfg.latchBehaviour
        : cfg.latchBehaviour;
      const lsku = LATCH_MAP[latchBehaviour]?.[gateFinish] || "";
      if (lsku) rows.push({ run: runLabel, sku: lsku, qty: 1, description: "Latch kit" });
    }

    // Extras intentionally excluded for this build
  });

  // Handrail BOM (balustrade only) — global on/off flag in finishes.
  // When on, every run gets a handrail; corner joiners come from the shape;
  // wall plates go on every non-corner run end.
  if (isBalustrade && finishes.handrailOn) {
    const colour = finishes.spigotColour || "Satin";
    const railSku = BALUSTRADE_HANDRAIL_RAIL_SKUS_5800[colour] || "";
    const inlineJoinerSku = BALUSTRADE_HANDRAIL_INLINE_JOINER_SKUS[colour] || "";
    const cornerJoinerSku = BALUSTRADE_HANDRAIL_90_JOINER_SKUS[colour] || "";
    const wallPlateSku = BALUSTRADE_HANDRAIL_WALL_PLATE_SKUS[colour] || "";

    // Per-run rails + inline joiners
    runs.forEach((cfg, idx) => {
      const runLabel = `Run ${String.fromCharCode(65 + idx)}`;
      const length = Number(cfg.length) || 0;
      if (length <= 0) return;
      const railCount = Math.ceil(length / BALUSTRADE_HANDRAIL_RAIL_LENGTH_MM);
      const inlineJoiners = Math.max(0, railCount - 1);
      if (railSku && railCount > 0) {
        rows.push({ run: runLabel, sku: railSku, qty: railCount, description: `SUMMIT 25x21mm RHS handrail 5800mm - ${colour}` });
      }
      if (inlineJoinerSku && inlineJoiners > 0) {
        rows.push({ run: runLabel, sku: inlineJoinerSku, qty: inlineJoiners, description: `Handrail inline joiner - ${colour}` });
      }
    });

    // Corners are purely shape-driven:
    //   Straight  → 0 corners (multiple runs separated by structural posts)
    //   L-shape   → 1 corner (between run A and run B)
    //   U-shape   → 2 corners (run A connects to both run B and run C)
    const runCount = runs.length;
    const cornerPairs = [];
    if (shape === "L-shape" && runCount >= 2) {
      cornerPairs.push([0, "start", 1, "end"]);
    } else if (shape === "U-shape" && runCount >= 3) {
      cornerPairs.push([0, "start", 1, "end"]);
      cornerPairs.push([0, "end", 2, "start"]);
    }

    const consumed = {};
    for (let i = 0; i < runCount; i++) consumed[i] = { start: false, end: false };
    for (const [r1, e1, r2, e2] of cornerPairs) {
      consumed[r1][e1] = true;
      consumed[r2][e2] = true;
    }

    if (cornerJoinerSku && cornerPairs.length > 0) {
      rows.push({ run: "—", sku: cornerJoinerSku, qty: cornerPairs.length, description: `Handrail 90° joiner - ${colour}` });
    }

    // Wall plates: every run end that isn't a corner gets one.
    let wallPlateCount = 0;
    runs.forEach((_, idx) => {
      if (!consumed[idx].start) wallPlateCount += 1;
      if (!consumed[idx].end) wallPlateCount += 1;
    });
    if (wallPlateSku && wallPlateCount > 0) {
      rows.push({ run: "—", sku: wallPlateSku, qty: wallPlateCount, description: `Handrail wall plate - ${colour}` });
    }
  }

  // Consolidated BOM
  const consolidated = {};
  for (const row of rows) {
    const key = `${row.sku}|${row.description}`;
    if (!consolidated[key]) {
      consolidated[key] = { sku: row.sku, description: row.description, qty: 0 };
    }
    consolidated[key].qty += row.qty;
  }

  return {
    rows,
    consolidated: Object.values(consolidated),
    runSummary,
    unsolved,
  };
}