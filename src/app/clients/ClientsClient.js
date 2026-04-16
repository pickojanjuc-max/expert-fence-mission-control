'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Sidebar from '@/components/Sidebar';

export default function ClientsClient({ email }) {
  const router = useRouter();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', company: '', email: '', phone: '', address: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);

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

  const handleDeleteClient = async (clientId) => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/clients/${clientId}`, { method: 'DELETE' });
      if (res.ok) {
        setClients(clients.filter((c) => c.id !== clientId));
        setDeleteConfirm(null);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to delete client');
      }
    } catch (e) {
      setError(e.message);
    }
    setDeleting(false);
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

  const filteredClients = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.company && c.company.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const deleteIconStyle = {
    background: 'none',
    border: 'none',
    color: '#dc2626',
    cursor: 'pointer',
    fontSize: '16px',
    padding: '4px 8px',
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <style>{`
        @media (max-width: 768px) {
          .ef-main { padding: 70px 16px 24px !important; }
        }
      `}</style>

      <Sidebar email={email} activePage="clients" />

      <div style={{ flex: 1, backgroundColor: '#f9fafb', overflowY: 'auto' }} className="ef-main">
        <div style={{ padding: '24px 32px', maxWidth: '900px', margin: '0 auto', width: '100%' }}>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#111827', margin: '0 0 24px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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

          {/* Search */}
          {clients.length > 0 && !showForm && (
            <div style={{ marginBottom: '24px' }}>
              <input
                type="text"
                placeholder="Search clients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  ...inputStyle,
                  marginBottom: '0',
                }}
              />
            </div>
          )}

          {loading ? (
            <p style={{ fontSize: '14px', color: '#9ca3af' }}>Loading clients...</p>
          ) : filteredClients.length === 0 ? (
            <div style={emptyStateStyle}>
              <p style={{ margin: 0, fontSize: '14px' }}>
                {searchTerm ? 'No matching clients.' : 'No clients yet. Add your first client to get started.'}
              </p>
            </div>
          ) : (
            <div>
              {filteredClients.map((client) => (
                <div
                  key={client.id}
                  style={{
                    ...cardStyle,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
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
                  <div style={{ flex: 1 }}>
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '14px', color: '#d1d5db' }}>→</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirm(client.id);
                      }}
                      style={deleteIconStyle}
                      title="Delete client"
                    >
                      🗑
                    </button>
                  </div>
                </div>
              ))}
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
                  Delete Client?
                </h2>
                <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 20px 0' }}>
                  This cannot be undone. Associated projects will keep the client information but the client record will be deleted.
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
                    onClick={() => handleDeleteClient(deleteConfirm)}
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
