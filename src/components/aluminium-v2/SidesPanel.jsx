import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus } from "lucide-react";

export default function SidesPanel({
  runs,
  setRuns,
  shape,
  setShape,
  selectedRun,
  setSelectedRun,
  canAddRun,
  onAddRun,
  onDeleteRun,
}) {
  const [inputValues, setInputValues] = useState(() => runs.map((r) => String(r.length_mm)));

  useEffect(() => {
    setInputValues(runs.map((r) => String(r.length_mm)));
  }, [runs.length]);

  // Box shape must always be a true rectangle:
  //   Side A (0) ↔ Side C (2) are opposite long sides
  //   Side B (1) ↔ Side D (3) are opposite short sides
  // Editing one side forces the opposite side to match.
  const oppositeBoxIndex = (idx) => {
    if (idx === 0) return 2;
    if (idx === 2) return 0;
    if (idx === 1) return 3;
    if (idx === 3) return 1;
    return -1;
  };

  const commitLength = (idx, val) => {
    const num = Math.max(500, Number(val) || 500);
    const next = [...runs];
    next[idx] = { ...next[idx], length_mm: num };

    // Rectangle rule for Box shape — mirror to the opposite side.
    const opp = shape === "Box" && next.length === 4 ? oppositeBoxIndex(idx) : -1;
    if (opp >= 0 && next[opp]) {
      next[opp] = { ...next[opp], length_mm: num };
    }

    setRuns(next);

    setInputValues((prev) => {
      const a = [...prev];
      a[idx] = String(num);
      if (opp >= 0) a[opp] = String(num);
      return a;
    });
  };

  const deleteRun = (idx) => {
    if (runs.length <= 1) return;
    onDeleteRun(idx);
  };

  const addRun = () => {
    if (!canAddRun) return;
    onAddRun();
  };

  return (
    <div className="p-4 flex-1 flex flex-col gap-4">
      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Project</p>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Shape</label>
            <Select value={shape} onValueChange={setShape}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["Straight", "L-shape", "U-shape", "Box"].map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
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
            const isSelected = selectedRun === i;
            return (
              <div
                key={i}
                onClick={() => setSelectedRun(i)}
                className={`rounded-lg border p-2.5 cursor-pointer transition-all ${
                  isSelected ? "border-cyan-400 bg-cyan-50" : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-gray-700">
                    {shape === "Straight" ? `Run ${i + 1}` : `Side ${String.fromCharCode(65 + i)}`}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteRun(i);
                    }}
                    disabled={runs.length <= 1}
                    className="w-6 h-6 rounded bg-red-500 hover:bg-red-600 disabled:bg-gray-200 text-white flex items-center justify-center transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={500}
                    step={10}
                    value={inputValues[i] ?? r.length_mm}
                    className="h-7 text-xs flex-1"
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => {
                      e.stopPropagation();
                      const a = [...inputValues];
                      a[i] = e.target.value;
                      setInputValues(a);
                    }}
                    onBlur={(e) => commitLength(i, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitLength(i, e.target.value);
                    }}
                  />
                  <span className="text-[10px] text-gray-500 whitespace-nowrap">mm</span>
                </div>
              </div>
            );
          })}

          {canAddRun && (
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
