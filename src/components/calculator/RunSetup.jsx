import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Settings2, DoorOpen, Target, GitBranch, CheckCircle, XCircle } from "lucide-react";
import { PANEL_SIZES, GATE_WIDTHS, LATCH_LABELS } from "@/lib/skuMaps";
import { solveRunFromConfig } from "@/lib/bomBuilder";
import RunPreview from "./RunPreview";

export default function RunSetup({ runs, setRuns, runCount, intersectionMap, onBack, onNext }) {
  const [selectedRun, setSelectedRun] = React.useState(0);
  const cfg = runs[selectedRun];
  if (!cfg) return null;

  const update = (field, val) => {
    const next = [...runs];
    next[selectedRun] = { ...next[selectedRun], [field]: val };
    setRuns(next);
  };

  // Auto allowances
  React.useEffect(() => {
    if (cfg.gateOn) {
      const hingeAllow = cfg.hingeTo === "wall" ? 22 : 10;
      const latchAllow = cfg.latchBehaviour === "post_or_wall" ? 22
        : ["corner_external", "corner_internal"].includes(cfg.latchBehaviour) ? 15 : 9;
      if (cfg.hingeAllow !== hingeAllow || cfg.latchAllow !== latchAllow) {
        const next = [...runs];
        next[selectedRun] = { ...next[selectedRun], hingeAllow, latchAllow };
        setRuns(next);
      }
    }
  }, [cfg.hingeTo, cfg.latchBehaviour, cfg.gateOn]);

  const { solved, useStart, useEnd } = solveRunFromConfig(cfg, intersectionMap, selectedRun + 1);

  // Prepare preview widths
  let previewWidths = [...(solved.panelWidths || [])];
  if (cfg.latchTargetOn && cfg.latchTarget && previewWidths.includes(cfg.latchTarget)) {
    const target = cfg.latchTarget;
    const idx = previewWidths.indexOf(target);
    previewWidths.splice(idx, 1);
    if (cfg.gatePlacement === "end") {
      if (cfg.endSide === "start") previewWidths = [target, ...previewWidths];
      else previewWidths = [...previewWidths, target];
    } else {
      const split = Math.max(1, Math.min(previewWidths.length, cfg.gateAfterPanel));
      previewWidths = [...previewWidths.slice(0, split), target, ...previewWidths.slice(split)];
    }
  }

  return (
    <div className="flex flex-1 overflow-hidden min-h-0">
      {/* LEFT PANEL */}
      <div className="w-80 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-y-auto">
        <div className="p-5 flex-1 space-y-4">
          <div>
            <h2 className="text-base font-bold text-gray-800 mb-1">Step 2: Configure Spigots &amp; Gates</h2>
            <p className="text-xs text-gray-500 leading-relaxed">Set panel constraints, gaps and gate details for each side.</p>
          </div>

          {/* Run selector */}
          <div className="flex gap-1.5 flex-wrap">
            {Array.from({ length: runCount }).map((_, i) => (
              <button
                key={i}
                onClick={() => setSelectedRun(i)}
                className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                  selectedRun === i
                    ? "bg-cyan-500 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Side {String.fromCharCode(65 + i)}
              </button>
            ))}
          </div>

          <GeometrySection cfg={cfg} update={update} />
          <GateSection cfg={cfg} update={update} intersectionMap={intersectionMap} runIdx={selectedRun + 1} />
          <TargetsSection cfg={cfg} update={update} />
          <IntersectionSection cfg={cfg} update={update} intersectionMap={intersectionMap} runIdx={selectedRun + 1} />
        </div>

        <div className="p-5 border-t border-gray-100 flex gap-2">
          {onBack && (
            <button onClick={onBack}
              className="flex-1 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors">
              ← Back
            </button>
          )}
          {onNext && (
            <button onClick={onNext}
              className="flex-1 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white text-sm font-semibold transition-colors shadow-sm">
              Next Step →
            </button>
          )}
        </div>
      </div>

      {/* RIGHT PANEL — run preview */}
      <div className="flex-1 bg-gray-100 flex flex-col items-center justify-center p-6 overflow-hidden">
        {solved.ok ? (
          <div className="w-full max-w-4xl space-y-3">
            <div className="bg-white rounded-xl shadow-sm p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Side {String.fromCharCode(65 + selectedRun)} — {solved.panelQty} panels · gap {solved.internalGap}mm
                {solved.gateOpening > 0 && ` · gate ${Math.round(solved.gateOpening)}mm`}
              </p>
              <RunPreview
                widths={previewWidths}
                internalGap={solved.internalGap}
                startGap={solved.startGap}
                endGap={solved.endGap}
                useStart={useStart}
                useEnd={useEnd}
                gateOpening={solved.gateOpening}
                gatePlacement={cfg.gatePlacement}
                endSide={cfg.endSide}
                gateAfterPanel={cfg.gateAfterPanel}
              />
            </div>
            <div className="flex gap-3 text-xs text-gray-600">
              <span className="bg-white px-3 py-1.5 rounded-lg shadow-sm">Start gap: <strong>{solved.startGap}mm</strong></span>
              <span className="bg-white px-3 py-1.5 rounded-lg shadow-sm">Internal gap: <strong>{solved.internalGap}mm</strong></span>
              <span className="bg-white px-3 py-1.5 rounded-lg shadow-sm">End gap: <strong>{solved.endGap}mm</strong></span>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl p-6 text-center max-w-sm shadow-sm">
            <XCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
            <p className="text-sm text-red-600 font-medium">{solved.reason}</p>
            <p className="text-xs text-gray-400 mt-1">Adjust panel size or gap constraints</p>
          </div>
        )}
      </div>
    </div>
  );
}

function GeometrySection({ cfg, update }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Settings2 className="w-4 h-4 text-primary" />
          Run Geometry
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Field label="Max panel width">
            <Select value={String(cfg.maxPanel)} onValueChange={(v) => update("maxPanel", Number(v))}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PANEL_SIZES.map(p => <SelectItem key={p} value={String(p)}>{p}mm</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Min gap">
            <Select value={String(cfg.minGap)} onValueChange={(v) => update("minGap", Number(v))}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[20, 30, 40, 50].map(g => <SelectItem key={g} value={String(g)}>{g}mm</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Max gap">
            <Select value={String(cfg.maxGap)} onValueChange={(v) => update("maxGap", Number(v))}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[30, 40, 50, 60, 70, 80].map(g => <SelectItem key={g} value={String(g)}>{g}mm</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="End gap mode">
            <Select value={cfg.gapMode} onValueChange={(v) => update("gapMode", v)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["both", "start_only", "end_only", "none"].map(m => (
                  <SelectItem key={m} value={m}>{m.replace(/_/g, " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <GapOverride label="Start" on={cfg.startGapOverrideOn} value={cfg.startGapOverride}
            onToggle={(v) => update("startGapOverrideOn", v)} onChange={(v) => update("startGapOverride", v)} />
          <GapOverride label="End" on={cfg.endGapOverrideOn} value={cfg.endGapOverride}
            onToggle={(v) => update("endGapOverrideOn", v)} onChange={(v) => update("endGapOverride", v)} />
        </div>
      </CardContent>
    </Card>
  );
}

function GateSection({ cfg, update, intersectionMap, runIdx }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <DoorOpen className="w-4 h-4 text-accent" />
            Gate
          </CardTitle>
          <div className="flex items-center gap-2">
            <Checkbox checked={cfg.gateOn} onCheckedChange={(v) => update("gateOn", !!v)} id="gate-toggle" />
            <label htmlFor="gate-toggle" className="text-sm cursor-pointer">Add gate</label>
          </div>
        </div>
      </CardHeader>
      {cfg.gateOn && (
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Field label="Gate width">
              <Select value={String(cfg.gateWidth)} onValueChange={(v) => update("gateWidth", Number(v))}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {GATE_WIDTHS.map(w => <SelectItem key={w} value={String(w)}>{w}mm</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Placement">
              <Select value={cfg.gatePlacement} onValueChange={(v) => update("gatePlacement", v)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="centre">Centre</SelectItem>
                  <SelectItem value="end">End</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            {cfg.gatePlacement === "end" ? (
              <Field label="Run end">
                <Select value={cfg.endSide} onValueChange={(v) => update("endSide", v)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="start">Start</SelectItem>
                    <SelectItem value="end">End</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            ) : (
              <Field label="After panel #">
                <Input type="number" min={1} max={20} value={cfg.gateAfterPanel} className="h-9"
                  onChange={(e) => update("gateAfterPanel", Math.max(1, Number(e.target.value) || 1))} />
              </Field>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Field label="Hinge to">
              <Select value={cfg.hingeTo} onValueChange={(v) => update("hingeTo", v)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="glass">Glass</SelectItem>
                  <SelectItem value="wall">Wall</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Latch behaviour" className="col-span-2">
              <Select value={cfg.latchBehaviour} onValueChange={(v) => update("latchBehaviour", v)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(LATCH_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <p className="text-xs text-muted-foreground">
            Auto allowances → hinge: {cfg.hingeAllow}mm | latch: {cfg.latchAllow}mm
          </p>
        </CardContent>
      )}
    </Card>
  );
}

function TargetsSection({ cfg, update }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Target className="w-4 h-4 text-primary" />
          Panel Targets
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Checkbox checked={cfg.hingeTargetOn} onCheckedChange={(v) => update("hingeTargetOn", !!v)} id="hinge-t" />
            <label htmlFor="hinge-t" className="text-sm cursor-pointer">Override hinge panel</label>
          </div>
          {cfg.hingeTargetOn && (
            <Select value={String(cfg.hingeTarget)} onValueChange={(v) => update("hingeTarget", Number(v))}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[600, 800, 1000, 1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800].map(p => (
                  <SelectItem key={p} value={String(p)}>{p}mm</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Checkbox checked={cfg.latchTargetOn} onCheckedChange={(v) => update("latchTargetOn", !!v)} id="latch-t" />
            <label htmlFor="latch-t" className="text-sm cursor-pointer">Override latch panel</label>
          </div>
          {cfg.latchTargetOn && (
            <Select value={String(cfg.latchTarget)} onValueChange={(v) => update("latchTarget", Number(v))}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PANEL_SIZES.map(p => <SelectItem key={p} value={String(p)}>{p}mm</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function IntersectionSection({ cfg, update, intersectionMap, runIdx }) {
  const si = intersectionMap[runIdx]?.start;
  const ei = intersectionMap[runIdx]?.end;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <GitBranch className="w-4 h-4 text-primary" />
          Intersection Overrides
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4">
        <Field label="Start override (mm)">
          <Input type="number" min={0} step={1} value={cfg.startCornerOverride} className="h-9"
            disabled={!si}
            onChange={(e) => update("startCornerOverride", Math.max(0, Number(e.target.value) || 0))} />
        </Field>
        <Field label="End override (mm)">
          <Input type="number" min={0} step={1} value={cfg.endCornerOverride} className="h-9"
            disabled={!ei}
            onChange={(e) => update("endCornerOverride", Math.max(0, Number(e.target.value) || 0))} />
        </Field>
      </CardContent>
    </Card>
  );
}

function Field({ label, children, className = "" }) {
  return (
    <div className={`space-y-1 ${className}`}>
      <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{label}</Label>
      {children}
    </div>
  );
}

function GapOverride({ label, on, value, onToggle, onChange }) {
  return (
    <div className="space-y-2 p-3 rounded-lg bg-muted/50">
      <div className="flex items-center gap-2">
        <Checkbox checked={on} onCheckedChange={onToggle} />
        <span className="text-sm">Custom {label.toLowerCase()} gap</span>
      </div>
      {on && (
        <Input type="number" min={0} step={1} value={value} className="h-9"
          onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))} />
      )}
    </div>
  );
}