import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Check, X, ClipboardList } from 'lucide-react';
import Layout from '../components/Layout';
import Loading from '../components/Loading';
import Toast, { ToastState } from '../components/Toast';
import { RequestStatusBadge } from '../components/StatusBadge';
import { apiFetch } from '../lib/api';
import type { ProductRequest } from '../lib/types';
import { REJECTION_REASONS } from '../lib/constants';
import supabase from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function RequestsPage({ agencyView = false }: { agencyView?: boolean }) {
  const { profile } = useAuth();
  const [searchParams] = useSearchParams();
  const [requests, setRequests] = useState<ProductRequest[]>([]);
  const [filter, setFilter] = useState(
    searchParams.get('focus') === 'pending' ? 'pending' : 'all'
  );
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [actingId, setActingId] = useState<number | null>(null);

  const [approveTarget, setApproveTarget] = useState<ProductRequest | null>(null);
  const [rejectTarget, setRejectTarget] = useState<ProductRequest | null>(null);
  const [rejectCode, setRejectCode] = useState<string>('stock_insuffisant');
  const [rejectCustom, setRejectCustom] = useState('');

  const isWarehouse =
    !agencyView &&
    (profile?.role === 'owner' || profile?.role === 'warehouse_manager');

  const load = useCallback(async () => {
    try {
      const q = filter !== 'all' ? `?status=${filter}` : '';
      const data = await apiFetch<ProductRequest[]>(`/api/requests${q}`);
      setRequests(data);
    } catch (err) {
      setToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Erreur de chargement',
      });
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel('requests-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'product_requests' },
        () => {
          load();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inventory' },
        () => {
          load();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  const confirmApprove = async () => {
    if (!approveTarget) return;
    setActingId(approveTarget.id);
    try {
      await apiFetch('/api/requests', {
        method: 'PUT',
        body: JSON.stringify({ id: approveTarget.id, action: 'approve' }),
      });
      setToast({
        type: 'success',
        message: 'Demande acceptée. Stock mis à jour.',
      });
      setApproveTarget(null);
      await load();
    } catch (err) {
      setToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Action impossible',
      });
    } finally {
      setActingId(null);
    }
  };

  const confirmReject = async () => {
    if (!rejectTarget) return;
    if (rejectCode === 'autre' && !rejectCustom.trim()) {
      setToast({ type: 'error', message: 'Précisez la raison du refus.' });
      return;
    }
    setActingId(rejectTarget.id);
    try {
      await apiFetch('/api/requests', {
        method: 'PUT',
        body: JSON.stringify({
          id: rejectTarget.id,
          action: 'reject',
          rejection_reason_code: rejectCode,
          rejection_reason_custom: rejectCustom,
        }),
      });
      setToast({ type: 'success', message: 'Demande refusée. L’agence est informée.' });
      setRejectTarget(null);
      setRejectCustom('');
      setRejectCode('stock_insuffisant');
      await load();
    } catch (err) {
      setToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Action impossible',
      });
    } finally {
      setActingId(null);
    }
  };

  return (
    <Layout>
      <Toast toast={toast} onClose={() => setToast(null)} />

      <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-2">
        {agencyView
          ? profile?.role === 'owner'
            ? 'Demandes (vue agence)'
            : 'Mes demandes'
          : 'Demandes des agences'}
      </h2>
      <p className="text-slate-500 text-base mb-5">
        {isWarehouse
          ? 'Acceptez ou refusez les demandes. Les refus restent visibles pour la traçabilité.'
          : 'Suivez le statut de vos demandes. Les refus affichent le motif.'}
      </p>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-5">
        {[
          { id: 'all', label: 'Toutes' },
          { id: 'pending', label: 'En attente' },
          { id: 'approved', label: 'Acceptées' },
          { id: 'rejected', label: 'Refusées' },
        ].map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`px-4 py-3 rounded-xl text-base font-bold whitespace-nowrap ${
              filter === f.id
                ? 'bg-emerald-600 text-white'
                : 'bg-white text-slate-700 border border-slate-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <Loading />
      ) : requests.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center border border-slate-100">
          <ClipboardList className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-lg text-slate-500">Aucune demande.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {requests.map((r) => (
            <li key={r.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{r.product_name}</h3>
                  <p className="text-sm text-slate-500 font-medium">{r.product_sku}</p>
                </div>
                <RequestStatusBadge status={r.status} />
              </div>

              <p className="text-2xl font-bold text-slate-800 mb-1">
                {r.quantity}{' '}
                <span className="text-base font-semibold text-slate-500">{r.product_unit}</span>
              </p>

              <div className="space-y-1 text-base text-slate-600">
                {!agencyView && (
                  <p>
                    Agence : <strong>{r.agency_name}</strong>
                  </p>
                )}
                <p>
                  Demandé par : <strong>{r.user_name || '—'}</strong>
                </p>
                {isWarehouse && r.status === 'pending' && (
                  <p>
                    Stock actuel :{' '}
                    <strong>
                      {r.current_stock ?? 0} {r.product_unit}
                    </strong>
                  </p>
                )}
              </div>

              {r.note && !r.note.startsWith('[Refus]') && (
                <p className="mt-2 text-base text-slate-600 bg-slate-50 rounded-xl px-3 py-2">
                  Note : {r.note.replace(/\n\[Refus\].*$/, '')}
                </p>
              )}

              {r.status === 'rejected' && (r.rejection_reason || r.note?.includes('[Refus]')) && (
                <div className="mt-3 bg-red-50 border border-red-100 rounded-xl px-3 py-3">
                  <p className="text-sm font-bold text-red-800 uppercase tracking-wide mb-1">
                    Motif du refus
                  </p>
                  <p className="text-base text-red-900 font-semibold">
                    {r.rejection_reason ||
                      r.note?.match(/\[Refus\]\s*(.*)/)?.[1] ||
                      'Non précisé'}
                  </p>
                  {r.processed_by_name && (
                    <p className="text-sm text-red-700 mt-1">
                      Par {r.processed_by_name}
                      {r.processed_at ? ` · ${formatDateTime(r.processed_at)}` : ''}
                    </p>
                  )}
                </div>
              )}

              {r.status === 'approved' && r.processed_by_name && (
                <p className="text-sm text-emerald-700 mt-2 font-medium">
                  Acceptée par {r.processed_by_name}
                  {r.processed_at ? ` · ${formatDateTime(r.processed_at)}` : ''}
                </p>
              )}

              <p className="text-sm text-slate-400 mt-2">
                Demandée le {formatDateTime(r.created_at)}
              </p>

              {isWarehouse && r.status === 'pending' && (
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <button
                    type="button"
                    disabled={actingId === r.id}
                    onClick={() => setApproveTarget(r)}
                    className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold text-lg py-3.5 rounded-xl"
                  >
                    <Check className="w-5 h-5" />
                    Accepter
                  </button>
                  <button
                    type="button"
                    disabled={actingId === r.id}
                    onClick={() => {
                      setRejectTarget(r);
                      setRejectCode('stock_insuffisant');
                      setRejectCustom('');
                    }}
                    className="flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 disabled:opacity-60 text-red-700 font-bold text-lg py-3.5 rounded-xl border border-red-100"
                  >
                    <X className="w-5 h-5" />
                    Refuser
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Approve confirmation */}
      {approveTarget && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-slate-900 mb-2">Confirmer l’acceptation</h3>
            <p className="text-slate-600 mb-4">
              <strong>{approveTarget.product_name}</strong> — {approveTarget.quantity}{' '}
              {approveTarget.product_unit}
              <br />
              Agence : <strong>{approveTarget.agency_name}</strong>
            </p>
            <div className="bg-slate-50 rounded-xl p-4 mb-5 space-y-2 text-base">
              <p>
                Stock actuel :{' '}
                <strong>
                  {approveTarget.current_stock ?? 0} {approveTarget.product_unit}
                </strong>
              </p>
              <p>
                Stock après acceptation :{' '}
                <strong className="text-emerald-700">
                  {Math.max(0, (approveTarget.current_stock ?? 0) - approveTarget.quantity)}{' '}
                  {approveTarget.product_unit}
                </strong>
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setApproveTarget(null)}
                className="py-3.5 rounded-xl font-bold text-lg bg-slate-100 text-slate-800"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={actingId === approveTarget.id}
                onClick={confirmApprove}
                className="py-3.5 rounded-xl font-bold text-lg bg-emerald-600 text-white disabled:opacity-60"
              >
                {actingId === approveTarget.id ? '...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject with reason */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-slate-900 mb-2">Refuser la demande</h3>
            <p className="text-slate-600 mb-4">
              <strong>{rejectTarget.product_name}</strong> — {rejectTarget.quantity}{' '}
              {rejectTarget.product_unit}
              <br />
              Agence : <strong>{rejectTarget.agency_name}</strong>
            </p>

            <p className="text-base font-semibold text-slate-700 mb-2">
              Motif du refus *
            </p>
            <div className="space-y-2 mb-4">
              {REJECTION_REASONS.map((reason) => (
                <label
                  key={reason.code}
                  className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer ${
                    rejectCode === reason.code
                      ? 'border-red-400 bg-red-50'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="reject-reason"
                    value={reason.code}
                    checked={rejectCode === reason.code}
                    onChange={() => setRejectCode(reason.code)}
                    className="w-5 h-5"
                  />
                  <span className="text-base font-semibold text-slate-800">{reason.label}</span>
                </label>
              ))}
            </div>

            {rejectCode === 'autre' && (
              <div className="mb-4">
                <label className="block text-base font-semibold text-slate-700 mb-2">
                  Précisez le motif *
                </label>
                <textarea
                  value={rejectCustom}
                  onChange={(e) => setRejectCustom(e.target.value)}
                  rows={3}
                  className="w-full text-base px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-red-400 focus:outline-none resize-none"
                  placeholder="Expliquez la raison..."
                  required
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRejectTarget(null)}
                className="py-3.5 rounded-xl font-bold text-lg bg-slate-100 text-slate-800"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={actingId === rejectTarget.id}
                onClick={confirmReject}
                className="py-3.5 rounded-xl font-bold text-lg bg-red-600 text-white disabled:opacity-60"
              >
                {actingId === rejectTarget.id ? '...' : 'Confirmer le refus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
