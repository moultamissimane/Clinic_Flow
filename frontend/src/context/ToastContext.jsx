import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';

const ToastContext = createContext(null);
let nextId = 1;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const push = useCallback(
    (type, title, message) => {
      const id = nextId++;
      setToasts((list) => [...list, { id, type, title, message }]);
      setTimeout(() => dismiss(id), 4500);
    },
    [dismiss],
  );

  const value = useMemo(
    () => ({
      success: (title, message) => push('success', title, message),
      error: (title, message) => push('error', title, message),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            <span className="toast-icon">{t.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}</span>
            <div className="toast-body">
              <strong>{t.title}</strong>
              {t.message && <span>{t.message}</span>}
            </div>
            <button className="icon-btn ghost" onClick={() => dismiss(t.id)} aria-label="Fermer">
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
