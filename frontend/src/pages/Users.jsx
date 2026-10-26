import { useCallback, useEffect, useState } from 'react';
import { Check, Mail, Plus, UserCog } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import Avatar from '../components/Avatar';
import Spinner from '../components/Spinner';
import Modal from '../components/Modal';
import Field from '../components/Field';
import { usersApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatDate } from '../utils/format';

function UserFormModal({ onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({ fullName: '', email: '', password: '', role: 'staff' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setErrors((er) => ({ ...er, [k]: undefined }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await usersApi.create(form);
      toast.success('Utilisateur créé', data.email);
      onSaved();
    } catch (err) {
      const fe = err.fieldErrors?.() || {};
      setErrors(fe);
      if (!Object.keys(fe).length) toast.error('Création impossible', err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Nouvel utilisateur"
      icon={UserCog}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>
            Annuler
          </button>
          <button type="submit" form="user-form" className="btn btn-primary" disabled={saving}>
            <Check size={16} /> {saving ? 'Création…' : 'Créer'}
          </button>
        </>
      }
    >
      <form id="user-form" className="form-grid" onSubmit={submit} noValidate>
        <Field label="Nom complet" required error={errors.fullName} className="span-2">
          <input value={form.fullName} onChange={set('fullName')} autoFocus />
        </Field>
        <Field label="Email" required icon={Mail} error={errors.email} className="span-2">
          <input type="email" value={form.email} onChange={set('email')} />
        </Field>
        <Field label="Mot de passe" required error={errors.password} hint="8 caractères min., lettres et chiffres">
          <input type="password" value={form.password} onChange={set('password')} autoComplete="new-password" />
        </Field>
        <Field label="Rôle" required error={errors.role}>
          <select value={form.role} onChange={set('role')}>
            <option value="staff">Staff</option>
            <option value="admin">Admin</option>
          </select>
        </Field>
      </form>
    </Modal>
  );
}

export default function Users() {
  const { user: me } = useAuth();
  const toast = useToast();
  const [users, setUsers] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    try {
      setUsers((await usersApi.list()).data);
    } catch (err) {
      toast.error('Chargement impossible', err.message);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const patch = async (u, changes) => {
    try {
      await usersApi.update(u.id, changes);
      toast.success('Utilisateur mis à jour', u.fullName);
      load();
    } catch (err) {
      toast.error('Mise à jour impossible', err.message);
    }
  };

  return (
    <div className="page">
      <PageHeader title="Utilisateurs" subtitle="Comptes du personnel et rôles d’accès">
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={16} /> Nouvel utilisateur
        </button>
      </PageHeader>

      <div className="card table-card">
        {!users ? (
          <Spinner />
        ) : (
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Utilisateur</th>
                  <th>Rôle</th>
                  <th>Statut</th>
                  <th>Créé le</th>
                  <th className="right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const self = u.id === me.id;
                  return (
                    <tr key={u.id}>
                      <td>
                        <div className="person">
                          <Avatar name={u.fullName} size="sm" />
                          <div>
                            <div className="strong">
                              {u.fullName} {self && <span className="tag">Vous</span>}
                            </div>
                            <div className="muted small">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <select
                          className="select-sm"
                          value={u.role}
                          disabled={self}
                          onChange={(e) => patch(u, { role: e.target.value })}
                          aria-label={`Rôle de ${u.fullName}`}
                        >
                          <option value="staff">Staff</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td>
                        <span className={`badge badge-${u.isActive ? 'success' : 'neutral'}`}>
                          <span className="dot" /> {u.isActive ? 'Actif' : 'Désactivé'}
                        </span>
                      </td>
                      <td>{formatDate(u.createdAt)}</td>
                      <td className="right">
                        {!self && (
                          <button className="btn btn-light btn-sm" onClick={() => patch(u, { isActive: !u.isActive })}>
                            {u.isActive ? 'Désactiver' : 'Réactiver'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreate && (
        <UserFormModal
          onClose={() => setShowCreate(false)}
          onSaved={() => {
            setShowCreate(false);
            load();
          }}
        />
      )}
    </div>
  );
}
