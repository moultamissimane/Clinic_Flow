import { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({ title, subtitle, icon: Icon, onClose, children, footer, size = 'md' }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal modal-${size}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          {Icon && (
            <span className="modal-icon">
              <Icon size={18} />
            </span>
          )}
          <div className="grow">
            <h2>{title}</h2>
            {subtitle && <p className="muted small">{subtitle}</p>}
          </div>
          <button className="icon-btn ghost" onClick={onClose} aria-label="Fermer">
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}
