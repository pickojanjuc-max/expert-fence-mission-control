import React from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RotateCcw, Trash2 } from "lucide-react";
import TopDownPreview from "./TopDownPreview";
import { solveRunFromConfig } from "@/lib/bomBuilder";

export default function SidesStep({
  runs, setRuns, shape, setShape,
  runCount, setRunCount, sharedCorners, setSharedCorners,
  intersectionMap, onNext,
}) {
  const updateLength = (idx, val) => {
    const next = [...runs];
    next[idx] = { ...next[idx], length: Math.max(500, Number(val) || 500) };
    setRuns(next);
  };

  const deleteRun = (idx) => {
    if (runs.length <= 1) return;
    const next = runs.filter((_, i) => i !== idx);
    setRuns(next);
    setRunCount(next.length);
  };

  const addRun = () => {
    const maxRuns = shape === "Straight" ? 4 : 8;
    if (runs.length >= maxRuns) return;
    const newRun = {
      ...runs[0],
      length: 3000,
      gateOn: false,
    };
    setRuns([...runs, newRun]);
    setRunCount(runs.length + 1);
  };

  const rotateRun = (idx) => {
    // Just a placeholder — visual rotation is handled in preview
    // For now cycle through gapMode values as a proxy for orientation
    const modes = ["both", "start_only", "end_only", "none"];
    const next = [...runs];
    const cur = modes.indexOf(next[idx].gapMode);
    next[idx] = { ...next[idx], gapMode: modes[(cur + 1) % modes.length] };
    setRuns(next);
  };

  // Solve all runs for preview
  const solvedRuns = runs.map((cfg, i) => {
    const { solved, isCornerGate, effectiveEndSide } = solveRunFromConfig(cfg, intersectionMap, i + 1, shape, runs);
    return {
      ...solved,
      isCornerGate,
      effectiveEndSide,
    };
  });

  return (
    <div className="flex flex-1 overflow-hidden min-h-0">
      {/* LEFT PANEL */}
      <div className="w-80 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-y-auto">
        <div className="p-5 flex-1">
          <h2 className="text-base font-bold text-gray-800 mb-1">
            Step 1: Add &amp; Configure {shape === "Straight" ? "Runs" : "Sides"}
          </h2>
          <p className="text-xs text-gray-500 mb-5 leading-relaxed">
            Enter the length of each {shape === "Straight" ? "run" : "side"}. Select the project shape to auto-configure.
          </p>

          {/* Shape selector */}
          <div className="mb-5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Project Shape</label>
            <Select value={shape} onValueChange={setShape}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Straight", "L-shape", "U-shape", "Box"].map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Shared corners (only visible when relevant) */}
          {runs.length > 1 && (
            <div className="mb-5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Shared Corners</label>
              <Input
                type="number" min={0} max={8} value={sharedCorners}
                className="h-9 text-sm"
                onChange={(e) => setSharedCorners(Math.max(0, Math.min(8, Number(e.target.value) || 0)))}
              />
            </div>
          )}

          {/* Runs table */}
          <div className="mb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 text-xs font-semibold text-gray-500 pr-2">Name</th>
                  <th className="text-left py-2 text-xs font-semibold text-gray-500 pr-2">Length (mm)</th>
                  <th className="text-left py-2 text-xs font-semibold text-gray-500 pr-2">m</th>
                  <th className="py-2 text-xs font-semibold text-gray-500 text-center">Rot</th>
                  <th className="py-2 text-xs font-semibold text-gray-500 text-center">Del</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((r, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="py-2 pr-2 font-semibold text-gray-700 text-sm">
                      {shape === "Straight" ? `Run ${i + 1}` : `Side ${String.fromCharCode(65 + i)}`}
                    </td>
                    <td className="py-2 pr-2">
                      <Input
                        type="number" min={500} step={10}
                        value={r.length}
                        className="h-8 text-sm w-24"
                        onChange={(e) => updateLength(i, e.target.value)}
                      />
                    </td>
                    <td className="py-2 pr-2 text-gray-500 text-xs whitespace-nowrap">
                      {(r.length / 1000).toFixed(2)} m
                    </td>
                    <td className="py-2 text-center">
                      <button
                        onClick={() => rotateRun(i)}
                        className="w-8 h-8 rounded bg-gray-600 hover:bg-gray-700 text-white flex items-center justify-center mx-auto transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    </td>
                    <td className="py-2 text-center">
                      <button
                        onClick={() => deleteRun(i)}
                        disabled={runs.length <= 1}
                        className="w-8 h-8 rounded bg-red-500 hover:bg-red-600 disabled:bg-gray-200 text-white flex items-center justify-center mx-auto transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
                {/* Empty side D row when < 4 sides (like reference) */}
                {runs.length < 4 && (
                  <tr className="border-b border-gray-50 opacity-40">
                    <td className="py-2 pr-2 text-sm text-gray-400">Side {String.fromCharCode(65 + runs.length)}</td>
                    <td className="py-2 pr-2">
                      <button
                        onClick={addRun}
                        className="h-8 w-24 rounded border border-dashed border-gray-300 text-xs text-gray-400 hover:border-cyan-400 hover:text-cyan-500 transition-colors"
                      >
                        + add
                      </button>
                    </td>
                    <td colSpan={3} />
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Solve summary */}
          <div className="space-y-1.5 mb-4">
            {solvedRuns.map((s, i) => (
              <div key={i} className={`text-xs px-2 py-1.5 rounded ${s.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
                <span className="font-semibold">Side {String.fromCharCode(65 + i)}:</span>{" "}
                {s.ok ? `${s.panelQty} panels · gap ${s.internalGap}mm` : s.reason}
              </div>
            ))}
          </div>
        </div>

        {/* Next button */}
        <div className="p-5 border-t border-gray-100">
          <button
            onClick={onNext}
            className="w-full py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white text-sm font-semibold transition-colors shadow-sm"
          >
            Next Step →
          </button>
        </div>
      </div>

      {/* RIGHT PANEL — top-down preview */}
      <div className="flex-1 bg-gray-100 overflow-hidden flex flex-col">
        <div className="flex-1 flex items-center justify-center p-6">
          <TopDownPreview runs={runs} solvedRuns={solvedRuns} shape={shape} />
        </div>
      </div>
    </div>
  );
}