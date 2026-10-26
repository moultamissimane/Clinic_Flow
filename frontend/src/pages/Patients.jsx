import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, Pencil, Plus, Search, Trash2, UserX, X } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import Pagination from '../components/Pagination';
import Avatar from '../components/Avatar';
import Spinner from '../components/Spinner';
import EmptyState from '../components/EmptyState';
import PatientFormModal from '../components/PatientFormModal';
import ConfirmDialog from '../components/ConfirmDialog';
import { patientsApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import useDebounce from '../utils/useDebounce';
import { formatDate, formatDateTime } from '../utils/format';

export default function Patients() {
  const { isAdmin } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  // search & page live in the URL so "back" from a patient restores the list.
  const [params, setParams] = useSearchParams();
  const page = Number(params.get('page')) || 1;
  const [search, setSearch] = useState(params.get('search') || '');
  const debounced = useDebounce(search.trim(), 300);

  const [result, setResult] = useState(null);
  const [editing, setEditing] = useState(undefined); // undefined: closed, null: create, object: edit
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (debounced === (params.get('search') || '')) return;
    setParams(debounced ? { search: debounced } : {}, { replace: true });
  }, [debounced, params, setParams]);

  const load = useCallback(async () => {
    try {
      setResult(await patientsApi.list({ search: params.get('search') || '', page, limit: 10 }));
    } catch (err) {
      toast.error('Chargement impossible', err.message);
    }
  }, [params, page, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const goToPage = (p) => {
    const next = Object.fromEntries(params);
    setParams({ ...next, page: String(p) });
  };

  const confirmDelete = async () => {
    setBusy(true);
    try {
      await patientsApi.remove(deleting.id);
      toast.success('Patient supprimé', `${deleting.fullName} a été archivé`);
      setDeleting(null);
      load();
    } catch (err) {
      toast.error('Suppression impossible', err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <PageHeader title="Gestion des patients" subtitle="Dossiers patients du cabinet">
        <button className="btn btn-primary" onClick={() => setEditing(null)}>
          <Plus size={16} /> Nouveau patient
        </button>
      </PageHeader>

      <div className="card table-card">
        <div className="toolbar">
          <span className="input-wrap with-icon search">
            <Search size={16} className="input-icon" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par nom ou CIN…"
              aria-label="Rechercher un patient"
            />
            {search && (
              <button className="input-action" onClick={() => setSearch('')} aria-label="Effacer">
                <X size={16} />
              </button>
            )}
          </span>
        </div>

        {!result ? (
          <Spinner />
        ) : result.data.length === 0 ? (
          <EmptyState
            icon={UserX}
            title="Aucun patient trouvé"
            text={params.get('search') ? 'Essayez un autre nom ou CIN.' : 'Ajoutez votre premier patient.'}
          />
        ) : (
          <>
            <div className="table-scroll">
              <table className="table">
                <thead>
                  <tr>
                    <th>Nom complet</th>
                    <th>CIN</th>
                    <th>Téléphone</th>
                    <th>Date de naissance</th>
                    <th>Créé le</th>
                    <th>Prochain RDV</th>
                    <th className="right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {result.data.map((p) => (
                    <tr key={p.id} className="clickable" onClick={() => navigate(`/patients/${p.id}`)}>
                      <td>
                        <div className="person">
                          <Avatar name={p.fullName} size="sm" />
                          <span className="strong">{p.fullName}</span>
                        </div>
                      </td>
                      <td>
                        <span className="tag">{p.cin}</span>
                      </td>
                      <td>{p.phone}</td>
                      <td>{formatDate(p.birthDate)}</td>
                      <td>{formatDate(p.createdAt)}</td>
                      <td>{p.nextAppointment ? formatDateTime(p.nextAppointment) : <span className="muted">—</span>}</td>
                      <td className="right" onClick={(e) => e.stopPropagation()}>
                        <div className="row-actions">
                          <button className="icon-btn" title="Voir" aria-label="Voir" onClick={() => navigate(`/patients/${p.id}`)}>
                            <Eye size={16} />
                          </button>
                          <button className="icon-btn" title="Modifier" aria-label="Modifier" onClick={() => setEditing(p)}>
                            <Pencil size={16} />
                          </button>
                          {isAdmin && (
                            <button className="icon-btn tone-danger" title="Supprimer" aria-label="Supprimer" onClick={() => setDeleting(p)}>
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination meta={result.meta} onChange={goToPage} noun="patients" />
          </>
        )}
      </div>

      {editing !== undefined && (
        <PatientFormModal
          patient={editing}
          onClose={() => setEditing(undefined)}
          onSaved={() => {
            setEditing(undefined);
            load();
          }}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title="Supprimer le patient ?"
          badge="ADMIN"
          message={`${deleting.fullName} (${deleting.cin}) sera archivé et ses rendez-vous à venir annulés. L’historique médical est conservé.`}
          busy={busy}
          onConfirm={confirmDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
