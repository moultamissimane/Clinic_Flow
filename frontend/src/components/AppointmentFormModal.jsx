import { useEffect, useState } from 'react';
import { AlertTriangle, ArrowRight, CalendarDays, CalendarPlus, Clock, Info } from 'lucide-react';
import Modal from './Modal';
import Field from './Field';
import PatientPicker from './PatientPicker';
import { appointmentsApi } from '../api/endpoints';
import { useToast } from '../context/ToastContext';
import { combineDateTime, formatTime, nextQuarterHour, todayISO } from '../utils/format';

const WINDOW_MS = 30 * 60 * 1000;

// Looks up the patient's confirmed appointments that day and returns the one
// (if any) less than 30 minutes from the chosen time. Purely a UX preview: the
// API and the database enforce the rule.
function useConflictPreview(patient, date, time) {
  const [conflict, setConflict] = useState(null);

  useEffect(() => {
    setConflict(null);
    if (!patient || !date || !time) return;
    let cancelled = false;
    const target = new Date(`${date}T${time}:00`).getTime();
    appointmentsApi
      .list({ patientId: patient.id, date, status: 'confirmed', limit: 100 })
      .then(({ data }) => {
        if (cancelled) return;
        const hit = data.find((a) => Math.abs(new Date(a.appointmentDate).getTime() - target) < WINDOW_MS);
        setConflict(hit || null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [patient, date, time]);

  return conflict;
}

export default function AppointmentFormModal({ presetPatient = null, onClose, onCreated }) {
  const toast = useToast();
  const [patient, setPatient] = useState(presetPatient);
  const [form, setForm] = useState({
    date: todayISO(),
    time: nextQuarterHour(),
    status: 'pending',
    reason: '',
    notes: '',
  });
  const [errors, setErrors] = useState({});
  const [serverConflict, setServerConflict] = useState(null);
  const [saving, setSaving] = useState(false);
  const conflict = useConflictPreview(patient, form.date, form.time);

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrors((er) => ({ ...er, [key]: undefined }));
    setServerConflict(null);
  };

  const submit = async (e) => {
    e.preventDefault();
    const local = {};
    if (!patient) local.patientId = 'Sélectionnez un patient';
    if (!form.date) local.date = 'Date requise';
    if (!form.time) local.time = 'Heure requise';
    if (form.reason.trim().length < 2) local.reason = 'Motif requis';
    if (Object.keys(local).length) return setErrors(local);

    setSaving(true);
    try {
      const { data } = await appointmentsApi.create({
        patientId: patient.id,
        appointmentDate: combineDateTime(form.date, form.time),
        status: form.status,
        reason: form.reason,
        notes: form.notes || null,
      });
      toast.success('Rendez-vous créé', `${data.patient.fullName} — ${formatTime(data.appointmentDate)}`);
      onCreated(data);
    } catch (err) {
      if (err.status === 409) setServerConflict(err.message);
      else {
        const fe = err.fieldErrors?.() || {};
        setErrors({ ...fe, date: fe.appointmentDate });
        if (!Object.keys(fe).length) toast.error('Création impossible', err.message);
      }
    } finally {
      setSaving(false);
    }
  };

  const blocking = form.status === 'confirmed' && conflict;

  return (
    <Modal
      title="Nouveau rendez-vous"
      subtitle="Planifier une consultation médicale"
      icon={CalendarPlus}
      onClose={onClose}
      footer={
        <>
          <span className="muted small foot-note">
            <Info size={14} /> Règle : 2 RDV confirmés espacés d’au moins 30 min
          </span>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Annuler
          </button>
          <button type="submit" form="appointment-form" className="btn btn-primary" disabled={saving || blocking}>
            {saving ? 'Création…' : 'Créer le rendez-vous'} <ArrowRight size={16} />
          </button>
        </>
      }
    >
      <form id="appointment-form" className="form-grid" onSubmit={submit} noValidate>
        <div className="field span-2">
          <span className="field-label">
            Patient <span className="req">*</span>
          </span>
          <PatientPicker value={patient} onChange={setPatient} locked={Boolean(presetPatient)} error={errors.patientId} />
          {errors.patientId ? (
            <span className="field-error">{errors.patientId}</span>
          ) : (
            patient && <span className="field-hint">Patient enregistré dans la base active.</span>
          )}
        </div>

        <Field label="Date" required icon={CalendarDays} error={errors.date}>
          <input type="date" value={form.date} onChange={set('date')} />
        </Field>
        <Field label="Heure prévue" required icon={Clock} error={errors.time}>
          <input type="time" value={form.time} onChange={set('time')} step={300} />
        </Field>

        {(conflict || serverConflict) && (
          <div className={`alert span-2 ${blocking || serverConflict ? 'alert-danger' : 'alert-warning'}`}>
            <AlertTriangle size={18} />
            <div>
              <strong>Attention : conflit d’horaire détecté</strong>
              <p>
                {serverConflict ||
                  `Ce patient a déjà un rendez-vous confirmé dans une fenêtre de 30 minutes (${formatTime(conflict.appointmentDate)} — ${conflict.reason}).`}
                {!serverConflict && !blocking && ' Ce rendez-vous pourra être créé en attente mais pas confirmé.'}
              </p>
            </div>
          </div>
        )}

        <div className="field span-2">
          <span className="field-label">Statut initial</span>
          <div className="segmented" role="radiogroup" aria-label="Statut initial">
            {[
              ['pending', 'En attente'],
              ['confirmed', 'Confirmé'],
            ].map(([value, label]) => (
              <button
                type="button"
                key={value}
                role="radio"
                aria-checked={form.status === value}
                className={form.status === value ? 'active' : ''}
                onClick={() => set('status')({ target: { value } })}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <Field label="Motif de la consultation" required error={errors.reason} className="span-2">
          <input value={form.reason} onChange={set('reason')} placeholder="Consultation de contrôle" />
        </Field>
        <Field label="Notes (optionnel)" className="span-2" error={errors.notes}>
          <textarea rows={3} value={form.notes} onChange={set('notes')} placeholder="Informations complémentaires…" />
        </Field>
      </form>
    </Modal>
  );
}
