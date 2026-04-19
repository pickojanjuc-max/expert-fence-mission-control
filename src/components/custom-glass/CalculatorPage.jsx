'use client';
import React, { useState, useCallback, useEffect } from 'react';
import {
  buildGlassBOM,
  defaultGlassPanel,
  GLASS_TYPE_LABELS,
  THICKNESS_OPTIONS,
  SHAPE_OPTIONS,
  GLASS_DEFAULTS,
} from '@/lib/customGlassBuilder';
import SaveProjectModal from '@/components/SaveProjectModal';

const SESSION_KEY = 'ef_custom_glass_state';

const fmt$ = (n) => '$' + Number(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const fmtN = (n, d = 2) => Number(n).toFixed(d);

// ── Colour tokens ─────────────────────────────────────────────────────────────
const C = {
  brand:    '#0f766e',
  brandDk:  '#0d6460',
  brandLt:  '#ccfbf1',
  border:   '#e5e7eb',
  bg:       '#f9fafb',
  white:    '#ffffff',
  text:     '#111827',
  muted:    '#6b7280',
  danger:   '#dc2626',
  warn:     '#d97706',
};

export default function CustomGlassCalculatorPage() {
  // ── State ─────────────────────────────────────────────────────────────────
  const [jobType,  setJobType]  = useState(GLASS_DEFAULTS.jobType);
  const [panels,   setPanels]   = useState([defaultGlassPanel(0)]);
  const [activeIdx, setActiveIdx] = useState(0);

  // Project save — standard pattern (matches glass, aluminium, balustrade)
  const [projectId,       setProjectId]       = useState(null);
  const [projectName,     setProjectName]     = useState('');
  const [calculationId,   setCalculationId]   = useState(null);
  const [showSaveModal,   setShowSaveModal]   = useState(false);
  const [saveMsg,         setSaveMsg]         = useState('');

  // Load from session
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (s.jobType)            setJobType(s.jobType);
        if (s.panels?.length)     { setPanels(s.panels); setActiveIdx(0); }
        if (s.projectId)          setProjectId(s.projectId);
        if (s.projectName)        setProjectName(s.projectName);
        if (s.calculationId)      setCalculationId(s.calculationId);
      }
    } catch {}
  }, []);

  // Persist to session
  useEffect(() => {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ jobType, panels, projectId, projectName, calculationId }));
    } catch {}
  }, [jobType, panels, projectId, projectName, calculationId]);

  // ── Save callback ────────────────────────────────────────────────────────────
  function handleProjectSaved({ projectId: pid, projectName: pname, calculationId: cid }) {
    setProjectId(pid);
    setProjectName(pname);
    setCalculationId(cid);
    setSaveMsg('Saved');
    setTimeout(() => setSaveMsg(''), 2000);
  }

  // ── Panel helpers ──────────────────────────────────────────────────────────
  const addPanel = useCallback(() => {
    if (panels.length >= 15) return;
    const newPanel = defaultGlassPanel(panels.length);
    setPanels(prev => [...prev, newPanel]);
    setActiveIdx(panels.length);
  }, [panels.length]);

  const removePanel = useCallback((idx) => {
    if (panels.length <= 1) return;
    setPanels(prev => prev.filter((_, i) => i !== idx));
    setActiveIdx(prev => Math.min(prev, panels.length - 2));
  }, [panels.length]);

  const updatePanel = useCallback((idx, key, value) => {
    setPanels(prev => prev.map((p, i) => i === idx ? { ...p, [key]: value } : p));
  }, []);

  // ── BOM ────────────────────────────────────────────────────────────────────
  const bom = buildGlassBOM({ panels, jobType });
  const { totals, panels: panelResults, validation } = bom;


  // ── Styles ─────────────────────────────────────────────────────────────────
  const activePanel = panels[activeIdx] || panels[0];
  const activePanelResult = panelResults[activeIdx] || panelResults[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', fontFamily: 'system-ui,-apple-system,sans-serif', backgroundColor: C.bg }}>
      <style>{`
        .cg-layout { display: grid; grid-template-columns: 380px 1fr; gap: 20px; padding: 20px; max-width: 1200px; margin: 0 auto; width: 100%; box-sizing: border-box; }
        @media (max-width: 900px) { .cg-layout { grid-template-columns: 1fr; } }
        @media (max-width: 640px) { .cg-layout { padding: 12px; gap: 12px; } }
        .cg-card { background: white; border: 1px solid ${C.border}; border-radius: 8px; padding: 16px; }
        .cg-section-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: ${C.muted}; margin: 0 0 10px 0; }
        .cg-panel-tab { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 6px; border: 1.5px solid ${C.border}; background: white; cursor: pointer; transition: all 0.15s; font-size: 13px; }
        .cg-panel-tab.active { border-color: ${C.brand}; background: ${C.brandLt}; }
        .cg-panel-tab:hover:not(.active) { border-color: #d1d5db; background: #f9fafb; }
        .cg-label { font-size: 12px; font-weight: 600; color: ${C.muted}; margin-bottom: 4px; display: block; }
        .cg-input { width: 100%; border: 1px solid ${C.border}; border-radius: 6px; padding: 7px 10px; font-size: 14px; color: ${C.text}; outline: none; box-sizing: border-box; }
        .cg-input:focus { border-color: ${C.brand}; box-shadow: 0 0 0 2px ${C.brandLt}; }
        .cg-select { width: 100%; border: 1px solid ${C.border}; border-radius: 6px; padding: 7px 10px; font-size: 14px; color: ${C.text}; outline: none; box-sizing: border-box; background: white; cursor: pointer; }
        .cg-select:focus { border-color: ${C.brand}; }
        .cg-seg { display: flex; gap: 6px; }
        .cg-seg button { flex: 1; padding: 6px 0; border-radius: 6px; border: 1.5px solid ${C.border}; background: white; font-size: 13px; cursor: pointer; transition: all 0.15s; }
        .cg-seg button.active { border-color: ${C.brand}; background: ${C.brandLt}; color: ${C.brand}; font-weight: 600; }
        .cg-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .cg-row3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
        .cg-stepper { display: flex; align-items: center; gap: 0; border: 1px solid ${C.border}; border-radius: 6px; overflow: hidden; }
        .cg-stepper button { width: 32px; height: 32px; border: none; background: #f3f4f6; cursor: pointer; font-size: 16px; color: ${C.text}; transition: background 0.15s; flex-shrink: 0; }
        .cg-stepper button:hover { background: #e5e7eb; }
        .cg-stepper span { flex: 1; text-align: center; font-size: 14px; font-weight: 600; color: ${C.text}; min-width: 28px; }
        .cg-bom-row { display: flex; justify-content: space-between; align-items: baseline; padding: 4px 0; border-bottom: 1px solid #f3f4f6; font-size: 13px; }
        .cg-bom-row:last-child { border-bottom: none; }
        .cg-always-on { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #059669; background: #ecfdf5; border-radius: 4px; padding: 3px 7px; }
        .cg-tag { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 600; padding: 2px 7px; border-radius: 10px; }
        .cg-warn { display: flex; gap: 8px; align-items: flex-start; background: #fffbeb; border: 1px solid #fcd34d; border-radius: 6px; padding: 10px 12px; font-size: 13px; color: #92400e; }
      `}</style>

      {/* Top nav */}
      <header style={{ background: C.white, borderBottom: `1px solid ${C.border}`, padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 10 }}>
        <a href="/dashboard" style={{ fontSize: 13, color: '#2563eb', textDecoration: 'none', fontWeight: 500 }}>
          ← Dashboard
        </a>
        <div style={{ width: 1, height: 16, background: C.border }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: C.text, flex: 1 }}>
          Custom Glass Calculator
          {projectName && <span style={{ fontWeight: 400, color: C.muted, marginLeft: 8 }}>— {projectName}</span>}
        </span>
        <button
          onClick={() => setShowSaveModal(true)}
          style={{ padding: '6px 14px', fontSize: 12, fontWeight: 600, color: 'white', background: '#10b981', border: 'none', borderRadius: 6, cursor: 'pointer' }}
        >
          Save Project
        </button>
        {saveMsg && <span style={{ fontSize: 12, color: '#059669', fontWeight: 600 }}>{saveMsg}</span>}
      </header>

      <div className="cg-layout">
        {/* ── LEFT COLUMN ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Job type */}
          <div className="cg-card">
            <p className="cg-section-title">Job Type</p>
            <div className="cg-seg">
              {['pool', 'balustrade'].map(t => (
                <button
                  key={t}
                  className={jobType === t ? 'active' : ''}
                  onClick={() => setJobType(t)}
                >
                  {t === 'pool' ? '🏊 Pool Fence' : '🏗 Glass Balustrade'}
                </button>
              ))}
            </div>
            <p style={{ fontSize: 12, color: C.muted, margin: '8px 0 0', lineHeight: 1.4 }}>
              Hardware (spigots, handrail) will be added as a second phase.
            </p>
          </div>

          {/* Panel list */}
          <div className="cg-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <p className="cg-section-title" style={{ margin: 0 }}>Panels ({panels.length}/15)</p>
              <button
                onClick={addPanel}
                disabled={panels.length >= 15}
                style={{ fontSize: 12, fontWeight: 600, color: panels.length >= 15 ? C.muted : C.brand, background: 'none', border: `1px solid ${panels.length >= 15 ? C.border : C.brand}`, borderRadius: 5, padding: '3px 10px', cursor: panels.length >= 15 ? 'default' : 'pointer' }}
              >
                + Add Panel
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {panels.map((p, i) => {
                const res = panelResults[i];
                return (
                  <div
                    key={i}
                    className={`cg-panel-tab${activeIdx === i ? ' active' : ''}`}
                    onClick={() => setActiveIdx(i)}
                  >
                    <span style={{ fontSize: 12, fontWeight: 700, color: activeIdx === i ? C.brand : C.muted, minWidth: 24 }}>{p.label}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{p.heightMM}×{p.widthMM}mm — {p.thickness}mm {GLASS_TYPE_LABELS[p.glassType]?.split(' ')[0]}</div>
                      <div style={{ fontSize: 11, color: C.muted }}>Qty {p.qty} · {fmt$(res?.lineSell ?? 0)} sell</div>
                    </div>
                    {panels.length > 1 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); removePanel(i); }}
                        style={{ fontSize: 14, color: C.muted, background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', lineHeight: 1 }}
                      >×</button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active panel config */}
          {activePanel && (
            <div className="cg-card">
              <p className="cg-section-title">Panel {activePanel.label} — Configuration</p>

              {/* Qty + Dimensions */}
              <div style={{ marginBottom: 12 }}>
                <label className="cg-label">Quantity</label>
                <div className="cg-stepper" style={{ width: 120 }}>
                  <button onClick={() => updatePanel(activeIdx, 'qty', Math.max(1, (activePanel.qty || 1) - 1))}>−</button>
                  <span>{activePanel.qty || 1}</span>
                  <button onClick={() => updatePanel(activeIdx, 'qty', Math.min(50, (activePanel.qty || 1) + 1))}>+</button>
                </div>
              </div>

              <div className="cg-row" style={{ marginBottom: 12 }}>
                <div>
                  <label className="cg-label">Height (mm)</label>
                  <input
                    type="number" className="cg-input" min="100" max="3000" step="1"
                    value={activePanel.heightMM}
                    onChange={e => updatePanel(activeIdx, 'heightMM', Math.max(100, parseInt(e.target.value) || 1000))}
                  />
                </div>
                <div>
                  <label className="cg-label">Width (mm)</label>
                  <input
                    type="number" className="cg-input" min="100" max="3000" step="1"
                    value={activePanel.widthMM}
                    onChange={e => updatePanel(activeIdx, 'widthMM', Math.max(100, parseInt(e.target.value) || 900))}
                  />
                </div>
              </div>

              {/* Thickness */}
              <div style={{ marginBottom: 12 }}>
                <label className="cg-label">Thickness</label>
                <div className="cg-seg">
                  {THICKNESS_OPTIONS.map(t => (
                    <button key={t} className={activePanel.thickness === t ? 'active' : ''} onClick={() => updatePanel(activeIdx, 'thickness', t)}>
                      {t}mm
                    </button>
                  ))}
                </div>
              </div>

              {/* Glass type */}
              <div style={{ marginBottom: 12 }}>
                <label className="cg-label">Glass Type</label>
                <select className="cg-select" value={activePanel.glassType} onChange={e => updatePanel(activeIdx, 'glassType', e.target.value)}>
                  {Object.entries(GLASS_TYPE_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Shape */}
              <div style={{ marginBottom: 14 }}>
                <label className="cg-label">Shape</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {Object.entries(SHAPE_OPTIONS).map(([key, { label }]) => (
                    <button
                      key={key}
                      onClick={() => updatePanel(activeIdx, 'shape', key)}
                      style={{
                        textAlign: 'left',
                        padding: '7px 10px',
                        borderRadius: 6,
                        border: `1.5px solid ${activePanel.shape === key ? C.brand : C.border}`,
                        background: activePanel.shape === key ? C.brandLt : 'white',
                        cursor: 'pointer',
                        fontSize: 13,
                        color: activePanel.shape === key ? C.brand : C.text,
                        fontWeight: activePanel.shape === key ? 600 : 400,
                        transition: 'all 0.15s',
                      }}
                    >{label}</button>
                  ))}
                </div>
              </div>

              {/* Always-on processing */}
              <div style={{ marginBottom: 14 }}>
                <label className="cg-label">Processing — Always Included</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {[
                    '✓ Heat Soak (all panels)',
                    '✓ Full CNC Polish (all edges)',
                    '✓ 2mm Radius Polished — 4 corners',
                  ].map(s => (
                    <div key={s} className="cg-always-on">{s}</div>
                  ))}
                </div>
              </div>

              {/* Optional: Drill holes */}
              <div style={{ marginBottom: 12 }}>
                <label className="cg-label">Drill Holes</label>
                <div className="cg-row">
                  <div>
                    <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>Standard (0–44mm)</div>
                    <div className="cg-stepper">
                      <button onClick={() => updatePanel(activeIdx, 'drillHolesStd', Math.max(0, (activePanel.drillHolesStd || 0) - 1))}>−</button>
                      <span>{activePanel.drillHolesStd || 0}</span>
                      <button onClick={() => updatePanel(activeIdx, 'drillHolesStd', (activePanel.drillHolesStd || 0) + 1)}>+</button>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>Polished (≥32mm)</div>
                    <div className="cg-stepper">
                      <button onClick={() => updatePanel(activeIdx, 'drillHolesPolished', Math.max(0, (activePanel.drillHolesPolished || 0) - 1))}>−</button>
                      <span>{activePanel.drillHolesPolished || 0}</span>
                      <button onClick={() => updatePanel(activeIdx, 'drillHolesPolished', (activePanel.drillHolesPolished || 0) + 1)}>+</button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Optional: Cut outs */}
              <div>
                <label className="cg-label">Cut Outs</label>
                <div className="cg-row">
                  <div>
                    <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>Corner cut out</div>
                    <div className="cg-stepper">
                      <button onClick={() => updatePanel(activeIdx, 'cornerCutOuts', Math.max(0, (activePanel.cornerCutOuts || 0) - 1))}>−</button>
                      <span>{activePanel.cornerCutOuts || 0}</span>
                      <button onClick={() => updatePanel(activeIdx, 'cornerCutOuts', (activePanel.cornerCutOuts || 0) + 1)}>+</button>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>Flat polish cut out</div>
                    <div className="cg-stepper">
                      <button onClick={() => updatePanel(activeIdx, 'flatPolishCutOuts', Math.max(0, (activePanel.flatPolishCutOuts || 0) - 1))}>−</button>
                      <span>{activePanel.flatPolishCutOuts || 0}</span>
                      <button onClick={() => updatePanel(activeIdx, 'flatPolishCutOuts', (activePanel.flatPolishCutOuts || 0) + 1)}>+</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Validation */}
          {validation.length > 0 && (
            <div className="cg-warn">
              <span>⚠️</span>
              <div>{validation.map((v, i) => <div key={i}>{v}</div>)}</div>
            </div>
          )}

          {/* Active panel breakdown */}
          {activePanelResult && (
            <div className="cg-card">
              <p className="cg-section-title">Panel {activePanel.label} — Cost Breakdown (per panel)</p>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 10 }}>
                {activePanel.heightMM}×{activePanel.widthMM}mm = {fmtN(activePanelResult.breakdown.areaSqm, 4)} m² · {fmtN(activePanelResult.breakdown.perimLM, 3)} LM perimeter
              </div>

              {[
                ['Glass panel', fmt$(activePanelResult.breakdown.glassCost)],
                ['Heat soak', fmt$(activePanelResult.breakdown.heatSoak)],
                ['CNC polish (all edges)', fmt$(activePanelResult.breakdown.cncPolish)],
                ['2mm radius corners × 4', fmt$(activePanelResult.breakdown.corners)],
                ...(activePanelResult.breakdown.shapeCharge > 0 ? [['Shape surcharge', fmt$(activePanelResult.breakdown.shapeCharge)]] : []),
                ...(activePanelResult.breakdown.drillStd > 0 ? [[`Drill holes std × ${activePanel.drillHolesStd}`, fmt$(activePanelResult.breakdown.drillStd)]] : []),
                ...(activePanelResult.breakdown.drillPol > 0 ? [[`Drill holes polished × ${activePanel.drillHolesPolished}`, fmt$(activePanelResult.breakdown.drillPol)]] : []),
                ...(activePanelResult.breakdown.cutCorner > 0 ? [[`Corner cut outs × ${activePanel.cornerCutOuts}`, fmt$(activePanelResult.breakdown.cutCorner)]] : []),
                ...(activePanelResult.breakdown.cutFlat > 0 ? [[`Flat polish cut outs × ${activePanel.flatPolishCutOuts}`, fmt$(activePanelResult.breakdown.cutFlat)]] : []),
              ].map(([label, value]) => (
                <div key={label} className="cg-bom-row">
                  <span style={{ color: C.muted }}>{label}</span>
                  <span style={{ fontWeight: 500 }}>{value}</span>
                </div>
              ))}

              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: `2px solid ${C.border}`, paddingTop: 8, marginTop: 4 }}>
                <div>
                  <div style={{ fontSize: 11, color: C.muted }}>Cost (per panel)</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{fmt$(activePanelResult.breakdown.totalCost)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, color: C.muted }}>Sell (per panel)</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: C.brand }}>{fmt$(activePanelResult.breakdown.totalSell)}</div>
                </div>
              </div>

              {(activePanel.qty || 1) > 1 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', background: '#f0fdf4', borderRadius: 6, padding: '8px 12px', marginTop: 8 }}>
                  <div>
                    <div style={{ fontSize: 11, color: C.muted }}>× {activePanel.qty} panels — Cost</div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{fmt$(activePanelResult.lineCost)}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, color: C.muted }}>× {activePanel.qty} panels — Sell</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.brand }}>{fmt$(activePanelResult.lineSell)}</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* All panels summary table */}
          {panels.length > 0 && (
            <div className="cg-card">
              <p className="cg-section-title">All Panels — Summary</p>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: C.bg }}>
                      {['Panel','Qty','H×W','Thick','Type','Shape','Area m²','Cost','Sell'].map(h => (
                        <th key={h} style={{ padding: '6px 8px', textAlign: h === 'Panel' || h === 'Type' || h === 'Shape' ? 'left' : 'right', color: C.muted, fontWeight: 600, fontSize: 11, borderBottom: `1px solid ${C.border}`, whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {panelResults.map((pr, i) => (
                      <tr
                        key={i}
                        onClick={() => setActiveIdx(i)}
                        style={{ cursor: 'pointer', background: activeIdx === i ? C.brandLt : 'white', transition: 'background 0.1s' }}
                      >
                        <td style={{ padding: '7px 8px', fontWeight: 600, color: C.brand, borderBottom: `1px solid ${C.border}` }}>{pr.label}</td>
                        <td style={{ padding: '7px 8px', textAlign: 'right', borderBottom: `1px solid ${C.border}` }}>{pr.qty}</td>
                        <td style={{ padding: '7px 8px', textAlign: 'right', whiteSpace: 'nowrap', borderBottom: `1px solid ${C.border}` }}>{pr.heightMM}×{pr.widthMM}</td>
                        <td style={{ padding: '7px 8px', textAlign: 'right', borderBottom: `1px solid ${C.border}` }}>{pr.thickness}mm</td>
                        <td style={{ padding: '7px 8px', borderBottom: `1px solid ${C.border}`, whiteSpace: 'nowrap' }}>{GLASS_TYPE_LABELS[pr.glassType]?.split(' ')[0]}</td>
                        <td style={{ padding: '7px 8px', borderBottom: `1px solid ${C.border}`, textTransform: 'capitalize' }}>{pr.shape}</td>
                        <td style={{ padding: '7px 8px', textAlign: 'right', borderBottom: `1px solid ${C.border}` }}>{fmtN(pr.breakdown.areaSqm * pr.qty, 3)}</td>
                        <td style={{ padding: '7px 8px', textAlign: 'right', borderBottom: `1px solid ${C.border}` }}>{fmt$(pr.lineCost)}</td>
                        <td style={{ padding: '7px 8px', textAlign: 'right', fontWeight: 600, color: C.brand, borderBottom: `1px solid ${C.border}` }}>{fmt$(pr.lineSell)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Job totals */}
          <div className="cg-card" style={{ border: `2px solid ${C.brand}` }}>
            <p className="cg-section-title">Job Total — {jobType === 'pool' ? 'Pool Fence' : 'Glass Balustrade'}</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
              {[
                ['Panels', totals.panels.toString()],
                ['Total area', `${fmtN(totals.areaSqm, 2)} m²`],
                ['Total cost', fmt$(totals.cost)],
                ['Total sell', fmt$(totals.sell)],
              ].map(([label, value]) => (
                <div key={label} style={{ background: C.bg, borderRadius: 6, padding: '10px 12px' }}>
                  <div style={{ fontSize: 11, color: C.muted, marginBottom: 2 }}>{label}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: label === 'Total sell' ? C.brand : C.text }}>{value}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: C.brandLt, borderRadius: 6, padding: '12px 16px' }}>
              <div>
                <div style={{ fontSize: 12, color: C.muted }}>Margin</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: C.brand }}>
                  {totals.cost > 0 ? `${(((totals.sell - totals.cost) / totals.sell) * 100).toFixed(1)}%` : '—'}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 12, color: C.muted }}>Gross Profit</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: C.brand }}>
                  {fmt$(totals.sell - totals.cost)}
                </div>
              </div>
            </div>

            <p style={{ fontSize: 11, color: C.muted, margin: '10px 0 0', lineHeight: 1.5 }}>
              Prices based on 8–14mm thickness group, supplier pricing updated April 2026.
              Hardware (spigots, handrail) to be added separately.
            </p>
          </div>
        </div>
      </div>

      {/* Save Project Modal — standard pattern shared across all calculators */}
      <SaveProjectModal
        show={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onSaved={handleProjectSaved}
        calculatorType="custom-glass"
        calculatorState={{ jobType, panels }}
        bomSnapshot={{
          // Build a real BOM array so the project page's consolidator can pick
          // up custom-glass panels alongside other calculators. Identical
          // size/thickness/type/shape lines collapse via the `key = SKU` rule
          // in consolidateBoms().
          consolidated: panelResults.map((pr) => {
            const typeShort = (GLASS_TYPE_LABELS[pr.glassType] || pr.glassType || '').split(' ')[0];
            const sku = `GLASS-H${pr.heightMM}-W${pr.widthMM}-T${pr.thickness}-${(pr.glassType || 'std').toUpperCase()}-${(pr.shape || 'rect').toUpperCase()}`;
            const unitSell = pr.qty > 0 ? pr.lineSell / pr.qty : pr.lineSell;
            return {
              SKU: sku,
              Item: `Glass Panel ${pr.heightMM}×${pr.widthMM}×${pr.thickness}mm (${typeShort}, ${pr.shape})`,
              Qty: pr.qty,
              'Unit Sell (ex GST)': unitSell,
              'Line Sell (ex GST)': pr.lineSell,
            };
          }),
          totals,
        }}
        currentProjectId={projectId}
        currentProjectName={projectName}
        currentCalculationId={calculationId}
        label="Custom Glass"
      />
    </div>
  );
}
