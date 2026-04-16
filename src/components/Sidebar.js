'use client';

import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const NAV = [
  { label: 'Dashboard', href: '/dashboard', icon: '⊞' },
  { label: 'Clients', href: '/clients', icon: '👤' },
  { label: 'Projects', href: '/projects', icon: '📋' },
];

const CALCS = [
  { label: 'Glass Pool', href: '/calculator/glass', icon: '🔷' },
  { label: 'Aluminium', href: '/calculator/aluminium', icon: '🔶' },
  { label: 'Balustrade', href: '/calculator/balustrade', icon: '🟦' },
];

export default function Sidebar({ email }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const active = (href) => pathname === href || pathname.startsWith(href + '/');

  return (
    <>
      {/* Sidebar */}
      <div style={{
        width: 220,
        flexShrink: 0,
        backgroundColor: '#111827',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        position: 'sticky',
        top: 0,
        alignSelf: 'flex-start',
      }} className="ef-sidebar">
        {/* Logo */}
        <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid #1f2937' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, backgroundColor: '#2563eb', borderRadius: 6,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontWeight: 'bold', fontSize: 14, flexShrink: 0,
            }}>EF</div>
            <div>
              <div style={{ color: 'white', fontWeight: 600, fontSize: 14, lineHeight: 1.2 }}>Expert Fence</div>
              <div style={{ color: '#9ca3af', fontSize: 11, marginTop: 2 }}>Mission Control</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 8px', overflowY: 'auto' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1, padding: '4px 8px 8px' }}>
            Workspace
          </div>
          {NAV.map(({ label, href, icon }) => (
            <a key={href} href={href} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
              borderRadius: 6, marginBottom: 2, textDecoration: 'none',
              backgroundColor: active(href) ? '#1d4ed8' : 'transparent',
              color: active(href) ? 'white' : '#d1d5db',
              fontSize: 14, fontWeight: active(href) ? 600 : 400,
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => { if (!active(href)) e.currentTarget.style.backgroundColor = '#1f2937'; }}
            onMouseLeave={e => { if (!active(href)) e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              <span style={{ fontSize: 16 }}>{icon}</span>
              {label}
            </a>
          ))}

          <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1, padding: '16px 8px 8px' }}>
            Calculators
          </div>
          {CALCS.map(({ label, href, icon }) => (
            <a key={href} href={href} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
              borderRadius: 6, marginBottom: 2, textDecoration: 'none',
              backgroundColor: active(href) ? '#1d4ed8' : 'transparent',
              color: active(href) ? 'white' : '#d1d5db',
              fontSize: 14, fontWeight: active(href) ? 600 : 400,
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => { if (!active(href)) e.currentTarget.style.backgroundColor = '#1f2937'; }}
            onMouseLeave={e => { if (!active(href)) e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              <span style={{ fontSize: 16 }}>{icon}</span>
              {label}
            </a>
          ))}
        </nav>

        {/* Footer */}
        <div style={{ padding: '12px 8px', borderTop: '1px solid #1f2937' }}>
          {email && (
            <div style={{ fontSize: 11, color: '#6b7280', padding: '0 8px 8px', wordBreak: 'break-all' }}>
              {email}
            </div>
          )}
          <button onClick={handleSignOut} style={{
            width: '100%', padding: '8px 10px', backgroundColor: 'transparent',
            border: '1px solid #374151', borderRadius: 6, color: '#9ca3af',
            fontSize: 13, cursor: 'pointer', textAlign: 'left',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#dc2626'; e.currentTarget.style.color = '#ef4444'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#374151'; e.currentTarget.style.color = '#9ca3af'; }}
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Mobile: hide sidebar, show top bar */}
      <style>{`
        @media (max-width: 768px) {
          .ef-sidebar { display: none !important; }
          .ef-mobile-bar { display: flex !important; }
        }
        @media (min-width: 769px) {
          .ef-mobile-bar { display: none !important; }
        }
      `}</style>

      {/* Mobile top bar */}
      <div className="ef-mobile-bar" style={{
        display: 'none', position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        backgroundColor: '#111827', padding: '10px 16px',
        borderBottom: '1px solid #1f2937', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 30, height: 30, backgroundColor: '#2563eb', borderRadius: 5,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontWeight: 'bold', fontSize: 12,
          }}>EF</div>
          <span style={{ color: 'white', fontWeight: 600, fontSize: 14 }}>Expert Fence</span>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          {NAV.concat(CALCS).map(({ label, href, icon }) => (
            <a key={href} href={href} style={{ color: active(href) ? '#60a5fa' : '#9ca3af', fontSize: 11, textDecoration: 'none' }}>
              {icon}
            </a>
          ))}
        </div>
      </div>
    </>
  );
}
