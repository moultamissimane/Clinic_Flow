import { useEffect, useState } from 'react';
import { Search, UserRound, XCircle } from 'lucide-react';
import { patientsApi } from '../api/endpoints';
import useDebounce from '../utils/useDebounce';

// Search-as-you-type patient selector (by name or CIN).
export default function PatientPicker({ value, onChange, error, locked = false }) {
  const [term, setTerm] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const debounced = useDebounce(term, 250);

  useEffect(() => {
    if (value || !open) return;
    let cancelled = false;
    patientsApi
      .list({ search: debounced, limit: 6 })
      .then(({ data }) => !cancelled && setResults(data))
      .catch(() => !cancelled && setResults([]));
    return () => {
      cancelled = true;
    };
  }, [debounced, open, value]);

  if (value) {
    return (
      <div className={`picker-selected ${error ? 'has-error' : ''}`}>
        <UserRound size={16} className="text-primary" />
        <strong>{value.fullName}</strong>
        <span className="tag">{value.cin}</span>
        {!locked && (
          <button type="button" className="icon-btn ghost push-right" onClick={() => onChange(null)} aria-label="Changer de patient">
            <XCircle size={18} />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="picker">
      <span className={`input-wrap with-icon ${error ? 'has-error' : ''}`}>
        <Search size={16} className="input-icon" />
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Rechercher par nom ou CIN…"
        />
      </span>
      {open && (
        <ul className="picker-list">
          {results.length === 0 && <li className="muted small picker-empty">Aucun patient trouvé</li>}
          {results.map((p) => (
            <li key={p.id}>
              <button type="button" onMouseDown={() => onChange(p)}>
                <span>{p.fullName}</span>
                <span className="tag">{p.cin}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
