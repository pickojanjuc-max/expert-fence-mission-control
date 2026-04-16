import React, { useState, useCallback, useEffect, useRef } from "react";
import { shapeDefaults, buildIntersectionMap, getDefaultRunConfig, getDefaultFinishes } from "@/lib/solverEngine";
import { solveRunFromConfig, buildBOM } from "@/lib/bomBuilder";
import { downloadSetoutPlanPDF } from "@/lib/pdfGenerator";
import { buildLayoutSequence } from "@/lib/solverEngine";
import TopDownPreview from "@/components/calculator/TopDownPreview";
import RunSetupPanel from "@/components/calculator/RunSetupPanel";
import SidesPanel from "@/components/calculator/SidesPanel";
import BOMPanel from "@/components/calculator/BOMPanel";
import SaveProjectModal from "@/components/SaveProjectModal";

// ── Session persistence ──────────────────────────────────────────────
const STORAGE_KEY = "ef_glass_calc_state";

function loadSavedState() {
  try {
    const raw = typeof window !== "undefined" && sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function saveState(state) {
  try {
    if (typeof window !== "undefined") {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  } catch { /* ignore */ }
}

export default function Calculator() {
  // Initialize with defaults — sessionStorage restore happens in useEffect to avoid hydration mismatch
  const [shape, setShape] = useState("Straight");
  const [runCount, setRunCount] = useState(1);
  const [sharedCorners, setSharedCorners] = useState(0);
  const [runs, setRuns] = useState(() => {
    const cfg = getDefaultRunConfig(0);
    cfg.length = 6000;
    return [cfg];
  });
  const [finishes, setFinishes] = useState(getDefaultFinishes());
  const [selectedRun, setSelectedRun] = useState(0);
  const [rightTab, setRightTab] = useState("preview");

  // ── Project save/load state ──────────────────────────────────────────
  const [projectId, setProjectId] = useState(null);
  const [projectName, setProjectName] = useState("");
  const [calculationId, setCalculationId] = useState(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [hydrated, setHydrated] = useState(false);

  // Restore sessionStorage state after hydration (avoids server/client mismatch)
  useEffect(() => {
    const saved = loadSavedState();
    if (saved) {
      if (saved.shape) setShape(saved.shape);
      if (saved.runCount) setRunCount(saved.runCount);
      if (saved.sharedCorners !== undefined) setSharedCorners(saved.sharedCorners);
      if (saved.runs) setRuns(saved.runs);
      if (saved.finishes) setFinishes(saved.finishes);
      if (saved.selectedRun !== undefined) setSelectedRun(saved.selectedRun);
      if (saved.rightTab) setRightTab(saved.rightTab);
      if (saved.projectId) setProjectId(saved.projectId);
      if (saved.projectName) setProjectName(saved.projectName);
      if (saved.calculationId) setCalculationId(saved.calculationId);
    }
    setHydrated(true);
  }, []);

  // Save session state on every change (only after hydration to avoid overwriting with defaults)
  useEffect(() => {
    if (!hydrated) return;
    saveState({ shape, runCount, sharedCorners, runs, finishes, selectedRun, rightTab, projectId, projectName, calculationId });
  }, [shape, runCount, sharedCorners, runs, finishes, selectedRun, rightTab, projectId, projectName, calculationId, hydrated]);

  // Load calculation from URL param on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const calcId = params.get("calc");
    if (calcId) {
      // New format: load specific calculation
      fetch(`/api/calculations/${calcId}`)
        .then((r) => r.json())
        .then((data) => {
          if (!data.calculation) return;
          const s = data.calculation.calculator_state || {};
          if (s.shape) setShape(s.shape);
          if (s.runCount) setRunCount(s.runCount);
          if (s.sharedCorners !== undefined) setSharedCorners(s.sharedCorners);
          if (s.runs) setRuns(s.runs);
          if (s.finishes) setFinishes(s.finishes);
          if (s.selectedRun !== undefined) setSelectedRun(s.selectedRun);
          setProjectId(data.project.id);
          setProjectName(data.project.name);
          setCalculationId(data.calculation.id);
        })
        .catch(() => {});
    } else {
      // Legacy format: load by project id
      const loadId = params.get("project");
      if (!loadId) return;
      fetch(`/api/projects/${loadId}`)
        .then((r) => r.json())
        .then((data) => {
          if (!data.project) return;
          const p = data.project;
          // Try to find a glass calculation in the project
          const calc = p.calculations?.find((c) => c.calculator_type === "glass");
          const s = calc?.calculator_state || p.calculator_state || {};
          if (s.shape) setShape(s.shape);
          if (s.runCount) setRunCount(s.runCount);
          if (s.sharedCorners !== undefined) setSharedCorners(s.sharedCorners);
          if (s.runs) setRuns(s.runs);
          if (s.finishes) setFinishes(s.finishes);
          if (s.selectedRun !== undefined) setSelectedRun(s.selectedRun);
          setProjectId(p.id);
          setProjectName(p.name);
          if (calc) setCalculationId(calc.id);
        })
        .catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Build current BOM for saving
  function getCurrentBom() {
    try {
      const bomResult = buildBOM(runs, finishes, buildIntersectionMap(runCount, shape, sharedCorners), shape);
      return { consolidated: bomResult.consolidated, unsolved: bomResult.unsolved };
    } catch { return null; }
  }

  function handleProjectSaved({ projectId: pid, projectName: pname, calculationId: cid }) {
    setProjectId(pid);
    setProjectName(pname);
    if (cid) setCalculationId(cid);
    setSaveMsg("Saved");
    setTimeout(() => setSaveMsg(""), 2000);
  }

  useEffect(() => {
    setRuns((prev) => {
      if (prev.length === runCount) return prev;
      if (prev.length < runCount) {
        const added = Array.from({ length: runCount - prev.length }, (_, i) => {
          const cfg = getDefaultRunConfig(prev.length + i);
          cfg.length = 6000;
          return cfg;
        });
        return [...prev, ...added];
      }
      return prev.slice(0, runCount);
    });
  }, [runCount]);

  const handleShapeChange = useCallback((newShape) => {
    setShape(newShape);
    const [defRuns, defCorners] = shapeDefaults(newShape);
    // Full reset: wipe all run configs and start fresh for new shape.
    const freshRuns = Array.from({ length: defRuns }, (_, i) => {
      const cfg = getDefaultRunConfig(i);
      // Standard default length across all shapes
      cfg.length = 6000;
      return cfg;
    });
    setRuns(freshRuns);
    setRunCount(defRuns);
    setSharedCorners(defCorners);
    setSelectedRun(0);
  }, []);

  const intersectionMap = buildIntersectionMap(runCount, shape, sharedCorners);

  // Whenever the intersection map changes, snap endSide for any run that has a corner latch
  useEffect(() => {
    setRuns(prev => {
      let changed = false;
      const next = prev.map((cfg, i) => {
        if (!cfg.gateOn) return cfg;
        if (!["corner_external", "corner_internal"].includes(cfg.latchBehaviour)) return cfg;
        const runKey = i + 1;
        const hasCornerAtEnd = !!intersectionMap[runKey]?.end;
        const hasCornerAtStart = !!intersectionMap[runKey]?.start;
        const allowDualCornerFlip = (shape === "U-shape" && i === 0) || (shape === "Box" && i <= 2);
        if (allowDualCornerFlip) return cfg;
        // U-shape Side C (run 3) visual corner appears at "end" in rendering orientation.
        const forceSideCEnd = shape === "U-shape" && i === 2;
        const correctEndSide = forceSideCEnd ? "end" : (hasCornerAtEnd ? "end" : hasCornerAtStart ? "start" : cfg.endSide);
        if (cfg.endSide !== correctEndSide) {
          changed = true;
          return { ...cfg, endSide: correctEndSide };
        }
        return cfg;
      });
      return changed ? next : prev;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(intersectionMap)]);

  const solvedRuns = runs.map((cfg, i) => {
    const result = solveRunFromConfig(cfg, intersectionMap, i + 1, shape, runs);
    return {
      ...result.solved,
      effectiveEndSide: result.effectiveEndSide,
      isCornerGate: result.isCornerGate,
    };
  });

  const runsForPreview = runs.map((run, idx) => {
    if (run.gateOn && run.latchBehaviour === "corner_external") {
      const allowDualCornerFlip = (shape === "U-shape" && idx === 0) || (shape === "Box" && idx <= 2);
      if (allowDualCornerFlip) return run;
      const runIdx = idx + 1;
      const hasCornerAtEnd = !!intersectionMap[runIdx]?.end;
      const hasCornerAtStart = !!intersectionMap[runIdx]?.start;
      // U-shape Side C visual corner appears at "end" in rendering orientation.
      const forceSideCEnd = shape === "U-shape" && idx === 2;
      const correctEndSide = forceSideCEnd ? "end" : (hasCornerAtEnd ? "end" : hasCornerAtStart ? "start" : run.endSide);
      return { ...run, endSide: correctEndSide };
    }
    return run;
  });

  return (
    <div className="min-h-screen md:h-screen bg-gray-50 flex flex-col overflow-y-auto md:overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-3 md:px-5 py-3 flex items-center gap-3 flex-shrink-0">
        <a href="/dashboard" className="text-sm text-blue-600 font-medium hover:underline flex items-center gap-1">← Dashboard</a>
        <div className="w-7 h-7 bg-cyan-500 rounded-md flex items-center justify-center">
          <span className="text-white text-xs font-black">EF</span>
        </div>
        <span className="text-sm font-bold text-gray-800 tracking-wide flex-1">
          Expert Fence Glass Calculator
          {projectName && <span className="text-gray-400 font-normal ml-2">— {projectName}</span>}
        </span>
        <button
          onClick={() => setShowSaveModal(true)}
          className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-500 hover:bg-emerald-600 rounded-md transition-colors"
        >
          Save Project
        </button>
        {saveMsg && <span className="text-xs text-emerald-600 font-medium">{saveMsg}</span>}
      </header>

      {/* Save Project Modal */}
      <SaveProjectModal
        show={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onSaved={handleProjectSaved}
        calculatorType="glass"
        calculatorState={{ shape, runCount, sharedCorners, runs, finishes, selectedRun }}
        bomSnapshot={getCurrentBom()}
        currentProjectId={projectId}
        currentProjectName={projectName}
        currentCalculationId={calculationId}
      />

      {/* Responsive layout */}
      <div className="flex flex-col md:flex-row flex-1 md:min-h-0">

        {/* COL 1 — Sides */}
        <div className="w-full md:w-64 md:flex-shrink-0 bg-white border-b md:border-b-0 md:border-r border-gray-200 flex flex-col overflow-y-visible md:overflow-y-auto">
          <SidesPanel
            runs={runs} setRuns={setRuns}
            shape={shape} setShape={handleShapeChange}
            runCount={runCount} setRunCount={setRunCount}
            sharedCorners={sharedCorners} setSharedCorners={setSharedCorners}
            solvedRuns={solvedRuns}
            selectedRun={selectedRun} setSelectedRun={setSelectedRun}
          />
        </div>

        {/* COL 2 — Configure selected run */}
        <div className="w-full md:w-80 md:flex-shrink-0 bg-gray-50 border-b md:border-b-0 md:border-r border-gray-200 flex flex-col overflow-y-visible md:overflow-y-auto">
          <RunSetupPanel
            runs={runs} setRuns={setRuns}
            selectedRun={selectedRun}
            intersectionMap={intersectionMap}
            solvedRuns={solvedRuns}
            shape={shape}
            finishes={finishes}
            setFinishes={setFinishes}
          />
        </div>

        {/* COL 3 — Preview + BOM */}
        <div className="flex-1 flex flex-col min-w-0 overflow-visible md:overflow-hidden">
          {/* Tab switcher */}
          <div className="bg-white border-b border-gray-200 px-2 md:px-4 py-1.5 md:py-0 flex flex-col sm:flex-row gap-2 justify-between sm:items-center flex-shrink-0">
            <div className="flex gap-0 min-w-0 w-full sm:w-auto">
              {[{ id: "preview", label: "Layout Preview" }, { id: "bom", label: "Bill of Materials" }].map(t => (
                <button
                  key={t.id}
                  onClick={() => setRightTab(t.id)}
                  className={`flex-1 sm:flex-none px-2 md:px-4 py-2 md:py-3 text-xs md:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                    rightTab === t.id
                      ? "border-cyan-500 text-cyan-600"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                // Generate PDFs for all runs in the shape
                const allSequences = [];
                let totalLength = 0;
                
                runs.forEach((run, idx) => {
                  const solved = solvedRuns[idx];
                  if (!solved || !solved.ok) {
                    alert(`Run ${idx + 1} is not solved.`);
                    return;
                  }
                  
                  const gapMode = run.gapMode || 'both';
                  const useStart = gapMode === "both" || gapMode === "start_only";
                  const useEnd = gapMode === "both" || gapMode === "end_only";
                  const layoutSeq = buildLayoutSequence(
                    solved.panelWidths, solved.internalGap, solved.startGap, solved.endGap,
                    useStart, useEnd, solved.gateOpening,
                    run.gatePlacement || 'end', run.endSide || 'end', solved.gateAfterPanel || 1,
                    run.gateWidth || 0, run.hingeAllow || 0, run.latchAllow || 0
                  );
                  
                  allSequences.push({
                    layoutSequence: layoutSeq,
                    totalRun: run.length || 9230,
                    offset: 0,
                    label: shape === "Straight" ? `Run ${idx + 1}` : `Side ${String.fromCharCode(65 + idx)}`
                  });
                  
                  totalLength += run.length || 9230;
                });
                
                if (allSequences.length === 0) return;
                
                // Generate PDF with all runs on sequential display
                downloadSetoutPlanPDF(allSequences, 'setout_plan.pdf');
              }}
              className="w-full sm:w-auto px-2.5 md:px-4 py-2 md:py-3 text-xs md:text-sm font-semibold text-white bg-cyan-500 hover:bg-cyan-600 rounded transition-colors whitespace-nowrap flex-shrink-0"
            >
              <span className="sm:hidden">Set Out PDF</span>
              <span className="hidden sm:inline">Set Out PDF</span>
            </button>
          </div>

          <div className="flex-1 overflow-visible md:overflow-y-auto">
            {rightTab === "preview" ? (
              <div className="min-h-[420px] md:h-full flex items-start md:items-center justify-center p-2 md:p-4">
                <TopDownPreview runs={runsForPreview} solvedRuns={solvedRuns} shape={shape} intersectionMap={intersectionMap} />
              </div>
            ) : (
              <div className="p-5">
                <BOMPanel runs={runs} finishes={finishes} intersectionMap={intersectionMap} shape={shape} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}