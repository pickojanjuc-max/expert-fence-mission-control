import { PANEL_SIZES, HINGE_PANEL_SIZES } from "./skuMaps";

// Pick the hinge panel size from HINGE_PANEL_SIZES that best matches the target width.
// On tie, prefer the larger size (looks more uniform).
export function pickHingePanel(targetWidth) {
  let best = HINGE_PANEL_SIZES[0];
  let bestDiff = Math.abs(targetWidth - best);
  for (const s of HINGE_PANEL_SIZES) {
    const diff = Math.abs(targetWidth - s);
    if (diff < bestDiff || (diff === bestDiff && s > best)) {
      best = s;
      bestDiff = diff;
    }
  }
  return best;
}

function calcGapQty(panelQty, useStart, useEnd) {
  return Math.max(
    (panelQty - 1) + (useStart ? 1 : 0) + (useEnd ? 1 : 0),
    1
  );
}

export function solveRun({
  runLength,
  maxPanel,
  minGap,
  maxGap,
  useStartGap,
  useEndGap,
  gateWidth = 0,
  hingeAllow = 0,
  latchAllow = 0,
  gatePlacement = "end",
  gateAfterPanel = 1,
  endSide = "end",
  hingeTarget = null,
  latchTarget = null,
  startGapOverride = null,
  endGapOverride = null,
  mixPanels = false,
  hingeToWall = false,
  cornerGate = false,
}) {
  const gateOpening = gateWidth > 0 ? gateWidth + hingeAllow + latchAllow : 0;

  // Auto-select hinge panel: try each candidate hinge panel size, do a quick solve
  // to find what normal panel width results, then pick the candidate that minimises
  // the difference between hinge panel and normal panel (most uniform layout).
  // When hinging off a wall, no hinge panel is needed — the wall is the anchor.
  let resolvedHingeTarget = hingeTarget;
  if (hingeToWall) resolvedHingeTarget = null;
  else if (gateWidth > 0 && !hingeTarget) {
    const allowed0 = PANEL_SIZES.filter((p) => p <= maxPanel).sort((a, b) => b - a);
    const candidates = HINGE_PANEL_SIZES.filter((p) => p <= maxPanel);

    let bestCandidate = candidates[candidates.length - 1]; // fallback: largest available
    let bestDelta = Infinity;

    for (const hinge of candidates) {
      // Quick solve with this hinge panel as a special to find the representative normal panel width
      let normalWidth = null;
      outer: for (let qty = 2; qty < 30; qty++) {
        const normalQty = qty - 1; // one slot taken by hinge special
        const gapQty = calcGapQty(qty, useStartGap, useEndGap);
        // Try uniform first
        for (const w of allowed0) {
          const panelSum = hinge + normalQty * w;
          const rem = runLength - gateOpening - panelSum;
          const gap = gapQty > 0 ? rem / gapQty : 0;
          if (gap >= minGap && gap <= maxGap) { normalWidth = w; break outer; }
        }
        // Try mixed (two adjacent 50mm sizes) if enabled
        if (mixPanels && normalQty >= 2) {
          for (const wA of allowed0) {
            const wB = wA - 50;
            if (wB < 200 || wB > maxPanel) continue;
            for (let k = 1; k < normalQty; k++) {
              const panelSum = hinge + (normalQty - k) * wA + k * wB;
              const rem = runLength - gateOpening - panelSum;
              const gap = gapQty > 0 ? rem / gapQty : 0;
              if (gap >= minGap && gap <= maxGap) {
                // Use average of the two sizes as representative width
                normalWidth = Math.round((wA * (normalQty - k) + wB * k) / normalQty);
                break outer;
              }
            }
          }
        }
      }
      if (normalWidth === null) continue;
      const delta = Math.abs(hinge - normalWidth);
      if (delta < bestDelta || (delta === bestDelta && hinge > bestCandidate)) {
        bestDelta = delta;
        bestCandidate = hinge;
      }
    }
    resolvedHingeTarget = bestCandidate;
  }

  const special = [];
  if (resolvedHingeTarget) special.push(resolvedHingeTarget);
  if (latchTarget) special.push(latchTarget);

  const allowed = PANEL_SIZES.filter((p) => p <= maxPanel).sort((a, b) => b - a);
  const specialSum = special.reduce((a, b) => a + b, 0);

  function tryLayout(panelQty, normalWidths) {
    const gapQty = calcGapQty(panelQty, useStartGap, useEndGap);
    const panelSum = specialSum + normalWidths.reduce((a, b) => a + b, 0);

    const startGapFixed = useStartGap && startGapOverride !== null ? startGapOverride : null;
    const endGapFixed = useEndGap && endGapOverride !== null ? endGapOverride : null;
    const fixedTotal = (startGapFixed || 0) + (endGapFixed || 0);
    const varGapQty = Math.max(
      gapQty - (startGapFixed !== null ? 1 : 0) - (endGapFixed !== null ? 1 : 0),
      0
    );

    const remainingForGaps = runLength - gateOpening - panelSum - fixedTotal;
    const internalGap = varGapQty > 0 ? remainingForGaps / varGapQty : 0;

    // If all gaps are fixed, remaining must be ~0 (cannot carry extra/deficit length)
    if (varGapQty === 0 && Math.abs(remainingForGaps) > 1e-6) return null;
    if (varGapQty > 0 && (internalGap < minGap || internalGap > maxGap)) return null;

    const startGap = startGapFixed !== null ? startGapFixed : useStartGap ? internalGap : 0;
    const endGap = endGapFixed !== null ? endGapFixed : useEndGap ? internalGap : 0;

    let widths;
    if (resolvedHingeTarget && gatePlacement === "custom") {
      // buildLayoutSequence inserts the gate AFTER widths[gateAfterPanel - 1].
      // So the panel at index (gateAfterPanel - 1) is the LEFT-of-gate panel,
      // and the panel at index (gateAfterPanel) is the RIGHT-of-gate panel.
      // Default (endSide==="end"): hinge LEFT, latch RIGHT.
      // Flipped (endSide==="start"): latch LEFT, hinge RIGHT.
      const gateIdx = Math.max(0, Math.min(normalWidths.length, (gateAfterPanel || 1) - 1));
      const normals = [...normalWidths];
      // Insert hinge at gateIdx and latch at gateIdx+1
      const leftOfGate = resolvedHingeTarget;
      const rightOfGate = latchTarget || null;
      const base = [
        ...normals.slice(0, gateIdx),
        leftOfGate,
        ...(rightOfGate ? [rightOfGate] : []),
        ...normals.slice(gateIdx),
      ];
      if (endSide === "start") {
        // Swap: latch goes left, hinge goes right
        [base[gateIdx], base[gateIdx + 1]] = [base[gateIdx + 1], base[gateIdx]];
      }
      widths = base;
    } else if (resolvedHingeTarget && gatePlacement === "end") {
      // End: hinge panel must be adjacent to the gate
      // endSide==="start" → gate is at the left, so hinge panel is first in the array
      // endSide==="end"   → gate is at the right, so hinge panel is last in the array
      const normals = latchTarget
        ? [...normalWidths, latchTarget].sort((a, b) => b - a)
        : [...normalWidths].sort((a, b) => b - a);
      if (endSide === "start") {
        // Gate is at LEFT/start end: hinge panel is first (adjacent to gate), normals follow
        widths = [resolvedHingeTarget, ...normals];
      } else {
        // Gate is at RIGHT/end end: normals first, hinge panel last (adjacent to gate)
        widths = [...normals, resolvedHingeTarget];
      }
    } else {
      widths = [...special, ...normalWidths].sort((a, b) => b - a);
    }

    return {
      ok: true,
      panelQty,
      panelWidths: widths,
      gapSize: Math.round((varGapQty > 0 ? internalGap : 0) * 100) / 100,
      internalGap: Math.round((varGapQty > 0 ? internalGap : 0) * 100) / 100,
      startGap: Math.round(startGap * 100) / 100,
      endGap: Math.round(endGap * 100) / 100,
      gateOpening,
      gateAfterPanel: gatePlacement === "custom" ? (gateAfterPanel || 1) : null,
      hingePanel: resolvedHingeTarget,
    };
  }

  // Search: for each panel count, try uniform widths first, then mixed (two adjacent sizes) if enabled.
  // Mixed: (normalQty - k) panels of size wA and k panels of size wB where wB = wA - 50, k in 1..normalQty-1.
  // Ranked by minimising max width difference (most uniform first).
  for (let panelQty = Math.max(1, special.length + 1); panelQty < 30; panelQty++) {
    const normalQty = panelQty - special.length;

    // 1. Uniform — try largest to smallest
    for (const w of allowed) {
      const result = tryLayout(panelQty, Array(normalQty).fill(w));
      if (result) return result;
    }

    // 2. Mixed panels — two adjacent 50mm sizes
    if (mixPanels && normalQty >= 2) {
      // Iterate over pairs (wA, wB) where wA > wB and wA - wB = 50, both <= maxPanel
      // Try all splits k (number of smaller panels), pick first valid
      const pairs = [];
      for (let ai = 0; ai < allowed.length; ai++) {
        const wA = allowed[ai];
        const wB = wA - 50;
        if (wB >= 200 && wB <= maxPanel) pairs.push([wA, wB]);
      }
      for (const [wA, wB] of pairs) {
        for (let k = 1; k < normalQty; k++) {
          const normals = [...Array(normalQty - k).fill(wA), ...Array(k).fill(wB)];
          const result = tryLayout(panelQty, normals);
          if (result) return result;
        }
      }
    }
  }

  return { ok: false, reason: "No valid layout with current constraints." };
}

export function shapeDefaults(shape) {
  const mapping = {
    Straight: [1, 0],
    "L-shape": [2, 1],
    "U-shape": [3, 2],
    Box: [4, 4],
  };
  return mapping[shape] || [1, 0];
}

export function buildIntersectionMap(runCount, shape, sharedCorners) {
  const pairs = [];

  if (shape === "U-shape" && runCount >= 3) {
    // U-shape canonical mapping:
    // Side A (run 1) intersects Side B (run 2) and Side C (run 3).
    // This gives Side A two corner ends (start + end), as expected.
    pairs.push([1, "start", 2, "end"]);
    pairs.push([1, "end", 3, "start"]);
  } else if (shape === "Box" && runCount >= 4) {
    // Box geometry: A (run 1, bottom), B (run 2, left), D (run 4, top), C (run 3, right)
    // Corners: A-B, B-D, D-C, C-A (clockwise from bottom-left)
    pairs.push([1, "end", 2, "start"]);     // A-B corner
    pairs.push([2, "end", 4, "start"]);     // B-D corner
    pairs.push([4, "end", 3, "start"]);     // D-C corner
    pairs.push([3, "end", 1, "start"]);     // C-A corner
  } else if (runCount > 1) {
    for (let i = 1; i < runCount; i++) {
      pairs.push([i, "start", i + 1, "end"]);
    }
  }
  // U-shape has two fixed intersections by definition (A-B and A-C).
  // Do not let sharedCorners trim these or corner-latch snapping breaks on Side C.
  const active = shape === "U-shape"
    ? pairs.length
    : Math.max(0, Math.min(sharedCorners, pairs.length));
  const byRun = {};
  for (let i = 1; i <= runCount; i++) {
    byRun[i] = { start: false, end: false };
  }
  for (let idx = 0; idx < active; idx++) {
    const [r1, e1, r2, e2] = pairs[idx];
    byRun[r1][e1] = true;
    byRun[r2][e2] = true;
  }
  return byRun;
}

export function buildLayoutSequence(
  widths,
  internalGap,
  startGap,
  endGap,
  useStart,
  useEnd,
  gateOpening,
  gatePlacement = "end",
  endSide = "end",
  gateAfterPanel = 1,
  gateWidth = 0,           // NEW: gate width (not including hinges/latches)
  hingeAllow = 0,          // NEW: hinge gap
  latchAllow = 0           // NEW: latch gap
) {
  const seq = [];

  // End/custom placement
  if (useStart) seq.push({ kind: "START_GAP", value: startGap });

  if (gateOpening > 0 && gatePlacement === "end" && endSide === "start") {
    // At start: place latch-gap on the corner side, then gate, then hinge-gap.
    // This keeps corner-latch clearance on latch side (not hinge side).
    if (latchAllow > 0) seq.push({ kind: "LATCH_GAP", value: latchAllow });
    seq.push({ kind: "GATE", value: gateWidth });
    if (hingeAllow > 0) seq.push({ kind: "HINGE_GAP", value: hingeAllow });
  }

  for (let i = 0; i < widths.length; i++) {
    seq.push({ kind: "PANEL", value: widths[i] });
    // Insert gate after the specified panel index (custom / mid-run placement)
    if (gateOpening > 0 && gatePlacement === "custom" && i === gateAfterPanel - 1) {
      // Inter-panel gap where gate is placed: split into hinge + gate + latch
      // NOTE: These replace the normal internalGap (they're not in addition to it)
      if (hingeAllow > 0) seq.push({ kind: "HINGE_GAP", value: hingeAllow });
      seq.push({ kind: "GATE", value: gateWidth });
      if (latchAllow > 0) seq.push({ kind: "LATCH_GAP", value: latchAllow });
      // Do NOT add the internalGap here - the hinge + gate + latch already replaces it
    } else if (i < widths.length - 1) {
      seq.push({ kind: "GAP", value: internalGap });
    }
  }

  if (gateOpening > 0 && gatePlacement === "end" && endSide === "end") {
    // At end: decompose into hinge, gate, latch
    if (hingeAllow > 0) seq.push({ kind: "HINGE_GAP", value: hingeAllow });
    seq.push({ kind: "GATE", value: gateWidth });
    if (latchAllow > 0) seq.push({ kind: "LATCH_GAP", value: latchAllow });
  }

  if (useEnd) seq.push({ kind: "END_GAP", value: endGap });
  return seq;
}

export function getDefaultRunConfig(index) {
  return {
    length: 9230,
    maxPanel: 1500,
    minGap: 20,
    maxGap: 50,
    gapMode: "both",
    startGapOverrideOn: false,
    startGapOverride: 25,
    endGapOverrideOn: false,
    endGapOverride: 25,
    gateOn: index === 0,
    gateWidth: 890,
    gatePlacement: "custom",
    gateAfterPanel: null,
    endSide: "end",
    hingeTo: "glass",
    latchBehaviour: "inline_glass_to_glass",
    hingeAllow: 10,
    latchAllow: 9,
    hingeTargetOn: false,
    hingeTarget: 1000,
    latchTargetOn: false,
    latchTarget: 800,
    startCornerOverride: 0,
    endCornerOverride: 0,
    mixPanels: false,
  };
}

export function getDefaultFinishes() {
  return {
    spigotProfile: "Round",
    spigotFinish: "satin",
    fixingType: "S/S Coach Screws",
    coverRing: "22mm Raised",
    extraCleaner: false,
    extraStainless: false,
    extraSign: false,
  };
}