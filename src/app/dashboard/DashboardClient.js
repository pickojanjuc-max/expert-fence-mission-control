'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Sidebar from '@/components/Sidebar';

export default function DashboardClient({ email, plan }) {
  const router = useRouter();
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);

  useEffect(() => {
    fetch('/api/projects')
      .then((r) => r.json())
      .then((data) => { setProjects(data.projects || []); })
      .catch(() => {})
      .finally(() => setLoadingProjects(false));
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleCalculatorClick = (path) => {
    router.push(path);
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

  const navCenterStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '24px',
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
  };

  const greetingStyle = {
    fontSize: '18px',
    fontWeight: '500',
    color: '#111827',
    marginBottom: '32px',
  };

  const gridContainerStyle = {
    maxWidth: '980px',
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '20px',
  };

  const cardStyle = {
    backgroundColor: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    transition: 'all 0.2s',
    cursor: 'pointer',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
  };

  const cardHoverStyle = {
    ...cardStyle,
    borderColor: '#3b82f6',
    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.1)',
  };

  const iconAreaGlassStyle = {
    width: '100%',
    height: '80px',
    backgroundColor: '#dbeafe',
    borderRadius: '6px',
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '32px',
    color: '#0284c7',
  };

  const iconAreaAluminium = {
    width: '100%',
    height: '80px',
    backgroundColor: '#1e3a5f',
    borderRadius: '6px',
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '32px',
    color: '#bfdbfe',
  };

  const cardTitleStyle = {
    fontSize: '16px',
    fontWeight: '600',
    color: '#111827',
    margin: '0 0 8px 0',
  };

  const cardDescriptionStyle = {
    fontSize: '13px',
    color: '#6b7280',
    margin: '0 0 16px 0',
    flex: 1,
  };

  const buttonStyle = {
    backgroundColor: '#2563eb',
    color: 'white',
    border: 'none',
    padding: '10px 16px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <style>{`
        @media (max-width: 900px) {
          .ef-dashboard-grid { grid-template-columns: 1fr 1fr !important; max-width: 620px !important; }
        }
        @media (max-width: 768px) {
          .ef-main { padding-top: 70px !important; }
        }
        @media (max-width: 640px) {
          .ef-dashboard-grid { grid-template-columns: 1fr !important; max-width: 100% !important; gap: 14px !important; }
          .ef-dashboard-content { padding: 16px !important; }
          .ef-dashboard-greeting { font-size: 16px !important; margin-bottom: 20px !important; }
          .ef-card-icon { height: 64px !important; font-size: 24px !important; margin-bottom: 12px !important; }
          .ef-card { padding: 16px !important; }
          .ef-projects-section { max-width: 100% !important; padding: 0 !important; }
        }
      `}</style>

      <Sidebar email={email} />

      {/* Main content */}
      <div style={{ flex: 1, backgroundColor: '#f9fafb', overflowY: 'auto' }} className="ef-main">
      <div style={contentStyle} className="ef-dashboard-content">
        <div style={greetingStyle} className="ef-dashboard-greeting">Welcome back, {email.split('@')[0]}</div>

        {/* Calculator Cards Grid */}
        <div style={gridContainerStyle} className="ef-dashboard-grid">
          {/* Glass Pool Fencing Card */}
          <div
            style={cardStyle} className="ef-card"
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#3b82f6';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#e5e7eb';
              e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
            }}
          >
            <div style={iconAreaGlassStyle} className="ef-card-icon">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                <rect x="8" y="8" width="24" height="24" stroke="currentColor" strokeWidth="2" rx="2" />
                <path d="M14 8V32" stroke="currentColor" strokeWidth="1" opacity="0.5" />
                <path d="M26 8V32" stroke="currentColor" strokeWidth="1" opacity="0.5" />
              </svg>
            </div>
            <h3 style={cardTitleStyle}>Glass Pool Fencing</h3>
            <p style={cardDescriptionStyle}>Spigot-mount glass panels, gates, and hardware</p>
            <button
              style={buttonStyle}
              onClick={() => handleCalculatorClick('/calculator/glass')}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#1d4ed8';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = '#2563eb';
              }}
            >
              Open Calculator
            </button>
          </div>

          {/* Aluminium Fencing Card */}
          <div
            style={cardStyle} className="ef-card"
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#3b82f6';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#e5e7eb';
              e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
            }}
          >
            <div style={iconAreaAluminium} className="ef-card-icon">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                <rect x="8" y="10" width="4" height="20" fill="currentColor" />
                <rect x="16" y="10" width="4" height="20" fill="currentColor" />
                <rect x="24" y="10" width="4" height="20" fill="currentColor" />
                <line x1="8" y1="18" x2="32" y2="18" stroke="currentColor" strokeWidth="1" opacity="0.3" />
              </svg>
            </div>
            <h3 style={cardTitleStyle}>Aluminium Fencing</h3>
            <p style={cardDescriptionStyle}>Tubular, Blade, and Barr panel systems</p>
            <button
              style={buttonStyle}
              onClick={() => handleCalculatorClick('/calculator/aluminium')}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#1d4ed8';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = '#2563eb';
              }}
            >
              Open Calculator
            </button>
          </div>

          {/* Balustrade Card */}
          <div
            style={cardStyle} className="ef-card"
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#3b82f6';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#e5e7eb';
              e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
            }}
          >
            <div style={iconAreaGlassStyle} className="ef-card-icon">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                <rect x="10" y="8" width="20" height="24" stroke="currentColor" strokeWidth="2" />
                <line x1="10" y1="16" x2="30" y2="16" stroke="currentColor" strokeWidth="1" opacity="0.5" />
                <line x1="10" y1="24" x2="30" y2="24" stroke="currentColor" strokeWidth="1" opacity="0.5" />
              </svg>
            </div>
            <h3 style={cardTitleStyle}>Glass Balustrade</h3>
            <p style={cardDescriptionStyle}>Frameless balustrade with spigot mounts</p>
            <button
              style={buttonStyle}
              onClick={() => handleCalculatorClick('/calculator/balustrade')}
              onMouseEnter={(e) => { e.target.style.backgroundColor = '#1d4ed8'; }}
              onMouseLeave={(e) => { e.target.style.backgroundColor = '#2563eb'; }}
            >
              Open Calculator
            </button>
          </div>

          {/* Stainless Wire Card */}
          <div
            style={cardStyle} className="ef-card"
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#0ea5e9';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(14, 165, 233, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#e5e7eb';
              e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
            }}
          >
            <div style={{ ...iconAreaGlassStyle, background: '#f0f9ff', color: '#0284c7' }} className="ef-card-icon">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                <rect x="8" y="8" width="4" height="24" fill="currentColor" rx="1" />
                <rect x="28" y="8" width="4" height="24" fill="currentColor" rx="1" />
                <line x1="12" y1="14" x2="28" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="12" y1="18" x2="28" y2="18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="12" y1="22" x2="28" y2="22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="12" y1="26" x2="28" y2="26" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <h3 style={cardTitleStyle}>Stainless Wire Balustrade</h3>
            <p style={cardDescriptionStyle}>1×19×3.2mm SS wire, dropper posts and fittings</p>
            <button
              style={{ ...buttonStyle, backgroundColor: '#0369a1' }}
              onClick={() => handleCalculatorClick('/calculator/wire')}
              onMouseEnter={(e) => { e.target.style.backgroundColor = '#075985'; }}
              onMouseLeave={(e) => { e.target.style.backgroundColor = '#0369a1'; }}
            >
              Open Calculator
            </button>
          </div>

          {/* AIRE+ Balustrade Card */}
          <div
            style={cardStyle} className="ef-card"
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#92400e';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(146, 64, 14, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#e5e7eb';
              e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
            }}
          >
            <div style={{ ...iconAreaAluminium, background: '#1e3a5f', color: '#bfdbfe' }} className="ef-card-icon">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                <rect x="8" y="8" width="4" height="24" fill="currentColor" rx="1" />
                <rect x="18" y="8" width="3" height="24" fill="currentColor" opacity="0.7" rx="1" />
                <rect x="28" y="8" width="4" height="24" fill="currentColor" rx="1" />
                <line x1="8" y1="8" x2="32" y2="8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <line x1="8" y1="32" x2="32" y2="32" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <h3 style={cardTitleStyle}>AIRE+ Balustrade</h3>
            <p style={cardDescriptionStyle}>Picket or slat infill, base plate or face mount</p>
            <button
              style={{ ...buttonStyle, backgroundColor: '#1e3a5f' }}
              onClick={() => handleCalculatorClick('/calculator/aire')}
              onMouseEnter={(e) => { e.target.style.backgroundColor = '#1e40af'; }}
              onMouseLeave={(e) => { e.target.style.backgroundColor = '#1e3a5f'; }}
            >
              Open Calculator
            </button>
          </div>

          {/* Custom Glass Card */}
          <div
            style={cardStyle} className="ef-card"
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#0f766e';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(15, 118, 110, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#e5e7eb';
              e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
            }}
          >
            <div style={{ ...iconAreaGlassStyle, background: '#ccfbf1', color: '#0f766e' }} className="ef-card-icon">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                <rect x="7" y="7" width="11" height="26" stroke="currentColor" strokeWidth="2" rx="1" fill="currentColor" fillOpacity="0.15" />
                <rect x="22" y="7" width="11" height="26" stroke="currentColor" strokeWidth="2" rx="1" fill="currentColor" fillOpacity="0.15" />
                <line x1="7" y1="20" x2="18" y2="20" stroke="currentColor" strokeWidth="1" opacity="0.4" />
                <line x1="22" y1="20" x2="33" y2="20" stroke="currentColor" strokeWidth="1" opacity="0.4" />
              </svg>
            </div>
            <h3 style={cardTitleStyle}>Custom Glass</h3>
            <p style={cardDescriptionStyle}>Panel-by-panel glass quoting — pool fence & balustrade</p>
            <button
              style={{ ...buttonStyle, backgroundColor: '#0f766e' }}
              onClick={() => handleCalculatorClick('/calculator/custom-glass')}
              onMouseEnter={(e) => { e.target.style.backgroundColor = '#0d6460'; }}
              onMouseLeave={(e) => { e.target.style.backgroundColor = '#0f766e'; }}
            >
              Open Calculator
            </button>
          </div>

        </div>

        {/* Saved Projects */}
        <div style={{ maxWidth: '640px', margin: '32px auto 0' }} className="ef-projects-section">
          <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '16px' }}>
            Saved Projects
          </h2>
          {loadingProjects ? (
            <p style={{ fontSize: '14px', color: '#9ca3af' }}>Loading...</p>
          ) : projects.length === 0 ? (
            <div style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '24px', textAlign: 'center' }}>
              <p style={{ fontSize: '14px', color: '#9ca3af', margin: 0 }}>No saved projects yet. Open a calculator and save your first project.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {projects.map((p) => {
                const calcs = p.calculations || [];
                const statusColors = {
                  draft: { bg: '#f3f4f6', text: '#6b7280' },
                  quoted: { bg: '#dbeafe', text: '#2563eb' },
                  approved: { bg: '#dcfce7', text: '#16a34a' },
                  ordered: { bg: '#fef3c7', text: '#d97706' },
                  scheduled: { bg: '#e0e7ff', text: '#4f46e5' },
                  complete: { bg: '#d1fae5', text: '#059669' },
                };
                const sc = statusColors[p.status] || statusColors.draft;
                const calcTypeLabels = { glass: 'Glass Pool Fencing', aluminium: 'Aluminium Fencing', balustrade: 'Glass Balustrade', wire: 'Stainless Wire Balustrade', aire: 'AIRE+ Balustrade', 'custom-glass': 'Custom Glass' };
                const calcTypeIcons = { glass: '🔷', aluminium: '🔶', balustrade: '🟦', wire: '🔩', aire: '🟫', 'custom-glass': '🪟' };

                return (
                  <div
                    key={p.id}
                    style={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '10px',
                      overflow: 'hidden',
                      transition: 'all 0.15s',
                    }}
                  >
                    {/* Project header */}
                    <div
                      onClick={() => router.push(`/project/${p.id}`)}
                      style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fafafa'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>{p.name}</div>
                        <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>
                          {calcs.length} calculation{calcs.length !== 1 ? 's' : ''}
                          {p.client_name ? ` · ${p.client_name}` : ''}
                          {' · '}
                          {new Date(p.updated_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                        </div>
                      </div>
                      <span style={{
                        fontSize: '11px', fontWeight: '600', padding: '3px 8px',
                        borderRadius: '999px', backgroundColor: sc.bg, color: sc.text,
                      }}>
                        {p.status}
                      </span>
                    </div>

                    {/* Calculations list */}
                    {calcs.length > 0 && (
                      <div style={{ borderTop: '1px solid #f3f4f6' }}>
                        {calcs.map((c) => (
                          <div
                            key={c.id}
                            onClick={() => {
                              const routes = { glass: '/calculator/glass', aluminium: '/calculator/aluminium', balustrade: '/calculator/balustrade', wire: '/calculator/wire', aire: '/calculator/aire' };
                              const path = routes[c.calculator_type] || '/calculator/glass';
                              router.push(`${path}?calc=${c.id}`);
                            }}
                            style={{
                              padding: '10px 16px 10px 28px',
                              cursor: 'pointer',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              borderBottom: '1px solid #f9fafb',
                              transition: 'background-color 0.1s',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f9fafb'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '14px' }}>{calcTypeIcons[c.calculator_type] || '📐'}</span>
                              <span style={{ fontSize: '13px', color: '#374151', fontWeight: '500' }}>
                                {c.label || calcTypeLabels[c.calculator_type] || c.calculator_type}
                              </span>
                            </div>
                            <span style={{ color: '#d1d5db', fontSize: '14px' }}>→</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Empty state — legacy projects with no calculations yet */}
                    {calcs.length === 0 && p.calculator_type && (
                      <div
                        onClick={() => {
                          const routes = { glass: '/calculator/glass', aluminium: '/calculator/aluminium', balustrade: '/calculator/balustrade', wire: '/calculator/wire', aire: '/calculator/aire' };
                          const path = routes[p.calculator_type] || '/calculator/glass';
                          router.push(`${path}?project=${p.id}`);
                        }}
                        style={{
                          padding: '10px 16px 10px 28px',
                          cursor: 'pointer',
                          borderTop: '1px solid #f3f4f6',
                          fontSize: '13px', color: '#6b7280',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f9fafb'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                      >
                        {calcTypeIcons[p.calculator_type] || '📐'} {calcTypeLabels[p.calculator_type] || p.calculator_type} →
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
