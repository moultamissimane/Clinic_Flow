import { useState } from 'react';
import { Check, RotateCcw, X } from 'lucide-react';
import { appointmentsApi } from '../api/endpoints';
import { useToast } from '../context/ToastContext';

// Available transitions per current status.
const ACTIONS = {
  pending: [
    { to: 'confirmed', label: 'Confirmer', icon: Check, tone: 'success' },
    { to: 'cancelled', label: 'Annuler', icon: X, tone: 'danger' },
  ],
  confirmed: [
    { to: 'pending', label: 'Remettre en attente', icon: RotateCcw, tone: 'neutral' },
    { to: 'cancelled', label: 'Annuler', icon: X, tone: 'danger' },
  ],
  cancelled: [{ to: 'pending', label: 'Rétablir (en attente)', icon: RotateCcw, tone: 'neutral' }],
};

export default function StatusActions({ appointment, onChanged }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const change = async (status, e) => {
    e.stopPropagation();
    setBusy(true);
    try {
      const { data } = await appointmentsApi.updateStatus(appointment.id, status);
      toast.success('Statut mis à jour', `${data.patient.fullName} — ${data.reason}`);
      onChanged?.(data);
    } catch (err) {
      toast.error(err.status === 409 ? 'Conflit d’horaire' : 'Échec de la mise à jour', err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="row-actions">
      {ACTIONS[appointment.status].map(({ to, label, icon: Icon, tone }) => (
        <button
          key={to}
          className={`icon-btn tone-${tone}`}
          title={label}
          aria-label={label}
          disabled={busy}
          onClick={(e) => change(to, e)}
        >
          <Icon size={16} />
        </button>
      ))}
    </div>
  );
}
