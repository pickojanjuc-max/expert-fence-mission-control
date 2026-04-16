'use client';
import React, { useState, useEffect } from 'react';

/**
 * SaveProjectModal — shared save dialog for all calculators.
 *
 * Props:
 *   show           — boolean, whether modal is visible
 *   onClose        — function, close the modal
 *   onSaved        — function({ projectId, projectName, calculationId }), called after successful save
 *   calculatorType — 'glass' | 'aluminium'
 *   calculatorState— object, the full calculator state to persist
 *   bomSnapshot    — object | null, the BOM result to persist
 *   currentProjectId     — string | null, project this calc is already saved to
 *   currentProjectName   — string, name of the current project
 *   currentCalculationId — string | null, existing calculation row id
 *   label                — string, optional label like "Pool fence"
 */
export default function SaveProjectModal({
  show,
  onClose,
  onSaved,
  calculatorType,
  calculatorState,
  bomSnapshot,
  currentProjectId,
  currentProjectName,
  currentCalculationId,
  label: initialLabel,
}) {
  const [mode, setMode] = useState(currentProjectId ? 'update' : 'new'); // 'new' | 'existing' | 'update'
  const [projectName, setProjectName] = useState(currentProjectName || '');
  const [label, setLabel] = useState(initialLabel || '');
  const [existingProjects, setExistingProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [clientMode, setClientMode] = useState('new'); // 'new' | 'existing' | 'none'
  const [newClientData, setNewClientData] = useState({ name: '', company: '', email: '', phone: '' });

  // Fetch user's projects and clients when opening in "existing" mode
  useEffect(() => {
    if (!show) return;
    // Reset state
    setMode(currentProjectId ? 'update' : 'new');
    setProjectName(currentProjectName || '');
    setLabel(initialLabel || '');
    setError('');
    setSelectedProjectId('');
    setSelectedClientId('');
    setClientMode('new');
    setNewClientData({ name: '', company: '', email: '', phone: '' });

    fetch('/api/projects')
      .then((r) => r.json())
      .then((data) => {
        setExistingProjects(data.projects || []);
      })
      .catch(() => {});

    fetch('/api/clients')
      .then((r) => r.json())
      .then((data) => {
        setClients(data.clients || []);
      })
      .catch(() => {});
  }, [show, currentProjectId, currentProjectName, initialLabel]);

  if (!show) return null;

  async function handleCreateClient() {
    if (!newClientData.name.trim()) {
      setError('Client name is required');
      return;
    }
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newClientData),
      });
      const data = await res.json();
      if (data.client) {
        setClients([...clients, data.client]);
        setSelectedClientId(data.client.id);
        setShowNewClient(false);
        setNewClientData({ name: '', company: '', email: '', phone: '' });
        setError('');
      } else {
        setError(data.error || 'Failed to create client');
      }
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError('');

    try {
      const payload = {
        calculator_type: calculatorType,
        calculator_state: calculatorState,
        bom_snapshot: bomSnapshot || null,
        label: label.trim(),
      };

      if (mode === 'update' && currentProjectId) {
        // Update existing calculation in existing project
        payload.project_id = currentProjectId;
        payload.calculation_id = currentCalculationId || undefined;
        payload.name = projectName.trim() || currentProjectName;
      } else if (mode === 'existing' && selectedProjectId) {
        // Add new calculation to existing project
        payload.project_id = selectedProjectId;
      } else if (mode === 'new') {
        // Create new project + calculation
        if (!projectName.trim()) {
          setError('Enter a project name');
          setSaving(false);
          return;
        }
        payload.name = projectName.trim();

        // Handle client capture based on mode
        if (clientMode === 'new') {
          if (!newClientData.name.trim()) {
            setError('Client name is required (or switch to existing / no client)');
            setSaving(false);
            return;
          }
          const cRes = await fetch('/api/clients', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newClientData),
          });
          const cData = await cRes.json();
          if (!cData.client) {
            setError(cData.error || 'Failed to create client');
            setSaving(false);
            return;
          }
          payload.client_id = cData.client.id;
        } else if (clientMode === 'existing' && selectedClientId) {
          payload.client_id = selectedClientId;
        }
      } else {
        setError('Select a project or create a new one');
        setSaving(false);
        return;
      }

      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.project) {
        onSaved({
          projectId: data.project.id,
          projectName: data.project.name,
          calculationId: data.calculation?.id || null,
        });
        onClose();
      } else {
        setError(data.error || 'Save failed');
      }
    } catch (e) {
      setError(e.message);
    }
    setSaving(false);
  }

  const s = styles; // alias

  return (
    <div onClick={onClose} style={s.overlay}>
      <div onClick={(e) => e.stopPropagation()} style={s.modal}>
        <h3 style={s.title}>
          {currentProjectId ? 'Save Calculation' : 'Save to Project'}
        </h3>

        {/* Mode tabs — only show if not already attached to a project */}
        {!currentProjectId && (
          <div style={s.tabs}>
            <button
              onClick={() => setMode('new')}
              style={mode === 'new' ? { ...s.tab, ...s.tabActive } : s.tab}
            >
              New Project
            </button>
            {existingProjects.length > 0 && (
              <button
                onClick={() => setMode('existing')}
                style={mode === 'existing' ? { ...s.tab, ...s.tabActive } : s.tab}
              >
                Existing Project
              </button>
            )}
          </div>
        )}

        {/* New project name */}
        {(mode === 'new' || mode === 'update') && (
          <div style={{ marginBottom: '12px' }}>
            <label style={s.label}>Project name</label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="e.g. Johnson Pool Area"
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
              style={s.input}
            />
          </div>
        )}

        {/* Existing project picker */}
        {mode === 'existing' && (
          <div style={{ marginBottom: '12px' }}>
            <label style={s.label}>Choose project</label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              style={s.input}
            >
              <option value="">— Select a project —</option>
              {existingProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.calculations?.length ? ` (${p.calculations.length} calc${p.calculations.length > 1 ? 's' : ''})` : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Client capture — only for new projects */}
        {mode === 'new' && (
          <div style={{ marginBottom: '12px' }}>
            <label style={s.label}>Client</label>
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              {[
                { v: 'new', label: 'New client' },
                { v: 'existing', label: 'Existing client' },
                { v: 'none', label: 'No client' },
              ].map((o) => (
                <button
                  key={o.v}
                  type="button"
                  onClick={() => setClientMode(o.v)}
                  style={{
                    flex: 1,
                    padding: '6px 10px',
                    fontSize: 12,
                    fontWeight: clientMode === o.v ? 600 : 500,
                    color: clientMode === o.v ? '#2563eb' : '#6b7280',
                    backgroundColor: clientMode === o.v ? '#dbeafe' : '#fff',
                    border: '1px solid ' + (clientMode === o.v ? '#93c5fd' : '#e5e7eb'),
                    borderRadius: 6,
                    cursor: 'pointer',
                  }}
                >
                  {o.label}
                </button>
              ))}
            </div>

            {clientMode === 'new' && (
              <>
                <input
                  type="text"
                  placeholder="Client name *"
                  value={newClientData.name}
                  onChange={(e) => setNewClientData({ ...newClientData, name: e.target.value })}
                  style={s.input}
                />
                <input
                  type="text"
                  placeholder="Company (optional)"
                  value={newClientData.company}
                  onChange={(e) => setNewClientData({ ...newClientData, company: e.target.value })}
                  style={s.input}
                />
                <input
                  type="tel"
                  placeholder="Phone"
                  value={newClientData.phone}
                  onChange={(e) => setNewClientData({ ...newClientData, phone: e.target.value })}
                  style={s.input}
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={newClientData.email}
                  onChange={(e) => setNewClientData({ ...newClientData, email: e.target.value })}
                  style={s.input}
                />
              </>
            )}

            {clientMode === 'existing' && (
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                style={s.input}
              >
                <option value="">— Pick a client —</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}{c.company ? ` — ${c.company}` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Calculation label */}
        <div style={{ marginBottom: '16px' }}>
          <label style={s.label}>Label (optional)</label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Front boundary, Pool fence"
            style={s.input}
          />
        </div>

        {error && <div style={s.error}>{error}</div>}

        <div style={s.actions}>
          <button onClick={onClose} style={s.cancelBtn}>Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={saving ? { ...s.saveBtn, opacity: 0.6, cursor: 'not-allowed' } : s.saveBtn}
          >
            {saving ? 'Saving...' : currentProjectId ? 'Save' : mode === 'existing' ? 'Add to Project' : 'Create & Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
  },
  modal: {
    backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
    padding: '20px', width: '100%', maxWidth: '420px',
  },
  title: { fontSize: '16px', fontWeight: 700, color: '#111827', marginTop: 0, marginBottom: '16px' },
  tabs: { display: 'flex', gap: '4px', marginBottom: '16px', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px' },
  tab: {
    padding: '6px 12px', fontSize: '13px', fontWeight: 500, background: 'none',
    border: '1px solid transparent', borderRadius: '6px', cursor: 'pointer', color: '#6b7280',
  },
  tabActive: { backgroundColor: '#f0fdf4', border: '1px solid #10b981', color: '#059669', fontWeight: 600 },
  label: { fontSize: '12px', fontWeight: 500, color: '#6b7280', display: 'block', marginBottom: '4px' },
  input: {
    width: '100%', border: '1px solid #d1d5db', borderRadius: '8px',
    padding: '8px 12px', fontSize: '14px', boxSizing: 'border-box',
  },
  error: { color: '#dc2626', fontSize: '13px', marginBottom: '12px' },
  actions: { display: 'flex', gap: '8px', justifyContent: 'flex-end' },
  cancelBtn: { padding: '6px 12px', fontSize: '12px', fontWeight: 500, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer' },
  saveBtn: {
    padding: '6px 16px', fontSize: '12px', fontWeight: 600, color: '#fff',
    backgroundColor: '#10b981', border: 'none', borderRadius: '6px', cursor: 'pointer',
  },
};
