import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarCheck, CalendarX2, CheckCircle2, Clock, Plus, TrendingUp, Users } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import StatusActions from '../components/StatusActions';
import Pagination from '../components/Pagination';
import Avatar from '../components/Avatar';
import Spinner from '../components/Spinner';
import EmptyState from '../components/EmptyState';
import AppointmentFormModal from '../components/AppointmentFormModal';
import { appointmentsApi, dashboardApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatLongDate, formatTime, todayISO } from '../utils/format';

function StatCard({ label, value, icon: Icon, tone, children }) {
  return (
    <div className="card stat">
      <div className="stat-head">
        <span className="muted small">{label}</span>
        <span className={`stat-icon tone-${tone}`}>
          <Icon size={18} />
        </span>
      </div>
      <div className="stat-value">{value ?? '—'}</div>
      <div className="stat-foot">{children}</div>
    </div>
  );
}

function Bar({ label, value, total, tone }) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <div className="bar">
      <div className="bar-label">
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <div className="bar-track">
        <div className={`bar-fill tone-${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [today, setToday] = useState(null);
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    try {
      const [s, a] = await Promise.all([
        dashboardApi.stats(),
        appointmentsApi.list({ date: todayISO(), page, limit: 8 }),
      ]);
      setStats(s.data);
      setToday(a);
    } catch (err) {
      toast.error('Chargement impossible', err.message);
    }
  }, [page, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const firstName = user.fullName.replace(/^Dr\.?\s*/i, '').split(' ')[0];
  const next = today?.data.find((a) => a.status !== 'cancelled' && new Date(a.appointmentDate) >= new Date());

  return (
    <div className="page">
      <PageHeader title="Tableau de bord" subtitle={formatLongDate()} />

      <section className="card welcome">
        <div>
          <h2>Bonjour {firstName}, voici l’activité du cabinet aujourd’hui</h2>
          {stats && (
            <p className="muted">
              Vous avez {stats.todayAppointments} rendez-vous programmé{stats.todayAppointments > 1 ? 's' : ''} aujourd’hui
              et {stats.pending} dossier{stats.pending > 1 ? 's' : ''} en attente de validation.
            </p>
          )}
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={16} /> Nouveau rendez-vous
        </button>
      </section>

      <section className="stats-grid">
        <StatCard label="Total patients" value={stats?.totalPatients} icon={Users} tone="teal">
          <span className="text-primary small">
            <TrendingUp size={14} /> +{stats?.newPatientsThisMonth ?? 0} ce mois
          </span>
        </StatCard>
        <StatCard label="Rendez-vous du jour" value={stats?.todayAppointments} icon={CalendarCheck} tone="teal">
          <span className="muted small">aujourd’hui</span>
        </StatCard>
        <StatCard label="En attente" value={stats?.pending} icon={Clock} tone="amber">
          {stats?.pending ? <span className="tag tag-warning">Action requise</span> : <span className="muted small">Rien à valider</span>}
        </StatCard>
        <StatCard label="Confirmés" value={stats?.confirmed} icon={CheckCircle2} tone="green">
          <span className="tag tag-success">Planning stable</span>
        </StatCard>
      </section>

      <section className="dash-grid">
        <div className="card table-card">
          <div className="card-head">
            <div>
              <h3>Rendez-vous d’aujourd’hui</h3>
              <p className="muted small">{today ? `${today.meta.total} consultation(s) enregistrée(s)` : '…'}</p>
            </div>
          </div>
          {!today ? (
            <Spinner />
          ) : today.data.length === 0 ? (
            <EmptyState icon={CalendarX2} title="Aucun rendez-vous aujourd’hui" text="Planifiez une consultation pour la voir ici." />
          ) : (
            <>
              <div className="table-scroll">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Heure</th>
                      <th>Patient</th>
                      <th>Motif de consultation</th>
                      <th>Statut</th>
                      <th className="right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {today.data.map((a) => (
                      <tr key={a.id} className="clickable" onClick={() => navigate(`/patients/${a.patientId}`)}>
                        <td className="strong">{formatTime(a.appointmentDate)}</td>
                        <td>
                          <div className="person">
                            <Avatar name={a.patient.fullName} size="sm" />
                            <div>
                              <div className="strong">{a.patient.fullName}</div>
                              <div className="muted small">{a.patient.phone}</div>
                            </div>
                          </div>
                        </td>
                        <td>{a.reason}</td>
                        <td>
                          <StatusBadge status={a.status} />
                        </td>
                        <td className="right">
                          <StatusActions appointment={a} onChanged={load} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination meta={today.meta} onChange={setPage} noun="rendez-vous" />
            </>
          )}
        </div>

        <aside className="side-col">
          <div className="card">
            <h3>Répartition du jour</h3>
            {stats && (
              <div className="bars">
                <Bar label="Confirmés" value={stats.today.confirmed} total={stats.todayAppointments} tone="teal" />
                <Bar label="En attente" value={stats.today.pending} total={stats.todayAppointments} tone="amber" />
                <Bar label="Annulés" value={stats.today.cancelled} total={stats.todayAppointments} tone="red" />
              </div>
            )}
          </div>
          <div className="card next-card">
            <h3>Prochain rendez-vous</h3>
            {next ? (
              <div className="next">
                <span className="next-time">{formatTime(next.appointmentDate)}</span>
                <div>
                  <div className="strong">{next.patient.fullName}</div>
                  <div className="muted small">{next.reason}</div>
                  <StatusBadge status={next.status} />
                </div>
              </div>
            ) : (
              <EmptyState icon={CalendarX2} title="Tranche horaire libre" text="Aucun autre rendez-vous prévu aujourd’hui." />
            )}
          </div>
        </aside>
      </section>

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
