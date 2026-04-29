import React, { useState, useEffect } from "react";
import SidesPanel from "@/components/aluminium-v2/SidesPanel";
import RunSetupPanel from "@/components/aluminium-v2/RunSetupPanel";
import FinishesPanel from "@/components/aluminium-v2/FinishesPanel";
import BOMPanel from "@/components/aluminium-v2/BOMPanel";
import TopDownPreview from "@/components/aluminium-v2/TopDownPreview";
import SaveProjectModal from "@/components/SaveProjectModal";
import { updateCalculation } from "@/lib/saveCalculation";

export default function CalculatorPage({
  selectedStyle,
  setSelectedStyle,
  colour,
  setColour,
  mount,
  setMount,
  shape,
  setShape,
  runs,
  setRuns,
  lastQuote,
  projectId,
  projectName,
  calculationId,
  showSaveModal,
  setShowSaveModal,
  saveMsg,
  onProjectSaved,
  getCurrentState,
  demoMode = false,
}) {
  const bomSnapshot = lastQuote
    ? { bom: lastQuote.bom, summary: lastQuote.summary }
    : null;
  const [selectedRun, setSelectedRun] = useState(0);
  const [rightTab, setRightTab] = useState("preview");
  const [updating, setUpdating] = useState(false);
  const [localSaveMsg, setLocalSaveMsg] = useState("");

  const handleDirectUpdate = async () => {
    if (!projectId) {
      setShowSaveModal(true);
      return;
    }
    try {
      setUpdating(true);
      setLocalSaveMsg("");
      const state = typeof getCurrentState === "function" ? getCurrentState() : {
        selectedStyle, colour, mount, shape, runs,
      };
      await updateCalculation({
        projectId,
        projectName,
        calculationId,
        calculatorType: "aluminium",
        calculatorState: state,
        bomSnapshot,
        label: "",
      });
      setLocalSaveMsg("Updated ✓");
      if (typeof onProjectSaved === "function") {
        onProjectSaved({ projectId, projectName, calculationId });
      }
      setTimeout(() => setLocalSaveMsg(""), 2000);
    } catch (err) {
      setLocalSaveMsg(`Error: ${err.message}`);
    } finally {
      setUpdating(false);
    }
  };

  // Keep selectedRun in range when runs change
  useEffect(() => {
    if (selectedRun >= runs.length) {
      setSelectedRun(Math.max(0, runs.length - 1));
    }
  }, [runs.length, selectedRun]);

  const updateRun = (idx, updates) => {
    const next = [...runs];
    next[idx] = { ...next[idx], ...updates };
    setRuns(next);
  };

  const deleteRun = (idx) => {
    if (runs.length <= 1) return;
    const next = runs.filter((_, i) => i !== idx);
    setRuns(next);
    if (selectedRun >= next.length) setSelectedRun(next.length - 1);
  };

  const addRun = () => {
    const maxRuns = 5;
    if (shape !== "Straight" || runs.length >= maxRuns) return;
    setRuns([...runs, { length_mm: 6000, gate: false, gate_mode: "End", gate_after_panel: 1 }]);
  };

  return (
    <div className="min-h-screen md:h-screen bg-gray-50 flex flex-col overflow-y-auto md:overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-3 md:px-5 py-3 flex items-center gap-3 flex-shrink-0">
        {!demoMode && (
          <a
            href={projectId ? `/project/${projectId}` : "/dashboard"}
            className="text-sm text-blue-600 font-medium hover:underline flex items-center gap-1"
          >
            {projectId ? "← Back to Project" : "← Dashboard"}
          </a>
        )}
        <div className="w-7 h-7 bg-cyan-500 rounded-md flex items-center justify-center">
          <span className="text-white text-xs font-black">EF</span>
        </div>
        <span className="text-sm font-bold text-gray-800 tracking-wide flex-1">
          Expert Fence Aluminium Calculator
          {demoMode && <span className="text-cyan-600 font-normal ml-2">— Demo</span>}
          {!demoMode && projectName && <span className="text-gray-400 font-normal ml-2">— {projectName}</span>}
        </span>
        {!demoMode && (
          <>
            <button
              onClick={projectId ? handleDirectUpdate : () => setShowSaveModal(true)}
              disabled={updating}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 rounded-md transition-colors"
            >
              {updating ? "Updating…" : projectId ? "Update Project" : "Save Project"}
            </button>
            {(localSaveMsg || saveMsg) && (
              <span className="text-xs text-emerald-600 font-medium">{localSaveMsg || saveMsg}</span>
            )}
          </>
        )}
      </header>

      {/* 3-column responsive layout */}
      <div className="flex flex-col md:flex-row flex-1 md:min-h-0">

        {/* COL 1 — Sides */}
        <div className="w-full md:w-64 md:flex-shrink-0 bg-white border-b md:border-b-0 md:border-r border-gray-200 flex flex-col overflow-y-visible md:overflow-y-auto">
          <SidesPanel
            runs={runs}
            setRuns={setRuns}
            shape={shape}
            setShape={setShape}
            selectedRun={selectedRun}
            setSelectedRun={setSelectedRun}
            canAddRun={shape === "Straight" && runs.length < 5}
            onAddRun={addRun}
            onDeleteRun={deleteRun}
          />
        </div>

        {/* COL 2 — Configure selected run + global finishes */}
        <div className="w-full md:w-80 md:flex-shrink-0 bg-gray-50 border-b md:border-b-0 md:border-r border-gray-200 flex flex-col overflow-y-visible md:overflow-y-auto">
          <div className="p-4 border-b border-gray-200 bg-white">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Style & Mount</h3>
            <FinishesPanel
              selectedStyle={selectedStyle}
              setSelectedStyle={setSelectedStyle}
              colour={colour}
              setColour={setColour}
              mount={mount}
              setMount={setMount}
            />
          </div>
          <div className="p-4">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
              {shape === "Straight" ? `Run ${selectedRun + 1}` : `Side ${String.fromCharCode(65 + selectedRun)}`} — Gates
            </h3>
            <RunSetupPanel
              runs={runs}
              updateRun={updateRun}
              selectedRun={selectedRun}
              setSelectedRun={setSelectedRun}
            />
          </div>
        </div>

        {/* COL 3 — Preview + BOM tabs */}
        <div className="flex-1 flex flex-col min-w-0 overflow-visible md:overflow-hidden">
          <div className="bg-white border-b border-gray-200 px-2 md:px-4 flex flex-shrink-0">
            {[{ id: "preview", label: "Layout Preview" }, { id: "bom", label: "Bill of Materials" }].map(t => (
              <button
                key={t.id}
                onClick={() => setRightTab(t.id)}
                className={`px-3 md:px-5 py-2.5 md:py-3 text-xs md:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                  rightTab === t.id
                    ? "border-cyan-500 text-cyan-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-visible md:overflow-y-auto">
            {rightTab === "preview" ? (
              <div className="min-h-[420px] md:h-full flex items-start md:items-center justify-center p-2 md:p-4">
                <TopDownPreview shape={shape} runs={runs} selectedStyle={selectedStyle} />
              </div>
            ) : (
              <BOMPanel
                lastQuote={lastQuote}
                selectedStyle={selectedStyle}
                colour={colour}
                mount={mount}
                shape={shape}
                runs={runs}
              />
            )}
          </div>
        </div>
      </div>

      {/* Save Modal */}
      {!demoMode && (
        <SaveProjectModal
          show={showSaveModal}
          onClose={() => setShowSaveModal(false)}
          onSaved={onProjectSaved}
          calculatorType="aluminium"
          calculatorState={getCurrentState()}
          bomSnapshot={bomSnapshot}
          currentProjectId={projectId}
          currentProjectName={projectName}
          currentCalculationId={calculationId}
        />
      )}
    </div>
  );
}
