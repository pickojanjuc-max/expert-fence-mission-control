'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

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

export default function ClientDetailClient({ clientId, email }) {
  const router = useRouter();
  const [client, setClient] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  useEffect(() => {
    loadClient();
  }, [clientId]);

  const loadClient = async () => {
    try {
      const res = await fetch(`/api/clients/${clientId}`);
      const data = await res.json();
      if (data.client) {
        setClient(data.client);
        setFormData(data.client);
        setProjects(data.projects || []);
      }
    } catch (e) {
      console.error('Load client error:', e);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/clients/${clientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          company: formData.company,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          notes: formData.notes,
        }),
      });
      const data = await res.json();
      if (data.client) {
        setClient(data.client);
        setEditing(false);
      } else {
        setError(data.error || 'Failed to save');
      }
    } catch (e) {
      setError(e.message);
    }
    setSaving(false);
  };

  const handleNewProject = async () => {
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${client.name} - Project`,
          client_id: clientId,
          client_name: client.name,
          client_email: client.email,
          client_phone: client.phone,
        }),
      });
      const data = await res.json();
      if (data.project) {
        router.push(`/project/${data.project.id}`);
      }
    } catch (e) {
      console.error('New project error:', e);
    }
  };

  const navStyle = {
    backgroundColor: '#111827',
    padding: '16px 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #1f2937',
  };

  const logoBoxStyle = {
    width: '40px',
    height: '40px',
    backgroundColor: '#2563eb',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontWeight: 'bold',
    fontSize: '16px',
    marginRight: '12px',
  };

  const navLeftStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '24px',
  };

  const navTextStyle = {
    display: 'flex',
    flexDirection: 'column',
  };

  const navTitleStyle = {
    color: 'white',
    fontSize: '16px',
    fontWeight: '600',
    margin: '0',
  };

  const navSubtitleStyle = {
    color: '#9ca3af',
    fontSize: '13px',
    margin: '0',
    marginTop: '2px',
  };

  const navLinkStyle = {
    color: '#e5e7eb',
    fontSize: '14px',
    textDecoration: 'none',
    fontWeight: '500',
    cursor: 'pointer',
  };

  const navRightStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  };

  const userEmailStyle = {
    color: '#e5e7eb',
    fontSize: '14px',
  };

  const signOutButtonStyle = {
    backgroundColor: '#dc2626',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  };

  const containerStyle = {
    minHeight: '100vh',
    backgroundColor: '#f9fafb',
  };

  const contentStyle = {
    padding: '32px 24px',
    maxWidth: '900px',
    margin: '0 auto',
  };

  const backLinkStyle = {
    fontSize: '14px',
    color: '#2563eb',
    textDecoration: 'none',
    fontWeight: '500',
    marginBottom: '24px',
    display: 'inline-block',
    cursor: 'pointer',
  };

  const cardStyle = {
    backgroundColor: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '20px',
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

  if (loading) {
    return (
      <div style={containerStyle}>
        <nav style={navStyle}>
          <div style={navLeftStyle}>
            <div style={navLeftStyle}>
              <div style={logoBoxStyle}>EF</div>
              <div style={navTextStyle}>
                <h1 style={navTitleStyle}>Expert Fence</h1>
                <p style={navSubtitleStyle}>Mission Control</p>
              </div>
            </div>
          </div>
          <div style={navRightStyle}>
            <span style={userEmailStyle}>{email}</span>
            <button style={signOutButtonStyle} onClick={handleSignOut}>Sign Out</button>
          </div>
        </nav>
        <div style={contentStyle}>
          <p style={{ color: '#9ca3af' }}>Loading client...</p>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div style={containerStyle}>
        <nav style={navStyle}>
          <div style={navLeftStyle}>
            <div style={navLeftStyle}>
              <div style={logoBoxStyle}>EF</div>
              <div style={navTextStyle}>
                <h1 style={navTitleStyle}>Expert Fence</h1>
                <p style={navSubtitleStyle}>Mission Control</p>
              </div>
            </div>
          </div>
        </nav>
        <div style={contentStyle}>
          <p style={{ color: '#dc2626' }}>Client not found</p>
          <a href="/clients" style={backLinkStyle}>← Back to Clients</a>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <style>{`
        @media (max-width: 640px) {
          .client-content { padding: 20px 16px !important; }
          .client-nav { padding: 12px 16px !important; }
          .client-nav-email { display: none !important; }
        }
      `}</style>

      <nav style={navStyle} className="client-nav">
        <div style={navLeftStyle}>
          <div style={navLeftStyle}>
            <div style={logoBoxStyle}>EF</div>
            <div style={navTextStyle}>
              <h1 style={navTitleStyle}>Expert Fence</h1>
              <p style={navSubtitleStyle}>Mission Control</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '16px' }}>
            <a href="/dashboard" style={navLinkStyle} onMouseEnter={(e) => e.target.style.color = '#fff'} onMouseLeave={(e) => e.target.style.color = '#e5e7eb'}>Dashboard</a>
            <a href="/clients" style={navLinkStyle} onMouseEnter={(e) => e.target.style.color = '#fff'} onMouseLeave={(e) => e.target.style.color = '#e5e7eb'}>Clients</a>
          </div>
        </div>
        <div style={navRightStyle}>
          <span style={userEmailStyle} className="client-nav-email">{email}</span>
          <button style={signOutButtonStyle} onClick={handleSignOut}>Sign Out</button>
        </div>
      </nav>

      <div style={contentStyle} className="client-content">
        <a href="/clients" style={backLinkStyle}>← Back to Clients</a>

        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '700', color: '#111827' }}>
              {editing ? 'Edit Client' : client.name}
            </h1>
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                style={buttonStyle}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#1d4ed8'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#2563eb'}
              >
                Edit
              </button>
            )}
          </div>

          {editing ? (
            <div>
              <input
                type="text"
                placeholder="Client name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                style={inputStyle}
              />
              <input
                type="text"
                placeholder="Company"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                style={inputStyle}
              />
              <input
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                style={inputStyle}
              />
              <input
                type="tel"
                placeholder="Phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                style={inputStyle}
              />
              <input
                type="text"
                placeholder="Address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                style={inputStyle}
              />
              <textarea
                placeholder="Notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows="3"
                style={{ ...inputStyle, marginBottom: '16px', fontFamily: 'inherit', resize: 'vertical' }}
              />
              {error && <div style={{ color: '#dc2626', fontSize: '13px', marginBottom: '12px' }}>{error}</div>}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    ...buttonStyle,
                    opacity: saving ? 0.6 : 1,
                    cursor: saving ? 'not-allowed' : 'pointer',
                  }}
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => {
                    setEditing(false);
                    setFormData(client);
                    setError('');
                  }}
                  style={{
                    ...buttonStyle,
                    backgroundColor: '#6b7280',
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#4b5563'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#6b7280'}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '14px' }}>
              {client.company && (
                <div>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280', marginBottom: '4px' }}>Company</div>
                  <div style={{ color: '#111827' }}>{client.company}</div>
                </div>
              )}
              {client.email && (
                <div>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280', marginBottom: '4px' }}>Email</div>
                  <div style={{ color: '#111827' }}>{client.email}</div>
                </div>
              )}
              {client.phone && (
                <div>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280', marginBottom: '4px' }}>Phone</div>
                  <div style={{ color: '#111827' }}>{client.phone}</div>
                </div>
              )}
              {client.address && (
                <div>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280', marginBottom: '4px' }}>Address</div>
                  <div style={{ color: '#111827' }}>{client.address}</div>
                </div>
              )}
              {client.notes && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280', marginBottom: '4px' }}>Notes</div>
                  <div style={{ color: '#111827' }}>{client.notes}</div>
                </div>
              )}
            </div>
          )}
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#111827' }}>Projects</h2>
            <button
              onClick={handleNewProject}
              style={buttonStyle}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#1d4ed8'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#2563eb'}
            >
              + New Project
            </button>
          </div>

          {projects.length === 0 ? (
            <div style={{ ...cardStyle, textAlign: 'center', color: '#9ca3af' }}>
              No projects yet. Create your first project for this client.
            </div>
          ) : (
            <div>
              {projects.map((p) => {
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                      <div>
                        <div style={{ fontSize: '15px', fontWeight: '600', color: '#111827' }}>
                          {p.name}
                        </div>
                        <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                          {new Date(p.updated_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: '600',
                          padding: '3px 8px',
                          borderRadius: '10px',
                          backgroundColor: sc.bg,
                          color: sc.text,
                        }}
                      >
                        {p.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
