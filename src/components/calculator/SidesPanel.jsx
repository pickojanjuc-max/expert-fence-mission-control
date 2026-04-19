import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RotateCcw, Trash2, Plus } from "lucide-react";
import { getDefaultRunConfig } from "@/lib/solverEngine";

export default function SidesPanel({
  runs, setRuns, shape, setShape,
  runCount, setRunCount, sharedCorners, setSharedCorners,
  solvedRuns, selectedRun, setSelectedRun,
}) {
  // Local string state for each input so user can type freely
  const [inputValues, setInputValues] = useState(() => runs.map(r => String(r.length)));

  // Sync if runs change externally (e.g. adding/removing runs)
  useEffect(() => {
    setInputValues(runs.map(r => String(r.length)));
  }, [runs.length]);

  const commitLength = (idx, val) => {
    const num = Math.max(500, Number(val) || 500);
    const next = [...runs];
    next[idx] = { ...next[idx], length: num };

    // Box rule: keep opposite sides equal to preserve true rectangle geometry
    // A(0) <-> D(3), B(1) <-> C(2)
    if (shape === "Box" && next.length >= 4) {
      if (idx === 0) next[3] = { ...next[3], length: num };
      if (idx === 3) next[0] = { ...next[0], length: num };
      if (idx === 1) next[2] = { ...next[2], length: num };
      if (idx === 2) next[1] = { ...next[1], length: num };
    }

    setRuns(next);

    // Sync display to committed value (including mirrored side in Box)
    setInputValues(prev => {
      const a = [...prev];
      a[idx] = String(num);
      if (shape === "Box" && next.length >= 4) {
        if (idx === 0) a[3] = String(num);
        if (idx === 3) a[0] = String(num);
        if (idx === 1) a[2] = String(num);
        if (idx === 2) a[1] = String(num);
      }
      return a;
    });
  };

  const deleteRun = (idx) => {
    if (runs.length <= 1) return;
    const next = runs.filter((_, i) => i !== idx);
    setRuns(next);
    setRunCount(next.length);
    if (selectedRun >= next.length) setSelectedRun(next.length - 1);
  };

  const addRun = () => {
    const maxRuns = shape === "Straight" ? 10 : 8;
    if (runs.length >= maxRuns) return;
    const newRun = { ...runs[0], gateOn: false };
    // For Straight runs, default new runs to 6000mm
    if (shape === "Straight") {
      newRun.length = 6000;
    } else {
      newRun.length = 3000;
    }
    setRuns([...runs, newRun]);
    setRunCount(runs.length + 1);
  };

  const rotateRun = (idx) => {
    const modes = ["both", "start_only", "end_only", "none"];
    const next = [...runs];
    const cur = modes.indexOf(next[idx].gapMode);
    next[idx] = { ...next[idx], gapMode: modes[(cur + 1) % modes.length] };
    setRuns(next);
  };

  return (
    <div className="p-4 flex-1 flex flex-col gap-4">
      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Project</p>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Shape</label>
            <Select value={shape} onValueChange={setShape}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Straight", "L-shape", "U-shape", "Box"].map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
          {shape === "Straight" ? "Runs" : "Sides"}
        </p>
        <div className="space-y-1.5">
          {runs.map((r, i) => {
            const s = solvedRuns[i];
            const isSelected = selectedRun === i;
            return (
              <div
                key={i}
                onClick={() => setSelectedRun(i)}
                className={`rounded-lg border p-2.5 cursor-pointer transition-all ${
                  isSelected
                    ? "border-cyan-400 bg-cyan-50"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-gray-700">
                    {shape === "Straight" ? `Run ${i + 1}` : `Side ${String.fromCharCode(65 + i)}`}
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); rotateRun(i); }}
                      className="w-6 h-6 rounded bg-gray-600 hover:bg-gray-700 text-white flex items-center justify-center transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteRun(i); }}
                      disabled={runs.length <= 1}
                      className="w-6 h-6 rounded bg-red-500 hover:bg-red-600 disabled:bg-gray-200 text-white flex items-center justify-center transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <Input
                  type="number" min={500} step={10}
                  value={inputValues[i] ?? r.length}
                  className="h-7 text-xs mb-1.5"
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => {
                    e.stopPropagation();
                    const a = [...inputValues]; a[i] = e.target.value; setInputValues(a);
                  }}
                  onBlur={(e) => commitLength(i, e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") commitLength(i, e.target.value); }}
                />
                <div className={`text-[10px] px-1.5 py-0.5 rounded ${s?.ok ? "text-green-700 bg-green-50" : "text-red-600 bg-red-50"}`}>
                  {s?.ok ? `${s.panelQty} panels · ${s.internalGap}mm gap` : (s?.reason || "—")}
                </div>
              </div>
            );
          })}

          {shape === "Straight" && runs.length < 10 && (
            <button
              onClick={addRun}
              className="w-full h-8 rounded-lg border border-dashed border-gray-300 text-xs text-gray-400 hover:border-cyan-400 hover:text-cyan-500 transition-colors flex items-center justify-center gap-1"
            >
              <Plus className="w-3 h-3" /> Add run
            </button>
          )}
        </div>
      </div>
    </div>
  );
}