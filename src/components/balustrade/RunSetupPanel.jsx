import React, { useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { PANEL_SIZES, GATE_WIDTHS, LATCH_LABELS } from "@/lib/skuMaps";
import { solveRunFromConfig } from "@/lib/bomBuilder";
import RunPreview from "./RunPreview";
import FinishesPanel from "./FinishesPanel";
import { XCircle } from "lucide-react";

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
      if (!allowDualCornerFlip) {
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
    // U-shape Side C: visual rendering shows corner at "end" side
    if (shape === "U-shape" && selectedRun === 2 && cfg.latchBehaviour === "corner_external") {
      effectiveEndSide = "end";
    } else if (!allowDualCornerFlip) {
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
  const hasTrueOuterEnd = !(hasIntersectionAtStart && hasIntersectionAtEnd)
    && !(shape === "U-shape" && selectedRun === 0);

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
  let canFlipGateEnd = isCornerLatch
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

  if (cfg.gateOn && cfg.gatePlacement === "end" && !endEligible(effectiveEndSide) && !allowUSideACornerManualFlip) {
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
            <Select
              value={String(cfg.maxPanel)}
              onValueChange={(v) => {
                // Project-level setting: apply the max panel to every run,
                // not just the selected one. New runs already inherit from
                // run 1, but existing runs were keeping their old value.
                const next = Number(v);
                setRuns(runs.map((r) => ({ ...r, maxPanel: next })));
              }}
            >
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

      {/* Finishes */}
      {finishes && setFinishes && (
        <Section label="Finishes">
          <div className="rounded-lg border border-gray-200 bg-white">
            <FinishesPanel finishes={finishes} setFinishes={setFinishes} />
          </div>
        </Section>
      )}

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
