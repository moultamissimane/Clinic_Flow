import { AlertTriangle } from 'lucide-react';

export default function ConfirmDialog({ title, message, confirmLabel = 'Confirmer', badge, busy, onConfirm, onCancel }) {
  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="confirm" role="alertdialog" aria-modal="true" aria-label={title}>
        <span className="confirm-icon">
          <AlertTriangle size={20} />
        </span>
        <div className="grow">
          <div className="confirm-title">
            <strong>{title}</strong>
            {badge && <span className="tag tag-danger">{badge}</span>}
          </div>
          <p className="muted small">{message}</p>
          <div className="confirm-actions">
            <button className="btn btn-ghost btn-sm" onClick={onCancel} disabled={busy}>
              Annuler
            </button>
            <button className="btn btn-danger btn-sm" onClick={onConfirm} disabled={busy}>
              {busy ? 'Suppression…' : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
