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

export default function ProjectsClient({ email }) {
  const router = useRouter();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProjects();
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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
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

  const headingStyle = {
    fontSize: '24px',
    fontWeight: '700',
    color: '#111827',
    margin: '0 0 24px 0',
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

  return (
    <div style={containerStyle}>
      <style>{`
        @media (max-width: 640px) {
          .projects-content { padding: 20px 16px !important; }
          .projects-heading { font-size: 20px !important; }
          .projects-nav-email { display: none !important; }
          .projects-nav { padding: 12px 16px !important; }
          .projects-nav-links { gap: 12px !important; }
        }
      `}</style>

      <nav style={navStyle} className="projects-nav">
        <div style={navLeftStyle}>
          <div style={navLeftStyle}>
            <div style={logoBoxStyle}>EF</div>
            <div style={navTextStyle}>
              <h1 style={navTitleStyle}>Expert Fence</h1>
              <p style={navSubtitleStyle}>Mission Control</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '16px' }} className="projects-nav-links">
            <a href="/dashboard" style={navLinkStyle} onMouseEnter={(e) => e.target.style.color = '#fff'} onMouseLeave={(e) => e.target.style.color = '#e5e7eb'}>
              Dashboard
            </a>
            <a href="/clients" style={navLinkStyle} onMouseEnter={(e) => e.target.style.color = '#fff'} onMouseLeave={(e) => e.target.style.color = '#e5e7eb'}>
              Clients
            </a>
          </div>
        </div>
        <div style={navRightStyle}>
          <span style={userEmailStyle} className="projects-nav-email">{email}</span>
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

      <div style={contentStyle} className="projects-content">
        <h1 style={headingStyle} className="projects-heading">Projects</h1>

        {loading ? (
          <p style={{ fontSize: '14px', color: '#9ca3af' }}>Loading projects...</p>
        ) : projects.length === 0 ? (
          <div style={emptyStateStyle}>
            <p style={{ margin: 0, fontSize: '14px' }}>No projects yet. Open a calculator and save your first project.</p>
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
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: '600',
                        padding: '3px 8px',
                        borderRadius: '10px',
                        backgroundColor: sc.bg,
                        color: sc.text,
                        whiteSpace: 'nowrap',
                        marginLeft: '16px',
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
  );
}
