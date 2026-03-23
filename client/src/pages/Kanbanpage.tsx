import { useState, useEffect, useRef } from 'react';
import { Navbar, TaskModal } from '../components';
import { tasksApi } from '../services/api';
import type { Task, TaskFormData } from '../types';

// ─── Types ───────────────────────────────────────────────────
type Column = 'backlog' | 'today' | 'done';

interface KanbanTask extends Task {
  column: Column;
}

interface DragState {
  taskId: string;
  fromCol: Column;
  overTaskId: string | null;
  overCol: Column | null;
}

// ─── helpers ────────────────────────────────────────────────
function energyColor(e: string) {
  if (e === 'low')    return { bg: 'var(--energy-low-bg)',  text: 'var(--energy-low-text)',  label: '🌙 Low' };
  if (e === 'medium') return { bg: 'var(--energy-med-bg)',  text: 'var(--energy-med-text)',  label: '☀️ Med' };
  return               { bg: 'var(--energy-hi-bg)',         text: 'var(--energy-hi-text)',   label: '⚡ High' };
}

function formatMin(m: number) {
  if (m < 60) return `${m}m`;
  const h = Math.floor(m/60), rem = m%60;
  return rem ? `${h}h ${rem}m` : `${h}h`;
}

function isOverdue(t: Task) {
  return !!t.deadline && !t.completedAt && new Date(t.deadline) < new Date();
}

// ─── Task card ───────────────────────────────────────────────
function KanbanCard({
  task,
  isDragging,
  isOver,
  onDragStart,
  onDragEnter,
  onDragEnd,
  onEdit,
  onComplete,
  onUncomplete,
  onDelete,
}: {
  task: KanbanTask;
  isDragging: boolean;
  isOver: boolean;
  onDragStart: () => void;
  onDragEnter: () => void;
  onDragEnd: () => void;
  onEdit: () => void;
  onComplete: () => void;
  onUncomplete: () => void;
  onDelete: () => void;
}) {
  const e = energyColor(task.energyRequired);
  const overdue = isOverdue(task);

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnter={onDragEnter}
      onDragEnd={onDragEnd}
      className={`kcard ${isDragging ? 'kcard-dragging' : ''} ${isOver ? 'kcard-over' : ''}`}
    >
      {/* Top row */}
      <div className="kcard-top">
        <button
          className={`kcard-check ${task.completedAt ? 'kcard-check-done' : ''}`}
          onClick={task.completedAt ? onUncomplete : onComplete}
          title={task.completedAt ? 'Mark incomplete' : 'Mark complete'}
        >
          {task.completedAt && (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </button>
        <div className="kcard-actions">
          <button className="kcard-btn" onClick={onEdit} title="Edit">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button className="kcard-btn kcard-btn-del" onClick={onDelete} title="Delete">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Title */}
      <p className={`kcard-title ${task.completedAt ? 'kcard-title-done' : ''}`}>{task.title}</p>
      {task.description && (
        <p className="kcard-desc">{task.description}</p>
      )}

      {/* Meta */}
      <div className="kcard-meta">
        <span className="kcard-energy" style={{ background: e.bg, color: e.text }}>{e.label}</span>
        <span className="kcard-time">{formatMin(task.estimatedTimeMinutes)}</span>
        {task.deadline && (
          <span className={`kcard-deadline ${overdue ? 'kcard-overdue' : ''}`}>
            {overdue ? '⚠ overdue' : new Date(task.deadline).toLocaleDateString('en-US',{month:'short',day:'numeric'})}
          </span>
        )}
        {task.recurrence && task.recurrence !== 'none' && (
          <span className="kcard-recurrence">↻ {task.recurrence}</span>
        )}
      </div>

      {/* Progress bar */}
      {(task.progress || 0) > 0 && !task.completedAt && (
        <div className="kcard-progress-track">
          <div className="kcard-progress-fill" style={{ width: `${task.progress}%` }} />
        </div>
      )}

      {/* Drag handle hint */}
      <div className="kcard-drag-hint">⠿</div>
    </div>
  );
}

// ─── Column ──────────────────────────────────────────────────
const COL_META: Record<Column, { label: string; accent: string; sub: string }> = {
  backlog: { label: 'Backlog',   accent: 'var(--border-mid)',         sub: 'Not started' },
  today:   { label: 'In Focus',  accent: 'var(--accent)',              sub: 'Working on' },
  done:    { label: 'Done',      accent: 'var(--energy-low-text)',     sub: 'Completed' },
};

function KanbanColumn({
  col,
  tasks,
  dragState,
  onDragStart,
  onDragEnter,
  onDragEnd,
  onColEnter,
  onEdit,
  onComplete,
  onUncomplete,
  onDelete,
  onAdd,
}: {
  col: Column;
  tasks: KanbanTask[];
  dragState: DragState | null;
  onDragStart: (id: string) => void;
  onDragEnter: (id: string) => void;
  onDragEnd: () => void;
  onColEnter: (col: Column) => void;
  onEdit: (t: Task) => void;
  onComplete: (id: string) => void;
  onUncomplete: (id: string) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
}) {
  const meta = COL_META[col];
  return (
    <div
      className={`kcol ${dragState?.overCol === col && !dragState.overTaskId ? 'kcol-over' : ''}`}
      onDragOver={e => e.preventDefault()}
      onDragEnter={() => onColEnter(col)}
    >
      {/* Header */}
      <div className="kcol-header">
        <div>
          <div className="kcol-title" style={{ '--col-accent': meta.accent } as React.CSSProperties}>
            <span className="kcol-dot" style={{ background: meta.accent }} />
            {meta.label}
          </div>
          <div className="kcol-sub">{meta.sub}</div>
        </div>
        <span className="kcol-count">{tasks.length}</span>
      </div>

      {/* Cards */}
      <div className="kcol-cards">
        {tasks.length === 0 && (
          <div className="kcol-empty">
            {col === 'backlog' ? 'No tasks yet' : col === 'today' ? 'Drag tasks here to focus' : 'Nothing done yet'}
          </div>
        )}
        {tasks.map(t => (
          <KanbanCard
            key={t._id}
            task={t}
            isDragging={dragState?.taskId === t._id}
            isOver={dragState?.overTaskId === t._id}
            onDragStart={() => onDragStart(t._id)}
            onDragEnter={() => onDragEnter(t._id)}
            onDragEnd={onDragEnd}
            onEdit={() => onEdit(t)}
            onComplete={() => onComplete(t._id)}
            onUncomplete={() => onUncomplete(t._id)}
            onDelete={() => onDelete(t._id)}
          />
        ))}
      </div>

      {/* Add button */}
      {col === 'backlog' && (
        <button className="kcol-add" onClick={onAdd}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M5 12h14" strokeLinecap="round"/>
          </svg>
          Add task
        </button>
      )}
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────
export function KanbanPage() {
  const [tasks, setTasks] = useState<KanbanTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [saving, setSaving] = useState(false);
  const colOrderRef = useRef<Record<string, Column>>({});

  async function load() {
    const { tasks: raw } = await tasksApi.getAll();
    setTasks(raw.map(t => ({
      ...t,
      column: colOrderRef.current[t._id] ?? (t.completedAt ? 'done' : 'backlog'),
    } as KanbanTask)));
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  // ── Drag handlers ──
  function handleDragStart(id: string) {
    const t = tasks.find(t => t._id === id)!;
    setDragState({ taskId: id, fromCol: t.column, overTaskId: null, overCol: t.column });
  }

  function handleDragEnterTask(id: string) {
    if (!dragState) return;
    const t = tasks.find(t => t._id === id)!;
    setDragState(s => s ? { ...s, overTaskId: id, overCol: t.column } : null);
  }

  function handleDragEnterCol(col: Column) {
    if (!dragState) return;
    setDragState(s => s ? { ...s, overCol: col, overTaskId: null } : null);
  }

  function handleDragEnd() {
    if (!dragState) return;
    const { taskId, overTaskId, overCol } = dragState;
    if (!overCol) { setDragState(null); return; }

    setTasks(prev => {
      const dragged = prev.find(t => t._id === taskId)!;
      const rest    = prev.filter(t => t._id !== taskId);
      const newTask = { ...dragged, column: overCol };

      // Persist column mapping
      colOrderRef.current[taskId] = overCol;

      if (overTaskId) {
        const idx = rest.findIndex(t => t._id === overTaskId);
        const result = [...rest];
        result.splice(idx, 0, newTask);
        return result;
      }
      return [...rest, newTask];
    });

    // Side-effects: complete / uncomplete based on column
    const t = tasks.find(t => t._id === taskId)!;
    if (overCol === 'done' && !t.completedAt) {
      tasksApi.complete(taskId).catch(() => {});
    } else if (overCol !== 'done' && t.completedAt) {
      tasksApi.uncomplete(taskId).catch(() => {});
    }

    setDragState(null);
  }

  // ── CRUD ──
  async function handleAdd(data: TaskFormData) {
    setSaving(true);
    await tasksApi.create(data);
    await load(); setSaving(false); setShowModal(false);
  }
  async function handleEdit(data: TaskFormData) {
    if (!editTask) return;
    setSaving(true);
    await tasksApi.update(editTask._id, data);
    await load(); setSaving(false); setEditTask(null);
  }
  async function handleDelete(id: string) {
    if (!confirm('Delete this task?')) return;
    await tasksApi.delete(id); await load();
  }
  async function handleComplete(id: string) {
    await tasksApi.complete(id);
    setTasks(prev => prev.map(t => t._id === id
      ? { ...t, completedAt: new Date().toISOString(), column: 'done' } : t));
    colOrderRef.current[id] = 'done';
  }
  async function handleUncomplete(id: string) {
    await tasksApi.uncomplete(id);
    setTasks(prev => prev.map(t => t._id === id
      ? { ...t, completedAt: undefined, column: 'backlog' } : t));
    colOrderRef.current[id] = 'backlog';
  }

  const cols: Column[] = ['backlog', 'today', 'done'];
  const byCol = (c: Column) => tasks.filter(t => t.column === c);

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-void)' }}>
      <Navbar />

      <main className="kboard-main">
        {/* Header */}
        <div className="kboard-header animate-fade-in">
          <div>
            <h1 className="heading-primary" style={{ marginBottom: '0.25rem' }}>Board</h1>
            <p className="text-body" style={{ margin: 0 }}>Drag tasks across columns to track your day.</p>
          </div>
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14" strokeLinecap="round"/>
            </svg>
            New task
          </button>
        </div>

        {loading ? (
          <div style={{ display:'flex', justifyContent:'center', alignItems:'center', minHeight:'40vh' }}>
            <div className="loading-ring-k" />
          </div>
        ) : (
          <div className="kboard-grid animate-slide-up">
            {cols.map(col => (
              <KanbanColumn
                key={col}
                col={col}
                tasks={byCol(col)}
                dragState={dragState}
                onDragStart={handleDragStart}
                onDragEnter={handleDragEnterTask}
                onDragEnd={handleDragEnd}
                onColEnter={handleDragEnterCol}
                onEdit={setEditTask}
                onComplete={handleComplete}
                onUncomplete={handleUncomplete}
                onDelete={handleDelete}
                onAdd={() => setShowModal(true)}
              />
            ))}
          </div>
        )}
      </main>

      <TaskModal isOpen={showModal}  onClose={() => setShowModal(false)} onSubmit={handleAdd}  task={null}     isLoading={saving} />
      <TaskModal isOpen={!!editTask} onClose={() => setEditTask(null)}   onSubmit={handleEdit} task={editTask} isLoading={saving} />

      <style>{KANBAN_STYLES}</style>
    </div>
  );
}

const KANBAN_STYLES = `
  .kboard-main {
    padding: 1.75rem 1.25rem 4rem;
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }
  .kboard-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 1rem;
  }
  .kboard-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  @media (min-width: 768px) {
    .kboard-grid { grid-template-columns: repeat(3, 1fr); align-items: start; }
  }
  .loading-ring-k {
    width: 32px; height: 32px;
    border: 2px solid var(--border-subtle);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* Column */
  .kcol {
    background: var(--bg-surface);
    border: 1px solid var(--border-subtle);
    border-radius: 12px;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0;
    min-height: 200px;
    transition: border-color 0.15s;
  }
  .kcol-over { border-color: var(--accent-dim); }

  .kcol-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 1rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid var(--border-subtle);
  }
  .kcol-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-family: var(--font-display, sans-serif);
    font-size: 0.8125rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--text-primary);
  }
  .kcol-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
  .kcol-sub { font-size: 0.6875rem; color: var(--text-muted); margin-top: 2px; }
  .kcol-count {
    font-family: var(--font-display, sans-serif);
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--text-muted);
    background: var(--bg-raised);
    border: 1px solid var(--border-subtle);
    border-radius: 20px;
    padding: 0.125rem 0.5rem;
    min-width: 1.5rem;
    text-align: center;
  }
  .kcol-cards { display: flex; flex-direction: column; gap: 0.5rem; flex: 1; }
  .kcol-empty {
    padding: 1.5rem 0;
    text-align: center;
    font-size: 0.8125rem;
    color: var(--text-ghost, #2e2b27);
    font-style: italic;
    border: 1px dashed var(--border-subtle);
    border-radius: 8px;
  }
  .kcol-add {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    margin-top: 0.75rem;
    width: 100%;
    padding: 0.5rem;
    background: none;
    border: none;
    color: var(--text-muted);
    font-size: 0.8125rem;
    cursor: pointer;
    border-radius: 6px;
    transition: all 0.15s;
    justify-content: center;
  }
  .kcol-add:hover { background: var(--bg-raised); color: var(--text-secondary); }

  /* Card */
  .kcard {
    background: var(--bg-raised);
    border: 1px solid var(--border-subtle);
    border-radius: 8px;
    padding: 0.75rem;
    cursor: grab;
    position: relative;
    transition: transform 0.12s, box-shadow 0.12s, opacity 0.12s, border-color 0.12s;
    user-select: none;
  }
  .kcard:active { cursor: grabbing; }
  .kcard:hover { border-color: var(--border-mid); box-shadow: var(--shadow-sm); }
  .kcard-dragging { opacity: 0.4; transform: scale(0.97); }
  .kcard-over { border-color: var(--accent); box-shadow: 0 0 0 2px var(--accent-subtle); }

  .kcard-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.5rem;
  }
  .kcard-check {
    width: 18px; height: 18px;
    border-radius: 50%;
    border: 1.5px solid var(--border-mid);
    background: none;
    cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.15s;
    flex-shrink: 0;
    color: #0a0704;
  }
  .kcard-check:hover { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-subtle); }
  .kcard-check-done { background: var(--accent); border-color: var(--accent); }

  .kcard-actions { display: flex; gap: 2px; opacity: 0; transition: opacity 0.15s; }
  .kcard:hover .kcard-actions { opacity: 1; }
  .kcard-btn {
    padding: 4px;
    background: none;
    border: none;
    cursor: pointer;
    color: var(--text-muted);
    border-radius: 4px;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.12s;
  }
  .kcard-btn:hover { background: var(--bg-elevated); color: var(--text-primary); }
  .kcard-btn-del:hover { color: var(--energy-hi-text); }

  .kcard-title {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-primary);
    margin: 0 0 0.375rem;
    line-height: 1.4;
  }
  .kcard-title-done { text-decoration: line-through; color: var(--text-muted); }
  .kcard-desc {
    font-size: 0.75rem;
    color: var(--text-muted);
    margin: 0 0 0.5rem;
    line-height: 1.5;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .kcard-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 0.375rem;
    align-items: center;
  }
  .kcard-energy {
    font-size: 0.625rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    padding: 2px 6px;
    border-radius: 3px;
    font-family: var(--font-display, sans-serif);
  }
  .kcard-time, .kcard-deadline, .kcard-recurrence {
    font-size: 0.6875rem;
    color: var(--text-muted);
    padding: 2px 6px;
    background: var(--bg-elevated);
    border-radius: 3px;
  }
  .kcard-overdue { color: var(--energy-hi-text) !important; background: var(--energy-hi-bg) !important; }
  .kcard-recurrence { color: var(--accent-dim); }

  .kcard-progress-track {
    height: 3px;
    background: var(--bg-elevated);
    border-radius: 2px;
    margin-top: 0.625rem;
    overflow: hidden;
  }
  .kcard-progress-fill {
    height: 100%;
    background: var(--accent);
    border-radius: 2px;
    transition: width 0.3s;
  }
  .kcard-drag-hint {
    position: absolute;
    top: 50%;
    right: 0.5rem;
    transform: translateY(-50%);
    color: var(--text-ghost, #2e2b27);
    font-size: 0.875rem;
    letter-spacing: -0.1em;
    opacity: 0;
    transition: opacity 0.15s;
    pointer-events: none;
  }
  .kcard:hover .kcard-drag-hint { opacity: 1; }
`;
