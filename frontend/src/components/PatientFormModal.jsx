import { useState } from 'react';
import { CalendarDays, Check, FilePen, Info, MapPin, Phone } from 'lucide-react';
import Modal from './Modal';
import Field from './Field';
import { patientsApi } from '../api/endpoints';
import { useToast } from '../context/ToastContext';
import { todayISO } from '../utils/format';

const EMPTY = { fullName: '', cin: '', phone: '', birthDate: '', address: '' };

function clientValidate(f) {
  const e = {};
  if (f.fullName.trim().length < 2) e.fullName = 'Nom complet requis';
  if (!f.cin.trim()) e.cin = 'CIN requis';
  if (!f.phone.trim()) e.phone = 'Téléphone requis';
  if (!f.birthDate) e.birthDate = 'Date de naissance requise';
  return e;
}

// Create when `patient` is null, edit otherwise.
export default function PatientFormModal({ patient, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState(() =>
    patient ? { ...EMPTY, ...patient, address: patient.address || '' } : EMPTY,
  );
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrors((er) => ({ ...er, [key]: undefined }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const local = clientValidate(form);
    if (Object.keys(local).length) return setErrors(local);

    const payload = {
      fullName: form.fullName,
      cin: form.cin,
      phone: form.phone,
      birthDate: form.birthDate,
      address: form.address || null,
    };
    setSaving(true);
    try {
      const { data } = patient ? await patientsApi.update(patient.id, payload) : await patientsApi.create(payload);
      toast.success('Patient enregistré avec succès', 'Dossier mis à jour dans la base clinique');
      onSaved(data);
    } catch (err) {
      const fieldErrors = err.fieldErrors?.() || {};
      setErrors(fieldErrors);
      if (!Object.keys(fieldErrors).length) toast.error('Enregistrement impossible', err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={patient ? 'Modifier le patient' : 'Ajouter un patient'}
      icon={FilePen}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Annuler
          </button>
          <button type="submit" form="patient-form" className="btn btn-primary" disabled={saving}>
            <Check size={16} /> {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </>
      }
    >
      <form id="patient-form" className="form-grid" onSubmit={submit} noValidate>
        <Field label="Nom complet" required error={errors.fullName}>
          <input value={form.fullName} onChange={set('fullName')} placeholder="Houda Mansouri" autoFocus />
        </Field>
        <Field label="CIN" required error={errors.cin}>
          <input
            value={form.cin}
            onChange={set('cin')}
            placeholder="AB123456"
            style={{ textTransform: 'uppercase' }}
          />
        </Field>
        <Field label="Téléphone" required icon={Phone} error={errors.phone}>
          <input value={form.phone} onChange={set('phone')} placeholder="0612345678" inputMode="tel" />
        </Field>
        <Field label="Date de naissance" required icon={CalendarDays} error={errors.birthDate}>
          <input type="date" value={form.birthDate} onChange={set('birthDate')} max={todayISO()} />
        </Field>
        <Field label="Adresse" icon={MapPin} error={errors.address} className="span-2">
          <input value={form.address} onChange={set('address')} placeholder="14 Bd Zerktouni, Casablanca" />
        </Field>
        <div className="note span-2">
          <Info size={16} />
          Le numéro CIN est obligatoire pour le remboursement AMO / CNSS et la conformité du dossier médical au Maroc.
        </div>
      </form>
    </Modal>
  );
}
