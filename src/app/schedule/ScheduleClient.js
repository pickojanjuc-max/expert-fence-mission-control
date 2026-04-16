'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';

const STATUSES = ['draft', 'quoted', 'approved', 'ordered', 'scheduled', 'complete'];

const STATUS_COLORS = {
  draft:     { bg: '#f3f4f6', text: '#6b7280', border: '#e5e7eb' },
  quoted:    { bg: '#dbeafe', text: '#2563eb', border: '#93c5fd' },
  approved:  { bg: '#dcfce7', text: '#16a34a', border: '#86efac' },
  ordered:   { bg: '#fef3c7', text: '#d97706', border: '#fcd34d' },
  scheduled: { bg: '#e0e7ff', text: '#4f46e5', border: '#a5b4fc' },
  complete:  { bg: '#d1fae5', text: '#059669', border: '#6ee7b7' },
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function StatusBadge({ status, small }) {
  const c = STATUS_COLORS[status] || STATUS_COLORS.draft;
  return (
    <span style={{
      fontSize: small ? 10 : 11,
      fontWeight: 600,
      padding: small ? '2px 6px' : '3px 8px',
      borderRadius: 10,
      backgroundColor: c.bg,
      color: c.text,
      whiteSpace: 'nowrap',
      border: `1px solid ${c.border}`,
    }}>
      {status}
    </span>
  );
}

// ─── BOARD VIEW ──────────────────────────────────────────────────────────────
function BoardView({ projects, onStatusChange, onProjectClick }) {
  const [dragOverStatus, setDragOverStatus] = useState(null);

  const handleDragOver = (e, status) => {
    e.preventDefault();
    setDragOverStatus(status);
  };

  const handleDrop = (e, status) => {
    e.preventDefault();
    setDragOverStatus(null);
    const projectId = e.dataTransfer.getData('projectId');
    const currentStatus = e.dataTransfer.getData('currentStatus');
    if (projectId && status !== currentStatus) {
      onStatusChange(projectId, status);
    }
  };

  return (
    <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 12, alignItems: 'flex-start' }}>
      {STATUSES.map(status => {
        const cols = projects.filter(p => p.status === status);
        const c = STATUS_COLORS[status];
        const isOver = dragOverStatus === status;
        return (
          <div key={status} style={{ minWidth: 200, flex: '0 0 200px' }}>
            <div style={{
              fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8,
              color: c.text, backgroundColor: c.bg, border: `1px solid ${c.border}`,
              borderRadius: '6px 6px 0 0', padding: '6px 10px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              {status}
              <span style={{ fontWeight: 400, fontSize: 11 }}>{cols.length}</span>
            </div>
            <div
              onDragOver={e => handleDragOver(e, status)}
              onDragLeave={() => setDragOverStatus(null)}
              onDrop={e => handleDrop(e, status)}
              style={{
                backgroundColor: isOver ? '#eff6ff' : '#f9fafb',
                border: `1px solid ${isOver ? '#3b82f6' : c.border}`,
                borderTop: 'none', borderRadius: '0 0 6px 6px',
                minHeight: 80, padding: 6,
                transition: 'background 0.15s, border-color 0.15s',
              }}
            >
              {cols.map(p => (
                <BoardCard key={p.id} project={p} onStatusChange={onStatusChange} onProjectClick={onProjectClick} />
              ))}
              {cols.length === 0 && (
                <div style={{ padding: '12px 8px', fontSize: 12, color: isOver ? '#3b82f6' : '#9ca3af', textAlign: 'center' }}>
                  {isOver ? 'Drop here' : '—'}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BoardCard({ project, onStatusChange, onProjectClick }) {
  const [showMenu, setShowMenu] = useState(false);
  const [dragging, setDragging] = useState(false);

  const handleDragStart = (e) => {
    e.dataTransfer.setData('projectId', project.id);
    e.dataTransfer.setData('currentStatus', project.status);
    e.dataTransfer.effectAllowed = 'move';
    setDragging(true);
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={() => setDragging(false)}
      style={{
        backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: 6,
        padding: '10px 10px 8px', marginBottom: 6, cursor: 'grab',
        boxShadow: dragging ? '0 8px 24px rgba(0,0,0,0.15)' : '0 1px 3px rgba(0,0,0,0.06)',
        opacity: dragging ? 0.5 : 1,
        transition: 'box-shadow 0.15s, opacity 0.15s',
      }}
      onMouseEnter={e => { if (!dragging) e.currentTarget.style.boxShadow = '0 4px 12px rgba(59,130,246,0.12)'; }}
      onMouseLeave={e => { if (!dragging) e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)'; }}
      onClick={() => !dragging && onProjectClick(project.id)}
    >
      <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 3, lineHeight: 1.3 }}>
        {project.name}
      </div>
      {project.client_name && (
        <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>{project.client_name}</div>
      )}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
        {project.measure_date && (
          <span style={{ fontSize: 10, color: '#7c3aed', backgroundColor: '#ede9fe', padding: '2px 6px', borderRadius: 4 }}>
            📏 {fmtDate(project.measure_date)}
          </span>
        )}
        {project.install_date && (
          <span style={{ fontSize: 10, color: '#0369a1', backgroundColor: '#e0f2fe', padding: '2px 6px', borderRadius: 4 }}>
            🔨 {fmtDate(project.install_date)}
          </span>
        )}
      </div>
      {/* Move status dropdown — keep for mobile where drag isn't available */}
      <div style={{ marginTop: 8, position: 'relative' }} onClick={e => e.stopPropagation()}>
        <button
          onClick={() => setShowMenu(!showMenu)}
          style={{
            fontSize: 10, color: '#6b7280', background: 'none', border: '1px solid #e5e7eb',
            borderRadius: 4, padding: '2px 6px', cursor: 'pointer', width: '100%', textAlign: 'left',
          }}
        >
          Move to ▾
        </button>
        {showMenu && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, zIndex: 20, backgroundColor: 'white',
            border: '1px solid #e5e7eb', borderRadius: 6, boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            overflow: 'hidden', minWidth: 130, marginTop: 2,
          }}>
            {STATUSES.filter(s => s !== project.status).map(s => {
              const c = STATUS_COLORS[s];
              return (
                <button
                  key={s}
                  onClick={() => { onStatusChange(project.id, s); setShowMenu(false); }}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    padding: '7px 12px', fontSize: 12, fontWeight: 500,
                    color: c.text, background: 'none', border: 'none', cursor: 'pointer',
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = c.bg}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── CALENDAR VIEW ────────────────────────────────────────────────────────────
function CalendarView({ projects, onProjectClick }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Build event map: 'YYYY-MM-DD' -> [{type, project}]
  const eventMap = {};
  projects.forEach(p => {
    if (p.measure_date) {
      const k = p.measure_date.slice(0, 10);
      if (!eventMap[k]) eventMap[k] = [];
      eventMap[k].push({ type: 'measure', project: p });
    }
    if (p.install_date) {
      const k = p.install_date.slice(0, 10);
      if (!eventMap[k]) eventMap[k] = [];
      eventMap[k].push({ type: 'install', project: p });
    }
  });

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  return (
    <div>
      {/* Month nav */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
        <button onClick={prevMonth} style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 14, color: '#374151' }}>‹</button>
        <span style={{ fontSize: 18, fontWeight: 700, color: '#111827', minWidth: 180, textAlign: 'center' }}>
          {MONTHS[month]} {year}
        </span>
        <button onClick={nextMonth} style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 14, color: '#374151' }}>›</button>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
        <span style={{ fontSize: 12, color: '#7c3aed', display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: '#ede9fe', border: '1px solid #c4b5fd', display: 'inline-block' }} />
          Measure
        </span>
        <span style={{ fontSize: 12, color: '#0369a1', display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: '#e0f2fe', border: '1px solid #7dd3fc', display: 'inline-block' }} />
          Install
        </span>
      </div>

      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 2 }}>
        {DAYS.map(d => (
          <div key={d} style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textAlign: 'center', padding: '4px 0', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} style={{ minHeight: 72, backgroundColor: '#f9fafb', borderRadius: 4 }} />;
          const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const events = eventMap[dateKey] || [];
          const isToday = dateKey === todayKey;
          return (
            <div key={dateKey} style={{
              minHeight: 72, backgroundColor: 'white', border: `1px solid ${isToday ? '#3b82f6' : '#e5e7eb'}`,
              borderRadius: 4, padding: '4px 5px', boxSizing: 'border-box',
              boxShadow: isToday ? '0 0 0 1px #3b82f6' : 'none',
            }}>
              <div style={{ fontSize: 12, fontWeight: isToday ? 700 : 400, color: isToday ? '#2563eb' : '#374151', marginBottom: 3 }}>
                {day}
              </div>
              {events.slice(0, 3).map((ev, ei) => (
                <div
                  key={ei}
                  onClick={() => onProjectClick(ev.project.id)}
                  title={`${ev.project.name} — ${ev.type}`}
                  style={{
                    fontSize: 10, fontWeight: 500, marginBottom: 2, padding: '1px 4px',
                    borderRadius: 3, cursor: 'pointer', lineHeight: 1.4, overflow: 'hidden',
                    whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                    backgroundColor: ev.type === 'measure' ? '#ede9fe' : '#e0f2fe',
                    color: ev.type === 'measure' ? '#7c3aed' : '#0369a1',
                  }}
                >
                  {ev.type === 'measure' ? '📏' : '🔨'} {ev.project.name}
                </div>
              ))}
              {events.length > 3 && (
                <div style={{ fontSize: 9, color: '#9ca3af' }}>+{events.length - 3} more</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── LIST VIEW ────────────────────────────────────────────────────────────────
function ListView({ projects, onStatusChange, onProjectClick }) {
  return (
    <div>
      {/* Header row */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 140px 120px 120px 110px',
        gap: 8, padding: '8px 12px', fontSize: 11, fontWeight: 700,
        color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.6,
        borderBottom: '2px solid #e5e7eb', backgroundColor: '#f9fafb', borderRadius: '8px 8px 0 0',
      }}>
        <span>Job</span>
        <span>Client</span>
        <span>Measure</span>
        <span>Install</span>
        <span>Status</span>
      </div>

      {projects.length === 0 && (
        <div style={{ padding: '32px', textAlign: 'center', fontSize: 14, color: '#9ca3af', backgroundColor: 'white', borderRadius: '0 0 8px 8px', border: '1px solid #e5e7eb', borderTop: 'none' }}>
          No jobs yet.
        </div>
      )}

      {projects.map((p, i) => (
        <ListRow key={p.id} project={p} isLast={i === projects.length - 1} onStatusChange={onStatusChange} onProjectClick={onProjectClick} />
      ))}
    </div>
  );
}

function ListRow({ project, isLast, onStatusChange, onProjectClick }) {
  const [showMenu, setShowMenu] = useState(false);
  const c = STATUS_COLORS[project.status] || STATUS_COLORS.draft;
  return (
    <div
      style={{
        display: 'grid', gridTemplateColumns: '1fr 140px 120px 120px 110px',
        gap: 8, padding: '10px 12px', fontSize: 13, alignItems: 'center',
        backgroundColor: 'white', borderBottom: isLast ? 'none' : '1px solid #f3f4f6',
        borderRadius: isLast ? '0 0 8px 8px' : 0,
        border: '1px solid #e5e7eb', borderTop: 'none',
        cursor: 'pointer', transition: 'background 0.12s',
      }}
      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8faff'}
      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'white'}
      onClick={() => onProjectClick(project.id)}
    >
      <span style={{ fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {project.name}
      </span>
      <span style={{ fontSize: 12, color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {project.client_name || '—'}
      </span>
      <span style={{ fontSize: 12, color: project.measure_date ? '#7c3aed' : '#d1d5db' }}>
        {project.measure_date ? fmtDate(project.measure_date) : '—'}
      </span>
      <span style={{ fontSize: 12, color: project.install_date ? '#0369a1' : '#d1d5db' }}>
        {project.install_date ? fmtDate(project.install_date) : '—'}
      </span>
      {/* Status dropdown */}
      <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
        <button
          onClick={() => setShowMenu(!showMenu)}
          style={{
            fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 10,
            backgroundColor: c.bg, color: c.text, border: `1px solid ${c.border}`,
            cursor: 'pointer', whiteSpace: 'nowrap',
          }}
        >
          {project.status} ▾
        </button>
        {showMenu && (
          <div style={{
            position: 'absolute', top: '100%', right: 0, zIndex: 20, backgroundColor: 'white',
            border: '1px solid #e5e7eb', borderRadius: 6, boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            overflow: 'hidden', minWidth: 130, marginTop: 2,
          }}>
            {STATUSES.filter(s => s !== project.status).map(s => {
              const sc = STATUS_COLORS[s];
              return (
                <button
                  key={s}
                  onClick={() => { onStatusChange(project.id, s); setShowMenu(false); }}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    padding: '7px 12px', fontSize: 12, fontWeight: 500,
                    color: sc.text, background: 'none', border: 'none', cursor: 'pointer',
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = sc.bg}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return '';
  // d is 'YYYY-MM-DD' — parse without timezone shift
  const [y, m, day] = d.slice(0, 10).split('-').map(Number);
  const date = new Date(y, m - 1, day);
  return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function ScheduleClient({ email }) {
  const router = useRouter();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('board'); // 'board' | 'calendar' | 'list'

  useEffect(() => { loadProjects(); }, []);

  const loadProjects = async () => {
    try {
      const res = await fetch('/api/projects');
      const data = await res.json();
      setProjects(data.projects || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleStatusChange = async (projectId, newStatus) => {
    // Optimistic update
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, status: newStatus } : p));
    try {
      await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId, status: newStatus }),
      });
    } catch (e) {
      console.error(e);
      loadProjects(); // revert on error
    }
  };

  const handleProjectClick = (id) => router.push(`/project/${id}`);

  const viewBtnStyle = (v) => ({
    padding: '6px 14px', fontSize: 13, fontWeight: view === v ? 600 : 500,
    borderRadius: 6, border: '1px solid ' + (view === v ? '#2563eb' : '#e5e7eb'),
    backgroundColor: view === v ? '#dbeafe' : 'white',
    color: view === v ? '#2563eb' : '#6b7280',
    cursor: 'pointer', transition: 'all 0.15s',
  });

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <style>{`
        @media (max-width: 768px) {
          .ef-main { padding: 70px 12px 24px !important; }
          .list-grid { grid-template-columns: 1fr 100px !important; }
          .list-grid .hide-mobile { display: none !important; }
        }
      `}</style>

      <Sidebar email={email} />

      <div style={{ flex: 1, backgroundColor: '#f9fafb', overflowY: 'auto' }} className="ef-main">
        <div style={{ padding: '24px 32px', maxWidth: '1100px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
          <div style={{ marginBottom: 20 }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: '0 0 4px 0' }}>Schedule</h1>
            <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>
              Track upcoming measures, orders, and installs across all your jobs.
            </p>
          </div>

          {/* Sub-tabs */}
          <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #e5e7eb', marginBottom: 20 }}>
            <a href="/projects" style={{ padding: '10px 18px', fontSize: 14, fontWeight: 500, color: '#6b7280', borderBottom: '2px solid transparent', textDecoration: 'none' }}>
              Jobs
            </a>
            <a href="/clients" style={{ padding: '10px 18px', fontSize: 14, fontWeight: 500, color: '#6b7280', borderBottom: '2px solid transparent', textDecoration: 'none' }}>
              Clients
            </a>
            <a href="/schedule" style={{ padding: '10px 18px', fontSize: 14, fontWeight: 600, color: '#111827', borderBottom: '2px solid #2563eb', textDecoration: 'none' }}>
              Schedule
            </a>
          </div>

          {/* View toggle */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
            <button onClick={() => setView('board')} style={viewBtnStyle('board')}>Board</button>
            <button onClick={() => setView('calendar')} style={viewBtnStyle('calendar')}>Calendar</button>
            <button onClick={() => setView('list')} style={viewBtnStyle('list')}>List</button>
          </div>

          {loading ? (
            <p style={{ fontSize: 14, color: '#9ca3af' }}>Loading...</p>
          ) : (
            <>
              {view === 'board' && (
                <BoardView projects={projects} onStatusChange={handleStatusChange} onProjectClick={handleProjectClick} />
              )}
              {view === 'calendar' && (
                <CalendarView projects={projects} onProjectClick={handleProjectClick} />
              )}
              {view === 'list' && (
                <ListView projects={projects} onStatusChange={handleStatusChange} onProjectClick={handleProjectClick} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
