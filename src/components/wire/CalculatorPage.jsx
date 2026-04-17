'use client';
import React, { useState, useEffect } from 'react';
import {
  buildWireBOM, defaultWireRun, WIRE_DEFAULTS,
  STANDARD_OPENING_MM, wireCountForOpening,
} from '@/lib/wireBuilder';
import { COST_MAP } from '@/lib/costData';
import SaveProjectModal from '@/components/SaveProjectModal';
import WireElevationPreview from '@/components/wire/ElevationPreview';

// ── Session persistence ───────────────────────────────────────────────────────
const STORAGE_KEY = 'ef_wire_calc_state';

function loadSavedState() {
  try {
    const raw = typeof window !== 'undefined' && sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function persistState(state) {
  try {
    if (typeof window !== 'undefined') sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function money(n) {
  const v = Number(n || 0);
  return `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const MAX_RUNS = 8;

const inputStyle = {
  width: '100%',
  padding: '7px 10px',
  borderRadius: 6,
  border: '1px solid #d1d5db',
  fontSize: 13,
  background: '#fff',
  boxSizing: 'border-box',
};

const selectStyle = { ...inputStyle, cursor: 'pointer' };

const labelStyle = {
  display: 'block',
  fontSize: 11,
  fontWeight: 600,
  color: '#6b7280',
  marginBottom: 4,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

// ── Main Component ────────────────────────────────────────────────────────────

export default function WireCalculator() {
  const [mode,                   setMode]                   = useState(WIRE_DEFAULTS.mode);
  const [openingMM,              setOpeningMM]              = useState(WIRE_DEFAULTS.openingMM);
  const [wireAllowanceMM,        setWireAllowanceMM]        = useState(WIRE_DEFAULTS.wireAllowanceMM);
  const [selectedWireCount,      setSelectedWireCount]      = useState(WIRE_DEFAULTS.selectedWireCount);
  const [customDroppersRequired, setCustomDroppersRequired] = useState(WIRE_DEFAULTS.customDroppersRequired);
  const [runs,                   setRuns]                   = useState(() => [defaultWireRun(0)]);
  const [activeRun,              setActiveRun]              = useState(0);
  const [rightTab,               setRightTab]               = useState('preview');

  // Save/project
  const [projectId,     setProjectId]     = useState(null);
  const [projectName,   setProjectName]   = useState('');
  const [calculationId, setCalculationId] = useState(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveMsg,       setSaveMsg]       = useState('');
  const [hydrated,      setHydrated]      = useState(false);

  // ── Hydration ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const s = loadSavedState();
    if (s) {
      if (s.mode                   !== undefined) setMode(s.mode);
      if (s.openingMM              !== undefined) setOpeningMM(s.openingMM);
      if (s.wireAllowanceMM        !== undefined) setWireAllowanceMM(s.wireAllowanceMM);
      if (s.selectedWireCount      !== undefined) setSelectedWireCount(s.selectedWireCount);
      if (s.customDroppersRequired !== undefined) setCustomDroppersRequired(s.customDroppersRequired);
      if (s.runs)                                 setRuns(s.runs);
      if (s.activeRun              !== undefined) setActiveRun(s.activeRun);
      if (s.projectId)                            setProjectId(s.projectId);
      if (s.projectName)                          setProjectName(s.projectName);
      if (s.calculationId)                        setCalculationId(s.calculationId);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    persistState({ mode, openingMM, wireAllowanceMM, selectedWireCount, customDroppersRequired, runs, activeRun, projectId, projectName, calculationId });
  }, [mode, openingMM, wireAllowanceMM, selectedWireCount, customDroppersRequired, runs, activeRun, projectId, projectName, calculationId, hydrated]);

  // ── URL param load ────────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const calcId = params.get('calc');
    if (!calcId) return;
    fetch(`/api/calculations/${calcId}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.calculation) return;
        const s = data.calculation.calculator_state || {};
        if (s.mode                   !== undefined) setMode(s.mode);
        if (s.openingMM              !== undefined) setOpeningMM(s.openingMM);
        if (s.wireAllowanceMM        !== undefined) setWireAllowanceMM(s.wireAllowanceMM);
        if (s.selectedWireCount      !== undefined) setSelectedWireCount(s.selectedWireCount);
        if (s.customDroppersRequired !== undefined) setCustomDroppersRequired(s.customDroppersRequired);
        if (s.runs)                                 setRuns(s.runs);
        if (s.activeRun              !== undefined) setActiveRun(s.activeRun);
        setProjectId(data.project.id);
        setProjectName(data.project.name);
        setCalculationId(data.calculation.id);
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Mode change ───────────────────────────────────────────────────────────
  function handleModeChange(newMode) {
    setMode(newMode);
    setOpeningMM(newMode === 'standard' ? 972 : 1000);
  }

  // ── Run management ─────────────────────────────────────────────────────────
  function addRun() {
    if (runs.length >= MAX_RUNS) return;
    setRuns((prev) => [...prev, defaultWireRun(prev.length)]);
    setActiveRun(runs.length);
  }

  function removeRun(i) {
    if (runs.length <= 1) return;
    setRuns((prev) => prev.filter((_, idx) => idx !== i));
    setActiveRun(Math.max(0, Math.min(activeRun, runs.length - 2)));
  }

  function updateRun(i, field, value) {
    setRuns((prev) => prev.map((r, idx) => idx === i ? { ...r, [field]: value } : r));
  }

  // ── BOM calculation ────────────────────────────────────────────────────────
  const { consolidated, validation, perRun, summary } = buildWireBOM({
    mode,
    runs,
    openingMM,
    wireAllowanceMM,
    selectedWireCount,
    customDroppersRequired,
  });

  // Enrich with pricing
  const enrichedBOM = consolidated.map((item) => {
    const key      = String(item.sku || '').toUpperCase();
    const costEntry = COST_MAP[key];
    const unitSell  = costEntry?.sell ?? 0;
    const lineSell  = Math.round(unitSell * (Number(item.qty) || 0) * 100) / 100;
    return { ...item, unitSell, lineSell };
  });

  const totalSell = enrichedBOM.reduce((sum, r) => sum + (r.lineSell || 0), 0);
  const hasBOM    = enrichedBOM.length > 0;

  // Save helpers
  function getCurrentBom() {
    return { consolidated: enrichedBOM, unsolved: [] };
  }

  function handleProjectSaved({ projectId: pid, projectName: pname, calculationId: cid }) {
    setProjectId(pid);
    setProjectName(pname);
    if (cid) setCalculationId(cid);
    setSaveMsg('Saved');
    setTimeout(() => setSaveMsg(''), 2000);
  }

  const recommendedCount = wireCountForOpening(openingMM);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#f9fafb' }}>
      {/* Top nav */}
      <header style={{ background: 'white', borderBottom: '1px solid #e5e7eb', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <a href="/dashboard" style={{ fontSize: 13, color: '#2563eb', fontWeight: 500, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>← Dashboard</a>
        <div style={{ width: 1, height: 16, background: '#e5e7eb' }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>Stainless Wire Balustrade Calculator</span>
      </header>
    <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', padding: '24px 20px', flex: 1 }}>

      {/* ── LEFT PANEL ── */}
      <div style={{ width: 300, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Header */}
        <div style={{ background: '#0f172a', borderRadius: 10, padding: '16px 18px', color: 'white' }}>
          <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.7, marginBottom: 4 }}>
            Stainless Wire
          </div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>Wire Balustrade Calculator</div>
          <div style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>
            1×19×3.2mm SS wire · dropper posts · fittings
          </div>
        </div>

        {/* Mode selector */}
        <div style={{ background: 'white', borderRadius: 10, padding: 16, border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            System Options
          </div>

          {/* Mode toggle */}
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Mode</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {[
                { value: 'standard', label: 'Standard',   sub: '972mm' },
                { value: 'custom',   label: 'Custom',     sub: 'Any height' },
              ].map(({ value, label, sub }) => (
                <button
                  key={value}
                  onClick={() => handleModeChange(value)}
                  style={{
                    flex: 1,
                    padding: '8px 4px',
                    borderRadius: 7,
                    border: `2px solid ${mode === value ? '#0ea5e9' : '#e5e7eb'}`,
                    background: mode === value ? '#f0f9ff' : 'white',
                    color: mode === value ? '#0369a1' : '#6b7280',
                    fontSize: 11,
                    fontWeight: mode === value ? 700 : 500,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 2,
                  }}
                >
                  <span style={{ fontSize: 12 }}>{label}</span>
                  <span style={{ fontSize: 10, opacity: 0.7 }}>{sub}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Opening height */}
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Opening Height (mm)</label>
            <input
              type="number"
              style={inputStyle}
              value={openingMM}
              min={200}
              max={2000}
              onChange={(e) => setOpeningMM(Number(e.target.value))}
            />
            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>
              Recommended wires: <strong>{recommendedCount}</strong> ({Math.round(openingMM / (recommendedCount + 1))}mm centres)
            </div>
          </div>

          {/* Wire allowance */}
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Wire Allowance per Run (mm)</label>
            <input
              type="number"
              style={inputStyle}
              value={wireAllowanceMM}
              min={0}
              max={2000}
              onChange={(e) => setWireAllowanceMM(Number(e.target.value))}
            />
            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>Extra wire per span for terminations</div>
          </div>

          {/* Custom mode options */}
          {mode === 'custom' && (
            <div style={{ background: '#f0f9ff', borderRadius: 7, padding: '10px 12px', border: '1px solid #bae6fd' }}>
              <div style={{ marginBottom: 10 }}>
                <label style={{ ...labelStyle, color: '#0369a1' }}>Wire Count Override</label>
                <input
                  type="number"
                  style={inputStyle}
                  value={selectedWireCount}
                  min={1}
                  max={30}
                  onChange={(e) => setSelectedWireCount(Number(e.target.value))}
                />
                <div style={{ fontSize: 11, color: '#0369a1', marginTop: 4 }}>
                  Auto-recommended: {recommendedCount}
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#0369a1', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={customDroppersRequired}
                  onChange={(e) => setCustomDroppersRequired(e.target.checked)}
                  style={{ width: 14, height: 14 }}
                />
                Dropper posts required
              </label>
            </div>
          )}
        </div>

        {/* Runs */}
        <div style={{ background: 'white', borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          {/* Tab bar */}
          <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
            {runs.map((r, i) => (
              <button
                key={i}
                onClick={() => setActiveRun(i)}
                style={{
                  flex: 1,
                  padding: '8px 4px',
                  fontSize: 12,
                  fontWeight: 600,
                  border: 'none',
                  background: activeRun === i ? 'white' : 'transparent',
                  borderBottom: activeRun === i ? '2px solid #0ea5e9' : '2px solid transparent',
                  color: activeRun === i ? '#0369a1' : '#6b7280',
                  cursor: 'pointer',
                }}
              >
                Run {r.label}
              </button>
            ))}
            {runs.length < MAX_RUNS && (
              <button
                onClick={addRun}
                style={{ padding: '8px 10px', fontSize: 16, border: 'none', background: 'transparent', color: '#9ca3af', cursor: 'pointer' }}
                title="Add run"
              >+</button>
            )}
          </div>

          {/* Active run */}
          {runs[activeRun] && (
            <div style={{ padding: 16 }}>
              <div>
                <label style={labelStyle}>Span Width (mm)</label>
                <input
                  type="number"
                  style={inputStyle}
                  value={runs[activeRun].spanMM}
                  min={100}
                  max={50000}
                  onChange={(e) => updateRun(activeRun, 'spanMM', Number(e.target.value))}
                />
              </div>

              {/* Per-run summary chip */}
              {runs[activeRun].spanMM > 0 && (() => {
                const span = runs[activeRun].spanMM;
                const droppers = Math.max(0, Math.ceil(span / 1200) - 1);
                const totalPosts = 2 + droppers;
                return (
                  <div style={{ background: '#f0f9ff', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: '#0369a1', marginTop: 10 }}>
                    {span}mm span · {totalPosts} posts ({droppers} dropper{droppers !== 1 ? 's' : ''})
                  </div>
                );
              })()}

              {runs.length > 1 && (
                <button
                  onClick={() => removeRun(activeRun)}
                  style={{ marginTop: 10, fontSize: 11, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  Remove this run
                </button>
              )}
            </div>
          )}
        </div>

        {/* Save */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={() => setShowSaveModal(true)}
            disabled={!hasBOM}
            style={{
              flex: 1,
              padding: '10px 16px',
              background: hasBOM ? '#0369a1' : '#9ca3af',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: hasBOM ? 'pointer' : 'default',
            }}
          >
            {projectId ? '↑ Update Project' : '+ Save to Project'}
          </button>
          {saveMsg && <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 600 }}>{saveMsg}</span>}
        </div>

        {projectId && (
          <div style={{ fontSize: 12, color: '#6b7280', textAlign: 'center', marginTop: -8 }}>
            Saved to: <strong>{projectName}</strong>
          </div>
        )}
      </div>

      {/* ── RIGHT PANEL ── */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Validation */}
        {validation.length > 0 && (
          <div style={{ background: '#fef9c3', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 14px' }}>
            {validation.map((msg, i) => (
              <div key={i} style={{ fontSize: 13, color: '#92400e' }}>⚠️ {msg}</div>
            ))}
          </div>
        )}

        {/* Tab switcher */}
        <div style={{ display: 'flex', gap: 4, background: '#f1f5f9', borderRadius: 8, padding: 4 }}>
          {[{ id: 'preview', label: '📐 Layout Preview' }, { id: 'bom', label: '📋 Bill of Materials' }].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setRightTab(tab.id)}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: 6,
                border: 'none',
                background: rightTab === tab.id ? 'white' : 'transparent',
                boxShadow: rightTab === tab.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                color: rightTab === tab.id ? '#111827' : '#6b7280',
                fontWeight: rightTab === tab.id ? 700 : 500,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Preview tab */}
        {rightTab === 'preview' && (
          <div style={{ background: 'white', borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden', padding: 12 }}>
            <WireElevationPreview runs={runs} summary={summary} openingMM={openingMM} />
          </div>
        )}

        {/* BOM tab */}
        {rightTab === 'bom' && <>

          {/* BOM header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#111827' }}>Bill of Materials</h2>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                Stainless Wire · {mode === 'standard' ? 'Standard 972mm' : `Custom ${openingMM}mm`} · {summary.wireCount} wires · {runs.length} run{runs.length > 1 ? 's' : ''}
              </div>
            </div>
            {hasBOM && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 12, color: '#6b7280' }}>Total (ex GST)</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#111827' }}>{money(totalSell)}</div>
              </div>
            )}
          </div>

          {/* Wire roll summary chip */}
          {hasBOM && (
            <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, padding: '10px 14px', display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 11, color: '#0369a1', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total wire</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#0c4a6e' }}>{summary.totalWireLengthM}m</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#0369a1', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Roll supply</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#0c4a6e' }}>
                  {summary.roll305 > 0 ? `${summary.roll305} × 305m` : ''}
                  {summary.roll305 > 0 && summary.roll100 > 0 ? ' + ' : ''}
                  {summary.roll100 > 0 ? `${summary.roll100} × 100m` : ''}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#0369a1', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Wire count</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#0c4a6e' }}>{summary.wireCount} wires · {summary.wireCentresMM}mm centres</div>
              </div>
              {summary.bottomGapMM !== null && (
                <div>
                  <div style={{ fontSize: 11, color: '#0369a1', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Bottom gap</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#0c4a6e' }}>{summary.bottomGapMM}mm</div>
                </div>
              )}
            </div>
          )}

          {/* BOM table */}
          {!hasBOM ? (
            <div style={{ background: 'white', borderRadius: 10, border: '1px solid #e5e7eb', padding: '40px 20px', textAlign: 'center', color: '#9ca3af' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🔩</div>
              <div style={{ fontSize: 14 }}>Enter measurements to see your materials list</div>
            </div>
          ) : (
            <div style={{ background: 'white', borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                    <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 600, color: '#374151', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Image</th>
                    <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 600, color: '#374151', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>SKU</th>
                    <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 600, color: '#374151', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Description</th>
                    <th style={{ textAlign: 'center', padding: '10px 14px', fontWeight: 600, color: '#374151', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Qty</th>
                    <th style={{ textAlign: 'center', padding: '10px 14px', fontWeight: 600, color: '#374151', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Unit</th>
                    <th style={{ textAlign: 'right', padding: '10px 14px', fontWeight: 600, color: '#374151', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Unit $</th>
                    <th style={{ textAlign: 'right', padding: '10px 14px', fontWeight: 600, color: '#374151', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Line $</th>
                  </tr>
                </thead>
                <tbody>
                  {enrichedBOM.map((item, i) => {
                    const key      = String(item.sku || '').toUpperCase();
                    const imgUrl   = COST_MAP[key]?.img || '';
                    return (
                      <tr key={i} style={{ borderBottom: i < enrichedBOM.length - 1 ? '1px solid #f3f4f6' : 'none', background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                        <td style={{ padding: '9px 14px' }}>
                          {imgUrl
                            ? <img src={imgUrl} alt={item.sku} loading="lazy" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4, border: '1px solid #e5e7eb' }} />
                            : <span style={{ fontSize: 10, color: '#9ca3af' }}>—</span>
                          }
                        </td>
                        <td style={{ padding: '9px 14px', fontFamily: 'monospace', fontSize: 12, color: '#374151', fontWeight: 500 }}>{item.sku}</td>
                        <td style={{ padding: '9px 14px', color: '#6b7280' }}>{item.description}</td>
                        <td style={{ padding: '9px 14px', textAlign: 'center', fontWeight: 600, color: '#111827' }}>{item.qty}</td>
                        <td style={{ padding: '9px 14px', textAlign: 'center', color: '#9ca3af', fontSize: 11 }}>{item.unit}</td>
                        <td style={{ padding: '9px 14px', textAlign: 'right', color: item.unitSell > 0 ? '#6b7280' : '#9ca3af', fontStyle: item.unitSell > 0 ? 'normal' : 'italic' }}>
                          {item.unitSell > 0 ? money(item.unitSell) : 'TBC'}
                        </td>
                        <td style={{ padding: '9px 14px', textAlign: 'right', fontWeight: 600, color: item.lineSell > 0 ? '#111827' : '#9ca3af', fontStyle: item.lineSell > 0 ? 'normal' : 'italic' }}>
                          {item.lineSell > 0 ? money(item.lineSell) : 'TBC'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '2px solid #e5e7eb', background: '#f9fafb' }}>
                    <td colSpan={5} style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'right', color: '#374151', fontSize: 13 }}>
                      Total (ex GST)
                    </td>
                    <td style={{ padding: '10px 14px' }}></td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, fontSize: 15, color: '#111827' }}>
                      {money(totalSell)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Per-run setout table */}
          {perRun.length > 0 && (
            <div style={{ background: 'white', borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb', fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Setout Detail
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                      {['Run', 'Span', 'Wires', 'Centres', 'Bottom Gap', 'Droppers', 'Wire (m)'].map((h) => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#6b7280', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {perRun.map((r, i) => (
                      <tr key={i} style={{ borderBottom: i < perRun.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                        <td style={{ padding: '8px 12px', fontWeight: 700, color: '#0369a1' }}>Run {r.label}</td>
                        <td style={{ padding: '8px 12px', color: '#374151' }}>{r.spanMM}mm</td>
                        <td style={{ padding: '8px 12px', color: '#374151', fontWeight: 600 }}>{r.wireCount}</td>
                        <td style={{ padding: '8px 12px', color: '#374151' }}>{r.wireCentresMM}mm</td>
                        <td style={{ padding: '8px 12px', color: '#374151' }}>{r.bottomGapMM !== null ? `${r.bottomGapMM}mm` : '—'}</td>
                        <td style={{ padding: '8px 12px', color: '#374151' }}>{r.dropperCount}</td>
                        <td style={{ padding: '8px 12px', color: '#374151' }}>{r.wireLengthM}m</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </>}

        {/* Run Summary — always visible */}
        <div style={{ background: 'white', borderRadius: 10, border: '1px solid #e5e7eb', padding: '14px 16px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Run Summary
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {runs.map((r, i) => {
              const droppers = Math.max(0, Math.ceil(r.spanMM / 1200) - 1);
              return (
                <div
                  key={i}
                  onClick={() => setActiveRun(i)}
                  style={{
                    background: activeRun === i ? '#f0f9ff' : '#f9fafb',
                    border: `1px solid ${activeRun === i ? '#7dd3fc' : '#e5e7eb'}`,
                    borderRadius: 8,
                    padding: '8px 12px',
                    cursor: 'pointer',
                    minWidth: 110,
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#0369a1', marginBottom: 3 }}>Run {r.label}</div>
                  <div style={{ fontSize: 11, color: '#6b7280' }}>{r.spanMM}mm span</div>
                  <div style={{ fontSize: 11, color: '#9ca3af' }}>{droppers} dropper{droppers !== 1 ? 's' : ''}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Save Modal */}
      <SaveProjectModal
        show={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onSaved={handleProjectSaved}
        calculatorType="wire"
        calculatorState={{ mode, openingMM, wireAllowanceMM, selectedWireCount, customDroppersRequired, runs, activeRun }}
        bomSnapshot={getCurrentBom()}
        currentProjectId={projectId}
        currentProjectName={projectName}
        currentCalculationId={calculationId}
        label="Stainless Wire Balustrade"
      />
    </div>
    </div>
  );
}
