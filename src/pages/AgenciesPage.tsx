import { FormEvent, useCallback, useEffect, useState } from 'react';
import {
  Building2,
  Plus,
  Pencil,
  Trash2,
  MapPin,
  Phone,
  Users,
  ClipboardList,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import Loading from '../components/Loading';
import Toast, { ToastState } from '../components/Toast';
import { apiFetch } from '../lib/api';

interface AgencyEmployee {
  id: string;
  full_name: string;
  email: string;
}

interface AgencyRow {
  id: number;
  name: string;
  city: string;
  phone: string;
  created_at?: string;
  employee_count?: number;
  employees?: AgencyEmployee[];
  pending_requests?: number;
}

const emptyForm = { name: '', city: '', phone: '' };

export default function AgenciesPage() {
  const [agencies, setAgencies] = useState<AgencyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AgencyRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<AgencyRow[]>('/api/agencies');
      setAgencies(data);
    } catch (err) {
      setToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Erreur de chargement',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (agency: AgencyRow) => {
    setEditing(agency);
    setForm({
      name: agency.name || '',
      city: agency.city || '',
      phone: agency.phone || '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setToast({ type: 'error', message: 'Le nom de l’agence est obligatoire.' });
      return;
    }
    setSubmitting(true);
    try {
      if (editing) {
        await apiFetch('/api/agencies', {
          method: 'PUT',
          body: JSON.stringify({ id: editing.id, ...form }),
        });
        setToast({ type: 'success', message: 'Agence mise à jour.' });
      } else {
        await apiFetch('/api/agencies', {
          method: 'POST',
          body: JSON.stringify(form),
        });
        setToast({ type: 'success', message: 'Agence créée avec succès.' });
      }
      setModalOpen(false);
      setEditing(null);
      setForm(emptyForm);
      await load();
    } catch (err) {
      setToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Enregistrement impossible',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (agency: AgencyRow) => {
    if (
      !confirm(
        `Supprimer « ${agency.name} » ?\nLes employés seront détachés. Impossible si des demandes existent (historique conservé).`
      )
    ) {
      return;
    }
    setDeletingId(agency.id);
    try {
      await apiFetch('/api/agencies', {
        method: 'DELETE',
        body: JSON.stringify({ id: agency.id }),
      });
      setToast({ type: 'success', message: 'Agence supprimée.' });
      await load();
    } catch (err) {
      setToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Suppression impossible',
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Layout>
      <Toast toast={toast} onClose={() => setToast(null)} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-800">Agences</h2>
          <p className="text-slate-500 text-base mt-1">
            Créez vos points de vente, puis rattachez les employés via Utilisateurs.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/entrepot/utilisateurs"
            className="inline-flex items-center justify-center gap-2 bg-white border-2 border-slate-200 hover:bg-slate-50 text-slate-800 text-lg font-bold py-3.5 px-5 rounded-xl"
          >
            <Users className="w-5 h-5" />
            Utilisateurs
          </Link>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-lg font-bold py-3.5 px-5 rounded-xl"
          >
            <Plus className="w-5 h-5" />
            Nouvelle agence
          </button>
        </div>
      </div>

      {loading ? (
        <Loading />
      ) : agencies.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center border border-slate-100">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-lg text-slate-500 mb-4">Aucune agence pour le moment.</p>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 bg-emerald-600 text-white font-bold px-5 py-3 rounded-xl"
          >
            <Plus className="w-5 h-5" />
            Créer la première agence
          </button>
        </div>
      ) : (
        <ul className="space-y-3">
          {agencies.map((agency) => {
            const expanded = expandedId === agency.id;
            return (
              <li
                key={agency.id}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-5"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="p-2 bg-emerald-100 rounded-xl shrink-0">
                        <Building2 className="w-5 h-5 text-emerald-700" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 truncate">
                        {agency.name}
                      </h3>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-base text-slate-600 mt-2">
                      {agency.city && (
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin className="w-4 h-4 text-slate-400" />
                          {agency.city}
                        </span>
                      )}
                      {agency.phone && (
                        <span className="inline-flex items-center gap-1.5">
                          <Phone className="w-4 h-4 text-slate-400" />
                          {agency.phone}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-3 mt-3">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 text-sm font-semibold">
                        <Users className="w-4 h-4" />
                        {agency.employee_count ?? 0} employé
                        {(agency.employee_count ?? 0) > 1 ? 's' : ''}
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 text-amber-800 text-sm font-semibold">
                        <ClipboardList className="w-4 h-4" />
                        {agency.pending_requests ?? 0} demande
                        {(agency.pending_requests ?? 0) > 1 ? 's' : ''} en attente
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setExpandedId(expanded ? null : agency.id)}
                      className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-base"
                    >
                      {expanded ? 'Masquer' : 'Détails'}
                    </button>
                    <button
                      type="button"
                      onClick={() => openEdit(agency)}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-base"
                    >
                      <Pencil className="w-4 h-4" />
                      Modifier
                    </button>
                    <button
                      type="button"
                      disabled={deletingId === agency.id}
                      onClick={() => handleDelete(agency)}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 font-semibold text-base disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                      {deletingId === agency.id ? '...' : 'Supprimer'}
                    </button>
                  </div>
                </div>

                {expanded && (
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-2">
                      Employés de l’agence
                    </p>
                    {!agency.employees?.length ? (
                      <p className="text-base text-slate-500">
                        Aucun employé rattaché pour le moment.
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {agency.employees.map((emp) => (
                          <li
                            key={emp.id}
                            className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 rounded-xl px-3 py-2.5"
                          >
                            <span className="font-semibold text-slate-800">{emp.full_name}</span>
                            <span className="text-sm text-slate-500">{emp.email}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-900">
                {editing ? 'Modifier l’agence' : 'Nouvelle agence'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-2 rounded-xl hover:bg-slate-100"
                aria-label="Fermer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-base font-semibold text-slate-700 mb-2">
                  Nom de l’agence *
                </label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full text-lg px-4 py-4 rounded-xl border-2 border-slate-200 focus:border-emerald-500 focus:outline-none"
                  placeholder="Ex: Agence Douala Akwa"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-base font-semibold text-slate-700 mb-2">Ville</label>
                <input
                  value={form.city}
                  onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                  className="w-full text-lg px-4 py-4 rounded-xl border-2 border-slate-200 focus:border-emerald-500 focus:outline-none"
                  placeholder="Ex: Douala"
                />
              </div>
              <div>
                <label className="block text-base font-semibold text-slate-700 mb-2">Téléphone</label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  className="w-full text-lg px-4 py-4 rounded-xl border-2 border-slate-200 focus:border-emerald-500 focus:outline-none"
                  placeholder="Ex: +237 6 XX XX XX XX"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xl font-bold py-4 rounded-xl"
              >
                {submitting ? 'Enregistrement...' : editing ? 'Enregistrer' : 'Créer l’agence'}
              </button>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
