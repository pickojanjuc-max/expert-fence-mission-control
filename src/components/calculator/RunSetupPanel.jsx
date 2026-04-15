import React, { useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { PANEL_SIZES, GATE_WIDTHS, LATCH_LABELS } from "@/lib/skuMaps";
import { solveRunFromConfig } from "@/lib/bomBuilder";
import RunPreview from "./RunPreview";
import FinishesPanel from "./FinishesPanel";
import { XCircle, Plus, X, RefreshCw, ArrowLeft, ArrowRight, FlipHorizontal } from "lucide-react";

export default function RunSetupPanel({ runs, setRuns, selectedRun, intersectionMap, solvedRuns, shape, finishes, setFinishes }) {
  const cfg = runs[selectedRun];
  if (!cfg) return null;

  const update = (field, val) => {
    const next = [...runs];
    next[selectedRun] = { ...next[selectedRun], [field]: val };
    setRuns(next);
  };

  // Auto allowances + placement snapping when hinge/latch changes
  useEffect(() => {
    if (!cfg.gateOn) return;

    const hingeAllow = cfg.hingeTo === "wall" ? 22 : 10;
    const latchAllow = cfg.latchBehaviour === "post_or_wall"
      ? 22
      : cfg.latchBehaviour === "corner_external"
      ? 15
      : 9;

    const updates = {};

    if (cfg.hingeAllow !== hingeAllow) updates.hingeAllow = hingeAllow;
    if (cfg.latchAllow !== latchAllow) updates.latchAllow = latchAllow;

    const isWallMount = cfg.hingeTo === "wall" || cfg.latchBehaviour === "post_or_wall";

    if (cfg.latchBehaviour === "corner_external") {
      if (cfg.gatePlacement !== "end") updates.gatePlacement = "end";
      // Corner latch mode: hinge must always be glass.
      if (cfg.hingeTo !== "glass") updates.hingeTo = "glass";
      const runKey = selectedRun + 1;
      const hasCornerAtEnd = !!intersectionMap[runKey]?.end;
      const hasCornerAtStart = !!intersectionMap[runKey]?.start;
      // U-shape Side A should always allow manual flip between its two corners.
      const allowDualCornerFlip = shape === "U-shape" && selectedRun === 0;
      // BOX: all sides can manually flip between their two corners.
      const allowBoxCornerFlip = shape === "Box";
      if (!allowDualCornerFlip && !allowBoxCornerFlip) {
        if (hasCornerAtEnd && cfg.endSide !== "end") {
          updates.endSide = "end";
        } else if (hasCornerAtStart && cfg.endSide !== "start") {
          updates.endSide = "start";
        }
      }


    } else if (isWallMount) {
      // If this side has no true outer end (e.g. U-shape Side A), wall/post end-gates are invalid.
      if (!hasTrueOuterEnd) {
        if (cfg.hingeTo !== "glass") updates.hingeTo = "glass";
        if (cfg.latchBehaviour === "post_or_wall") updates.latchBehaviour = "inline_glass_to_glass";
        if (cfg.gatePlacement !== "custom") updates.gatePlacement = "custom";
      } else {
        if (cfg.gatePlacement !== "end") updates.gatePlacement = "end";
      }
      if (cfg.hingeTargetOn) updates.hingeTargetOn = false;
      // L-shape hard lock for non-corner end gates (write-through to run state)
      if (shape === "L-shape") {
        const lockedEnd = selectedRun === 0 ? "end" : selectedRun === 1 ? "start" : cfg.endSide;
        if (lockedEnd && cfg.endSide !== lockedEnd) updates.endSide = lockedEnd;
      }
      // U-shape hard lock for non-corner end gates
      if (shape === "U-shape") {
        let lockedEnd = null;
        if (selectedRun === 1) lockedEnd = "start"; // Side B true outer end
        if (selectedRun === 2) lockedEnd = "start"; // Side C true outer end (orientation corrected)
        if (lockedEnd && cfg.endSide !== lockedEnd) updates.endSide = lockedEnd;
      }
    } else {
      // Glass hinge: custom placement
      if (cfg.gatePlacement !== "custom") updates.gatePlacement = "custom";
      const panelCount = solvedRuns[selectedRun]?.panelQty;
      if (panelCount) {
        const minPos = 1;
        const maxPos = Math.max(1, panelCount - 1);
        const curPos = cfg.gateAfterPanel == null ? maxPos : Number(cfg.gateAfterPanel);
        const clamped = Math.min(maxPos, Math.max(minPos, curPos));
        if (cfg.gateAfterPanel !== clamped) {
          updates.gateAfterPanel = clamped;
        }
      }
    }

    if (Object.keys(updates).length > 0) {
      const next = [...runs];
      next[selectedRun] = { ...next[selectedRun], ...updates };
      setRuns(next);
    }
  }, [cfg.hingeTo, cfg.latchBehaviour, cfg.gateOn, selectedRun, solvedRuns[selectedRun]?.panelQty, intersectionMap]);


  let effectiveEndSide = cfg.endSide || 'end';
  if (cfg.latchBehaviour === "corner_external") {
    const runIdx = selectedRun + 1;
    const hasCornerAtEnd = !!intersectionMap[runIdx]?.end;
    const hasCornerAtStart = !!intersectionMap[runIdx]?.start;
    const allowDualCornerFlip = shape === "U-shape" && selectedRun === 0;
    // BOX: all sides can manually flip between corners.
    const allowBoxCornerFlip = shape === "Box";
    // U-shape Side C: visual rendering shows corner at "end" side
    if (shape === "U-shape" && selectedRun === 2 && cfg.latchBehaviour === "corner_external") {
      effectiveEndSide = "end";
    } else if (!allowDualCornerFlip && !allowBoxCornerFlip) {
      if (hasCornerAtEnd) effectiveEndSide = "end";
      else if (hasCornerAtStart) effectiveEndSide = "start";
    }
  }

  const runIntersections = intersectionMap[selectedRun + 1] || {};
  const hasIntersectionAtStart = !!runIntersections.start;
  const hasIntersectionAtEnd = !!runIntersections.end;

  const isCornerLatch = cfg.latchBehaviour === "corner_external";
  const isWallMount = cfg.hingeTo === "wall" || cfg.latchBehaviour === "post_or_wall";
  // U-shape Side A is always internal (corner-to-corner), so it has no true outer end.
  // BOX: All sides A/B/C are internal (D later).
  const hasTrueOuterEnd = !(hasIntersectionAtStart && hasIntersectionAtEnd) 
    && !(shape === "U-shape" && selectedRun === 0)
    && !(shape === "Box");

  const endEligible = (side) => {
    const isIntersection = side === "start" ? hasIntersectionAtStart : hasIntersectionAtEnd;
    // Corner latch must be at the true intersecting corner.
    if (isCornerLatch) return isIntersection;
    // End-mounted gates (wall/post/glass end cases) should target true external run ends.
    return !isIntersection;
  };

  // End flipping rules:
  // - Box/corner latch: enable by default (checked later per shape)
  // - U-shape/corner latch: allow flipping between valid corners
  // - non-corner end gates: require a true outer end on both sides
  let canFlipGateEnd = (shape === "Box" && isCornerLatch)
    ? true // Box corner flip enabled by default, refined below
    : isCornerLatch
    ? (endEligible("start") && endEligible("end"))
    : (hasTrueOuterEnd && endEligible("start") && endEligible("end"));

  // L-shape hard rule (orientation-corrected):
  // Side A (run 1) true outer end is "end"; Side B (run 2) true outer end is "start".
  // For non-corner end gates, lock to these true ends so gate never snaps into the corner.
  if (shape === "L-shape" && cfg.gateOn && cfg.gatePlacement === "end" && cfg.latchBehaviour !== "corner_external") {
    if (selectedRun === 0) effectiveEndSide = "end";
    else if (selectedRun === 1) effectiveEndSide = "start";
    canFlipGateEnd = false;
  }

  // U-shape hard rule for Side B/C wall/post end gates:
  // Side B true outer end is "start", Side C true outer end is "start" (orientation corrected).
  if (shape === "U-shape" && cfg.gateOn && cfg.gatePlacement === "end" && cfg.latchBehaviour !== "corner_external") {
    if (selectedRun === 1) {
      effectiveEndSide = "start";
      canFlipGateEnd = false;
    } else if (selectedRun === 2) {
      effectiveEndSide = "start";
      canFlipGateEnd = false;
    }
  }

  const allowUSideACornerManualFlip = shape === "U-shape" && selectedRun === 0 && isCornerLatch;

  const allowBoxCornerManualFlip = shape === "Box" && isCornerLatch;
  if (cfg.gateOn && cfg.gatePlacement === "end" && !endEligible(effectiveEndSide) && !allowUSideACornerManualFlip && !allowBoxCornerManualFlip) {
    if (endEligible("end")) effectiveEndSide = "end";
    else if (endEligible("start")) effectiveEndSide = "start";
  }

  // U-shape Side A + corner latch: allow flip unless the target junction is occupied.
  if (shape === "U-shape" && selectedRun === 0 && isCornerLatch) {
    const sideB = runs[1];
    const sideC = runs[2];
    const sideBBlocked = sideB?.gateOn && sideB?.latchBehaviour === "corner_external";
    const sideCBlocked = sideC?.gateOn && sideC?.latchBehaviour === "corner_external";
    // Can flip if at least one junction is free.
    canFlipGateEnd = !sideBBlocked || !sideCBlocked;
  }

  // BOX Side A: corners are A-B (start) and C-A (end)
  if (shape === "Box" && selectedRun === 0 && isCornerLatch) {
    const sideB = runs[1];
    const sideC = runs[2];
    const sideBOnAB = sideB?.gateOn && sideB?.latchBehaviour === "corner_external" && (sideB.endSide || "end") === "end";
    const sideCOnCA = sideC?.gateOn && sideC?.latchBehaviour === "corner_external" && (sideC.endSide || "end") === "end";
    canFlipGateEnd = !(sideBOnAB && sideCOnCA);
  }

  // BOX Side D: corners are B-D (start) and D-C (end)
  if (shape === "Box" && selectedRun === 3 && isCornerLatch) {
    const sideB = runs[1];
    const sideC = runs[2];
    const sideBOnBD = sideB?.gateOn && sideB?.latchBehaviour === "corner_external" && (sideB.endSide || "end") === "start";
    const sideCOnDC = sideC?.gateOn && sideC?.latchBehaviour === "corner_external" && (sideC.endSide || "end") === "start";
    canFlipGateEnd = !(sideBOnBD && sideCOnDC);
  }

  // Gate validation rules
  let gateRuleError = "";
  if (cfg.gateOn && cfg.gatePlacement === "end") {
    const endKey = effectiveEndSide === "start" ? "start" : "end";
    const endIsIntersection = !!intersectionMap[selectedRun + 1]?.[endKey];

    if (endIsIntersection && cfg.latchBehaviour !== "corner_external") {
      gateRuleError = "This end is an intersecting corner. Use Corner Panel latch mode or switch to the true outer end.";
    }
  }

  const cfgWithCorrectEndSide = { ...cfg, endSide: effectiveEndSide, gatePlacement: cfg.gatePlacement };
  const { solved, useStart, useEnd } = gateRuleError
    ? { solved: { ok: false, reason: gateRuleError }, useStart: false, useEnd: false }
    : solveRunFromConfig(cfgWithCorrectEndSide, intersectionMap, selectedRun + 1, shape, runs);

  let previewWidths = [...(solved.panelWidths || [])];
  if (cfg.latchTargetOn && cfg.latchTarget && previewWidths.includes(cfg.latchTarget)) {
    const target = cfg.latchTarget;
    const idx = previewWidths.indexOf(target);
    previewWidths.splice(idx, 1);
    if (cfg.gatePlacement === "end") {
    previewWidths = effectiveEndSide === "start" ? [target, ...previewWidths] : [...previewWidths, target];
    } else if (cfg.gatePlacement === "custom") {
      const split = Math.max(1, Math.min(previewWidths.length, cfg.gateAfterPanel));
      previewWidths = [...previewWidths.slice(0, split), target, ...previewWidths.slice(split)];
    }
  }

  const sideLabel = `Side ${String.fromCharCode(65 + selectedRun)}`;

  // L-shape has one shared corner between Side A and Side B.
  // Only one side may latch to corner at a time.
  let otherRunCornerLatched = shape === "L-shape" && runs.some((r, idx) => (
    idx !== selectedRun && r?.gateOn && r?.latchBehaviour === "corner_external"
  ));

  // U-shape corner-latch blocking logic:
  // Side A can latch to A-B corner (endSide=start) or A-C corner (endSide=end).
  // If Side A uses A-B corner, block Side B corner latch option entirely.
  // If Side A uses A-C corner, block Side C corner latch option entirely.
  let usideABothJunctionsBlocked = false;
  if (shape === "U-shape") {
    const sideA = runs[0];
    const sideB = runs[1];
    const sideC = runs[2];
    const sideBCornerLatched = sideB?.gateOn && sideB?.latchBehaviour === "corner_external";
    const sideCCornerLatched = sideC?.gateOn && sideC?.latchBehaviour === "corner_external";

    if (sideA?.gateOn && sideA?.latchBehaviour === "corner_external") {
      const sideAEndSide = sideA.endSide || "end";
      if (selectedRun === 1 && sideAEndSide === "start") otherRunCornerLatched = true; // A using A-B, block B
      if (selectedRun === 2 && sideAEndSide === "end") otherRunCornerLatched = true;   // A using A-C, block C
    }
    // If BOTH B and C are corner-latched, Side A corner option is disabled entirely.
    if (selectedRun === 0 && sideBCornerLatched && sideCCornerLatched) {
      usideABothJunctionsBlocked = true;
      otherRunCornerLatched = true;
    }
  }

  // BOX corner-latch blocking
  // Deterministic mapping:
  // - Side B corner path = A-B (B start)
  // - Side C corner path = C-A (C end)
  // Therefore, B/C block state should depend only on which corner Side A currently occupies.
  if (shape === "Box") {
    const sideA = runs[0];
    const sideB = runs[1];
    const sideC = runs[2];
    const sideD = runs[3];

    const sideAIsCorner = sideA?.gateOn && sideA?.latchBehaviour === "corner_external";
    const sideBIsCorner = sideB?.gateOn && sideB?.latchBehaviour === "corner_external";
    const sideCIsCorner = sideC?.gateOn && sideC?.latchBehaviour === "corner_external";
    const sideDIsCorner = sideD?.gateOn && sideD?.latchBehaviour === "corner_external";

    // Mapping used here:
    // A: start=A-B, end=C-A
    // B: end=A-B, start=B-D
    // C: end=C-A, start=D-C
    // D: start=B-D, end=D-C
    const aAB = sideAIsCorner && (sideA.endSide || "end") === "start";
    const aCA = sideAIsCorner && (sideA.endSide || "end") === "end";
    const bAB = sideBIsCorner && (sideB.endSide || "end") === "end";
    const bBD = sideBIsCorner && (sideB.endSide || "end") === "start";
    const cCA = sideCIsCorner && (sideC.endSide || "end") === "end";
    const cDC = sideCIsCorner && (sideC.endSide || "end") === "start";
    const dBD = sideDIsCorner && (sideD.endSide || "end") === "start";
    const dDC = sideDIsCorner && (sideD.endSide || "end") === "end";

    // Selected side's corner option is unavailable only if BOTH its adjacent corners are occupied.
    const blockA = selectedRun === 0 && bAB && cCA;
    const blockB = selectedRun === 1 && aAB && dBD;
    const blockC = selectedRun === 2 && aCA && dDC;
    const blockD = selectedRun === 3 && bBD && cDC;

    if (blockA || blockB || blockC || blockD) {
      otherRunCornerLatched = true;
    }
  }

  return (
    <div className="p-4 space-y-4">
      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Configure — {sideLabel}</p>
        <p className="text-xs text-gray-400">Panel constraints, gaps &amp; gate</p>
      </div>

      {/* Mini preview */}
      <div className="bg-white rounded-lg border border-gray-200 p-3">
        {solved.ok ? (
          <>
            <p className="text-[10px] text-gray-400 mb-2 font-medium">
              {solved.panelQty} panels · gap {solved.internalGap}mm
              {solved.gateOpening > 0 && ` · gate ${Math.round(solved.gateOpening)}mm`}
            </p>
            <RunPreview
              widths={solved.panelWidths || []}
              internalGap={solved.internalGap}
              startGap={solved.startGap}
              endGap={solved.endGap}
              useStart={useStart}
              useEnd={useEnd}
              gateOpening={solved.gateOpening}
              gateWidth={cfg.gateOn ? (cfg.gateWidth || 0) : 0}
              hingeAllow={cfg.gateOn ? (cfg.hingeAllow || 0) : 0}
              latchAllow={cfg.gateOn ? (cfg.latchAllow || 0) : 0}
              gatePlacement={cfg.gateOn ? cfg.gatePlacement : "none"}
              endSide={effectiveEndSide}
              gateAfterPanel={solved.gateAfterPanel ?? cfg.gateAfterPanel ?? 1}
            />
            <div className="flex gap-2 mt-2 text-[10px] text-gray-500">
              <span>Start: <strong>{solved.startGap}mm</strong></span>
              <span>·</span>
              <span>Gap: <strong>{solved.internalGap}mm</strong></span>
              <span>·</span>
              <span>End: <strong>{solved.endGap}mm</strong></span>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2 text-red-500">
            <XCircle className="w-4 h-4 flex-shrink-0" />
            <p className="text-xs">{solved.reason}</p>
          </div>
        )}
      </div>

      {/* Geometry */}
      <Section label="Geometry">
        <div className="grid grid-cols-2 gap-2">
          <Field label="Max panel">
            <Select value={String(cfg.maxPanel)} onValueChange={(v) => update("maxPanel", Number(v))}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{PANEL_SIZES.map(p => <SelectItem key={p} value={String(p)}>{p}mm</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Min gap">
            <Select value={String(cfg.minGap)} onValueChange={(v) => update("minGap", Number(v))}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{[20, 25, 30, 35, 40, 45, 50].map(g => <SelectItem key={g} value={String(g)}>{g}mm</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Max gap">
            <Select value={String(cfg.maxGap)} onValueChange={(v) => update("maxGap", Number(v))}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{[30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80].map(g => <SelectItem key={g} value={String(g)}>{g}mm</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="End gap mode">
            <Select value={cfg.gapMode} onValueChange={(v) => update("gapMode", v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["both", "start_only", "end_only", "none"].map(m => (
                  <SelectItem key={m} value={m}>{m.replace(/_/g, " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <div className="flex items-center gap-2 mt-2 p-2 rounded bg-gray-100">
          <Checkbox checked={!!cfg.mixPanels} onCheckedChange={(v) => update("mixPanels", !!v)} className="w-3.5 h-3.5" />
          <span className="text-[10px] text-gray-600">Allow mixed panel widths <span className="text-gray-400">(two adjacent 50mm sizes)</span></span>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <GapOverride label="Custom start gap" on={cfg.startGapOverrideOn} value={cfg.startGapOverride}
            onToggle={(v) => update("startGapOverrideOn", v)} onChange={(v) => update("startGapOverride", v)} />
          <GapOverride label="Custom end gap" on={cfg.endGapOverrideOn} value={cfg.endGapOverride}
            onToggle={(v) => update("endGapOverrideOn", v)} onChange={(v) => update("endGapOverride", v)} />
        </div>
      </Section>

      {/* Finishes (above gate) */}
      {finishes && setFinishes && (
        <Section label="Finishes">
          <div className="rounded-lg border border-gray-200 bg-white">
            <FinishesPanel finishes={finishes} setFinishes={setFinishes} />
          </div>
        </Section>
      )}

      {/* Gate */}
      <div>
        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Gate</div>
        {!cfg.gateOn ? (
          <button
            onClick={() => {
              const panelCount = solvedRuns[selectedRun]?.panelQty || 5;
              const next = [...runs];
              next[selectedRun] = { ...next[selectedRun], gateOn: true, gateAfterPanel: Math.max(1, panelCount - 1) };
              setRuns(next);
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 border-dashed border-blue-300 text-blue-500 hover:bg-blue-50 hover:border-blue-400 transition-colors text-sm font-semibold"
          >
            <Plus className="w-4 h-4" /> Add Gate
          </button>
        ) : (
          <div className="rounded-lg border-2 border-red-200 bg-red-50 p-3 space-y-3">
            {/* Gate header with remove */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-red-600 uppercase tracking-wide">Gate Enabled</span>
              <button
                onClick={() => update("gateOn", false)}
                className="flex items-center gap-1 text-[10px] text-red-400 hover:text-red-600 transition-colors"
              >
                <X className="w-3 h-3" /> Remove
              </button>
            </div>

            <Field label="Width">
              <Select value={String(cfg.gateWidth)} onValueChange={(v) => update("gateWidth", Number(v))}>
                <SelectTrigger className="h-8 text-xs bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>{GATE_WIDTHS.map(w => <SelectItem key={w} value={String(w)}>{w}mm</SelectItem>)}</SelectContent>
              </Select>
            </Field>

            {/* Hinge from / Latch to — radio style with mutual exclusion */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              {/* Hinge from */}
              <div>
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Gate hinging from</p>
                <div className="space-y-1">
                  {[{ val: "glass", label: "Glass" }, { val: "wall", label: "Wall / sq. post" }].map(opt => {
                    const disabled = opt.val === "wall" && (cfg.latchBehaviour === "post_or_wall" || cfg.latchBehaviour === "corner_external" || !hasTrueOuterEnd);
                    const checked = cfg.hingeTo === opt.val;
                    return (
                      <label key={opt.val} className={`flex items-center gap-2 cursor-pointer select-none ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}>
                        <div
                          onClick={() => !disabled && update("hingeTo", opt.val)}
                          className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${checked ? "border-blue-500 bg-blue-500" : "border-gray-400 bg-white"} ${disabled ? "" : "hover:border-blue-400"}`}
                        >
                          {checked && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                        <span className="text-xs text-gray-700">{opt.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Latch destination — radio style matching "Gate hinging from" */}
              <div>
               <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Latch destination</p>
               <div className="space-y-1">
                 {[
                   { val: "inline_glass_to_glass", label: "Glass" },
                   { val: "post_or_wall", label: "Wall / sq. post" },
                   ...(shape !== "Straight" ? [{ val: "corner_external", label: "Corner Panel" }] : []),
                 ].map(opt => {
                   const checked = cfg.latchBehaviour === opt.val;
                   const disabled = (opt.val === "corner_external" && otherRunCornerLatched) || (opt.val === "post_or_wall" && !hasTrueOuterEnd);
                   return (
                     <label key={opt.val} className={`flex items-center gap-2 select-none ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}>
                       <div
                         onClick={() => !disabled && update("latchBehaviour", opt.val)}
                         className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${checked ? "border-blue-500 bg-blue-500" : "border-gray-400 bg-white"} ${disabled ? "" : "hover:border-blue-400"}`}
                       >
                         {checked && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                       </div>
                       <span className="text-xs text-gray-700">{opt.label}</span>
                     </label>
                   );
                 })}
               </div>
               {shape === "L-shape" && otherRunCornerLatched && (
                 <p className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-1.5 mt-1.5">
                   Corner latch already used on the other side. Only one gate can latch to the shared L-corner.
                 </p>
               )}
               {/* BOX: Corner latch blocking message */}
               {shape === "Box" && otherRunCornerLatched && (
                 <p className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-1.5 mt-1.5">
                   This corner path is currently occupied by another side's corner latch.
                 </p>
               )}
              </div>
            </div>

            {/* Gate position controls */}
            {cfg.hingeTo === "wall" || cfg.latchBehaviour === "post_or_wall" || cfg.latchBehaviour === "corner_external" ? (
              canFlipGateEnd ? (
                <button
                  onClick={() => {
                    const current = cfg.endSide || effectiveEndSide || "end";
                    const target = current === "start" ? "end" : "start";
                    // U-shape Side A: don't flip if target junction is occupied.
                    if (shape === "U-shape" && selectedRun === 0 && isCornerLatch) {
                      const sideB = runs[1];
                      const sideC = runs[2];
                      const sideBCornerLatched = sideB?.gateOn && sideB?.latchBehaviour === "corner_external";
                      const sideCCornerLatched = sideC?.gateOn && sideC?.latchBehaviour === "corner_external";
                      if (target === "start" && sideBCornerLatched) return; // A-B blocked
                      if (target === "end" && sideCCornerLatched) return;   // A-C blocked
                    }
                    // BOX Side A: start=A-B, end=C-A
                    if (shape === "Box" && selectedRun === 0 && isCornerLatch) {
                      const sideB = runs[1];
                      const sideC = runs[2];
                      const sideBOnAB = sideB?.gateOn && sideB?.latchBehaviour === "corner_external" && (sideB.endSide || "end") === "end";
                      const sideCOnCA = sideC?.gateOn && sideC?.latchBehaviour === "corner_external" && (sideC.endSide || "end") === "end";
                      if (target === "start" && sideBOnAB) return; // A-B blocked
                      if (target === "end" && sideCOnCA) return;   // C-A blocked
                    }
                    // BOX Side B: start=B-D, end=A-B
                    if (shape === "Box" && selectedRun === 1 && isCornerLatch) {
                      const sideA = runs[0];
                      const sideD = runs[3];
                      const sideAOnAB = sideA?.gateOn && sideA?.latchBehaviour === "corner_external" && (sideA.endSide || "end") === "start";
                      const sideDOnBD = sideD?.gateOn && sideD?.latchBehaviour === "corner_external" && (sideD.endSide || "end") === "start";
                      if (target === "end" && sideAOnAB) return;   // A-B blocked
                      if (target === "start" && sideDOnBD) return; // B-D blocked
                    }
                    // BOX Side C: start=D-C, end=C-A
                    if (shape === "Box" && selectedRun === 2 && isCornerLatch) {
                      const sideA = runs[0];
                      const sideD = runs[3];
                      const sideAOnCA = sideA?.gateOn && sideA?.latchBehaviour === "corner_external" && (sideA.endSide || "end") === "end";
                      const sideDOnDC = sideD?.gateOn && sideD?.latchBehaviour === "corner_external" && (sideD.endSide || "end") === "end";
                      if (target === "end" && sideAOnCA) return;   // C-A blocked
                      if (target === "start" && sideDOnDC) return; // D-C blocked
                    }
                    // BOX Side D: start=B-D, end=D-C
                    if (shape === "Box" && selectedRun === 3 && isCornerLatch) {
                      const sideB = runs[1];
                      const sideC = runs[2];
                      const sideBOnBD = sideB?.gateOn && sideB?.latchBehaviour === "corner_external" && (sideB.endSide || "end") === "start";
                      const sideCOnDC = sideC?.gateOn && sideC?.latchBehaviour === "corner_external" && (sideC.endSide || "end") === "start";
                      if (target === "start" && sideBOnBD) return; // B-D blocked
                      if (target === "end" && sideCOnDC) return;   // D-C blocked
                    }
                    update("endSide", target);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white text-xs font-semibold transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Switch Gate End
                </button>
              ) : (
                <p className="text-[10px] text-gray-500 bg-gray-50 border border-gray-200 rounded px-2 py-1.5">
                  Gate end is fixed for this side/layout.
                </p>
              )
            ) : (
              /* Glass hinge: flip gate + move left/right, constrained so gate stays between panels */
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  onClick={() => update("endSide", cfg.endSide === "start" ? "end" : "start")}
                  className="flex flex-col items-center justify-center gap-1 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white text-[10px] font-semibold transition-colors"
                >
                  <FlipHorizontal className="w-3.5 h-3.5" />
                  Flip Hinge
                </button>
                <button
                  onClick={() => update("gateAfterPanel", Math.max(1, (cfg.gateAfterPanel || 1) - 1))}
                  disabled={(cfg.gateAfterPanel || 1) <= 1}
                  className="flex flex-col items-center justify-center gap-1 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-[10px] font-semibold transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Move Left
                </button>
                <button
                  onClick={() => {
                    const panelCount = solved.panelQty || 2;
                    update("gateAfterPanel", Math.min(panelCount - 1, (cfg.gateAfterPanel || 1) + 1));
                  }}
                  disabled={(cfg.gateAfterPanel || 1) >= (solved.panelQty || 2) - 1}
                  className="flex flex-col items-center justify-center gap-1 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-[10px] font-semibold transition-colors"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  Move Right
                </button>
              </div>
            )}

            <p className="text-[10px] text-red-400">
              Allowances: hinge {cfg.hingeAllow}mm · latch {cfg.latchAllow}mm
            </p>

          </div>
        )}
      </div>

      {/* Targets */}
      <Section label="Panel Targets">
        <div className="space-y-2">
          {/* Hinge panel: auto or manual — not applicable when hinging off wall */}
          {cfg.gateOn && cfg.hingeTo !== "wall" && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">Hinge panel</span>
                <div className="flex rounded-md overflow-hidden border border-gray-200 text-[10px] font-semibold">
                  <button
                    onClick={() => update("hingeTargetOn", false)}
                    className={`px-2.5 py-1 transition-colors ${!cfg.hingeTargetOn ? "bg-blue-500 text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}
                  >Auto</button>
                  <button
                    onClick={() => update("hingeTargetOn", true)}
                    className={`px-2.5 py-1 transition-colors ${cfg.hingeTargetOn ? "bg-blue-500 text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}
                  >Manual</button>
                </div>
              </div>
              {!cfg.hingeTargetOn ? (
                <p className="text-[10px] text-gray-400 bg-gray-50 rounded px-2 py-1.5">
                  Auto-selected: <strong className="text-gray-600">{solved.hingePanel ? `${solved.hingePanel}mm` : "—"}</strong>
                </p>
              ) : (
                <Select value={String(cfg.hingeTarget)} onValueChange={(v) => update("hingeTarget", Number(v))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[600, 800, 1000, 1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800].map(p => (
                      <SelectItem key={p} value={String(p)}>{p}mm</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}
          <TargetOverride
            label="Override latch panel" checked={cfg.latchTargetOn}
            onToggle={(v) => update("latchTargetOn", !!v)}
            value={String(cfg.latchTarget)}
            onChange={(v) => update("latchTarget", Number(v))}
            options={PANEL_SIZES.map(p => ({ val: p, label: `${p}mm` }))}
          />
        </div>
      </Section>

    </div>
  );
}

function Section({ label, children }) {
  return (
    <div>
      <div className="flex items-center text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
        {typeof label === "string" ? <span>{label}</span> : label}
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wide block">{label}</label>
      {children}
    </div>
  );
}

function GapOverride({ label, on, value, onToggle, onChange }) {
  return (
    <div className="space-y-1.5 p-2 rounded bg-gray-100">
      <div className="flex items-center gap-1.5">
        <Checkbox checked={on} onCheckedChange={onToggle} className="w-3.5 h-3.5" />
        <span className="text-[10px] text-gray-600">{label}</span>
      </div>
      {on && (
        <Input type="number" min={0} step={1} value={value} className="h-7 text-xs"
          onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))} />
      )}
    </div>
  );
}

function TargetOverride({ label, checked, onToggle, value, onChange, options }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <Checkbox checked={checked} onCheckedChange={onToggle} className="w-3.5 h-3.5" />
        <span className="text-xs text-gray-600 cursor-pointer">{label}</span>
      </div>
      {checked && (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {options.map(o => <SelectItem key={o.val} value={String(o.val)}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
