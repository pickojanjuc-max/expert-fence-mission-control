'use client';

// ─────────────────────────────────────────────────────────────────────
// MyProductsClient
//
// Lets a tenant override default supplier pricing AND markup on a
// per-SKU basis, with a bulk "default markup" per calculator.
//
// v1: Balustrade only — sources the canonical SKU list from the same
// CSVs that BOMPanel uses (/data/balustrade/*.csv).
//
// Resolution order for the markup applied to each SKU:
//   1. The per-row markup_pct (if the user has saved one)
//   2. The user's default markup for this calculator (/api/settings)
//   3. FALLBACK_MARKUP_PCT (40) — what the app shipped with
//
// This file mirrors useUserCostMap so what shows here matches what
// the calculator/BOM displays for the customer.
// ─────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Sidebar from '@/components/Sidebar';

const FALLBACK_MARKUP_PCT = 40; // mirrors useUserCostMap.js + costData.js

const BALUSTRADE_SOURCES = [
  { url: '/data/balustrade/spigots.csv', category: 'Spigot' },
  { url: '/data/balustrade/cover_plates.csv', category: 'Cover plate' },
  { url: '/data/balustrade/glass.csv', category: 'Glass panel' },
  { url: '/data/balustrade/handrail_components.csv', category: 'Handrail fitting' },
  { url: '/data/balustrade/handrail_rails.csv', category: 'Handrail rail' },
];

function parseCsv(raw) {
  const lines = String(raw || '').trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cells = line.split(',');
    const row = {};
    headers.forEach((h, i) => { row[h] = (cells[i] || '').trim(); });
    return row;
  });
}

function money(n) {
  const v = Number(n || 0);
  if (!Number.isFinite(v) || v === 0) return '—';
  return `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function sellFrom(cost, markupPct) {
  const c = Number(cost);
  const m = Number(markupPct);
  if (!Number.isFinite(c) || c <= 0 || !Number.isFinite(m)) return 0;
  return Math.round(c * (1 + m / 100) * 100) / 100;
}

// CSV escape: wrap in quotes if value contains comma/quote/newline; double inner quotes
function csvEscape(v) {
  const s = v == null ? '' : String(v);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

// Export matches the on-screen table: Cost | Markup | Sell.
// Cost   = the user's override if set, else the supplier default.
// Markup = the user's per-SKU override if set, else the default for this calc.
// Sell   = derived (read-only). Import ignores the Sell column.
function buildExportCsv(rows, overrides, defaultMarkupPct) {
  const headers = ['SKU', 'Description', 'Category', 'Cost', 'Markup %', 'Sell'];
  const lines = [headers.join(',')];
  for (const r of rows) {
    const ov = overrides[r.sku];
    const cost = ov ? Number(ov.cost_price) : (r.defaultCost || 0);
    const markupPct = ov && ov.markup_pct != null ? Number(ov.markup_pct) : defaultMarkupPct;
    const sell = sellFrom(cost, markupPct);
    lines.push([
      csvEscape(r.sku),
      csvEscape(r.description),
      csvEscape(r.category),
      cost > 0 ? cost.toFixed(2) : '',
      Number.isFinite(markupPct) ? markupPct.toString() : '',
      sell > 0 ? sell.toFixed(2) : '',
    ].join(','));
  }
  return lines.join('\n');
}

// Parse a CSV (handles quoted fields with commas/escaped quotes).
function parseCsvFull(raw) {
  const text = String(raw || '').replace(/\r\n?/g, '\n').trim();
  if (!text) return [];
  const rows = [];
  let cur = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') { inQuotes = false; }
      else { field += c; }
    } else {
      if (c === '"') { inQuotes = true; }
      else if (c === ',') { cur.push(field); field = ''; }
      else if (c === '\n') { cur.push(field); rows.push(cur); cur = []; field = ''; }
      else { field += c; }
    }
  }
  cur.push(field);
  if (cur.length > 1 || cur[0] !== '') rows.push(cur);
  if (rows.length < 2) return [];
  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).map((cells) => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = (cells[i] || '').trim(); });
    return obj;
  });
}

function downloadFile(filename, text, mime = 'text/csv') {
  const blob = new Blob([text], { type: `${mime};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Strip "%" / whitespace from a CSV markup cell, return Number or NaN.
function parseMarkupCell(raw) {
  const s = String(raw ?? '').trim().replace(/%$/, '').trim();
  if (s === '') return NaN;
  return Number(s);
}

export default function MyProductsClient({ email }) {
  const [calculator] = useState('balustrade'); // single-calc v1, picker comes later
  const [defaults, setDefaults] = useState([]); // [{sku, description, category, defaultCost, image_url}]
  const [overrides, setOverrides] = useState({}); // { SKU: { cost_price, markup_pct, id, ... } }
  const [defaultMarkupPct, setDefaultMarkupPct] = useState(FALLBACK_MARKUP_PCT);
  const [defaultMarkupEdit, setDefaultMarkupEdit] = useState(''); // string in the input
  const [savingDefaultMarkup, setSavingDefaultMarkup] = useState(false);
  const [defaultMarkupSaved, setDefaultMarkupSaved] = useState(false);

  const [costEdits, setCostEdits] = useState({});       // { SKU: '99.99' }
  const [markupEdits, setMarkupEdits] = useState({});   // { SKU: '50' }
  const [savingSku, setSavingSku] = useState(null);
  const [savedSku, setSavedSku] = useState(null);

  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState('');
  const fileInputRef = useRef(null);

  const reload = useCallback(async () => {
    try {
      const csvTexts = await Promise.all(
        BALUSTRADE_SOURCES.map((s) =>
          fetch(s.url).then((r) => (r.ok ? r.text() : '')).then((t) => ({ ...s, text: t }))
        )
      );
      const seen = {};
      const all = [];
      for (const { text, category } of csvTexts) {
        for (const row of parseCsv(text)) {
          const sku = String(row.sku || '').toUpperCase();
          if (!sku || seen[sku]) continue;
          seen[sku] = true;
          all.push({
            sku,
            description: row.description || '',
            category,
            defaultCost: Number(row.price_aud_ex_gst) || 0,
            image_url: row.image_url || '',
          });
        }
      }
      all.sort((a, b) => a.sku.localeCompare(b.sku));

      const [productsData, settingsData] = await Promise.all([
        fetch(`/api/products?calculator_type=${calculator}`).then((r) => r.json()),
        fetch(`/api/settings?calculator_type=${calculator}`).then((r) => r.json()),
      ]);
      const overrideMap = {};
      for (const p of productsData.products || []) {
        overrideMap[String(p.slot_key).toUpperCase()] = p;
      }
      const fetchedDefault = Number(settingsData?.settings?.default_markup_pct);
      const safeDefault = Number.isFinite(fetchedDefault) ? fetchedDefault : FALLBACK_MARKUP_PCT;

      setDefaults(all);
      setOverrides(overrideMap);
      setDefaultMarkupPct(safeDefault);
      setDefaultMarkupEdit(String(safeDefault));
      setLoading(false);
      return { defaults: all, overrides: overrideMap, defaultMarkupPct: safeDefault };
    } catch (e) {
      setError(e.message || 'Failed to load products');
      setLoading(false);
      return null;
    }
  }, [calculator]);

  useEffect(() => {
    reload();
  }, [reload]);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return defaults;
    return defaults.filter(
      (r) =>
        r.sku.toLowerCase().includes(term) ||
        r.description.toLowerCase().includes(term) ||
        r.category.toLowerCase().includes(term)
    );
  }, [defaults, search]);

  async function saveDefaultMarkup() {
    const pct = Number(defaultMarkupEdit);
    if (!Number.isFinite(pct) || pct < 0 || pct > 1000) {
      setError('Default markup must be between 0 and 1000.');
      return;
    }
    setSavingDefaultMarkup(true);
    setError('');
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ calculator_type: calculator, default_markup_pct: pct }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setDefaultMarkupPct(pct);
      setDefaultMarkupSaved(true);
      setTimeout(() => setDefaultMarkupSaved(false), 1500);
    } catch (e) {
      setError(e.message);
    }
    setSavingDefaultMarkup(false);
  }

  async function saveOne(row) {
    // Resolve what's actually being saved. For each field: if the user typed
    // something, use that. Otherwise fall back to the existing override (so
    // saving cost-only doesn't blow away an existing markup override).
    const ov = overrides[row.sku];

    const costRaw = (costEdits[row.sku] ?? '').toString().trim();
    let costToSave;
    if (costRaw !== '') {
      const c = Number(costRaw);
      if (!Number.isFinite(c) || c < 0) {
        setError(`Invalid cost for ${row.sku}`);
        return;
      }
      costToSave = c;
    } else if (ov) {
      costToSave = Number(ov.cost_price);
    } else {
      // No user input and no existing override → still no real change.
      // But the user may have only edited markup. Use the supplier default
      // as the cost so we have a complete row to upsert.
      costToSave = Number(row.defaultCost) || 0;
    }

    const markupRaw = (markupEdits[row.sku] ?? '').toString().trim();
    let markupToSave; // null = inherit user default
    if (markupRaw !== '') {
      const m = Number(markupRaw);
      if (!Number.isFinite(m) || m < 0 || m > 1000) {
        setError(`Invalid markup for ${row.sku} (0-1000)`);
        return;
      }
      // If user typed exactly the current default, store NULL so they
      // automatically inherit future default changes.
      markupToSave = Math.abs(m - defaultMarkupPct) < 0.005 ? null : m;
    } else if (ov && ov.markup_pct != null) {
      markupToSave = Number(ov.markup_pct);
    } else {
      markupToSave = null;
    }

    setSavingSku(row.sku);
    setError('');
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          calculator_type: calculator,
          slot_key: row.sku,
          category: row.category,
          display_name: row.description,
          cost_price: costToSave,
          markup_pct: markupToSave,
          unit: 'each',
          image_url: row.image_url || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setOverrides((prev) => ({ ...prev, [row.sku]: data.product }));
      setCostEdits((prev) => { const n = { ...prev }; delete n[row.sku]; return n; });
      setMarkupEdits((prev) => { const n = { ...prev }; delete n[row.sku]; return n; });
      setSavedSku(row.sku);
      setTimeout(() => setSavedSku((s) => (s === row.sku ? null : s)), 1500);
    } catch (e) {
      setError(`${row.sku}: ${e.message}`);
    }
    setSavingSku(null);
  }

  function handleExport() {
    const csv = buildExportCsv(defaults, overrides, defaultMarkupPct);
    const today = new Date().toISOString().slice(0, 10);
    downloadFile(`${calculator}-products-${today}.csv`, csv);
  }

  async function handleImportFile(file) {
    if (!file) return;
    setImporting(true);
    setImportMessage('');
    setError('');
    try {
      const text = await file.text();
      const parsed = parseCsvFull(text);
      if (parsed.length === 0) throw new Error('CSV is empty or has no header row.');

      const defaultBySku = {};
      for (const r of defaults) defaultBySku[r.sku] = r;

      const toUpsert = [];
      let skipped = 0;
      let invalid = 0;
      let unknown = 0;

      for (const row of parsed) {
        const sku = String(row.SKU || row.sku || '').trim().toUpperCase();
        if (!sku) { invalid++; continue; }

        // Cost: new column = "Cost". Backwards-compat for old "Your Cost" exports.
        const costRaw = (row.Cost ?? row.cost ?? row['Your Cost'] ?? row.your_cost ?? '').toString().trim();
        // Markup: accept "Markup %", "Markup", or "markup_pct".
        const markupRaw = (row['Markup %'] ?? row.Markup ?? row.markup ?? row.markup_pct ?? '').toString().trim();

        // Both blank → skip the row entirely.
        if (costRaw === '' && markupRaw === '') { skipped++; continue; }

        const ref = defaultBySku[sku];
        if (!ref) { unknown++; continue; }
        const existing = overrides[sku];

        // Resolve effective cost.
        let cost;
        if (costRaw !== '') {
          const c = Number(costRaw);
          if (!Number.isFinite(c) || c < 0) { invalid++; continue; }
          cost = c;
        } else {
          cost = existing ? Number(existing.cost_price) : Number(ref.defaultCost) || 0;
        }

        // Resolve effective markup (null = inherit default).
        let markup;
        if (markupRaw !== '') {
          const m = parseMarkupCell(markupRaw);
          if (!Number.isFinite(m) || m < 0 || m > 1000) { invalid++; continue; }
          markup = Math.abs(m - defaultMarkupPct) < 0.005 ? null : m;
        } else {
          markup = existing && existing.markup_pct != null ? Number(existing.markup_pct) : null;
        }

        // No-op detection: if both cost and markup match what's already there
        // (or the supplier default for un-overridden rows), skip.
        const existingCost = existing ? Number(existing.cost_price) : Number(ref.defaultCost) || 0;
        const existingMarkup = existing && existing.markup_pct != null ? Number(existing.markup_pct) : null;
        const costSame = Math.abs(existingCost - cost) < 0.005;
        const markupSame = (existingMarkup === null && markup === null)
          || (existingMarkup !== null && markup !== null && Math.abs(existingMarkup - markup) < 0.005);
        const noOverrideExists = !existing;
        const matchesSupplierDefault = noOverrideExists
          && Math.abs(Number(ref.defaultCost) - cost) < 0.005
          && markup === null;
        if ((existing && costSame && markupSame) || matchesSupplierDefault) {
          skipped++;
          continue;
        }

        toUpsert.push({
          slot_key: sku,
          cost_price: cost,
          markup_pct: markup,
          category: ref.category,
          display_name: ref.description,
          image_url: ref.image_url || null,
        });
      }

      if (toUpsert.length === 0) {
        setImportMessage(`Nothing to update — ${skipped} unchanged, ${invalid} invalid, ${unknown} unknown SKU(s).`);
        setImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      const res = await fetch('/api/products/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ calculator_type: calculator, products: toUpsert }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Bulk save failed');

      await reload();
      setCostEdits({});
      setMarkupEdits({});
      setImportMessage(
        `Imported ${data.upserted} row(s). Skipped ${skipped} unchanged, ${invalid} invalid, ${unknown} unknown.`
      );
    } catch (e) {
      setError(`Import failed: ${e.message}`);
    }
    setImporting(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  // Styles
  const inputStyle = {
    width: '100%',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    padding: '6px 10px',
    fontSize: '13px',
    boxSizing: 'border-box',
    fontVariantNumeric: 'tabular-nums',
  };

  const buttonStyle = {
    backgroundColor: '#2563eb',
    color: 'white',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500',
    whiteSpace: 'nowrap',
  };

  const headerCell = {
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    color: '#6b7280',
    padding: '10px 12px',
    textAlign: 'left',
    background: '#f9fafb',
    borderBottom: '1px solid #e5e7eb',
    position: 'sticky',
    top: 0,
  };

  const defaultMarkupDirty = Number(defaultMarkupEdit) !== defaultMarkupPct
    && defaultMarkupEdit !== '';

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <style>{`
        @media (max-width: 768px) {
          .ef-main { padding: 70px 12px 24px !important; }
          .ef-hide-sm { display: none !important; }
        }
      `}</style>

      <Sidebar email={email} activePage="my-products" />

      <div style={{ flex: 1, backgroundColor: '#f9fafb', overflowY: 'auto' }} className="ef-main">
        <div style={{ padding: '24px 32px', maxWidth: '1100px', margin: '0 auto', width: '100%' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#111827', margin: '0 0 6px 0' }}>My Products</h1>
          <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 20px 0' }}>
            Set your supplier costs and the markup applied to each SKU. Sell prices = cost × (1 + markup%).
          </p>

          {/* Calc selector — single option for now */}
          <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #e5e7eb', marginBottom: '16px' }}>
            <div style={{ padding: '10px 18px', fontSize: 14, fontWeight: 600, color: '#111827', borderBottom: '2px solid #2563eb' }}>
              Balustrade
            </div>
            <div style={{ padding: '10px 18px', fontSize: 14, fontWeight: 500, color: '#9ca3af' }}>
              Glass <span style={{ fontSize: 11, color: '#9ca3af' }}>(coming soon)</span>
            </div>
            <div style={{ padding: '10px 18px', fontSize: 14, fontWeight: 500, color: '#9ca3af' }}>
              Wire <span style={{ fontSize: 11, color: '#9ca3af' }}>(coming soon)</span>
            </div>
          </div>

          {/* Bulk default markup */}
          <div style={{
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            padding: '14px 16px',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
          }}>
            <div style={{ flex: '1 1 320px', minWidth: 240 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 2 }}>Default markup for {calculator}</div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>
                Applied to every SKU unless you override it on the row below.
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ position: 'relative' }}>
                <input
                  type="number"
                  step="1"
                  min="0"
                  max="1000"
                  value={defaultMarkupEdit}
                  onChange={(e) => setDefaultMarkupEdit(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') saveDefaultMarkup(); }}
                  style={{ ...inputStyle, width: 100, paddingRight: 24, textAlign: 'right' }}
                />
                <span style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  color: '#6b7280', fontSize: 13, pointerEvents: 'none',
                }}>%</span>
              </div>
              {defaultMarkupSaved ? (
                <span style={{ fontSize: 12, color: '#059669', fontWeight: 600 }}>Saved ✓</span>
              ) : (
                <button
                  onClick={saveDefaultMarkup}
                  disabled={!defaultMarkupDirty || savingDefaultMarkup}
                  style={{
                    ...buttonStyle,
                    opacity: !defaultMarkupDirty || savingDefaultMarkup ? 0.4 : 1,
                    cursor: !defaultMarkupDirty || savingDefaultMarkup ? 'default' : 'pointer',
                  }}
                >
                  {savingDefaultMarkup ? 'Saving…' : 'Save default'}
                </button>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Search SKU, description, or category…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ ...inputStyle, maxWidth: 360, flex: '1 1 240px' }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleExport}
                disabled={loading || defaults.length === 0}
                style={{
                  ...buttonStyle,
                  background: 'white',
                  color: '#374151',
                  border: '1px solid #d1d5db',
                  opacity: loading || defaults.length === 0 ? 0.5 : 1,
                }}
                title="Download all SKUs and your overrides as a CSV you can edit in Excel"
              >
                ⬇ Export CSV
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={importing || loading}
                style={{
                  ...buttonStyle,
                  opacity: importing || loading ? 0.5 : 1,
                }}
                title="Upload an edited CSV to bulk-update your prices"
              >
                {importing ? 'Importing…' : '⬆ Import CSV'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                style={{ display: 'none' }}
                onChange={(e) => handleImportFile(e.target.files?.[0])}
              />
            </div>
            <div style={{ fontSize: 12, color: '#6b7280', flex: '1 1 100%' }}>
              {rows.length} of {defaults.length} SKUs · {Object.keys(overrides).length} overridden
            </div>
          </div>

          {importMessage && (
            <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', padding: '10px 12px', borderRadius: 6, fontSize: 13, marginBottom: 12 }}>
              {importMessage}
            </div>
          )}

          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '10px 12px', borderRadius: 6, fontSize: 13, marginBottom: 12 }}>
              {error}
            </div>
          )}

          {loading ? (
            <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>
              Loading products…
            </div>
          ) : rows.length === 0 ? (
            <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>
              No SKUs match your search.
            </div>
          ) : (
            <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr>
                      <th style={{ ...headerCell, width: 56 }} className="ef-hide-sm">Img</th>
                      <th style={headerCell}>SKU</th>
                      <th style={headerCell} className="ef-hide-sm">Description</th>
                      <th style={{ ...headerCell, textAlign: 'right', width: 130 }}>Cost</th>
                      <th style={{ ...headerCell, textAlign: 'right', width: 110 }}>Markup %</th>
                      <th style={{ ...headerCell, textAlign: 'right' }}>Sell</th>
                      <th style={{ ...headerCell, width: 90 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                      const ov = overrides[row.sku];

                      // Cost field: edited value > saved override > "" (placeholder shows default)
                      const costEdit = costEdits[row.sku];
                      const displayedCost = costEdit !== undefined
                        ? costEdit
                        : (ov ? Number(ov.cost_price).toFixed(2) : '');
                      const liveCost = Number(displayedCost) || (ov ? Number(ov.cost_price) : Number(row.defaultCost)) || 0;

                      // Markup field: edited > saved override > "" (placeholder shows default)
                      const markupEdit = markupEdits[row.sku];
                      const savedMarkup = ov && ov.markup_pct != null ? Number(ov.markup_pct) : null;
                      const displayedMarkup = markupEdit !== undefined
                        ? markupEdit
                        : (savedMarkup != null ? String(savedMarkup) : '');
                      const liveMarkup = displayedMarkup !== '' && Number.isFinite(Number(displayedMarkup))
                        ? Number(displayedMarkup)
                        : defaultMarkupPct;

                      const sell = sellFrom(liveCost, liveMarkup);

                      const isOverridden = !!ov;
                      const isDirty =
                        (costEdit !== undefined && costEdit !== (ov ? Number(ov.cost_price).toFixed(2) : ''))
                        || (markupEdit !== undefined && markupEdit !== (savedMarkup != null ? String(savedMarkup) : ''));
                      const isSaving = savingSku === row.sku;
                      const isSaved = savedSku === row.sku;

                      return (
                        <tr key={row.sku} style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '8px 12px' }} className="ef-hide-sm">
                            {row.image_url ? (
                              <img src={row.image_url} alt={row.sku} loading="lazy" style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 4, border: '1px solid #e5e7eb' }} />
                            ) : (
                              <div style={{ width: 36, height: 36, background: '#f3f4f6', borderRadius: 4 }} />
                            )}
                          </td>
                          <td style={{ padding: '8px 12px', fontFamily: 'ui-monospace, monospace', fontSize: 12, color: '#111827' }}>
                            <div>{row.sku}</div>
                            {isOverridden && (
                              <div style={{ fontSize: 10, color: '#059669', fontWeight: 600, marginTop: 2 }}>Custom</div>
                            )}
                          </td>
                          <td style={{ padding: '8px 12px', color: '#374151' }} className="ef-hide-sm">
                            <div>{row.description}</div>
                            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{row.category}</div>
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder={row.defaultCost ? row.defaultCost.toFixed(2) : '0.00'}
                              value={displayedCost}
                              onChange={(e) => setCostEdits((prev) => ({ ...prev, [row.sku]: e.target.value }))}
                              onKeyDown={(e) => { if (e.key === 'Enter') saveOne(row); }}
                              style={{ ...inputStyle, textAlign: 'right' }}
                            />
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                            <input
                              type="number"
                              step="1"
                              min="0"
                              max="1000"
                              placeholder={String(defaultMarkupPct)}
                              value={displayedMarkup}
                              onChange={(e) => setMarkupEdits((prev) => ({ ...prev, [row.sku]: e.target.value }))}
                              onKeyDown={(e) => { if (e.key === 'Enter') saveOne(row); }}
                              style={{ ...inputStyle, textAlign: 'right' }}
                              title={`Blank uses your default (${defaultMarkupPct}%)`}
                            />
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: '#0891b2', fontVariantNumeric: 'tabular-nums' }}>
                            {sell > 0 ? money(sell) : '—'}
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                            {isSaved ? (
                              <span style={{ fontSize: 12, color: '#059669', fontWeight: 600 }}>Saved ✓</span>
                            ) : (
                              <button
                                onClick={() => saveOne(row)}
                                disabled={!isDirty || isSaving}
                                style={{
                                  ...buttonStyle,
                                  opacity: !isDirty || isSaving ? 0.4 : 1,
                                  cursor: !isDirty || isSaving ? 'default' : 'pointer',
                                }}
                              >
                                {isSaving ? 'Saving…' : 'Save'}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
