import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  AlertTriangle,
  ClipboardList,
  Plus,
  RefreshCw,
  ListChecks,
  Clock,
  Building2,
  Users,
} from 'lucide-react';
import Layout from '../components/Layout';
import Loading from '../components/Loading';
import Toast, { ToastState } from '../components/Toast';
import { apiFetch } from '../lib/api';
import type { DashboardStats } from '../lib/types';
import { ACTION_LABELS } from '../lib/constants';
import { useAuth } from '../contexts/AuthContext';

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function WarehouseDashboard() {
  const { profile } = useAuth();
  const isOwner = profile?.role === 'owner';
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastState | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<DashboardStats>('/api/dashboard');
      setStats(data);
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

  if (loading) {
    return (
      <Layout>
        <Loading />
      </Layout>
    );
  }

  return (
    <Layout>
      <Toast toast={toast} onClose={() => setToast(null)} />

      <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-2">Tableau de bord</h2>
      <p className="text-slate-500 text-base mb-5">
        Traitez d’abord les demandes en attente — c’est le cœur du travail entrepôt.
      </p>

      {/* Primary CTA: pending requests */}
      <Link
        to="/entrepot/demandes?focus=pending"
        className="block mb-6 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl p-5 shadow-md"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/15 rounded-xl">
              <ClipboardList className="w-8 h-8" />
            </div>
            <div>
              <p className="text-blue-100 font-semibold text-base">Demandes en attente</p>
              <p className="text-4xl font-bold">{stats?.pendingRequests ?? 0}</p>
            </div>
          </div>
          <span className="text-lg font-bold bg-white/15 px-4 py-3 rounded-xl whitespace-nowrap">
            Traiter →
          </span>
        </div>
      </Link>

      {!!stats?.recentPending?.length && (
        <section className="mb-8">
          <h3 className="text-xl font-bold text-slate-800 mb-3">À traiter maintenant</h3>
          <ul className="space-y-2">
            {stats.recentPending.map((r) => (
              <li key={r.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                <div className="flex flex-wrap justify-between gap-2">
                  <div>
                    <p className="text-lg font-bold text-slate-900">{r.product_name}</p>
                    <p className="text-base text-slate-600">
                      {r.quantity} {r.product_unit} · {r.agency_name}
                      {r.user_name ? ` · ${r.user_name}` : ''}
                    </p>
                    <p className="text-sm text-slate-400 mt-1">
                      {formatDateTime(r.created_at)}
                    </p>
                  </div>
                  <Link
                    to="/entrepot/demandes"
                    className="self-center bg-emerald-600 text-white font-bold px-4 py-3 rounded-xl text-base"
                  >
                    Voir
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className={`grid grid-cols-1 sm:grid-cols-2 ${isOwner ? 'lg:grid-cols-3' : ''} gap-3 sm:gap-4 mb-6`}>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-emerald-100 rounded-xl">
              <Package className="w-7 h-7 text-emerald-700" />
            </div>
            <p className="text-slate-500 font-semibold text-base">Produits</p>
          </div>
          <p className="text-4xl font-bold text-slate-900">{stats?.totalProducts ?? 0}</p>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-amber-100 rounded-xl">
              <AlertTriangle className="w-7 h-7 text-amber-700" />
            </div>
            <p className="text-slate-500 font-semibold text-base">Stock bas</p>
          </div>
          <p className="text-4xl font-bold text-amber-700">{stats?.lowStock ?? 0}</p>
        </div>

        {isOwner && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-violet-100 rounded-xl">
                <Building2 className="w-7 h-7 text-violet-700" />
              </div>
              <p className="text-slate-500 font-semibold text-base">Agences</p>
            </div>
            <p className="text-4xl font-bold text-violet-700">{stats?.totalAgencies ?? 0}</p>
          </div>
        )}
      </div>

      <div className={`grid grid-cols-1 sm:grid-cols-2 ${isOwner ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-3 mb-8`}>
        <Link
          to="/entrepot/demandes"
          className="flex items-center justify-center gap-3 bg-emerald-600 hover:bg-emerald-700 text-white text-lg font-bold py-5 px-4 rounded-2xl shadow-md"
        >
          <ListChecks className="w-6 h-6" />
          Voir les demandes
        </Link>
        <Link
          to="/entrepot/stock"
          className="flex items-center justify-center gap-3 bg-white hover:bg-slate-50 text-slate-800 text-lg font-bold py-5 px-4 rounded-2xl shadow-sm border-2 border-slate-200"
        >
          <RefreshCw className="w-6 h-6 text-emerald-700" />
          Mettre à jour stock
        </Link>
        <Link
          to="/entrepot/produits/nouveau"
          className="flex items-center justify-center gap-3 bg-white hover:bg-slate-50 text-slate-800 text-lg font-bold py-5 px-4 rounded-2xl shadow-sm border-2 border-slate-200"
        >
          <Plus className="w-6 h-6 text-emerald-700" />
          Ajouter produit
        </Link>
        {isOwner && (
          <Link
            to="/entrepot/utilisateurs"
            className="flex items-center justify-center gap-3 bg-violet-600 hover:bg-violet-700 text-white text-lg font-bold py-5 px-4 rounded-2xl shadow-md"
          >
            <Users className="w-6 h-6" />
            Utilisateurs
          </Link>
        )}
      </div>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Activité récente
          </h3>
          <Link to="/entrepot/activite" className="text-emerald-700 font-semibold text-base">
            Tout voir
          </Link>
        </div>

        {!stats?.recentActivity?.length ? (
          <div className="bg-white rounded-2xl p-8 text-center text-slate-500 border border-slate-100">
            Aucune activité pour le moment.
          </div>
        ) : (
          <ul className="space-y-2">
            {stats.recentActivity.map((log) => (
              <li
                key={log.id}
                className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-2 mb-1">
                  <span className="font-bold text-slate-800 text-base">
                    {ACTION_LABELS[log.action] || log.action}
                  </span>
                  <span className="text-sm text-slate-500">{formatDateTime(log.created_at)}</span>
                </div>
                <p className="text-slate-600 text-base">{log.details}</p>
                <p className="text-sm text-slate-400 mt-1">par {log.user_name}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Layout>
  );
}
