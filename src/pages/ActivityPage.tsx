import { useCallback, useEffect, useState } from 'react';
import { History } from 'lucide-react';
import Layout from '../components/Layout';
import Loading from '../components/Loading';
import Toast, { ToastState } from '../components/Toast';
import { apiFetch } from '../lib/api';
import type { ActivityLog } from '../lib/types';
import { ACTION_LABELS, ROLE_LABELS } from '../lib/constants';
import { useAuth } from '../contexts/AuthContext';

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ActivityPage() {
  const { profile } = useAuth();
  const isOwner = profile?.role === 'owner';
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastState | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<ActivityLog[]>('/api/activity?limit=100');
      setLogs(data);
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

  return (
    <Layout>
      <Toast toast={toast} onClose={() => setToast(null)} />

      <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-2 flex items-center gap-2">
        <History className="w-7 h-7" />
        Journal d’activité
      </h2>
      <p className="text-slate-500 text-base mb-5">
        {isOwner
          ? 'Traçabilité complète : qui a fait quoi, quand, et pourquoi.'
          : 'Historique des opérations entrepôt et demandes.'}
      </p>

      {loading ? (
        <Loading />
      ) : logs.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center border border-slate-100 text-slate-500 text-lg">
          Aucune activité enregistrée.
        </div>
      ) : (
        <ul className="space-y-3">
          {logs.map((log) => (
            <li key={log.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <div className="flex flex-wrap items-start justify-between gap-2 mb-1">
                <span className="font-bold text-slate-900 text-base">
                  {ACTION_LABELS[log.action] || log.action}
                </span>
                <span className="text-sm text-slate-500 font-medium">
                  {formatDateTime(log.created_at)}
                </span>
              </div>
              <p className="text-base text-slate-700">{log.details}</p>

              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                <span>
                  Par <strong className="text-slate-700">{log.user_name}</strong>
                  {log.user_role ? ` (${ROLE_LABELS[log.user_role] || log.user_role})` : ''}
                </span>
                {log.agency_name && (
                  <span>
                    Agence : <strong className="text-slate-700">{log.agency_name}</strong>
                  </span>
                )}
                {log.product_name && (
                  <span>
                    Produit : <strong className="text-slate-700">{log.product_name}</strong>
                  </span>
                )}
                {log.quantity != null && (
                  <span>
                    Qté : <strong className="text-slate-700">{log.quantity}</strong>
                  </span>
                )}
              </div>

              {(log.previous_value != null || log.new_value != null) && (
                <p className="text-sm text-slate-600 mt-2 bg-slate-50 rounded-lg px-3 py-2">
                  {log.previous_value != null && (
                    <>
                      Avant : <strong>{log.previous_value}</strong>
                    </>
                  )}
                  {log.previous_value != null && log.new_value != null && ' → '}
                  {log.new_value != null && (
                    <>
                      Après : <strong>{log.new_value}</strong>
                    </>
                  )}
                </p>
              )}

              {log.rejection_reason && (
                <p className="text-sm text-red-800 mt-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  Motif du refus : <strong>{log.rejection_reason}</strong>
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </Layout>
  );
}
