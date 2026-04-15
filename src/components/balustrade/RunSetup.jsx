import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Settings2, GitBranch, CheckCircle, XCircle } from "lucide-react";
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
            <h2 className="text-base font-bold text-gray-800 mb-1">Step 2: Configure Spigots</h2>
            <p className="text-xs text-gray-500 leading-relaxed">Set panel constraints and gaps for each side.</p>
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