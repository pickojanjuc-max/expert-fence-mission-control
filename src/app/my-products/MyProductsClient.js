'use client';

// ─────────────────────────────────────────────────────────────────────
// MyProductsClient
//
// Lets a tenant override default supplier pricing on a per-SKU basis.
// v1: Balustrade only — sources the canonical SKU list from the same
// CSVs that BOMPanel uses (/data/balustrade/*.csv).
//
// Behaviour:
//   - Loads the master SKU list (CSVs) + the user's saved overrides
//     (GET /api/products?calculator_type=balustrade) on mount.
//   - Each row shows the supplier price + an editable "Your cost" input.
//   - "Your sell" is computed live (cost × MARKUP).
//   - Save POSTs one row at a time to /api/products. The hook on the
//     calculator page picks up the override on its next load.
// ─────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Sidebar from '@/components/Sidebar';

const MARKUP = 1.4; // keep in sync with costData.js + useUserCostMap.js

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

// CSV escape: wrap in quotes if value contains comma/quote/newline; double inner quotes
function csvEscape(v) {
  const s = v == null ? '' : String(v);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function buildExportCsv(rows, overrides) {
  const headers = ['SKU', 'Description', 'Category', 'Default Cost', 'Your Cost', 'Your Sell'];
  const lines = [headers.join(',')];
  for (const r of rows) {
    const ov = overrides[r.sku];
    const yourCost = ov ? Number(ov.cost_price) : '';
    const yourSell = yourCost !== '' ? Math.round(yourCost * MARKUP * 100) / 100 : '';
    lines.push([
      csvEscape(r.sku),
      csvEscape(r.description),
      csvEscape(r.category),
      r.defaultCost ? r.defaultCost.toFixed(2) : '',
      yourCost !== '' ? yourCost.toFixed(2) : '',
      yourSell !== '' ? yourSell.toFixed(2) : '',
    ].join(','));
  }
  return lines.join('\n');
}

// Parse a CSV (handles quoted fields with commas/escaped quotes).
// Returns array of objects keyed by header.
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

export default function MyProductsClient({ email }) {
  const [calculator] = useState('balustrade'); // single-calc v1, picker comes later
  const [defaults, setDefaults] = useState([]); // [{sku, description, category, defaultCost, image_url}]
  const [overrides, setOverrides] = useState({}); // { SKU: { cost_price, id, display_name } }
  const [edits, setEdits] = useState({}); // { SKU: '99.99' | '' }
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

      const productsRes = await fetch(`/api/products?calculator_type=${calculator}`);
      const productsData = await productsRes.json();
      const overrideMap = {};
      for (const p of productsData.products || []) {
        overrideMap[String(p.slot_key).toUpperCase()] = p;
      }

      setDefaults(all);
      setOverrides(overrideMap);
      setLoading(false);
      return { defaults: all, overrides: overrideMap };
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

  async function saveOne(row) {
    const raw = (edits[row.sku] ?? '').toString().trim();
    if (raw === '') return; // nothing to save
    const cost = Number(raw);
    if (!Number.isFinite(cost) || cost < 0) {
      setError(`Invalid price for ${row.sku}`);
      return;
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
          cost_price: cost,
          unit: 'each',
          image_url: row.image_url || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setOverrides((prev) => ({ ...prev, [row.sku]: data.product }));
      setEdits((prev) => { const n = { ...prev }; delete n[row.sku]; return n; });
      setSavedSku(row.sku);
      setTimeout(() => setSavedSku((s) => (s === row.sku ? null : s)), 1500);
    } catch (e) {
      setError(`${row.sku}: ${e.message}`);
    }
    setSavingSku(null);
  }

  function handleExport() {
    const csv = buildExportCsv(defaults, overrides);
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

      // Build SKU → default-cost lookup so we can detect "no real change" rows
      const defaultBySku = {};
      for (const r of defaults) defaultBySku[r.sku] = r;

      const toUpsert = [];
      let skipped = 0;
      let invalid = 0;
      let unknown = 0;

      for (const row of parsed) {
        const sku = String(row.SKU || row.sku || '').trim().toUpperCase();
        if (!sku) { invalid++; continue; }

        const yourCostRaw = (row['Your Cost'] ?? row.your_cost ?? '').toString().trim();
        if (yourCostRaw === '') { skipped++; continue; }

        const cost = Number(yourCostRaw);
        if (!Number.isFinite(cost) || cost < 0) { invalid++; continue; }

        const ref = defaultBySku[sku];
        if (!ref) { unknown++; continue; } // SKU not in current catalog

        const existing = overrides[sku];
        if (existing && Math.abs(Number(existing.cost_price) - cost) < 0.005) {
          skipped++; // unchanged
          continue;
        }

        toUpsert.push({
          slot_key: sku,
          cost_price: cost,
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
      setEdits({}); // clear any in-flight edits since data is fresh
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
            Override default supplier pricing for SKUs you buy at custom rates. Sell prices use a {Math.round((MARKUP - 1) * 100)}% markup. Leave blank to keep the default.
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
                      <th style={{ ...headerCell, textAlign: 'right' }}>Default cost</th>
                      <th style={{ ...headerCell, textAlign: 'right', width: 130 }}>Your cost</th>
                      <th style={{ ...headerCell, textAlign: 'right' }}>Your sell</th>
                      <th style={{ ...headerCell, width: 90 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                      const ov = overrides[row.sku];
                      const editVal = edits[row.sku];
                      const displayedCost = editVal !== undefined
                        ? editVal
                        : (ov ? Number(ov.cost_price).toFixed(2) : '');
                      const liveCost = Number(displayedCost);
                      const sell = Number.isFinite(liveCost) && liveCost > 0
                        ? Math.round(liveCost * MARKUP * 100) / 100
                        : 0;
                      const isOverridden = !!ov;
                      const isDirty = editVal !== undefined && editVal !== (ov ? Number(ov.cost_price).toFixed(2) : '');
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
                          <td style={{ padding: '8px 12px', textAlign: 'right', color: '#6b7280', fontVariantNumeric: 'tabular-nums' }}>
                            {money(row.defaultCost)}
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder={row.defaultCost ? row.defaultCost.toFixed(2) : '0.00'}
                              value={displayedCost}
                              onChange={(e) => setEdits((prev) => ({ ...prev, [row.sku]: e.target.value }))}
                              onKeyDown={(e) => { if (e.key === 'Enter') saveOne(row); }}
                              style={{ ...inputStyle, textAlign: 'right' }}
                            />
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: sell > 0 ? '#0891b2' : '#9ca3af', fontVariantNumeric: 'tabular-nums' }}>
                            {money(sell)}
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
