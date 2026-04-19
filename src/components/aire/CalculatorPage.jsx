'use client';
import React, { useState, useEffect } from 'react';
import { buildAireBOM, defaultAireRun, AIRE_DEFAULTS, SHAPE_CORNERS, SHAPE_RUN_COUNT } from '@/lib/aireBuilder';
import { COST_MAP } from '@/lib/costData';
import SaveProjectModal from '@/components/SaveProjectModal';
import ElevationPreview from '@/components/aire/ElevationPreview';
import { updateCalculation } from '@/lib/saveCalculation';

// ── Session persistence ───────────────────────────────────────────────────────
const STORAGE_KEY = 'ef_aire_calc_state';

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

const COLOURS = [
  { value: 'B',  label: 'Satin Black' },
  { value: 'MN', label: 'Monument' },
  { value: 'W',  label: 'Pearl White' },
  { value: 'M',  label: 'Mill' },
];

const HANDRAIL_TYPES = [
  { value: 'Oval',        label: 'Oval' },
  { value: 'Rectangular', label: 'Rectangular' },
];

const MOUNT_TYPES = [
  { value: 'BasePlate', label: 'Base Plate (AR-1050-FPBP)' },
  { value: 'FaceMount', label: 'Face Mount (AR-1500-FMLR)' },
];

const INFILL_TYPES = [
  { value: 'Slat',   label: 'Slat (XP-6100-S65)' },
  { value: 'Picket', label: 'Picket (AR-5600-PB)' },
];

const FENCE_STYLES = [
  { value: 'Full',   label: 'Full' },
  { value: '3-Rail', label: '3-Rail' },
];

// End types match PHP plugin
const END_TYPES = [
  { value: 'post',       label: 'Post (free end)' },
  { value: 'half_post',  label: 'Half Post' },
  { value: 'wall',       label: 'Into Wall (60mm gap)' },
];

const MAX_RUNS = 6;

// ── Shared input styles ───────────────────────────────────────────────────────
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

export default function AireCalculator() {
  // Global opts
  const [colour,       setColour]       = useState(AIRE_DEFAULTS.colour);
  const [handrailType, setHandrailType] = useState(AIRE_DEFAULTS.handrailType);
  const [mountType,    setMountType]    = useState(AIRE_DEFAULTS.mountType);
  const [infillType,   setInfillType]   = useState(AIRE_DEFAULTS.infillType);
  const [fenceStyle,   setFenceStyle]   = useState(AIRE_DEFAULTS.fenceStyle);
  const [shape,        setShape]        = useState(AIRE_DEFAULTS.shape);

  // Runs (up to 6 for Straight, fixed count for L/U shapes)
  const [runs, setRuns] = useState(() => [defaultAireRun(0)]);

  const [activeRun, setActiveRun] = useState(0);
  const [rightTab, setRightTab]   = useState('preview');

  // SKU → image URL (loaded from supplier CSV)
  const [skuToImage, setSkuToImage] = useState({});
  useEffect(() => {
    let alive = true;
    fetch('/data/supplier_sku_image_map.csv')
      .then((r) => (r.ok ? r.text() : ''))
      .then((text) => {
        if (!alive) return;
        const lines = String(text || '').trim().split(/\r?\n/);
        if (lines.length < 2) return;
        const headers = lines[0].split(',').map((h) => h.trim());
        const m = {};
        for (const line of lines.slice(1)) {
          const cells = line.split(',');
          const row = {};
          headers.forEach((h, i) => { row[h] = (cells[i] || '').trim(); });
          if (row.sku) m[String(row.sku).toUpperCase()] = row.image_url || '';
        }
        setSkuToImage(m);
      })
      .catch(() => { if (alive) setSkuToImage({}); });
    return () => { alive = false; };
  }, []);

  // Save/project
  const [projectId,     setProjectId]     = useState(null);
  const [projectName,   setProjectName]   = useState('');
  const [calculationId, setCalculationId] = useState(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveMsg,       setSaveMsg]       = useState('');
  const [hydrated,      setHydrated]      = useState(false);

  // ── Hydration from sessionStorage ─────────────────────────────────────────
  useEffect(() => {
    const s = loadSavedState();
    if (s) {
      if (s.colour)       setColour(s.colour);
      if (s.handrailType) setHandrailType(s.handrailType);
      if (s.mountType)    setMountType(s.mountType);
      if (s.infillType)   setInfillType(s.infillType);
      if (s.fenceStyle)   setFenceStyle(s.fenceStyle);
      if (s.shape)        setShape(s.shape);
      if (s.runs)         setRuns(s.runs);
      if (s.activeRun !== undefined) setActiveRun(s.activeRun);
      if (s.projectId)    setProjectId(s.projectId);
      if (s.projectName)  setProjectName(s.projectName);
      if (s.calculationId) setCalculationId(s.calculationId);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    persistState({ colour, handrailType, mountType, infillType, fenceStyle, shape, runs, activeRun, projectId, projectName, calculationId });
  }, [colour, handrailType, mountType, infillType, fenceStyle, shape, runs, activeRun, projectId, projectName, calculationId, hydrated]);

  // ── Load from URL param ────────────────────────────────────────────────────
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
        if (s.colour)       setColour(s.colour);
        if (s.handrailType) setHandrailType(s.handrailType);
        if (s.mountType)    setMountType(s.mountType);
        if (s.infillType)   setInfillType(s.infillType);
        if (s.fenceStyle)   setFenceStyle(s.fenceStyle);
        if (s.shape)        setShape(s.shape);
        if (s.runs)         setRuns(s.runs);
        if (s.activeRun !== undefined) setActiveRun(s.activeRun);
        setProjectId(data.project.id);
        setProjectName(data.project.name);
        setCalculationId(data.calculation.id);
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Shape management ──────────────────────────────────────────────────────
  function handleShapeChange(newShape) {
    setShape(newShape);
    const fixedCount = SHAPE_RUN_COUNT[newShape];
    if (fixedCount !== null && fixedCount !== undefined) {
      // Build exactly the right number of runs, preserving existing lengths
      setRuns((prev) => {
        const next = [];
        for (let i = 0; i < fixedCount; i++) {
          next.push(prev[i] ? { ...prev[i] } : defaultAireRun(i));
        }
        return next;
      });
      setActiveRun(0);
    }
    // Straight — keep current runs as-is (user manages count)
  }

  // Shared corners auto-derived from shape
  const sharedCorners = SHAPE_CORNERS[shape] ?? 0;

  // Whether user can add/remove runs (only for Straight)
  const isFixedRunCount = SHAPE_RUN_COUNT[shape] !== null && SHAPE_RUN_COUNT[shape] !== undefined;

  // Label: "Side A/B/C" for shaped, "Run A/B/C" for straight
  function runLabel(i) {
    return isFixedRunCount ? `Side ${['A','B','C','D','E','F'][i]}` : `Run ${['A','B','C','D','E','F'][i] || i+1}`;
  }

  // ── Run management ─────────────────────────────────────────────────────────
  function addRun() {
    if (isFixedRunCount || runs.length >= MAX_RUNS) return;
    setRuns((prev) => [...prev, defaultAireRun(prev.length)]);
    setActiveRun(runs.length);
  }

  function removeRun(i) {
    if (isFixedRunCount || runs.length <= 1) return;
    setRuns((prev) => prev.filter((_, idx) => idx !== i));
    setActiveRun(Math.max(0, Math.min(activeRun, runs.length - 2)));
  }

  function updateRun(i, field, value) {
    setRuns((prev) => prev.map((r, idx) => idx === i ? { ...r, [field]: value } : r));
  }

  // ── BOM calculation ────────────────────────────────────────────────────────
  const opts = { colour, handrailType, mountType, infillType, fenceStyle, sharedCorners };
  const activeRuns = runs.map((r) => ({ ...r, active: r.active !== false }));
  const { consolidated, validation } = buildAireBOM(activeRuns, opts);

  // Enrich with pricing
  const enrichedBOM = consolidated.map((item) => {
    const key = String(item.sku || '').toUpperCase();
    const costEntry = COST_MAP[key];
    const unitSell = costEntry?.sell ?? 0;
    const lineSell = Math.round(unitSell * (Number(item.qty) || 0) * 100) / 100;
    return { ...item, 'Unit Sell (ex GST)': unitSell, 'Line Sell (ex GST)': lineSell };
  });

  const totalSell = enrichedBOM.reduce((sum, r) => sum + (r['Line Sell (ex GST)'] || 0), 0);
  const hasPricing = enrichedBOM.length > 0;

  // ── Get BOM for saving ─────────────────────────────────────────────────────
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

  // ── Colour / infill label ──────────────────────────────────────────────────
  const colourLabel  = COLOURS.find((c) => c.value === colour)?.label || colour;
  const infillLabel  = INFILL_TYPES.find((t) => t.value === infillType)?.label || infillType;
  const mountLabel   = MOUNT_TYPES.find((t) => t.value === mountType)?.label?.split(' ')[0] || mountType;

  // Per-run summary helper — members per bay based on infill type
  function membersPerBay(run) {
    const bays    = Math.max(1, Math.ceil(run.length / (run.maxPostSpan || 1800)));
    const bayCc   = run.length / bays;
    const clearMM = Math.max(0, bayCc - 50);
    if (infillType === 'Picket') {
      return Math.floor(clearMM / 110);
    }
    return Math.floor((clearMM + 64) / (66 + 64));
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#f9fafb' }}>
      {/* Top nav */}
      <header style={{ background: 'white', borderBottom: '1px solid #e5e7eb', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <a
          href={projectId ? `/project/${projectId}` : '/dashboard'}
          style={{ fontSize: 13, color: '#2563eb', fontWeight: 500, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
        >
          ← {projectId ? (projectName ? `Back to ${projectName}` : 'Back to Project') : 'Dashboard'}
        </a>
        <div style={{ width: 1, height: 16, background: '#e5e7eb' }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: '#111827', flex: 1 }}>
          AIRE+ Balustrade Calculator
          {projectName && <span style={{ color: '#9ca3af', fontWeight: 400, marginLeft: 8 }}>— {projectName}</span>}
        </span>
        {saveMsg && <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 600 }}>{saveMsg}</span>}
        <button
          onClick={async () => {
            if (projectId) {
              // Direct update — no modal prompt when already inside a project
              try {
                const res = await updateCalculation({
                  projectId,
                  projectName,
                  calculationId,
                  calculatorType: 'aire',
                  calculatorState: { colour, handrailType, mountType, infillType, fenceStyle, shape, runs, activeRun },
                  bomSnapshot: getCurrentBom(),
                  label: 'AIRE+ Balustrade',
                });
                handleProjectSaved(res);
                setSaveMsg('Saved');
                setTimeout(() => setSaveMsg(''), 1500);
              } catch (e) {
                setSaveMsg('Error: ' + e.message);
              }
            } else {
              setShowSaveModal(true);
            }
          }}
          disabled={enrichedBOM.length === 0}
          style={{
            padding: '6px 12px',
            background: enrichedBOM.length > 0 ? '#10b981' : '#d1d5db',
            color: 'white',
            border: 'none',
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 600,
            cursor: enrichedBOM.length > 0 ? 'pointer' : 'default',
          }}
        >
          {projectId ? 'Update Project' : 'Save Project'}
        </button>
      </header>
    <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', padding: '24px 20px', flex: 1 }}>

      {/* ── LEFT PANEL ── */}
      <div style={{ width: 300, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Header */}
        <div style={{ background: '#1e3a5f', borderRadius: 10, padding: '16px 18px', color: 'white' }}>
          <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.7, marginBottom: 4 }}>
            AIRE+ System
          </div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>Balustrade Calculator</div>
          <div style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>
            Max 1800mm post centres · Picket or Slat infill
          </div>
        </div>

        {/* Global Options */}
        <div style={{ background: 'white', borderRadius: 10, padding: 16, border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            System Options
          </div>

          {/* Shape selector */}
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Shape</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {[
                { value: 'Straight', icon: '—',  desc: 'Straight' },
                { value: 'L-shape',  icon: '⌐',  desc: 'L-shape'  },
                { value: 'U-shape',  icon: '⊓',  desc: 'U-shape'  },
              ].map(({ value, icon, desc }) => (
                <button
                  key={value}
                  onClick={() => handleShapeChange(value)}
                  style={{
                    flex: 1,
                    padding: '8px 4px',
                    borderRadius: 7,
                    border: `2px solid ${shape === value ? '#2563eb' : '#e5e7eb'}`,
                    background: shape === value ? '#eff6ff' : 'white',
                    color: shape === value ? '#1d4ed8' : '#6b7280',
                    fontSize: 11,
                    fontWeight: shape === value ? 700 : 500,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 3,
                  }}
                >
                  <span style={{ fontSize: 16, lineHeight: 1 }}>{icon}</span>
                  <span>{desc}</span>
                </button>
              ))}
            </div>
            {shape !== 'Straight' && (
              <div style={{ fontSize: 11, color: '#6b7280', marginTop: 6, background: '#f0f9ff', borderRadius: 5, padding: '5px 8px' }}>
                {shape === 'L-shape' ? '2 sides · 1 shared corner post' : '3 sides · 2 shared corner posts'}
              </div>
            )}
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Infill Type</label>
            <select style={selectStyle} value={infillType} onChange={(e) => setInfillType(e.target.value)}>
              {INFILL_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Mount Type</label>
            <select style={selectStyle} value={mountType} onChange={(e) => setMountType(e.target.value)}>
              {MOUNT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Style</label>
            <select style={selectStyle} value={fenceStyle} onChange={(e) => setFenceStyle(e.target.value)}>
              {FENCE_STYLES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Colour</label>
            <select style={selectStyle} value={colour} onChange={(e) => setColour(e.target.value)}>
              {COLOURS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Handrail Profile</label>
            <select style={selectStyle} value={handrailType} onChange={(e) => setHandrailType(e.target.value)}>
              {HANDRAIL_TYPES.map((h) => <option key={h.value} value={h.value}>{h.label}</option>)}
            </select>
          </div>
        </div>

        {/* Run Tabs */}
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
                  borderBottom: activeRun === i ? '2px solid #2563eb' : '2px solid transparent',
                  color: activeRun === i ? '#2563eb' : '#6b7280',
                  cursor: 'pointer',
                }}
              >
                {runLabel(i)}
              </button>
            ))}
            {!isFixedRunCount && runs.length < MAX_RUNS && (
              <button
                onClick={addRun}
                style={{
                  padding: '8px 10px',
                  fontSize: 16,
                  border: 'none',
                  background: 'transparent',
                  color: '#9ca3af',
                  cursor: 'pointer',
                }}
                title="Add run"
              >
                +
              </button>
            )}
          </div>

          {/* Active run inputs */}
          {runs[activeRun] && (
            <div style={{ padding: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div>
                  <label style={labelStyle}>Length (mm)</label>
                  <input
                    type="number"
                    style={inputStyle}
                    value={runs[activeRun].length}
                    min={100}
                    max={50000}
                    onChange={(e) => updateRun(activeRun, 'length', Number(e.target.value))}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Height (mm)</label>
                  <input
                    type="number"
                    style={inputStyle}
                    value={runs[activeRun].height}
                    min={500}
                    max={1200}
                    onChange={(e) => updateRun(activeRun, 'height', Number(e.target.value))}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div>
                  <label style={labelStyle}>Bottom Gap (mm)</label>
                  <input
                    type="number"
                    style={inputStyle}
                    value={runs[activeRun].bottomGap}
                    min={0}
                    max={200}
                    onChange={(e) => updateRun(activeRun, 'bottomGap', Number(e.target.value))}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Max Post Span (mm)</label>
                  <input
                    type="number"
                    style={inputStyle}
                    value={runs[activeRun].maxPostSpan}
                    min={500}
                    max={1800}
                    onChange={(e) => updateRun(activeRun, 'maxPostSpan', Number(e.target.value))}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                <div>
                  <label style={labelStyle}>End 1 Type</label>
                  <select style={selectStyle} value={runs[activeRun].end1 || 'post'} onChange={(e) => updateRun(activeRun, 'end1', e.target.value)}>
                    {END_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>End 2 Type</label>
                  <select style={selectStyle} value={runs[activeRun].end2 || 'post'} onChange={(e) => updateRun(activeRun, 'end2', e.target.value)}>
                    {END_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Per-run summary chip */}
              {runs[activeRun].length > 0 && (() => {
                const bays    = Math.max(1, Math.ceil(runs[activeRun].length / runs[activeRun].maxPostSpan));
                const posts   = bays + 1;
                const mbCount = membersPerBay(runs[activeRun]);
                return (
                  <div style={{ background: '#f0f9ff', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: '#0369a1' }}>
                    {bays} bay{bays > 1 ? 's' : ''} · {posts} posts · ~{mbCount} {infillType.toLowerCase()}s/bay
                  </div>
                );
              })()}

              {!isFixedRunCount && runs.length > 1 && (
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

      </div>

      {/* ── RIGHT PANEL — Preview + BOM ── */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Validation warnings */}
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
                transition: 'all 0.15s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Layout Preview tab */}
        {rightTab === 'preview' && (
          <div style={{ background: 'white', borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden', padding: 12 }}>
            <ElevationPreview runs={runs} infillType={infillType} fenceStyle={fenceStyle} />
          </div>
        )}

        {/* BOM tab */}
        {rightTab === 'bom' && <>

        {/* BOM header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#111827' }}>
              Bill of Materials
            </h2>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
              AIRE+ · {infillLabel} infill · {colourLabel} · {handrailType} handrail · {mountLabel}
            </div>
          </div>
          {hasPricing && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, color: '#6b7280' }}>Total (ex GST)</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#111827' }}>{money(totalSell)}</div>
            </div>
          )}
        </div>

        {/* BOM Table */}
        {enrichedBOM.length === 0 ? (
          <div style={{ background: 'white', borderRadius: 10, border: '1px solid #e5e7eb', padding: '40px 20px', textAlign: 'center', color: '#9ca3af' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📐</div>
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
                  {hasPricing && (
                    <>
                      <th style={{ textAlign: 'right', padding: '10px 14px', fontWeight: 600, color: '#374151', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Unit</th>
                      <th style={{ textAlign: 'right', padding: '10px 14px', fontWeight: 600, color: '#374151', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Line</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {enrichedBOM.map((item, i) => {
                  const unitSell = item['Unit Sell (ex GST)'] || 0;
                  const lineSell = item['Line Sell (ex GST)'] || 0;
                  return (
                    <tr key={i} style={{ borderBottom: i < enrichedBOM.length - 1 ? '1px solid #f3f4f6' : 'none', background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                      <td style={{ padding: '9px 14px' }}>
                        {(() => {
                          const key = String(item.sku || '').toUpperCase();
                          const imageUrl = skuToImage[key] || COST_MAP[key]?.img || '';
                          return imageUrl ? (
                            <img src={imageUrl} alt={item.sku} loading="lazy" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4, border: '1px solid #e5e7eb' }} />
                          ) : (
                            <span style={{ fontSize: 10, color: '#9ca3af' }}>—</span>
                          );
                        })()}
                      </td>
                      <td style={{ padding: '9px 14px', fontFamily: 'monospace', fontSize: 12, color: '#374151', fontWeight: 500 }}>
                        {item.sku}
                      </td>
                      <td style={{ padding: '9px 14px', color: '#6b7280' }}>{item.description}</td>
                      <td style={{ padding: '9px 14px', textAlign: 'center', fontWeight: 600, color: '#111827' }}>{item.qty}</td>
                      <td style={{ padding: '9px 14px', textAlign: 'center', color: '#9ca3af', fontSize: 11 }}>{item.unit}</td>
                      {hasPricing && (
                        <>
                          <td style={{ padding: '9px 14px', textAlign: 'right', color: unitSell > 0 ? '#6b7280' : '#9ca3af', fontStyle: unitSell > 0 ? 'normal' : 'italic' }}>
                            {unitSell > 0 ? money(unitSell) : 'TBC'}
                          </td>
                          <td style={{ padding: '9px 14px', textAlign: 'right', fontWeight: 600, color: lineSell > 0 ? '#111827' : '#9ca3af', fontStyle: lineSell > 0 ? 'normal' : 'italic' }}>
                            {lineSell > 0 ? money(lineSell) : 'TBC'}
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
              {hasPricing && (
                <tfoot>
                  <tr style={{ borderTop: '2px solid #e5e7eb', background: '#f9fafb' }}>
                    <td colSpan={5} style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'right', color: '#374151', fontSize: 13 }}>
                      Total (ex GST)
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right' }}></td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, fontSize: 15, color: '#111827' }}>
                      {money(totalSell)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}

        {/* close BOM tab conditional */}
        </>}

        {/* Run summary — always visible */}
        <div style={{ background: 'white', borderRadius: 10, border: '1px solid #e5e7eb', padding: '14px 16px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Run Summary
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {runs.map((r, i) => {
              const bays    = r.length > 0 ? Math.max(1, Math.ceil(r.length / r.maxPostSpan)) : 0;
              const posts   = bays + 1;
              const mbCount = membersPerBay(r);
              return (
                <div
                  key={i}
                  onClick={() => setActiveRun(i)}
                  style={{
                    background: activeRun === i ? '#eff6ff' : '#f9fafb',
                    border: `1px solid ${activeRun === i ? '#93c5fd' : '#e5e7eb'}`,
                    borderRadius: 8,
                    padding: '8px 12px',
                    cursor: 'pointer',
                    minWidth: 120,
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#1d4ed8', marginBottom: 3 }}>{runLabel(i)}</div>
                  <div style={{ fontSize: 11, color: '#6b7280' }}>{(r.length / 1000).toFixed(2)}m · {r.height}mm H</div>
                  <div style={{ fontSize: 11, color: '#9ca3af' }}>{posts} posts · ~{mbCount} {infillType.toLowerCase()}s/bay</div>
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
        calculatorType="aire"
        calculatorState={{ colour, handrailType, mountType, infillType, fenceStyle, shape, runs, activeRun }}
        bomSnapshot={getCurrentBom()}
        currentProjectId={projectId}
        currentProjectName={projectName}
        currentCalculationId={calculationId}
        label="AIRE+ Balustrade"
      />
    </div>
    </div>
  );
}
