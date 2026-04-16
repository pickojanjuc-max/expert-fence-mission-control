'use client';

export default function Sidebar({ email, activePage }) {
  const sidebarStyle = {
    position: 'fixed',
    left: 0,
    top: '60px',
    width: '260px',
    height: 'calc(100vh - 60px)',
    backgroundColor: '#ffffff',
    borderRight: '1px solid #e5e7eb',
    padding: '16px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '32px',
  };

  const sectionStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '0',
  };

  const sectionTitleStyle = {
    fontSize: '12px',
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '12px',
    padding: '0 12px',
  };

  const navLinkStyle = (isActive) => ({
    display: 'flex',
    alignItems: 'center',
    padding: '12px 12px',
    fontSize: '12px',
    color: isActive ? '#2563eb' : '#374151',
    textDecoration: 'none',
    cursor: 'pointer',
    borderLeft: isActive ? '3px solid #2563eb' : '3px solid transparent',
    transition: 'all 0.15s',
    backgroundColor: isActive ? '#f0f9ff' : 'transparent',
  });

  const navLinkHoverStyle = {
    backgroundColor: '#f3f4f6',
  };

  const buttonStyle = {
    width: '100%',
    backgroundColor: '#2563eb',
    color: 'white',
    border: 'none',
    padding: '8px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  };

  return (
    <div style={sidebarStyle} className="sidebar">
      <style>{`
        @media (max-width: 768px) {
          .sidebar {
            display: none !important;
          }
        }
      `}</style>

      {/* Navigation section */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>Navigation</div>
        <a
          href="/clients"
          style={navLinkStyle(activePage === 'clients')}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = navLinkStyle(activePage === 'clients').backgroundColor === '#f0f9ff' ? '#f0f9ff' : '#f3f4f6';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = navLinkStyle(activePage === 'clients').backgroundColor;
          }}
        >
          Clients
        </a>
        <a
          href="/projects"
          style={navLinkStyle(activePage === 'projects')}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = navLinkStyle(activePage === 'projects').backgroundColor === '#f0f9ff' ? '#f0f9ff' : '#f3f4f6';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = navLinkStyle(activePage === 'projects').backgroundColor;
          }}
        >
          Projects
        </a>
        <a
          href="/dashboard"
          style={navLinkStyle(activePage === 'dashboard')}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = navLinkStyle(activePage === 'dashboard').backgroundColor === '#f0f9ff' ? '#f0f9ff' : '#f3f4f6';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = navLinkStyle(activePage === 'dashboard').backgroundColor;
          }}
        >
          Dashboard
        </a>
      </div>

      {/* Section for page-specific content — optional */}
      <div style={{ flex: 1 }}></div>
    </div>
  );
}
