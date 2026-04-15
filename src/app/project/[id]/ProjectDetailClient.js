'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// ── Helpers ────────────────────────────────────────────────────────────
function money(v) { return '$' + Number(v || 0).toFixed(2); }

function statusColor(s) {
  const map = {
    draft: { bg: '#f3f4f6', text: '#6b7280' },
    quoted: { bg: '#dbeafe', text: '#2563eb' },
    approved: { bg: '#dcfce7', text: '#16a34a' },
    ordered: { bg: '#fef3c7', text: '#d97706' },
    scheduled: { bg: '#e0e7ff', text: '#4f46e5' },
    complete: { bg: '#d1fae5', text: '#059669' },
  };
  return map[s] || map.draft;
}

const calcTypeLabels = { glass: 'Glass Pool Fencing', aluminium: 'Aluminium Fencing' };
const calcTypeIcons = { glass: '🔷', aluminium: '🔶' };

// ── Consolidate BOMs across all calculations ───────────────────────
function consolidateBoms(calculations) {
  const itemMap = {};
  let materialTotal = 0;

  calculations.forEach((calc) => {
    const snap = calc.bom_snapshot;
    if (!snap) return;

    // Glass calculator stores { consolidated, unsolved }
    // Aluminium calculator stores { bom, summary }
    const items = snap.consolidated || snap.bom || [];

    items.forEach((item) => {
      // Normalise field names between calculators
      const sku = item.SKU || item.sku || item.code || '';
      const name = item.Item || item.item || item.description || item.name || sku;
      const qty = Number(item.Qty || item.qty || item.quantity || 0);
      const unitPrice = Number(item['Unit Sell (ex GST)'] || item.unit_price || item.unitPrice || 0);
      const linePrice = Number(item['Line Sell (ex GST)'] || item.line_price || item.linePrice || unitPrice * qty);

      const key = sku || name;
      if (!key) return;

      if (itemMap[key]) {
        itemMap[key].qty += qty;
        itemMap[key].linePrice += linePrice;
      } else {
        itemMap[key] = { sku, name, qty, unitPrice, linePrice };
      }
      materialTotal += linePrice;
    });
  });

  return {
    items: Object.values(itemMap).sort((a, b) => a.name.localeCompare(b.name)),
    materialTotal,
  };
}


export default function ProjectDetailClient({ projectId }) {
  const router = useRouter();

  // ── Project data ────────────────────────────────────────────────────
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);

  // ── Quote builder state ─────────────────────────────────────────────
  const [labourHours, setLabourHours] = useState(0);
  const [hourlyRate, setHourlyRate] = useState(0);
  const [consumables, setConsumables] = useState([]);
  const [markupPercent, setMarkupPercent] = useState(0);
  const [notes, setNotes] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  // ── Load project ────────────────────────────────────────────────────
  const loadProject = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}`);
      const data = await res.json();
      if (data.project) {
        setProject(data.project);
        setLabourHours(Number(data.project.labour_hours || 0));
        setHourlyRate(Number(data.project.hourly_rate || 0));
        setConsumables(data.project.consumables || []);
        setMarkupPercent(Number(data.project.markup_percent || 0));
        setNotes(data.project.notes || '');
        setClientName(data.project.client_name || '');
        setClientEmail(data.project.client_email || '');
        setClientPhone(data.project.client_phone || '');
      }
    } catch (e) {
      console.error('Load project error:', e);
    }
    setLoading(false);
  }, [projectId]);

  useEffect(() => { loadProject(); }, [loadProject]);

  // ── Calculations & consolidated BOM ─────────────────────────────────
  const calculations = project?.calculations || [];
  const { items: bomItems, materialTotal } = consolidateBoms(calculations);

  // ── Quote totals ────────────────────────────────────────────────────
  const labourTotal = labourHours * hourlyRate;
  const consumablesTotal = consumables.reduce((s, c) => s + Number(c.cost || 0), 0);
  const subtotal = materialTotal + labourTotal + consumablesTotal;
  const markupAmount = subtotal * (markupPercent / 100);
  const totalExGst = subtotal + markupAmount;
  const gst = totalExGst * 0.1;
  const totalIncGst = totalExGst + gst;

  // ── Save project quote data ─────────────────────────────────────────
  async function handleSave() {
    setSaving(true);
    setSaveMsg('');
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          name: project.name,
          labour_hours: labourHours,
          hourly_rate: hourlyRate,
          consumables,
          markup_percent: markupPercent,
          notes,
          client_name: clientName,
          client_email: clientEmail,
          client_phone: clientPhone,
        }),
      });
      const data = await res.json();
      if (data.project) {
        setSaveMsg('Saved');
        setTimeout(() => setSaveMsg(''), 2000);
      }
    } catch (e) {
      setSaveMsg('Error: ' + e.message);
    }
    setSaving(false);
  }

  // ── Consumable helpers ──────────────────────────────────────────────
  function addConsumable() {
    setConsumables((prev) => [...prev, { name: '', cost: 0 }]);
  }
  function updateConsumable(idx, updates) {
    setConsumables((prev) => prev.map((c, i) => (i === idx ? { ...c, ...updates } : c)));
  }
  function removeConsumable(idx) {
    setConsumables((prev) => prev.filter((_, i) => i !== idx));
  }

  // ── Status update ───────────────────────────────────────────────────
  async function updateStatus(newStatus) {
    try {
      await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId, status: newStatus }),
      });
      setProject((prev) => ({ ...prev, status: newStatus }));
    } catch {}
  }

  // ── Generate Quote PDF ──────────────────────────────────────────────
  async function generateQuotePdf() {
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const left = 40;
      const right = 555;
      let y = 42;

      // Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.text('Quote', left, y);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Date: ${new Date().toLocaleDateString('en-AU')}`, right, y, { align: 'right' });
      y += 20;
      doc.text(`Project: ${project.name}`, left, y);
      y += 16;

      if (clientName) { doc.text(`Client: ${clientName}`, left, y); y += 14; }
      if (clientEmail) { doc.text(`Email: ${clientEmail}`, left, y); y += 14; }
      if (clientPhone) { doc.text(`Phone: ${clientPhone}`, left, y); y += 14; }
      y += 10;

      // Calculations included
      doc.setFont('helvetica', 'bold');
      doc.text('Scope', left, y);
      y += 14;
      doc.setFont('helvetica', 'normal');
      calculations.forEach((c) => {
        const label = c.label || calcTypeLabels[c.calculator_type] || c.calculator_type;
        doc.text(`• ${label}`, left + 10, y);
        y += 14;
      });
      y += 8;

      // Materials table
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('Materials', left, y);
      y += 14;
      doc.setFontSize(9);
      doc.text('Item', left, y);
      doc.text('SKU', 260, y);
      doc.text('Qty', 380, y, { align: 'right' });
      doc.text('Unit (ex)', 460, y, { align: 'right' });
      doc.text('Line (ex)', right, y, { align: 'right' });
      y += 6;
      doc.line(left, y, right, y);
      y += 12;
      doc.setFont('helvetica', 'normal');

      bomItems.forEach((item) => {
        if (y > 760) { doc.addPage(); y = 42; }
        doc.text(String(item.name).substring(0, 40), left, y, { maxWidth: 210 });
        doc.text(String(item.sku || ''), 260, y, { maxWidth: 100 });
        doc.text(String(item.qty), 380, y, { align: 'right' });
        doc.text(money(item.unitPrice), 460, y, { align: 'right' });
        doc.text(money(item.linePrice), right, y, { align: 'right' });
        y += 14;
      });

      y += 4;
      doc.line(left, y, right, y);
      y += 16;

      // Summary
      doc.setFontSize(10);
      const summaryLeft = 340;
      doc.text('Materials:', summaryLeft, y);
      doc.text(money(materialTotal), right, y, { align: 'right' });
      y += 16;

      if (labourTotal > 0) {
        doc.text(`Labour (${labourHours}h × ${money(hourlyRate)}/h):`, summaryLeft, y);
        doc.text(money(labourTotal), right, y, { align: 'right' });
        y += 16;
      }

      if (consumablesTotal > 0) {
        doc.text('Consumables:', summaryLeft, y);
        doc.text(money(consumablesTotal), right, y, { align: 'right' });
        y += 16;
      }

      if (markupPercent > 0) {
        doc.text(`Markup (${markupPercent}%):`, summaryLeft, y);
        doc.text(money(markupAmount), right, y, { align: 'right' });
        y += 16;
      }

      doc.line(summaryLeft, y, right, y);
      y += 14;
      doc.setFont('helvetica', 'bold');
      doc.text('Total (ex GST):', summaryLeft, y);
      doc.text(money(totalExGst), right, y, { align: 'right' });
      y += 16;
      doc.text('GST:', summaryLeft, y);
      doc.text(money(gst), right, y, { align: 'right' });
      y += 16;
      doc.setFontSize(12);
      doc.text('Total (inc GST):', summaryLeft, y);
      doc.text(money(totalIncGst), right, y, { align: 'right' });
      y += 20;

      if (notes) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text('Notes:', left, y);
        y += 12;
        const splitNotes = doc.splitTextToSize(notes, right - left);
        doc.text(splitNotes, left, y);
      }

      const safeName = (project.name || 'quote').replace(/[^a-z0-9\-_]+/gi, '_');
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      if (isMobile) {
        window.open(url, '_blank');
      } else {
        const a = document.createElement('a');
        a.href = url;
        a.download = `quote_${safeName}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      alert('PDF error: ' + e.message);
    }
  }

  // ── Generate Purchase Order PDF ─────────────────────────────────────
  async function generatePurchaseOrderPdf() {
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const left = 40;
      const right = 555;
      let y = 42;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.text('Purchase Order', left, y);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Date: ${new Date().toLocaleDateString('en-AU')}`, right, y, { align: 'right' });
      y += 20;
      doc.text(`Project: ${project.name}`, left, y);
      y += 20;

      // Table header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('SKU', left, y);
      doc.text('Item', 140, y);
      doc.text('Qty', right, y, { align: 'right' });
      y += 6;
      doc.line(left, y, right, y);
      y += 12;
      doc.setFont('helvetica', 'normal');

      bomItems.forEach((item) => {
        if (y > 760) { doc.addPage(); y = 42; }
        doc.text(String(item.sku || ''), left, y, { maxWidth: 90 });
        doc.text(String(item.name).substring(0, 50), 140, y, { maxWidth: 350 });
        doc.text(String(item.qty), right, y, { align: 'right' });
        y += 14;
      });

      y += 6;
      doc.line(left, y, right, y);
      y += 14;
      doc.setFont('helvetica', 'bold');
      doc.text(`Total line items: ${bomItems.length}`, left, y);

      if (notes) {
        y += 20;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text('Notes:', left, y);
        y += 12;
        const splitNotes = doc.splitTextToSize(notes, right - left);
        doc.text(splitNotes, left, y);
      }

      const safeName = (project.name || 'po').replace(/[^a-z0-9\-_]+/gi, '_');
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      if (isMobile) {
        window.open(url, '_blank');
      } else {
        const a = document.createElement('a');
        a.href = url;
        a.download = `purchase_order_${safeName}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      alert('PDF error: ' + e.message);
    }
  }

  // ── Loading / error states ──────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af', fontFamily: 'Inter, system-ui, sans-serif' }}>
        Loading project...
      </div>
    );
  }

  if (!project) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'Inter, system-ui, sans-serif' }}>
        <p style={{ color: '#dc2626' }}>Project not found</p>
        <a href="/dashboard" style={{ color: '#2563eb' }}>← Back to Dashboard</a>
      </div>
    );
  }

  const sc = statusColor(project.status);
  const statuses = ['draft', 'quoted', 'approved', 'ordered', 'scheduled', 'complete'];

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif', backgroundColor: '#f9fafb', minHeight: '100vh' }}>
      {/* Top bar */}
      <div style={{ backgroundColor: '#fff', borderBottom: '1px solid #e5e7eb', padding: '12px 16px' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <a href="/dashboard" style={{ fontSize: '14px', color: '#2563eb', textDecoration: 'none', fontWeight: 500 }}>← Dashboard</a>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {saveMsg && <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 500 }}>{saveMsg}</span>}
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                padding: '6px 14px', fontSize: '13px', fontWeight: 600, color: '#fff',
                backgroundColor: '#10b981', border: 'none', borderRadius: '6px',
                cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '20px 16px' }}>
        {/* Project header */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: '#111827' }}>{project.name}</h1>
            <span style={{
              fontSize: '11px', fontWeight: 600, padding: '3px 10px',
              borderRadius: '999px', backgroundColor: sc.bg, color: sc.text,
            }}>
              {project.status}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {statuses.map((s) => (
              <button
                key={s}
                onClick={() => updateStatus(s)}
                style={{
                  padding: '3px 8px', fontSize: '11px', borderRadius: '4px', cursor: 'pointer',
                  border: project.status === s ? '1px solid #2563eb' : '1px solid #e5e7eb',
                  backgroundColor: project.status === s ? '#eff6ff' : '#fff',
                  color: project.status === s ? '#2563eb' : '#6b7280',
                  fontWeight: project.status === s ? 600 : 400,
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Two-column layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px', alignItems: 'start' }}>
          {/* Left column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Calculations */}
            <div style={cardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h2 style={sectionTitle}>Calculations</h2>
              </div>
              {calculations.length === 0 ? (
                <p style={{ fontSize: '13px', color: '#9ca3af', margin: 0 }}>No calculations yet. Open a calculator and save to this project.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {calculations.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => {
                        const path = c.calculator_type === 'glass' ? '/calculator/glass' : '/calculator/aluminium';
                        router.push(`${path}?calc=${c.id}`);
                      }}
                      style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '10px 12px', borderRadius: '6px', border: '1px solid #f3f4f6',
                        cursor: 'pointer', transition: 'background-color 0.1s',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f9fafb'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>{calcTypeIcons[c.calculator_type] || '📐'}</span>
                        <span style={{ fontSize: '13px', fontWeight: 500, color: '#374151' }}>
                          {c.label || calcTypeLabels[c.calculator_type] || c.calculator_type}
                        </span>
                      </div>
                      <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                        {new Date(c.updated_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} →
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Consolidated BOM */}
            <div style={cardStyle}>
              <h2 style={sectionTitle}>Consolidated Bill of Materials</h2>
              {bomItems.length === 0 ? (
                <p style={{ fontSize: '13px', color: '#9ca3af', margin: 0 }}>No BOM data yet.</p>
              ) : (
                <>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <th style={thStyle}>Item</th>
                        <th style={{ ...thStyle, width: '80px' }}>SKU</th>
                        <th style={{ ...thStyle, textAlign: 'right', width: '50px' }}>Qty</th>
                        <th style={{ ...thStyle, textAlign: 'right', width: '80px' }}>Unit (ex)</th>
                        <th style={{ ...thStyle, textAlign: 'right', width: '80px' }}>Line (ex)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bomItems.map((item, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <td style={tdStyle}>{item.name}</td>
                          <td style={{ ...tdStyle, color: '#9ca3af', fontSize: '11px' }}>{item.sku}</td>
                          <td style={{ ...tdStyle, textAlign: 'right' }}>{item.qty}</td>
                          <td style={{ ...tdStyle, textAlign: 'right' }}>{money(item.unitPrice)}</td>
                          <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>{money(item.linePrice)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px', fontSize: '13px', fontWeight: 600 }}>
                    Materials total: {money(materialTotal)}
                  </div>
                </>
              )}
            </div>

            {/* Notes */}
            <div style={cardStyle}>
              <h2 style={sectionTitle}>Notes</h2>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Job notes, site access details, special requirements..."
                rows={3}
                style={{
                  width: '100%', border: '1px solid #e5e7eb', borderRadius: '6px',
                  padding: '8px 10px', fontSize: '13px', resize: 'vertical',
                  fontFamily: 'inherit', boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* Right column — Quote builder + actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Client details */}
            <div style={cardStyle}>
              <h2 style={sectionTitle}>Client</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <input type="text" placeholder="Client name" value={clientName}
                  onChange={(e) => setClientName(e.target.value)} style={inputStyle} />
                <input type="email" placeholder="Email" value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)} style={inputStyle} />
                <input type="tel" placeholder="Phone" value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)} style={inputStyle} />
              </div>
            </div>

            {/* Labour */}
            <div style={cardStyle}>
              <h2 style={sectionTitle}>Labour</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={labelStyle}>Hours</label>
                  <input type="number" min="0" step="0.5" value={labourHours}
                    onChange={(e) => setLabourHours(Number(e.target.value))} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Rate ($/hr)</label>
                  <input type="number" min="0" step="5" value={hourlyRate}
                    onChange={(e) => setHourlyRate(Number(e.target.value))} style={inputStyle} />
                </div>
              </div>
              {labourTotal > 0 && (
                <div style={{ fontSize: '13px', color: '#374151', marginTop: '6px', textAlign: 'right' }}>
                  = {money(labourTotal)}
                </div>
              )}
            </div>

            {/* Consumables */}
            <div style={cardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h2 style={{ ...sectionTitle, marginBottom: 0 }}>Consumables</h2>
                <button onClick={addConsumable} style={smallBtnStyle}>+ Add</button>
              </div>
              {consumables.length === 0 ? (
                <p style={{ fontSize: '12px', color: '#9ca3af', margin: 0 }}>None added</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {consumables.map((c, i) => (
                    <div key={i} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <input type="text" placeholder="Item" value={c.name}
                        onChange={(e) => updateConsumable(i, { name: e.target.value })}
                        style={{ ...inputStyle, flex: 1 }} />
                      <input type="number" min="0" step="1" placeholder="$" value={c.cost}
                        onChange={(e) => updateConsumable(i, { cost: Number(e.target.value) })}
                        style={{ ...inputStyle, width: '70px' }} />
                      <button onClick={() => removeConsumable(i)}
                        style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '14px', padding: '2px' }}>
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {consumablesTotal > 0 && (
                <div style={{ fontSize: '13px', color: '#374151', marginTop: '6px', textAlign: 'right' }}>
                  = {money(consumablesTotal)}
                </div>
              )}
            </div>

            {/* Markup */}
            <div style={cardStyle}>
              <h2 style={sectionTitle}>Markup</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input type="number" min="0" max="100" step="1" value={markupPercent}
                  onChange={(e) => setMarkupPercent(Number(e.target.value))} style={{ ...inputStyle, width: '70px' }} />
                <span style={{ fontSize: '13px', color: '#6b7280' }}>%</span>
              </div>
            </div>

            {/* Quote summary */}
            <div style={{ ...cardStyle, backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
              <h2 style={{ ...sectionTitle, color: '#166534' }}>Quote Summary</h2>
              <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={summaryRow}><span>Materials</span><span>{money(materialTotal)}</span></div>
                {labourTotal > 0 && <div style={summaryRow}><span>Labour</span><span>{money(labourTotal)}</span></div>}
                {consumablesTotal > 0 && <div style={summaryRow}><span>Consumables</span><span>{money(consumablesTotal)}</span></div>}
                {markupAmount > 0 && <div style={summaryRow}><span>Markup ({markupPercent}%)</span><span>{money(markupAmount)}</span></div>}
                <div style={{ ...summaryRow, borderTop: '1px solid #86efac', paddingTop: '6px', marginTop: '4px', fontWeight: 600 }}>
                  <span>Total (ex GST)</span><span>{money(totalExGst)}</span>
                </div>
                <div style={summaryRow}><span>GST</span><span>{money(gst)}</span></div>
                <div style={{ ...summaryRow, fontWeight: 700, fontSize: '15px', color: '#166534' }}>
                  <span>Total (inc GST)</span><span>{money(totalIncGst)}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button onClick={generateQuotePdf} style={actionBtnStyle}>
                📄 Generate Client Quote PDF
              </button>
              <button onClick={generatePurchaseOrderPdf} style={{ ...actionBtnStyle, backgroundColor: '#1e3a5f' }}>
                📋 Generate Purchase Order PDF
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────
const cardStyle = {
  backgroundColor: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: '10px',
  padding: '16px',
};

const sectionTitle = {
  fontSize: '14px',
  fontWeight: 700,
  color: '#111827',
  margin: '0 0 10px 0',
};

const thStyle = {
  textAlign: 'left',
  padding: '6px 4px',
  fontSize: '11px',
  fontWeight: 600,
  color: '#6b7280',
  textTransform: 'uppercase',
  letterSpacing: '0.03em',
};

const tdStyle = {
  padding: '6px 4px',
  color: '#374151',
};

const inputStyle = {
  border: '1px solid #e5e7eb',
  borderRadius: '6px',
  padding: '6px 10px',
  fontSize: '13px',
  width: '100%',
  boxSizing: 'border-box',
};

const labelStyle = {
  fontSize: '11px',
  fontWeight: 500,
  color: '#6b7280',
  display: 'block',
  marginBottom: '3px',
};

const smallBtnStyle = {
  padding: '3px 8px',
  fontSize: '11px',
  fontWeight: 600,
  color: '#2563eb',
  backgroundColor: '#eff6ff',
  border: '1px solid #bfdbfe',
  borderRadius: '4px',
  cursor: 'pointer',
};

const summaryRow = {
  display: 'flex',
  justifyContent: 'space-between',
};

const actionBtnStyle = {
  width: '100%',
  padding: '10px',
  fontSize: '13px',
  fontWeight: 600,
  color: '#fff',
  backgroundColor: '#111827',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  transition: 'opacity 0.15s',
};
