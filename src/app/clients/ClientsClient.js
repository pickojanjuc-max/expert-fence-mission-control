'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function ClientsClient({ email }) {
  const router = useRouter();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', company: '', email: '', phone: '', address: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      const res = await fetch('/api/clients');
      const data = await res.json();
      setClients(data.clients || []);
    } catch (e) {
      console.error('Load clients error:', e);
    }
    setLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleAddClient = async () => {
    if (!formData.name.trim()) {
      setError('Client name is required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.client) {
        setClients([data.client, ...clients]);
        setFormData({ name: '', company: '', email: '', phone: '', address: '', notes: '' });
        setShowForm(false);
      } else {
        setError(data.error || 'Failed to add client');
      }
    } catch (e) {
      setError(e.message);
    }
    setSaving(false);
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
    transition: 'color 0.2s',
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
    transition: 'background-color 0.2s',
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

  const headingStyle = {
    fontSize: '24px',
    fontWeight: '700',
    color: '#111827',
    margin: '0 0 24px 0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    transition: 'background-color 0.2s',
  };

  const cardStyle = {
    backgroundColor: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '12px',
    cursor: 'pointer',
    transition: 'all 0.15s',
  };

  const emptyStateStyle = {
    backgroundColor: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '40px',
    textAlign: 'center',
    color: '#9ca3af',
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

  return (
    <div style={containerStyle}>
      <style>{`
        @media (max-width: 640px) {
          .clients-content { padding: 20px 16px !important; }
          .clients-heading { font-size: 20px !important; }
          .clients-nav-email { display: none !important; }
          .clients-nav { padding: 12px 16px !important; }
          .clients-nav-links { gap: 12px !important; }
        }
      `}</style>

      <nav style={navStyle} className="clients-nav">
        <div style={navLeftStyle}>
          <div style={navLeftStyle}>
            <div style={logoBoxStyle}>EF</div>
            <div style={navTextStyle}>
              <h1 style={navTitleStyle}>Expert Fence</h1>
              <p style={navSubtitleStyle}>Mission Control</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '16px' }} className="clients-nav-links">
            <a href="/dashboard" style={navLinkStyle} onMouseEnter={(e) => e.target.style.color = '#fff'} onMouseLeave={(e) => e.target.style.color = '#e5e7eb'}>
              Dashboard
            </a>
            <a href="/projects" style={navLinkStyle} onMouseEnter={(e) => e.target.style.color = '#fff'} onMouseLeave={(e) => e.target.style.color = '#e5e7eb'}>
              Projects
            </a>
          </div>
        </div>
        <div style={navRightStyle}>
          <span style={userEmailStyle} className="clients-nav-email">{email}</span>
          <button
            style={signOutButtonStyle}
            onClick={handleSignOut}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#b91c1c';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#dc2626';
            }}
          >
            Sign Out
          </button>
        </div>
      </nav>

      <div style={contentStyle} className="clients-content">
        <div style={headingStyle} className="clients-heading">
          <span>Clients</span>
          <button
            style={buttonStyle}
            onClick={() => setShowForm(!showForm)}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#1d4ed8'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#2563eb'}
          >
            {showForm ? 'Cancel' : '+ New Client'}
          </button>
        </div>

        {showForm && (
          <div style={formStyle}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', marginTop: 0, marginBottom: '16px' }}>Add New Client</h3>
            <input
              type="text"
              placeholder="Client name *"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              style={inputStyle}
              autoFocus
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
            <button
              onClick={handleAddClient}
              disabled={saving}
              style={{
                ...buttonStyle,
                width: '100%',
                opacity: saving ? 0.6 : 1,
                cursor: saving ? 'not-allowed' : 'pointer',
              }}
            >
              {saving ? 'Saving...' : 'Save Client'}
            </button>
          </div>
        )}

        {loading ? (
          <p style={{ fontSize: '14px', color: '#9ca3af' }}>Loading clients...</p>
        ) : clients.length === 0 ? (
          <div style={emptyStateStyle}>
            <p style={{ margin: 0, fontSize: '14px' }}>No clients yet. Add your first client to get started.</p>
          </div>
        ) : (
          <div>
            {clients.map((client) => (
              <div
                key={client.id}
                style={cardStyle}
                onClick={() => router.push(`/clients/${client.id}`)}
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
                    <div style={{ fontSize: '15px', fontWeight: '600', color: '#111827', marginBottom: '4px' }}>
                      {client.name}
                    </div>
                    {client.company && (
                      <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>
                        {client.company}
                      </div>
                    )}
                    {client.phone && (
                      <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '2px' }}>
                        {client.phone}
                      </div>
                    )}
                    {client.email && (
                      <div style={{ fontSize: '13px', color: '#6b7280' }}>
                        {client.email}
                      </div>
                    )}
                  </div>
                  <span style={{ fontSize: '14px', color: '#d1d5db' }}>→</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
