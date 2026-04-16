'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Sidebar from '@/components/Sidebar';

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

export default function ProjectsClient({ email }) {
  const router = useRouter();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectClientId, setNewProjectClientId] = useState('');
  const [clientMode, setClientMode] = useState('new'); // 'new' | 'existing' | 'none'
  const [newClientName, setNewClientName] = useState('');
  const [newClientCompany, setNewClientCompany] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [clients, setClients] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadProjects();
    loadClients();
  }, []);

  const loadProjects = async () => {
    try {
      const res = await fetch('/api/projects');
      const data = await res.json();
      setProjects(data.projects || []);
    } catch (e) {
      console.error('Load projects error:', e);
    }
    setLoading(false);
  };

  const loadClients = async () => {
    try {
      const res = await fetch('/api/clients');
      const data = await res.json();
      setClients(data.clients || []);
    } catch (e) {
      console.error('Load clients error:', e);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleNewProject = async () => {
    if (!newProjectName.trim()) {
      setError('Project name is required');
      return;
    }
    if (clientMode === 'new' && !newClientName.trim()) {
      setError('Client name is required (or switch to existing client / no client)');
      return;
    }
    setSaving(true);
    setError('');
    try {
      let clientIdToUse = null;
      if (clientMode === 'existing') {
        clientIdToUse = newProjectClientId || null;
      } else if (clientMode === 'new') {
        // Create the client first
        const cRes = await fetch('/api/clients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: newClientName.trim(),
            company: newClientCompany.trim(),
            phone: newClientPhone.trim(),
            email: newClientEmail.trim(),
          }),
        });
        const cData = await cRes.json();
        if (!cData.client) {
          setError(cData.error || 'Failed to create client');
          setSaving(false);
          return;
        }
        clientIdToUse = cData.client.id;
      }

      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProjectName.trim(),
          client_id: clientIdToUse,
        }),
      });
      const data = await res.json();
      if (data.project) {
        router.push(`/project/${data.project.id}`);
      } else {
        setError(data.error || 'Failed to create project');
      }
    } catch (e) {
      setError(e.message);
    }
    setSaving(false);
  };

  const handleDeleteProject = async (projectId) => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, { method: 'DELETE' });
      if (res.ok) {
        setProjects(projects.filter((p) => p.id !== projectId));
        setDeleteConfirm(null);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to delete project');
      }
    } catch (e) {
      setError(e.message);
    }
    setDeleting(false);
  };

  const filterTabsStyle = {
    display: 'flex',
    gap: '8px',
    marginBottom: '24px',
    flexWrap: 'wrap',
  };

  const filterTabStyle = (isActive) => ({
    padding: '6px 12px',
    fontSize: '13px',
    fontWeight: isActive ? '600' : '500',
    borderRadius: '6px',
    border: '1px solid #e5e7eb',
    backgroundColor: isActive ? '#dbeafe' : '#fff',
    color: isActive ? '#2563eb' : '#6b7280',
    cursor: 'pointer',
    transition: 'all 0.15s',
  });

  const cardStyle = {
    backgroundColor: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '12px',
    cursor: 'pointer',
    transition: 'all 0.15s',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  };

  const formStyle = {
    backgroundColor: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '24px',
  };

  const inputStyle = {
    width: '100%',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    padding: '8px 12px',
    fontSize: '14px',
    marginBottom: '12px',
    boxSizing: 'border-box',
  };

  const buttonStyle = {
    backgroundColor: '#2563eb',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  };

  const emptyStateStyle = {
    backgroundColor: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '40px',
    textAlign: 'center',
    color: '#9ca3af',
  };

  const deleteIconStyle = {
    background: 'none',
    border: 'none',
    color: '#dc2626',
    cursor: 'pointer',
    fontSize: '16px',
    padding: '4px 8px',
  };

  const filteredProjects = statusFilter === 'all'
    ? projects
    : projects.filter((p) => p.status === statusFilter);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <style>{`
        @media (max-width: 768px) {
          .ef-main { padding: 70px 16px 24px !important; }
        }
      `}</style>

      <Sidebar email={email} activePage="projects" />

      {/* Main content */}
      <div style={{ flex: 1, backgroundColor: '#f9fafb', overflowY: 'auto' }} className="ef-main">
        <div style={{ padding: '24px 32px', maxWidth: '900px', margin: '0 auto', width: '100%' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#111827', margin: '0 0 8px 0' }}>
            Projects
          </h1>

          {/* Sub-tabs */}
          <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #e5e7eb', marginBottom: '20px' }}>
            <a href="/projects" style={{ padding: '10px 18px', fontSize: 14, fontWeight: 600, color: '#111827', borderBottom: '2px solid #2563eb', textDecoration: 'none' }}>
              Jobs
            </a>
            <a href="/clients" style={{ padding: '10px 18px', fontSize: 14, fontWeight: 500, color: '#6b7280', borderBottom: '2px solid transparent', textDecoration: 'none' }}>
              Clients
            </a>
            <a href="/schedule" style={{ padding: '10px 18px', fontSize: 14, fontWeight: 500, color: '#6b7280', borderBottom: '2px solid transparent', textDecoration: 'none' }}>
              Schedule
            </a>
          </div>

          {/* Top action bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ fontSize: 14, color: '#6b7280' }}>
              Every job starts as a project. Create one, capture the client, then schedule work and link calculator results.
            </div>
            {!showNewForm && (
              <button
                onClick={() => setShowNewForm(true)}
                style={{ ...buttonStyle, whiteSpace: 'nowrap' }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#1d4ed8'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#2563eb'}
              >
                + New Project
              </button>
            )}
          </div>

          {/* New project form */}
          {showNewForm && (
            <div style={formStyle}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', marginTop: 0, marginBottom: '16px' }}>
                New Project
              </h3>
              <input
                type="text"
                placeholder="Project name * (e.g. 'Smith residence — glass pool fence')"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                style={inputStyle}
                autoFocus
              />

              {/* Client mode switcher */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 10, fontSize: 12 }}>
                {[
                  { v: 'new', label: 'New client' },
                  { v: 'existing', label: 'Existing client' },
                  { v: 'none', label: 'No client yet' },
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
                  <input type="text" placeholder="Client name *" value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)} style={inputStyle} />
                  <input type="text" placeholder="Company (optional)" value={newClientCompany}
                    onChange={(e) => setNewClientCompany(e.target.value)} style={inputStyle} />
                  <input type="text" placeholder="Phone" value={newClientPhone}
                    onChange={(e) => setNewClientPhone(e.target.value)} style={inputStyle} />
                  <input type="email" placeholder="Email" value={newClientEmail}
                    onChange={(e) => setNewClientEmail(e.target.value)} style={inputStyle} />
                </>
              )}

              {clientMode === 'existing' && (
                <select
                  value={newProjectClientId}
                  onChange={(e) => setNewProjectClientId(e.target.value)}
                  style={inputStyle}
                >
                  <option value="">— Pick a client —</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}{c.company ? ` — ${c.company}` : ''}</option>
                  ))}
                </select>
              )}

              {error && <div style={{ color: '#dc2626', fontSize: '13px', marginBottom: '12px' }}>{error}</div>}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleNewProject}
                  disabled={saving}
                  style={{
                    ...buttonStyle,
                    flex: 1,
                    opacity: saving ? 0.6 : 1,
                    cursor: saving ? 'not-allowed' : 'pointer',
                  }}
                >
                  {saving ? 'Creating...' : 'Create Project'}
                </button>
                <button
                  onClick={() => {
                    setShowNewForm(false);
                    setNewProjectName('');
                    setNewProjectClientId('');
                    setNewClientName('');
                    setNewClientCompany('');
                    setNewClientPhone('');
                    setNewClientEmail('');
                    setClientMode('new');
                    setError('');
                  }}
                  style={{
                    ...buttonStyle,
                    backgroundColor: '#6b7280',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Status filter tabs */}
          <div style={filterTabsStyle}>
            {['all', 'draft', 'quoted', 'approved', 'ordered', 'scheduled', 'complete'].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                style={filterTabStyle(statusFilter === s)}
              >
                {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>

          {/* Projects list */}
          {loading ? (
            <p style={{ fontSize: '14px', color: '#9ca3af' }}>Loading projects...</p>
          ) : filteredProjects.length === 0 ? (
            <div style={emptyStateStyle}>
              <p style={{ margin: 0, fontSize: '14px' }}>
                {statusFilter === 'all'
                  ? 'No projects yet. Start by running a calculator and saving your first project.'
                  : `No ${statusFilter} projects.`}
              </p>
            </div>
          ) : (
            <div>
              {filteredProjects.map((p) => {
                const sc = statusColor(p.status);
                return (
                  <div
                    key={p.id}
                    style={cardStyle}
                    onClick={() => router.push(`/project/${p.id}`)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#3b82f6';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e5e7eb';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '15px', fontWeight: '600', color: '#111827', marginBottom: '4px' }}>
                        {p.name}
                      </div>
                      <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '2px' }}>
                        {p.client_name || 'No client assigned'}
                      </div>
                      <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                        {new Date(p.updated_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: '600',
                          padding: '3px 8px',
                          borderRadius: '10px',
                          backgroundColor: sc.bg,
                          color: sc.text,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {p.status}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirm(p.id);
                        }}
                        style={deleteIconStyle}
                        title="Delete project"
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Delete confirmation modal */}
          {deleteConfirm && (
            <div
              style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(0,0,0,0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 50,
              }}
              onClick={() => !deleting && setDeleteConfirm(null)}
            >
              <div
                style={{
                  backgroundColor: '#fff',
                  borderRadius: '12px',
                  padding: '24px',
                  maxWidth: '400px',
                  boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', marginTop: 0, marginBottom: '8px' }}>
                  Delete Project?
                </h2>
                <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 20px 0' }}>
                  This cannot be undone. The project and all its calculations will be permanently deleted.
                </p>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    disabled={deleting}
                    style={{
                      ...buttonStyle,
                      backgroundColor: '#6b7280',
                      cursor: deleting ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDeleteProject(deleteConfirm)}
                    disabled={deleting}
                    style={{
                      ...buttonStyle,
                      backgroundColor: '#dc2626',
                      cursor: deleting ? 'not-allowed' : 'pointer',
                      opacity: deleting ? 0.6 : 1,
                    }}
                  >
                    {deleting ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
