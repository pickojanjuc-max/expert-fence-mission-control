import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GATE_MODES } from "@/lib/styleConfig";

export default function RunSetupPanel({
  runs,
  updateRun,
  selectedRun,
  setSelectedRun,
}) {
  const run = runs[selectedRun];
  if (!run) return null;

  const handleGateToggle = (checked) => {
    updateRun(selectedRun, { gate: checked });
  };

  const handleGateModeChange = (mode) => {
    updateRun(selectedRun, { gate_mode: mode });
  };

  const handleGatePositionChange = (val) => {
    const num = Math.max(1, Number(val) || 1);
    updateRun(selectedRun, { gate_after_panel: num });
  };

  return (
    <div className="p-4 flex-1 flex flex-col gap-4">
      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
          Run {selectedRun + 1} Configuration
        </p>
      </div>

      {/* Run selector */}
      <div className="mb-4">
        <label className="text-xs font-medium text-gray-500 mb-2 block">Select Run</label>
        <Select value={String(selectedRun)} onValueChange={(v) => setSelectedRun(Number(v))}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {runs.map((_, i) => (
              <SelectItem key={i} value={String(i)}>
                Run {i + 1} ({runs[i].length_mm}mm)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Gate toggle */}
      <div>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <Checkbox checked={!!run.gate} onCheckedChange={handleGateToggle} className="w-4 h-4" />
          <span className="text-xs font-semibold text-gray-700">Include gate</span>
        </label>
      </div>

      {/* Gate configuration (only if gate is enabled) */}
      {run.gate && (
        <div className="pt-3 border-t border-gray-100 space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-2 block">Gate Position</label>
            <Select value={run.gate_mode || "End"} onValueChange={handleGateModeChange}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GATE_MODES.map((mode) => (
                  <SelectItem key={mode} value={mode}>
                    {mode}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-gray-500 mt-1.5">
              {run.gate_mode === "Start" && "Gate opens at the start of this run"}
              {run.gate_mode === "End" && "Gate opens at the end of this run"}
              {run.gate_mode === "Centre" && "Gate opens in the middle of this run"}
              {run.gate_mode === "Custom" && "Gate opens after a specific panel number"}
            </p>
          </div>

          {run.gate_mode === "Custom" && (
            <div>
              <label className="text-xs font-medium text-gray-500 mb-2 block">After Panel #</label>
              <Input
                type="number"
                min={1}
                value={run.gate_after_panel || 1}
                onChange={(e) => handleGatePositionChange(e.target.value)}
                className="h-8 text-sm"
              />
              <p className="text-[10px] text-gray-500 mt-1">Which panel number the gate comes after</p>
            </div>
          )}
        </div>
      )}

      {/* Run summary */}
      <div className="mt-4 pt-4 border-t border-gray-100 bg-gray-50 rounded p-3">
        <p className="text-xs font-medium text-gray-700 mb-2">Run Summary</p>
        <div className="text-[10px] space-y-1 text-gray-600">
          <p>Length: {run.length_mm}mm</p>
          {run.gate && (
            <>
              <p>Gate: Yes ({run.gate_mode})</p>
              {run.gate_mode === "Custom" && <p>After panel: {run.gate_after_panel}</p>}
            </>
          )}
          {!run.gate && <p>Gate: No</p>}
        </div>
      </div>
    </div>
  );
}
