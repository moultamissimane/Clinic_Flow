import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CalendarDays, CalendarX2, Plus, X } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import StatusActions from '../components/StatusActions';
import Pagination from '../components/Pagination';
import Avatar from '../components/Avatar';
import Spinner from '../components/Spinner';
import EmptyState from '../components/EmptyState';
import AppointmentFormModal from '../components/AppointmentFormModal';
import { appointmentsApi } from '../api/endpoints';
import { useToast } from '../context/ToastContext';
import { STATUS, formatDate, formatTime, todayISO } from '../utils/format';

export default function Appointments() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const date = params.get('date') || '';
  const status = params.get('status') || '';
  const page = Number(params.get('page')) || 1;

  const [result, setResult] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  // Changing a filter resets to page 1.
  const update = (changes) => {
    const next = { date, status, ...changes };
    if (!('page' in changes)) delete next.page;
    setParams(Object.fromEntries(Object.entries(next).filter(([, v]) => v)));
  };

  const load = useCallback(async () => {
    try {
      setResult(await appointmentsApi.list({ date, status, page, limit: 10 }));
    } catch (err) {
      toast.error('Chargement impossible', err.message);
    }
  }, [date, status, page, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const hasFilters = date || status;

  return (
    <div className="page">
      <PageHeader title="Planning & rendez-vous" subtitle="Créez, filtrez et mettez à jour les consultations">
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={16} /> Nouveau rendez-vous
        </button>
      </PageHeader>

      <div className="card table-card">
        <div className="toolbar">
          <label className="input-wrap with-icon filter">
            <CalendarDays size={16} className="input-icon" />
            <input type="date" value={date} onChange={(e) => update({ date: e.target.value })} aria-label="Filtrer par date" />
          </label>
          <button className={`btn btn-sm ${date === todayISO() ? 'btn-primary' : 'btn-light'}`} onClick={() => update({ date: todayISO() })}>
            Aujourd’hui
          </button>

          <div className="chips" role="group" aria-label="Filtrer par statut">
            <button className={`chip ${!status ? 'active' : ''}`} onClick={() => update({ status: '' })}>
              Tous
            </button>
            {Object.entries(STATUS).map(([key, s]) => (
              <button key={key} className={`chip chip-${s.tone} ${status === key ? 'active' : ''}`} onClick={() => update({ status: key })}>
                {s.label}
              </button>
            ))}
          </div>

          {hasFilters && (
            <button className="btn btn-ghost btn-sm push-right" onClick={() => setParams({})}>
              <X size={14} /> Réinitialiser
            </button>
          )}
        </div>

        {!result ? (
          <Spinner />
        ) : result.data.length === 0 ? (
          <EmptyState icon={CalendarX2} title="Aucun rendez-vous" text={hasFilters ? 'Aucun résultat pour ces filtres.' : 'Créez le premier rendez-vous.'} />
        ) : (
          <>
            <div className="table-scroll">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Heure</th>
                    <th>Patient</th>
                    <th>Motif</th>
                    <th>Statut</th>
                    <th>Créé par</th>
                    <th className="right">Mettre à jour</th>
                  </tr>
                </thead>
                <tbody>
                  {result.data.map((a) => (
                    <tr key={a.id}>
                      <td>{formatDate(a.appointmentDate)}</td>
                      <td className="strong">{formatTime(a.appointmentDate)}</td>
                      <td>
                        <Link to={`/patients/${a.patientId}`} className="person link">
                          <Avatar name={a.patient.fullName} size="sm" />
                          <div>
                            <div className="strong">{a.patient.fullName}</div>
                            <div className="muted small">{a.patient.cin}</div>
                          </div>
                        </Link>
                      </td>
                      <td>
                        <div>{a.reason}</div>
                        {a.notes && <div className="muted small notes-cell">{a.notes}</div>}
                      </td>
                      <td>
                        <StatusBadge status={a.status} />
                      </td>
                      <td className="small">{a.createdByName}</td>
                      <td className="right">
                        <StatusActions appointment={a} onChanged={load} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination meta={result.meta} onChange={(p) => update({ page: String(p) })} noun="rendez-vous" />
          </>
        )}
      </div>

      {showCreate && (
        <AppointmentFormModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            load();
          }}
        />
      )}
    </div>
  );
}
