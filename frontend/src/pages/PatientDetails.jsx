import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Cake, CalendarPlus, CalendarX2, CreditCard, FileClock, MapPin, Pencil, Phone, Trash2 } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import StatusActions from '../components/StatusActions';
import Pagination from '../components/Pagination';
import Avatar from '../components/Avatar';
import Spinner from '../components/Spinner';
import EmptyState from '../components/EmptyState';
import PatientFormModal from '../components/PatientFormModal';
import AppointmentFormModal from '../components/AppointmentFormModal';
import ConfirmDialog from '../components/ConfirmDialog';
import { appointmentsApi, patientsApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { age, formatDate, formatLongDate, formatTime } from '../utils/format';

function InfoRow({ icon: Icon, label, children }) {
  return (
    <div className="info-row">
      <span className="info-icon">
        <Icon size={16} />
      </span>
      <div>
        <div className="muted small">{label}</div>
        <div className="strong">{children}</div>
      </div>
    </div>
  );
}

export default function PatientDetails() {
  const { id } = useParams();
  const { isAdmin } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [patient, setPatient] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [appointments, setAppointments] = useState(null);
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null); // 'edit' | 'appointment' | 'delete'
  const [busy, setBusy] = useState(false);

  const loadPatient = useCallback(async () => {
    try {
      setPatient((await patientsApi.get(id)).data);
    } catch (err) {
      if (err.status === 404 || err.status === 400) setNotFound(true);
      else toast.error('Chargement impossible', err.message);
    }
  }, [id, toast]);

  const loadAppointments = useCallback(async () => {
    try {
      setAppointments(await appointmentsApi.list({ patientId: id, page, limit: 8 }));
    } catch (err) {
      toast.error('Chargement des rendez-vous impossible', err.message);
    }
  }, [id, page, toast]);

  useEffect(() => {
    loadPatient();
  }, [loadPatient]);
  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  const remove = async () => {
    setBusy(true);
    try {
      await patientsApi.remove(id);
      toast.success('Patient supprimé', `${patient.fullName} a été archivé`);
      navigate('/patients', { replace: true });
    } catch (err) {
      toast.error('Suppression impossible', err.message);
      setBusy(false);
    }
  };

  if (notFound) {
    return (
      <div className="page">
        <EmptyState icon={CalendarX2} title="Patient introuvable" text="Ce dossier n’existe pas ou a été archivé.">
          <Link to="/patients" className="btn btn-light">
            Retour à la liste
          </Link>
        </EmptyState>
      </div>
    );
  }
  if (!patient) return <Spinner full />;

  return (
    <div className="page">
      <Link to="/patients" className="back-link">
        <ArrowLeft size={16} /> Retour à la liste des patients
      </Link>
      <PageHeader title={patient.fullName}>
        {isAdmin && (
          <button className="btn btn-danger-light" onClick={() => setModal('delete')}>
            <Trash2 size={16} /> Supprimer
          </button>
        )}
        <button className="btn btn-primary" onClick={() => setModal('appointment')}>
          <CalendarPlus size={16} /> Nouveau rendez-vous
        </button>
      </PageHeader>

      <section className="details-grid">
        <div className="card profile-card">
          <div className="profile-head">
            <Avatar name={patient.fullName} size="lg" />
            <div>
              <h2>{patient.fullName}</h2>
              <div className="muted small">{patient.appointmentCount} consultation(s) au total</div>
              <span className="tag">CIN : {patient.cin}</span>
            </div>
          </div>
          <div className="info-list">
            <InfoRow icon={CreditCard} label="Carte d’Identité Nationale">{patient.cin}</InfoRow>
            <InfoRow icon={Phone} label="Téléphone">
              <a href={`tel:${patient.phone}`}>{patient.phone}</a>
            </InfoRow>
            <InfoRow icon={Cake} label="Date de naissance">
              {formatLongDate(patient.birthDate).replace(/^\w+ /, '')} ({age(patient.birthDate)} ans)
            </InfoRow>
            <InfoRow icon={MapPin} label="Adresse">{patient.address || <span className="muted">Non renseignée</span>}</InfoRow>
            <InfoRow icon={FileClock} label="Création du dossier">
              {formatDate(patient.createdAt)}
              {patient.createdByName && <span className="muted"> par {patient.createdByName}</span>}
            </InfoRow>
          </div>
          <button className="btn btn-light btn-block" onClick={() => setModal('edit')}>
            <Pencil size={16} /> Modifier les informations
          </button>
        </div>

        <div className="card table-card">
          <div className="card-head">
            <div>
              <h3>
                Rendez-vous du patient{' '}
                {appointments && <span className="tag tag-teal">Total : {appointments.meta.total}</span>}
              </h3>
              <p className="muted small">Historique complet des consultations</p>
            </div>
          </div>
          {!appointments ? (
            <Spinner />
          ) : appointments.data.length === 0 ? (
            <EmptyState icon={CalendarX2} title="Aucun rendez-vous" text="Ce patient n’a pas encore de rendez-vous." />
          ) : (
            <>
              <div className="table-scroll">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Date et heure</th>
                      <th>Motif</th>
                      <th>Statut</th>
                      <th>Notes</th>
                      <th>Créé par</th>
                      <th className="right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.data.map((a) => (
                      <tr key={a.id}>
                        <td>
                          <div className="strong">{formatDate(a.appointmentDate)}</div>
                          <div className="muted small">{formatTime(a.appointmentDate)}</div>
                        </td>
                        <td>{a.reason}</td>
                        <td>
                          <StatusBadge status={a.status} />
                        </td>
                        <td className="notes-cell">{a.notes || <span className="muted">—</span>}</td>
                        <td className="small">{a.createdByName}</td>
                        <td className="right">
                          <StatusActions appointment={a} onChanged={loadAppointments} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination meta={appointments.meta} onChange={setPage} noun="rendez-vous" />
            </>
          )}
        </div>
      </section>

      {modal === 'edit' && (
        <PatientFormModal
          patient={patient}
          onClose={() => setModal(null)}
          onSaved={(p) => {
            setModal(null);
            setPatient((prev) => ({ ...prev, ...p }));
          }}
        />
      )}
      {modal === 'appointment' && (
        <AppointmentFormModal
          presetPatient={patient}
          onClose={() => setModal(null)}
          onCreated={() => {
            setModal(null);
            loadAppointments();
            loadPatient();
          }}
        />
      )}
      {modal === 'delete' && (
        <ConfirmDialog
          title="Supprimer le patient ?"
          badge="ADMIN"
          message="Le dossier sera archivé et ses rendez-vous à venir annulés. L’historique médical est conservé."
          busy={busy}
          onConfirm={remove}
          onCancel={() => setModal(null)}
        />
      )}
    </div>
  );
}
