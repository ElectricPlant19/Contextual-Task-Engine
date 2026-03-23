import { useState, useRef, useEffect } from 'react';
import type { TaskFormData } from '../types';
import api from '../services/api';

// ─── Types ───────────────────────────────────────────────────
type Step = 'input' | 'parsing' | 'preview' | 'error';

interface ParsedPreview {
  title: string;
  description: string;
  energyRequired: 'low' | 'medium' | 'high';
  estimatedTimeMinutes: number;
  deadline: string;
  recurrence: 'none' | 'daily' | 'weekly' | 'monthly';
}

interface QuickCaptureProps {
  onConfirm: (data: TaskFormData) => Promise<void>;
  onClose: () => void;
  isOpen: boolean;
}

// ─── Example prompts cycling ─────────────────────────────────
const EXAMPLES = [
  'finish psych essay by Thursday, 2 hours, need full focus',
  'review chem notes before Friday exam, low energy ok, 45 min',
  'weekly reading for history class, 1 hour, every Monday',
  'debug the sorting algorithm, high energy, due tomorrow',
  'email professor about extension, 15 min, low energy',
  'group project slides due Sunday, 3 hours, high focus',
];

// ─── Helpers ─────────────────────────────────────────────────
function energyLabel(e: string) {
  if (e === 'low')    return { icon: '🌙', text: 'Low energy',    color: 'var(--energy-low-text)'  };
  if (e === 'medium') return { icon: '☀️', text: 'Medium energy', color: 'var(--energy-med-text)'  };
  return                     { icon: '⚡', text: 'High energy',   color: 'var(--energy-hi-text)'   };
}

function formatMin(m: number) {
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60), r = m % 60;
  return r ? `${h}h ${r}m` : `${h}h`;
}

// ─── Editable field ──────────────────────────────────────────
function EditableField({
  label, value, onChange, type = 'text', options,
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  type?: 'text' | 'select' | 'number' | 'date';
  options?: { value: string; label: string }[];
}) {
  if (type === 'select' && options) {
    return (
      <div className="qc-field">
        <span className="qc-field-label">{label}</span>
        <select
          className="qc-field-select"
          value={String(value)}
          onChange={e => onChange(e.target.value)}
        >
          {options.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
    );
  }
  return (
    <div className="qc-field">
      <span className="qc-field-label">{label}</span>
      <input
        className="qc-field-input"
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        min={type === 'number' ? 1 : undefined}
        max={type === 'number' ? 480 : undefined}
      />
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────
export function QuickCapture({ onConfirm, onClose, isOpen }: QuickCaptureProps) {
  const [step, setStep]         = useState<Step>('input');
  const [text, setText]         = useState('');
  const [preview, setPreview]   = useState<ParsedPreview | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [saving, setSaving]     = useState(false);
  const [exampleIdx, setExampleIdx] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Cycle placeholder examples
  useEffect(() => {
    const t = setInterval(() => setExampleIdx(i => (i + 1) % EXAMPLES.length), 3000);
    return () => clearInterval(t);
  }, []);

  // Focus textarea when opened
  useEffect(() => {
    if (isOpen && step === 'input') {
      setTimeout(() => textareaRef.current?.focus(), 80);
    }
  }, [isOpen, step]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => { setStep('input'); setText(''); setPreview(null); setErrorMsg(''); }, 300);
    }
  }, [isOpen]);

  // ── Parse ──
  async function handleParse() {
    if (!text.trim()) return;
    setStep('parsing');
    try {
      const { data } = await api.post<{ parsed: ParsedPreview }>('/tasks/parse', { text: text.trim() });
      setPreview(data.parsed);
      setStep('preview');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setErrorMsg(e.response?.data?.message ?? 'Could not parse. Try rephrasing.');
      setStep('error');
    }
  }

  // ── Confirm save ──
  async function handleConfirm() {
    if (!preview) return;
    setSaving(true);
    try {
      await onConfirm({
        title: preview.title,
        description: preview.description,
        energyRequired: preview.energyRequired,
        estimatedTimeMinutes: Number(preview.estimatedTimeMinutes),
        deadline: preview.deadline,
        recurrence: preview.recurrence,
        progress: 0,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  // ── Keyboard shortcuts ──
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && step === 'input') {
      handleParse();
    }
    if (e.key === 'Escape') onClose();
  }

  const energy = preview ? energyLabel(preview.energyRequired) : null;

  if (!isOpen) return null;

  return (
    <div className="qc-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="qc-panel animate-slide-up" onKeyDown={handleKeyDown}>

        {/* ── Header ── */}
        <div className="qc-header">
          <div className="qc-header-left">
            <span className="qc-badge">AI</span>
            <span className="qc-title">Quick capture</span>
          </div>
          <button className="qc-close" onClick={onClose} aria-label="Close">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* ── Step: input ── */}
        {(step === 'input' || step === 'parsing') && (
          <div className="qc-body">
            <div className="qc-input-wrap">
              <textarea
                ref={textareaRef}
                className="qc-textarea"
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder={`e.g. "${EXAMPLES[exampleIdx]}"`}
                rows={3}
                maxLength={500}
                disabled={step === 'parsing'}
              />
              <div className="qc-input-footer">
                <span className="qc-char-count">{text.length}/500</span>
                <span className="qc-hint">⌘ + Enter to parse</span>
              </div>
            </div>

            {/* Example chips */}
            <div className="qc-chips">
              {EXAMPLES.slice(0, 3).map((ex, i) => (
                <button
                  key={i}
                  className="qc-chip"
                  onClick={() => setText(ex)}
                  disabled={step === 'parsing'}
                >
                  {ex.length > 42 ? ex.slice(0, 42) + '…' : ex}
                </button>
              ))}
            </div>

            <button
              className="qc-parse-btn"
              onClick={handleParse}
              disabled={!text.trim() || step === 'parsing'}
            >
              {step === 'parsing' ? (
                <>
                  <span className="qc-spinner" />
                  Parsing...
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" strokeLinejoin="round"/>
                  </svg>
                  Parse with AI
                </>
              )}
            </button>
          </div>
        )}

        {/* ── Step: error ── */}
        {step === 'error' && (
          <div className="qc-body">
            <div className="qc-error-box">
              <span className="qc-error-icon">⚠</span>
              <p className="qc-error-text">{errorMsg}</p>
            </div>
            <button className="qc-secondary-btn" onClick={() => setStep('input')}>
              ← Try again
            </button>
          </div>
        )}

        {/* ── Step: preview ── */}
        {step === 'preview' && preview && energy && (
          <div className="qc-body">
            <div className="qc-preview-label">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" strokeLinejoin="round"/>
              </svg>
              AI parsed — edit anything below
            </div>

            {/* Parsed result — all editable */}
            <div className="qc-preview-card">
              {/* Title */}
              <div className="qc-field qc-field-title">
                <span className="qc-field-label">Title</span>
                <input
                  className="qc-field-input qc-title-input"
                  value={preview.title}
                  onChange={e => setPreview(p => p ? { ...p, title: e.target.value } : p)}
                />
              </div>

              {/* Description */}
              <div className="qc-field">
                <span className="qc-field-label">Notes</span>
                <input
                  className="qc-field-input"
                  value={preview.description}
                  placeholder="Optional details..."
                  onChange={e => setPreview(p => p ? { ...p, description: e.target.value } : p)}
                />
              </div>

              {/* Row: energy + time */}
              <div className="qc-row">
                <EditableField
                  label="Energy"
                  type="select"
                  value={preview.energyRequired}
                  onChange={v => setPreview(p => p ? { ...p, energyRequired: v as ParsedPreview['energyRequired'] } : p)}
                  options={[
                    { value: 'low',    label: '🌙 Low'    },
                    { value: 'medium', label: '☀️ Medium' },
                    { value: 'high',   label: '⚡ High'   },
                  ]}
                />
                <EditableField
                  label="Time (min)"
                  type="number"
                  value={preview.estimatedTimeMinutes}
                  onChange={v => setPreview(p => p ? { ...p, estimatedTimeMinutes: parseInt(v) || 30 } : p)}
                />
              </div>

              {/* Row: deadline + recurrence */}
              <div className="qc-row">
                <EditableField
                  label="Deadline"
                  type="date"
                  value={preview.deadline}
                  onChange={v => setPreview(p => p ? { ...p, deadline: v } : p)}
                />
                <EditableField
                  label="Repeats"
                  type="select"
                  value={preview.recurrence}
                  onChange={v => setPreview(p => p ? { ...p, recurrence: v as ParsedPreview['recurrence'] } : p)}
                  options={[
                    { value: 'none',    label: 'Never'   },
                    { value: 'daily',   label: 'Daily'   },
                    { value: 'weekly',  label: 'Weekly'  },
                    { value: 'monthly', label: 'Monthly' },
                  ]}
                />
              </div>

              {/* Summary pill row */}
              <div className="qc-pills">
                <span className="qc-pill" style={{ color: energy.color, background: `${energy.color}18`, border: `1px solid ${energy.color}33` }}>
                  {energy.icon} {energy.text}
                </span>
                <span className="qc-pill">{formatMin(preview.estimatedTimeMinutes)}</span>
                {preview.deadline && (
                  <span className="qc-pill">
                    📅 {new Date(preview.deadline + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                )}
                {preview.recurrence !== 'none' && (
                  <span className="qc-pill">↻ {preview.recurrence}</span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="qc-actions">
              <button className="qc-secondary-btn" onClick={() => setStep('input')}>
                ← Re-parse
              </button>
              <button
                className="qc-confirm-btn"
                onClick={handleConfirm}
                disabled={saving || !preview.title.trim()}
              >
                {saving ? 'Saving...' : 'Add task →'}
              </button>
            </div>
          </div>
        )}

      </div>

      <style>{QC_STYLES}</style>
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────
const QC_STYLES = `
  .qc-backdrop {
    position: fixed;
    inset: 0;
    z-index: 60;
    background: rgba(8,10,14,0.78);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding-top: clamp(3rem, 12vh, 8rem);
    padding-left: 1rem;
    padding-right: 1rem;
  }

  .qc-panel {
    width: 100%;
    max-width: 560px;
    background: var(--bg-surface, #0f1218);
    border: 1px solid var(--border-mid, rgba(255,255,255,0.12));
    border-radius: 14px;
    box-shadow: 0 24px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(212,168,83,0.08);
    overflow: hidden;
    position: relative;
  }
  .qc-panel::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(212,168,83,0.4), transparent);
  }

  /* Header */
  .qc-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--border-subtle, rgba(255,255,255,0.06));
  }
  .qc-header-left { display: flex; align-items: center; gap: 0.625rem; }
  .qc-badge {
    font-family: var(--font-display, sans-serif);
    font-size: 0.5625rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    padding: 2px 6px;
    border-radius: 3px;
    background: rgba(212,168,83,0.15);
    color: var(--accent, #d4a853);
    border: 1px solid rgba(212,168,83,0.25);
  }
  .qc-title {
    font-family: var(--font-display, sans-serif);
    font-size: 0.8125rem;
    font-weight: 600;
    letter-spacing: 0.02em;
    color: var(--text-primary, #f0ebe3);
  }
  .qc-close {
    background: none; border: none; cursor: pointer;
    color: var(--text-muted, #5e5a55);
    padding: 4px; border-radius: 4px;
    display: flex; align-items: center; justify-content: center;
    transition: color 0.15s, background 0.15s;
  }
  .qc-close:hover { color: var(--text-primary, #f0ebe3); background: var(--bg-raised, #161b24); }

  /* Body */
  .qc-body {
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.875rem;
  }

  /* Textarea */
  .qc-input-wrap {
    display: flex;
    flex-direction: column;
    gap: 0;
    border: 1px solid var(--border-subtle, rgba(255,255,255,0.06));
    border-radius: 8px;
    overflow: hidden;
    transition: border-color 0.18s;
    background: var(--bg-raised, #161b24);
  }
  .qc-input-wrap:focus-within {
    border-color: rgba(212,168,83,0.35);
    box-shadow: 0 0 0 3px rgba(212,168,83,0.08);
  }
  .qc-textarea {
    width: 100%;
    background: transparent;
    border: none;
    outline: none;
    color: var(--text-primary, #f0ebe3);
    font-family: var(--font-body, 'DM Sans', sans-serif);
    font-size: 0.9375rem;
    font-weight: 300;
    line-height: 1.6;
    padding: 0.875rem 1rem;
    resize: none;
  }
  .qc-textarea::placeholder { color: var(--text-ghost, #2e2b27); font-style: italic; }
  .qc-textarea:disabled { opacity: 0.5; }
  .qc-input-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.375rem 0.875rem;
    border-top: 1px solid var(--border-subtle, rgba(255,255,255,0.06));
  }
  .qc-char-count, .qc-hint {
    font-size: 0.6875rem;
    color: var(--text-muted, #5e5a55);
  }

  /* Example chips */
  .qc-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.375rem;
  }
  .qc-chip {
    font-size: 0.6875rem;
    padding: 0.3125rem 0.625rem;
    background: var(--bg-raised, #161b24);
    border: 1px solid var(--border-subtle, rgba(255,255,255,0.06));
    border-radius: 20px;
    color: var(--text-muted, #5e5a55);
    cursor: pointer;
    transition: all 0.15s;
    text-align: left;
    font-family: var(--font-body, sans-serif);
  }
  .qc-chip:hover:not(:disabled) {
    border-color: rgba(212,168,83,0.3);
    color: var(--accent, #d4a853);
    background: rgba(212,168,83,0.06);
  }
  .qc-chip:disabled { opacity: 0.4; cursor: not-allowed; }

  /* Parse button */
  .qc-parse-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.75rem;
    background: var(--accent, #d4a853);
    color: #0a0704;
    border: none;
    border-radius: 8px;
    font-family: var(--font-display, sans-serif);
    font-size: 0.8125rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    cursor: pointer;
    transition: all 0.18s;
    box-shadow: 0 2px 12px rgba(212,168,83,0.25);
  }
  .qc-parse-btn:hover:not(:disabled) {
    background: #dbb562;
    box-shadow: 0 4px 20px rgba(212,168,83,0.4);
    transform: translateY(-1px);
  }
  .qc-parse-btn:disabled { opacity: 0.45; cursor: not-allowed; transform: none; }

  /* Spinner */
  .qc-spinner {
    width: 14px; height: 14px;
    border: 2px solid rgba(10,7,4,0.3);
    border-top-color: #0a0704;
    border-radius: 50%;
    animation: qc-spin 0.7s linear infinite;
    flex-shrink: 0;
  }
  @keyframes qc-spin { to { transform: rotate(360deg); } }

  /* Error */
  .qc-error-box {
    display: flex;
    align-items: flex-start;
    gap: 0.625rem;
    padding: 0.875rem 1rem;
    background: var(--energy-hi-bg, rgba(220,80,80,0.08));
    border: 1px solid var(--energy-hi-border, rgba(220,80,80,0.2));
    border-radius: 8px;
  }
  .qc-error-icon { font-size: 0.875rem; color: var(--energy-hi-text, #dc5050); flex-shrink: 0; }
  .qc-error-text { font-size: 0.875rem; color: var(--energy-hi-text, #dc5050); margin: 0; }

  /* Preview label */
  .qc-preview-label {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    font-family: var(--font-display, sans-serif);
    font-size: 0.625rem;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--accent, #d4a853);
  }

  /* Preview card */
  .qc-preview-card {
    background: var(--bg-raised, #161b24);
    border: 1px solid var(--border-subtle, rgba(255,255,255,0.06));
    border-radius: 10px;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  /* Fields */
  .qc-field { display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 0; }
  .qc-field-title { flex: none; }
  .qc-field-label {
    font-family: var(--font-display, sans-serif);
    font-size: 0.5625rem;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--text-muted, #5e5a55);
  }
  .qc-field-input {
    background: var(--bg-elevated, #1e2530);
    border: 1px solid var(--border-subtle, rgba(255,255,255,0.06));
    border-radius: 5px;
    color: var(--text-primary, #f0ebe3);
    font-family: var(--font-body, sans-serif);
    font-size: 0.875rem;
    padding: 0.4375rem 0.625rem;
    outline: none;
    width: 100%;
    transition: border-color 0.15s;
  }
  .qc-title-input { font-weight: 500; }
  .qc-field-input:focus { border-color: rgba(212,168,83,0.35); }
  .qc-field-select {
    background: var(--bg-elevated, #1e2530);
    border: 1px solid var(--border-subtle, rgba(255,255,255,0.06));
    border-radius: 5px;
    color: var(--text-primary, #f0ebe3);
    font-family: var(--font-body, sans-serif);
    font-size: 0.875rem;
    padding: 0.4375rem 0.625rem;
    outline: none;
    width: 100%;
    cursor: pointer;
    transition: border-color 0.15s;
    appearance: none;
  }
  .qc-field-select:focus { border-color: rgba(212,168,83,0.35); }

  /* Row layout */
  .qc-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.625rem; }

  /* Summary pills */
  .qc-pills { display: flex; flex-wrap: wrap; gap: 0.375rem; padding-top: 0.25rem; }
  .qc-pill {
    font-size: 0.6875rem;
    padding: 3px 8px;
    border-radius: 4px;
    background: var(--bg-elevated, #1e2530);
    border: 1px solid var(--border-subtle, rgba(255,255,255,0.06));
    color: var(--text-muted, #5e5a55);
    font-family: var(--font-display, sans-serif);
    font-weight: 500;
  }

  /* Actions row */
  .qc-actions { display: flex; gap: 0.625rem; }
  .qc-secondary-btn {
    padding: 0.625rem 0.875rem;
    background: transparent;
    border: 1px solid var(--border-mid, rgba(255,255,255,0.12));
    border-radius: 7px;
    color: var(--text-secondary, #a8a099);
    font-family: var(--font-display, sans-serif);
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    cursor: pointer;
    transition: all 0.15s;
    white-space: nowrap;
  }
  .qc-secondary-btn:hover { border-color: var(--border-bright, rgba(255,255,255,0.22)); color: var(--text-primary, #f0ebe3); background: var(--bg-raised, #161b24); }
  .qc-confirm-btn {
    flex: 1;
    padding: 0.6875rem 1rem;
    background: var(--accent, #d4a853);
    color: #0a0704;
    border: none;
    border-radius: 7px;
    font-family: var(--font-display, sans-serif);
    font-size: 0.8125rem;
    font-weight: 700;
    letter-spacing: 0.05em;
    cursor: pointer;
    transition: all 0.18s;
    box-shadow: 0 2px 8px rgba(212,168,83,0.25);
  }
  .qc-confirm-btn:hover:not(:disabled) { background: #dbb562; box-shadow: 0 4px 16px rgba(212,168,83,0.35); }
  .qc-confirm-btn:disabled { opacity: 0.45; cursor: not-allowed; }
`;