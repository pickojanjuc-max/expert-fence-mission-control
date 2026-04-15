"use client";

import React, { useState, useEffect, useRef } from "react";
import { STYLE_CONFIG, STYLE_DEFS, SHAPE_MAP, MOUNT_TYPES, GATE_MODES } from "@/lib/styleConfig";
import { loadSavedV2State, saveV2State, getDefaultAluminiumRun } from "@/lib/aluminiumV2State";
import CalculatorPage from "@/components/aluminium-v2/CalculatorPage";

export default function AluminiumV2Client() {
  // ─── State (defaults only — sessionStorage restored after hydration) ────
  const [selectedStyle, setSelectedStyle] = useState("Tubular");
  const [colour, setColour] = useState("Black");
  const [mount, setMount] = useState("Surface");
  const [shape, setShape] = useState("Straight");
  const [runs, setRuns] = useState([getDefaultAluminiumRun()]);
  const [lastQuote, setLastQuote] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);

  // ── Project save/load state ──────────────────────────────────────────
  const [projectId, setProjectId] = useState(null);
  const [projectName, setProjectName] = useState("");
  const [calculationId, setCalculationId] = useState(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [hydrated, setHydrated] = useState(false);

  const autoCalcTimer = useRef(null);

  // Restore sessionStorage state after hydration (avoids server/client mismatch)
  useEffect(() => {
    const saved = loadSavedV2State();
    if (saved) {
      if (saved.selectedStyle) setSelectedStyle(saved.selectedStyle);
      if (saved.colour) setColour(saved.colour);
      if (saved.mount) setMount(saved.mount);
      if (saved.shape) setShape(saved.shape);
      if (saved.runs) setRuns(saved.runs);
      if (saved.currentStep) setCurrentStep(saved.currentStep);
      if (saved.projectId) setProjectId(saved.projectId);
      if (saved.projectName) setProjectName(saved.projectName);
      if (saved.calculationId) setCalculationId(saved.calculationId);
    }
    setHydrated(true);
  }, []);

  // Save session state on every change (only after hydration)
  useEffect(() => {
    if (!hydrated) return;
    saveV2State({
      selectedStyle,
      colour,
      mount,
      shape,
      runs,
      currentStep,
      projectId,
      projectName,
      calculationId,
    });
  }, [selectedStyle, colour, mount, shape, runs, currentStep, projectId, projectName, calculationId, hydrated]);

  // Load calculation from URL param on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const calcId = params.get("calc");
    if (calcId) {
      fetch(`/api/calculations/${calcId}`)
        .then((r) => r.json())
        .then((data) => {
          if (!data.calculation) return;
          const s = data.calculation.calculator_state || {};
          if (s.selectedStyle) setSelectedStyle(s.selectedStyle);
          if (s.colour) setColour(s.colour);
          if (s.mount) setMount(s.mount);
          if (s.shape) setShape(s.shape);
          if (s.runs) setRuns(s.runs);
          setProjectId(data.project.id);
          setProjectName(data.project.name);
          setCalculationId(data.calculation.id);
        })
        .catch(() => {});
    }
  }, []);

  // Build current state for saving
  function getCurrentState() {
    return {
      selectedStyle,
      colour,
      mount,
      shape,
      runs,
      currentStep,
    };
  }

  // Auto-calculate on config change — POST to backend (same path as the
  // existing aluminium calculator: /api/quote/calculate-v5).
  useEffect(() => {
    if (!hydrated) return;
    if (autoCalcTimer.current) clearTimeout(autoCalcTimer.current);
    autoCalcTimer.current = setTimeout(async () => {
      const runCount = runs.filter((r) => Number(r.length_mm || 0) > 0).length;
      const sharedCorners = ({ Straight: 0, "L-shape": 1, "U-shape": 2, Box: 4 }[shape])
        ?? Math.max(0, runCount - 1);
      const payload = {
        style: selectedStyle,
        colour,
        mount,
        shape,
        runs,
        shared_corners: sharedCorners,
      };
      try {
        const response = await fetch("/api/quote/calculate-v5", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          const text = await response.text();
          throw new Error(`Quote API ${response.status}: ${text.slice(0, 180)}`);
        }
        const data = await response.json();
        setLastQuote(data);
      } catch (err) {
        console.error("v2 quote error:", err);
        setLastQuote(null);
      }
    }, 300);

    return () => {
      if (autoCalcTimer.current) clearTimeout(autoCalcTimer.current);
    };
  }, [selectedStyle, colour, mount, shape, runs]);

  function handleProjectSaved({ projectId: pid, projectName: pname, calculationId: cid }) {
    setProjectId(pid);
    setProjectName(pname);
    if (cid) setCalculationId(cid);
    setSaveMsg("Saved");
    setTimeout(() => setSaveMsg(""), 2000);
  }

  // Manage run count based on shape
  useEffect(() => {
    const targetCount = SHAPE_MAP[shape];
    if (targetCount === 0) return; // Straight — allow dynamic count

    if (runs.length < targetCount) {
      // Add runs
      const newRuns = [...runs];
      while (newRuns.length < targetCount) {
        newRuns.push(getDefaultAluminiumRun());
      }
      setRuns(newRuns);
    } else if (runs.length > targetCount) {
      // Remove runs
      setRuns(runs.slice(0, targetCount));
    }
  }, [shape]);

  // Ensure colour is valid for selected style
  useEffect(() => {
    const validColours = STYLE_CONFIG[selectedStyle]?.colours || [];
    if (!validColours.includes(colour)) {
      setColour(validColours[0] || "Black");
    }
  }, [selectedStyle, colour]);

  return (
    <CalculatorPage
      selectedStyle={selectedStyle}
      setSelectedStyle={setSelectedStyle}
      colour={colour}
      setColour={setColour}
      mount={mount}
      setMount={setMount}
      shape={shape}
      setShape={setShape}
      runs={runs}
      setRuns={setRuns}
      lastQuote={lastQuote}
      projectId={projectId}
      projectName={projectName}
      calculationId={calculationId}
      showSaveModal={showSaveModal}
      setShowSaveModal={setShowSaveModal}
      saveMsg={saveMsg}
      onProjectSaved={handleProjectSaved}
      getCurrentState={getCurrentState}
    />
  );
}
