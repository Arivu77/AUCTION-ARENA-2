import { createContext, useContext, useState, useCallback, useEffect } from 'react';

// ── Toast System ──────────────────────────────────────────────────────────────
const ToastContext = createContext(null);
export function useToast() { return useContext(ToastContext); }

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const addToast = useCallback((message, type = 'info', title = '') => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, message, type, title }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }, []);
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  return (
    <ToastContext.Provider value={addToast}>
      {children}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            <span className="toast-icon">{icons[t.type]}</span>
            <div className="toast-content">
              {t.title && <div className="toast-title">{t.title}</div>}
              <div className="toast-message" style={{ textTransform: 'none', letterSpacing: 0 }}>{t.message}</div>
            </div>
            <button className="toast-dismiss" onClick={() => setToasts(t2 => t2.filter(x => x.id !== t.id))}>✕</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// ── Button ────────────────────────────────────────────────────────────────────
export function Button({ variant = 'primary', size = 'md', loading, children, className = '', style, ...props }) {
  const variantMap = { primary: 'btn-primary', neon: 'btn-neon', cyan: 'btn-cyan', purple: 'btn-purple', pink: 'btn-pink', gold: 'btn-gold', secondary: 'btn-secondary', ghost: 'btn-ghost', danger: 'btn-danger', blue: 'btn-blue' };
  const sizeMap = { sm: 'btn-sm', md: '', lg: 'btn-lg', xl: 'btn-xl', icon: 'btn-icon' };
  return (
    <button
      className={`btn ${variantMap[variant] || 'btn-primary'} ${sizeMap[size] || ''} ${loading ? 'btn-loading' : ''} ${className}`}
      style={style}
      {...props}
    >
      {!loading && children}
    </button>
  );
}

// ── Input ─────────────────────────────────────────────────────────────────────
export function Input({ label, error, id, className = '', style, ...props }) {
  return (
    <div className="input-group" style={style}>
      {label && <label className="input-label" htmlFor={id}>{label}</label>}
      <input id={id} className={`input ${error ? 'input-error' : ''} ${className}`} {...props} />
      {error && <span className="input-error-text">{error}</span>}
    </div>
  );
}

// ── Select ────────────────────────────────────────────────────────────────────
export function Select({ label, id, children, className = '', style, ...props }) {
  return (
    <div className="input-group" style={style}>
      {label && <label className="input-label" htmlFor={id}>{label}</label>}
      <select id={id} className={`select ${className}`} {...props}>{children}</select>
    </div>
  );
}

// ── Badge ─────────────────────────────────────────────────────────────────────
export function Badge({ variant = 'purple', children, className = '', ...props }) {
  return <span className={`badge badge-${variant} ${className}`} {...props}>{children}</span>;
}

// ── Avatar ────────────────────────────────────────────────────────────────────
export function Avatar({ src, name, size = 'md', variant = '', className = '', ...props }) {
  const [imgError, setImgError] = useState(false);
  const initial = name ? name.charAt(0).toUpperCase() : '?';
  return (
    <div className={`avatar avatar-${size} ${variant ? `avatar-${variant}` : ''} ${className}`} {...props}>
      {src && !imgError
        ? <img src={src} alt={name || 'avatar'} referrerPolicy="no-referrer" onError={() => setImgError(true)} />
        : <span>{initial}</span>
      }
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, footer, maxWidth = 540 }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose?.(); };
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="modal" style={{ maxWidth }}>
        {title && (
          <div className="modal-header">
            <h3 style={{ fontSize: '1.1rem', margin: 0 }}>{title}</h3>
            <button onClick={onClose} className="btn btn-ghost btn-icon" style={{ width: 32, height: 32, fontSize: '0.9rem' }}>✕</button>
          </div>
        )}
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

// ── ProgressBar ───────────────────────────────────────────────────────────────
export function ProgressBar({ value = 0, max = 100, color }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="progress-bar-wrapper">
      <div className="progress-bar-fill" style={{ width: `${pct}%`, ...(color ? { background: color } : {}) }} />
    </div>
  );
}
