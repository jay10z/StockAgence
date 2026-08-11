import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Plus, Users, Pencil, X, Building2 } from 'lucide-react';
import Layout from '../components/Layout';
import Loading from '../components/Loading';
import Toast, { ToastState } from '../components/Toast';
import { apiFetch } from '../lib/api';
import type { Agency, ManagedUser, UserRole } from '../lib/types';
import { ROLE_LABELS } from '../lib/constants';

const emptyForm = {
  email: '',
  password: '',
  full_name: '',
  role: 'agency_employee' as UserRole,
  agency_id: '' as number | '',
};

export default function UsersPage() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ManagedUser | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const [usersData, agenciesData] = await Promise.all([
        apiFetch<ManagedUser[]>('/api/users'),
        apiFetch<Agency[]>('/api/agencies'),
      ]);
      setUsers(usersData);
      setAgencies(agenciesData);
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

  const openEdit = (user: ManagedUser) => {
    setEditing(user);
    setForm({
      email: user.email,
      password: '',
      full_name: user.full_name,
      role: user.role,
      agency_id: user.agency_id || '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim() || !form.role) {
      setToast({ type: 'error', message: 'Nom et rôle obligatoires.' });
      return;
    }
    if (form.role === 'agency_employee' && !form.agency_id) {
      setToast({
        type: 'error',
        message: 'Choisissez l’agence pour cet employé.',
      });
      return;
    }

    setSubmitting(true);
    try {
      if (editing) {
        await apiFetch('/api/users', {
          method: 'PUT',
          body: JSON.stringify({
            id: editing.id,
            full_name: form.full_name,
            role: form.role,
            agency_id: form.role === 'agency_employee' ? form.agency_id : null,
          }),
        });
        setToast({ type: 'success', message: 'Utilisateur mis à jour.' });
      } else {
        if (!form.email.trim() || !form.password) {
          setToast({ type: 'error', message: 'Email et mot de passe obligatoires.' });
          setSubmitting(false);
          return;
        }
        await apiFetch('/api/users', {
          method: 'POST',
          body: JSON.stringify({
            email: form.email,
            password: form.password,
            full_name: form.full_name,
            role: form.role,
            agency_id: form.role === 'agency_employee' ? form.agency_id : null,
          }),
        });
        setToast({ type: 'success', message: 'Compte créé avec succès.' });
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

  return (
    <Layout>
      <Toast toast={toast} onClose={() => setToast(null)} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-800">Utilisateurs</h2>
          <p className="text-slate-500 text-base mt-1">
            Créez des comptes et rattachez les employés à leur agence.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-lg font-bold py-3.5 px-5 rounded-xl"
        >
          <Plus className="w-5 h-5" />
          Nouvel utilisateur
        </button>
      </div>

      {loading ? (
        <Loading />
      ) : users.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center border border-slate-100">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-lg text-slate-500">Aucun utilisateur.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {users.map((user) => (
            <li
              key={user.id}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-5"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{user.full_name}</h3>
                  <p className="text-base text-slate-500">{user.email}</p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <span className="px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-800 text-sm font-semibold">
                      {ROLE_LABELS[user.role] || user.role}
                    </span>
                    {user.agency_name && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 text-sm font-semibold">
                        <Building2 className="w-4 h-4" />
                        {user.agency_name}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => openEdit(user)}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-base self-start"
                >
                  <Pencil className="w-4 h-4" />
                  Modifier
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-900">
                {editing ? 'Modifier l’utilisateur' : 'Nouvel utilisateur'}
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
                  Nom complet *
                </label>
                <input
                  value={form.full_name}
                  onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                  className="w-full text-lg px-4 py-4 rounded-xl border-2 border-slate-200 focus:border-emerald-500 focus:outline-none"
                  required
                  autoFocus
                />
              </div>

              {!editing && (
                <>
                  <div>
                    <label className="block text-base font-semibold text-slate-700 mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      className="w-full text-lg px-4 py-4 rounded-xl border-2 border-slate-200 focus:border-emerald-500 focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-base font-semibold text-slate-700 mb-2">
                      Mot de passe *
                    </label>
                    <input
                      type="password"
                      value={form.password}
                      onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                      className="w-full text-lg px-4 py-4 rounded-xl border-2 border-slate-200 focus:border-emerald-500 focus:outline-none"
                      minLength={6}
                      required
                      placeholder="Au moins 6 caractères"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-base font-semibold text-slate-700 mb-2">Rôle *</label>
                <select
                  value={form.role}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      role: e.target.value as UserRole,
                      agency_id: e.target.value === 'agency_employee' ? f.agency_id : '',
                    }))
                  }
                  className="w-full text-lg px-4 py-4 rounded-xl border-2 border-slate-200 focus:border-emerald-500 focus:outline-none bg-white"
                >
                  <option value="agency_employee">{ROLE_LABELS.agency_employee}</option>
                  <option value="warehouse_manager">{ROLE_LABELS.warehouse_manager}</option>
                  <option value="owner">{ROLE_LABELS.owner}</option>
                </select>
              </div>

              {form.role === 'agency_employee' && (
                <div>
                  <label className="block text-base font-semibold text-slate-700 mb-2">
                    Agence *
                  </label>
                  <select
                    value={form.agency_id}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        agency_id: e.target.value ? Number(e.target.value) : '',
                      }))
                    }
                    className="w-full text-lg px-4 py-4 rounded-xl border-2 border-slate-200 focus:border-emerald-500 focus:outline-none bg-white"
                    required
                  >
                    <option value="">— Choisir une agence —</option>
                    {agencies.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                        {a.city ? ` (${a.city})` : ''}
                      </option>
                    ))}
                  </select>
                  <p className="text-sm text-slate-500 mt-2">
                    L’employé appartiendra automatiquement à cette agence.
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xl font-bold py-4 rounded-xl"
              >
                {submitting
                  ? 'Enregistrement...'
                  : editing
                    ? 'Enregistrer'
                    : 'Créer le compte'}
              </button>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
