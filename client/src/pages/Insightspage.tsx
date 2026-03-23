import { useState, useEffect } from 'react';
import { Navbar } from '../components';
import { tasksApi } from '../services/api';
import type { Task } from '../types';

// ─── helpers ────────────────────────────────────────────────
function startOfDay(d: Date) {
  const c = new Date(d); c.setHours(0,0,0,0); return c;
}
function dayKey(d: Date) {
  return d.toISOString().slice(0,10);
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month:'short', day:'numeric' });
}
function isSameDay(a: Date, b: Date) {
  return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
}

// ─── streak calculator ───────────────────────────────────────
function calcStreak(completedDates: Date[]): number {
  if (!completedDates.length) return 0;
  const unique = [...new Set(completedDates.map(d => dayKey(startOfDay(d))))].sort().reverse();
  let streak = 0;
  let cursor = startOfDay(new Date());
  for (const key of unique) {
    const d = new Date(key);
    if (isSameDay(d, cursor)) { streak++; cursor.setDate(cursor.getDate()-1); }
    else if (streak === 0) { 
      cursor.setDate(cursor.getDate()-1);
      if (isSameDay(d, cursor)) { streak++; cursor.setDate(cursor.getDate()-1); }
      else break;
    } else break;
  }
  return streak;
}

// ─── weekly heatmap data (last 14 weeks × 7 days) ───────────
function buildHeatmap(tasks: Task[]) {
  const completedByDay: Record<string,number> = {};
  tasks.forEach(t => {
    if (t.completedAt) {
      const key = dayKey(startOfDay(new Date(t.completedAt)));
      completedByDay[key] = (completedByDay[key] || 0) + 1;
    }
  });
  const cells: { date: Date; count: number; key: string }[] = [];
  const today = startOfDay(new Date());
  for (let i = 97; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = dayKey(d);
    cells.push({ date: new Date(d), count: completedByDay[key] || 0, key });
  }
  return cells;
}

// ─── weekly breakdown (last 7 days) ─────────────────────────
function weeklyBreakdown(tasks: Task[]) {
  const days: { label: string; completed: number; total: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = startOfDay(new Date());
    d.setDate(d.getDate() - i);
    const next = new Date(d); next.setDate(next.getDate()+1);
    const dayTasks = tasks.filter(t => {
      const created = new Date(t.createdAt);
      return created >= d && created < next;
    });
    const done = dayTasks.filter(t => t.completedAt).length;
    days.push({
      label: i === 0 ? 'Today' : d.toLocaleDateString('en-US', { weekday:'short' }),
      completed: done,
      total: dayTasks.length,
    });
  }
  return days;
}

// ─── energy distribution ─────────────────────────────────────
function energyDist(tasks: Task[]) {
  const completed = tasks.filter(t => t.completedAt);
  const low  = completed.filter(t => t.energyRequired==='low').length;
  const med  = completed.filter(t => t.energyRequired==='medium').length;
  const high = completed.filter(t => t.energyRequired==='high').length;
  const total = low+med+high || 1;
  return { low, med, high, total };
}

// ─── Stat card ───────────────────────────────────────────────
function StatCard({ label, value, sub, accent }: {
  label: string; value: string | number; sub?: string; accent?: string;
}) {
  return (
    <div className="stat-card" style={{ '--accent-col': accent || 'var(--accent)' } as React.CSSProperties}>
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
      {sub && <span className="stat-sub">{sub}</span>}
    </div>
  );
}

// ─── Heatmap cell color ──────────────────────────────────────
function heatColor(count: number) {
  if (count === 0) return 'var(--bg-elevated)';
  if (count === 1) return 'rgba(212,168,83,0.25)';
  if (count === 2) return 'rgba(212,168,83,0.50)';
  if (count === 3) return 'rgba(212,168,83,0.72)';
  return 'rgba(212,168,83,0.95)';
}

// ─── Main component ──────────────────────────────────────────
export function InsightsPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);

  useEffect(() => {
    tasksApi.getAll().then(({ tasks }) => { setTasks(tasks); setLoading(false); });
  }, []);

  const completed     = tasks.filter(t => t.completedAt);
  const active        = tasks.filter(t => !t.completedAt);
  const streak        = calcStreak(completed.map(t => new Date(t.completedAt!)));
  const heatmap       = buildHeatmap(tasks);
  const week          = weeklyBreakdown(tasks);
  const energy        = energyDist(tasks);
  const maxWeekBar    = Math.max(...week.map(d => d.total), 1);
  const totalMinutes  = completed.reduce((s, t) => s + t.estimatedTimeMinutes, 0);
  const avgPerDay     = completed.length ? (totalMinutes / Math.max(streak, 1) / 60).toFixed(1) : '0';
  const completionRate = tasks.length ? Math.round((completed.length / tasks.length) * 100) : 0;

  // Overdue
  const overdue = active.filter(t => t.deadline && new Date(t.deadline) < new Date()).length;

  // Best day this week
  const bestDay = [...week].sort((a,b) => b.completed - a.completed)[0];

  if (loading) return (
    <div className="min-h-screen" style={{ background: 'var(--bg-void)' }}>
      <Navbar />
      <div className="loading-center">
        <div className="loading-ring" />
        <p style={{ color: 'var(--text-muted)', marginTop: '1rem', fontSize: '0.8125rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Crunching numbers
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-void)' }}>
      <Navbar />

      <main className="insights-main">
        {/* ── Header ── */}
        <div className="insights-header animate-fade-in">
          <div>
            <h1 className="heading-primary" style={{ marginBottom: '0.25rem' }}>Insights</h1>
            <p className="text-body" style={{ margin: 0 }}>
              Your productivity, decoded.
            </p>
          </div>
          {streak > 0 && (
            <div className="streak-badge">
              <span className="streak-fire">🔥</span>
              <div>
                <div className="streak-number">{streak}</div>
                <div className="streak-label">day streak</div>
              </div>
            </div>
          )}
        </div>

        {/* ── Top stats grid ── */}
        <div className="stats-grid animate-slide-up" style={{ animationDelay: '0.05s' }}>
          <StatCard label="Tasks completed" value={completed.length} sub={`of ${tasks.length} total`} />
          <StatCard label="Completion rate" value={`${completionRate}%`} sub="all time" accent="var(--energy-low-text)" />
          <StatCard label="Hours focused" value={(totalMinutes/60).toFixed(1)+'h'} sub={`~${avgPerDay}h/day`} accent="var(--accent)" />
          <StatCard label="Overdue" value={overdue} sub={overdue === 0 ? 'all clear ✓' : 'need attention'} accent={overdue > 0 ? 'var(--energy-hi-text)' : 'var(--energy-low-text)'} />
        </div>

        {/* ── Activity heatmap ── */}
        <div className="insight-card animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <div className="insight-card-header">
            <h2 className="insight-card-title">Activity</h2>
            <span className="insight-card-sub">Last 14 weeks</span>
          </div>

          <div className="heatmap-wrap">
            <div className="heatmap-grid">
              {heatmap.map((cell, i) => (
                <div
                  key={cell.key}
                  className="heat-cell"
                  style={{ background: heatColor(cell.count) }}
                  onMouseEnter={e => {
                    const rect = (e.target as HTMLElement).getBoundingClientRect();
                    setTooltip({
                      text: `${formatDate(cell.key)} — ${cell.count} task${cell.count !== 1 ? 's' : ''}`,
                      x: rect.left + rect.width/2,
                      y: rect.top - 8,
                    });
                  }}
                  onMouseLeave={() => setTooltip(null)}
                />
              ))}
            </div>
            <div className="heatmap-legend">
              <span style={{ color: 'var(--text-muted)', fontSize: '0.6875rem' }}>Less</span>
              {[0,1,2,3,4].map(n => (
                <div key={n} className="heat-cell" style={{ background: heatColor(n), flexShrink: 0 }} />
              ))}
              <span style={{ color: 'var(--text-muted)', fontSize: '0.6875rem' }}>More</span>
            </div>
          </div>
        </div>

        {/* ── Weekly bar + energy split ── */}
        <div className="two-col animate-slide-up" style={{ animationDelay: '0.15s' }}>

          {/* Weekly bars */}
          <div className="insight-card">
            <div className="insight-card-header">
              <h2 className="insight-card-title">This week</h2>
              {bestDay.completed > 0 && (
                <span className="insight-card-sub">Best: {bestDay.label} ({bestDay.completed})</span>
              )}
            </div>
            <div className="bar-chart">
              {week.map((d, i) => (
                <div key={i} className="bar-col">
                  <div className="bar-track">
                    {d.total > 0 && (
                      <div
                        className="bar-total"
                        style={{ height: `${(d.total / maxWeekBar) * 100}%` }}
                      />
                    )}
                    {d.completed > 0 && (
                      <div
                        className="bar-done"
                        style={{ height: `${(d.completed / maxWeekBar) * 100}%` }}
                      />
                    )}
                  </div>
                  <span className="bar-label">{d.label}</span>
                  {d.completed > 0 && (
                    <span className="bar-count">{d.completed}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Energy distribution */}
          <div className="insight-card">
            <div className="insight-card-header">
              <h2 className="insight-card-title">Energy mix</h2>
              <span className="insight-card-sub">Completed tasks</span>
            </div>
            <div className="energy-rows">
              {[
                { label: 'Low energy 🌙',  count: energy.low,  color: 'var(--energy-low-text)',  pct: (energy.low/energy.total)*100 },
                { label: 'Medium ☀️',       count: energy.med,  color: 'var(--energy-med-text)',  pct: (energy.med/energy.total)*100 },
                { label: 'High energy ⚡',  count: energy.high, color: 'var(--energy-hi-text)',   pct: (energy.high/energy.total)*100 },
              ].map(row => (
                <div key={row.label} className="energy-row">
                  <div className="energy-row-header">
                    <span className="energy-row-label">{row.label}</span>
                    <span className="energy-row-count" style={{ color: row.color }}>{row.count}</span>
                  </div>
                  <div className="energy-bar-track">
                    <div
                      className="energy-bar-fill"
                      style={{ width: `${row.pct}%`, background: row.color }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Insight blurb */}
            {energy.total > 1 && (
              <div className="insight-blurb">
                {energy.low >= energy.med && energy.low >= energy.high
                  ? '💡 You tend to do your best work during low-energy sessions — consistent progress beats big bursts.'
                  : energy.high >= energy.med && energy.high >= energy.low
                  ? '⚡ You're crushing high-effort tasks. Make sure to protect your peak focus hours.'
                  : '☀️ Balanced energy across task types — great variety and sustainable momentum.'}
              </div>
            )}
          </div>

        </div>

        {/* ── Weekly review ── */}
        <div className="insight-card animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <div className="insight-card-header">
            <h2 className="insight-card-title">Weekly review</h2>
            <span className="insight-card-sub">What actually happened</span>
          </div>

          <div className="review-grid">
            <div className="review-cell review-done">
              <span className="review-cell-icon">✓</span>
              <div className="review-cell-title">Completed this week</div>
              {completed.filter(t => {
                const d = new Date(t.completedAt!);
                const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate()-7);
                return d > weekAgo;
              }).slice(0,5).map(t => (
                <div key={t._id} className="review-task-item review-task-done">
                  {t.title}
                </div>
              ))}
              {completed.filter(t => {
                const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate()-7);
                return new Date(t.completedAt!) > weekAgo;
              }).length === 0 && (
                <div className="review-empty">Nothing completed yet this week.</div>
              )}
            </div>

            <div className="review-cell review-pending">
              <span className="review-cell-icon">→</span>
              <div className="review-cell-title">Still in progress</div>
              {active.slice(0,5).map(t => (
                <div key={t._id} className="review-task-item review-task-pending">
                  <span>{t.title}</span>
                  {t.deadline && (
                    <span className={`review-deadline ${new Date(t.deadline) < new Date() ? 'overdue' : ''}`}>
                      {new Date(t.deadline) < new Date() ? 'overdue' : 
                        `due ${new Date(t.deadline).toLocaleDateString('en-US',{month:'short',day:'numeric'})}`}
                    </span>
                  )}
                </div>
              ))}
              {active.length === 0 && (
                <div className="review-empty">All tasks completed! 🎉</div>
              )}
            </div>
          </div>

          {/* Reflection prompt */}
          <div className="reflection-prompt">
            <span className="reflection-label">Weekly intention</span>
            <textarea
              className="reflection-input"
              placeholder="What's the one thing you want to accomplish this week? Write it here as a commitment to yourself..."
              rows={2}
            />
          </div>
        </div>

      </main>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="heat-tooltip"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          {tooltip.text}
        </div>
      )}

      <style>{STYLES}</style>
    </div>
  );
}

// ─── Scoped styles ───────────────────────────────────────────
const STYLES = `
  .insights-main {
    max-width: 900px;
    margin: 0 auto;
    padding: 2rem 1.25rem 5rem;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }
  .insights-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 1rem;
    padding-bottom: 0.5rem;
  }
  .loading-center {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 60vh;
  }
  .loading-ring {
    width: 32px; height: 32px;
    border: 2px solid var(--border-subtle);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* Streak badge */
  .streak-badge {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    background: var(--accent-subtle);
    border: 1px solid var(--accent-dim);
    border-radius: 10px;
    padding: 0.625rem 1rem;
  }
  .streak-fire { font-size: 1.5rem; }
  .streak-number { font-family: var(--font-display, 'Syne', sans-serif); font-size: 1.5rem; font-weight: 700; color: var(--accent); line-height: 1; }
  .streak-label { font-size: 0.6875rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-muted); }

  /* Stats grid */
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
  }
  @media (min-width: 640px) { .stats-grid { grid-template-columns: repeat(4, 1fr); } }

  .stat-card {
    background: var(--bg-surface);
    border: 1px solid var(--border-subtle);
    border-radius: 10px;
    padding: 1.125rem 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    position: relative;
    overflow: hidden;
  }
  .stat-card::after {
    content: '';
    position: absolute;
    bottom: 0; left: 0; right: 0;
    height: 2px;
    background: var(--accent-col);
    opacity: 0.5;
  }
  .stat-label { font-family: var(--font-display, sans-serif); font-size: 0.625rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-muted); }
  .stat-value { font-family: var(--font-display, sans-serif); font-size: 1.75rem; font-weight: 700; color: var(--text-primary); line-height: 1.1; }
  .stat-sub { font-size: 0.75rem; color: var(--text-muted); }

  /* Insight card */
  .insight-card {
    background: var(--bg-surface);
    border: 1px solid var(--border-subtle);
    border-radius: 12px;
    padding: 1.5rem;
    position: relative;
    overflow: hidden;
  }
  .insight-card::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--border-mid), transparent);
  }
  .insight-card-header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    margin-bottom: 1.25rem;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .insight-card-title {
    font-family: var(--font-display, sans-serif);
    font-size: 0.9375rem;
    font-weight: 600;
    letter-spacing: -0.01em;
    color: var(--text-primary);
    margin: 0;
  }
  .insight-card-sub { font-size: 0.75rem; color: var(--text-muted); }

  /* Heatmap */
  .heatmap-wrap { display: flex; flex-direction: column; gap: 0.75rem; }
  .heatmap-grid {
    display: grid;
    grid-template-columns: repeat(14, 1fr);
    grid-template-rows: repeat(7, 1fr);
    grid-auto-flow: column;
    gap: 3px;
  }
  .heat-cell {
    width: 100%;
    aspect-ratio: 1;
    border-radius: 2px;
    cursor: default;
    transition: transform 0.1s;
  }
  .heat-cell:hover { transform: scale(1.3); z-index: 2; position: relative; }
  .heatmap-legend {
    display: flex;
    align-items: center;
    gap: 4px;
    justify-content: flex-end;
  }
  .heatmap-legend .heat-cell { width: 12px; height: 12px; }

  /* Tooltip */
  .heat-tooltip {
    position: fixed;
    transform: translate(-50%, -100%);
    background: var(--bg-elevated);
    border: 1px solid var(--border-mid);
    color: var(--text-primary);
    font-size: 0.75rem;
    padding: 0.375rem 0.625rem;
    border-radius: 5px;
    pointer-events: none;
    white-space: nowrap;
    z-index: 100;
    box-shadow: var(--shadow-md);
  }

  /* Two-column */
  .two-col { display: grid; grid-template-columns: 1fr; gap: 1.25rem; }
  @media (min-width: 640px) { .two-col { grid-template-columns: 1fr 1fr; } }

  /* Bar chart */
  .bar-chart {
    display: flex;
    align-items: flex-end;
    gap: 6px;
    height: 120px;
  }
  .bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; height: 100%; }
  .bar-track { flex: 1; width: 100%; position: relative; display: flex; align-items: flex-end; border-radius: 3px; overflow: hidden; background: var(--bg-raised); }
  .bar-total { position: absolute; bottom: 0; left: 0; right: 0; background: var(--border-mid); border-radius: 3px; transition: height 0.4s cubic-bezier(0.16,1,0.3,1); }
  .bar-done  { position: absolute; bottom: 0; left: 0; right: 0; background: var(--accent); border-radius: 3px; transition: height 0.4s cubic-bezier(0.16,1,0.3,1); }
  .bar-label { font-size: 0.625rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); }
  .bar-count { font-family: var(--font-display, sans-serif); font-size: 0.6875rem; font-weight: 600; color: var(--accent); }

  /* Energy rows */
  .energy-rows { display: flex; flex-direction: column; gap: 1rem; }
  .energy-row { display: flex; flex-direction: column; gap: 6px; }
  .energy-row-header { display: flex; justify-content: space-between; align-items: center; }
  .energy-row-label { font-size: 0.8125rem; color: var(--text-secondary); }
  .energy-row-count { font-family: var(--font-display, sans-serif); font-size: 0.875rem; font-weight: 600; }
  .energy-bar-track { height: 5px; background: var(--bg-raised); border-radius: 3px; overflow: hidden; }
  .energy-bar-fill { height: 100%; border-radius: 3px; transition: width 0.6s cubic-bezier(0.16,1,0.3,1); }
  .insight-blurb {
    margin-top: 1rem;
    padding: 0.75rem 1rem;
    background: var(--bg-raised);
    border-radius: 7px;
    font-size: 0.8125rem;
    color: var(--text-secondary);
    line-height: 1.5;
    border-left: 2px solid var(--accent-dim);
  }

  /* Weekly review */
  .review-grid { display: grid; grid-template-columns: 1fr; gap: 1rem; margin-bottom: 1.25rem; }
  @media (min-width: 540px) { .review-grid { grid-template-columns: 1fr 1fr; } }
  .review-cell { padding: 1rem; border-radius: 8px; display: flex; flex-direction: column; gap: 0.625rem; }
  .review-done    { background: rgba(56,189,130,0.05); border: 1px solid rgba(56,189,130,0.12); }
  .review-pending { background: var(--bg-raised); border: 1px solid var(--border-subtle); }
  .review-cell-icon { font-size: 1.125rem; }
  .review-cell-title { font-family: var(--font-display, sans-serif); font-size: 0.6875rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-muted); }
  .review-task-item { font-size: 0.8125rem; padding: 0.375rem 0; border-bottom: 1px solid var(--border-subtle); display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; }
  .review-task-item:last-child { border-bottom: none; }
  .review-task-done    { color: var(--text-secondary); text-decoration: line-through; text-decoration-color: var(--border-mid); }
  .review-task-pending { color: var(--text-primary); }
  .review-deadline { font-size: 0.6875rem; color: var(--text-muted); white-space: nowrap; flex-shrink: 0; }
  .review-deadline.overdue { color: var(--energy-hi-text); }
  .review-empty { font-size: 0.8125rem; color: var(--text-muted); font-style: italic; }

  /* Reflection */
  .reflection-prompt { display: flex; flex-direction: column; gap: 0.5rem; }
  .reflection-label { font-family: var(--font-display, sans-serif); font-size: 0.6875rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-muted); }
  .reflection-input {
    width: 100%;
    background: var(--bg-raised);
    border: 1px solid var(--border-subtle);
    border-radius: 7px;
    padding: 0.75rem 1rem;
    color: var(--text-primary);
    font-size: 0.875rem;
    line-height: 1.6;
    resize: none;
    outline: none;
    transition: border-color 0.18s;
    font-family: inherit;
  }
  .reflection-input::placeholder { color: var(--text-ghost, #2e2b27); }
  .reflection-input:focus { border-color: var(--accent-dim); box-shadow: 0 0 0 3px var(--accent-subtle); }
`;
