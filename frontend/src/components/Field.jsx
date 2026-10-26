import { AlertCircle } from 'lucide-react';

// Label + input wrapper with optional leading icon and inline error.
export default function Field({ label, required, error, icon: Icon, hint, children, className = '' }) {
  return (
    <label className={`field ${error ? 'has-error' : ''} ${className}`}>
      <span className="field-label">
        {label} {required && <span className="req">*</span>}
      </span>
      <span className={`input-wrap ${Icon ? 'with-icon' : ''}`}>
        {Icon && <Icon size={16} className="input-icon" />}
        {children}
        {error && <AlertCircle size={16} className="input-error-icon" />}
      </span>
      {error ? <span className="field-error">{error}</span> : hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}
