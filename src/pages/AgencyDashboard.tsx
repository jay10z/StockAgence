import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Search, Package, Send, X } from 'lucide-react';
import Layout from '../components/Layout';
import Loading from '../components/Loading';
import Toast, { ToastState } from '../components/Toast';
import { StockStatus } from '../components/StatusBadge';
import { apiFetch } from '../lib/api';
import type { Agency, Product } from '../lib/types';
import {
  PRICE_DISCLAIMER,
  PRODUCT_CATEGORIES,
  PRODUCT_TYPES,
} from '../lib/constants';
import supabase from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

function formatDateTime(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatPriceRange(min: number | null | undefined, max: number | null | undefined) {
  if (min == null && max == null) return null;
  const fmt = (n: number) =>
    new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n);
  if (min != null && max != null) return `${fmt(min)} – ${fmt(max)} FCFA`;
  if (min != null) return `à partir de ${fmt(min)} FCFA`;
  return `jusqu’à ${fmt(max!)} FCFA`;
}

export default function AgencyDashboard() {
  const { profile } = useAuth();
  const isOwner = profile?.role === 'owner';
  const [products, setProducts] = useState<Product[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [requestAgencyId, setRequestAgencyId] = useState<number | ''>('');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [selected, setSelected] = useState<Product | null>(null);
  const [qty, setQty] = useState('1');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<Product[]>('/api/products');
      setProducts(data);
      setSelected((prev) => {
        if (!prev) return prev;
        return data.find((p) => p.id === prev.id) || prev;
      });
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

  useEffect(() => {
    // Owner without assigned agency can pick one for demo requests
    if (!isOwner || profile?.agency_id) return;
    (async () => {
      try {
        const data = await apiFetch<Agency[]>('/api/agencies');
        setAgencies(data);
        if (data.length > 0) {
          setRequestAgencyId((prev) => prev || data[0].id);
        }
      } catch {
        /* optional */
      }
    })();
  }, [isOwner, profile?.agency_id]);

  useEffect(() => {
    const channel = supabase
      .channel('agency-inventory-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inventory' },
        () => {
          load();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        () => {
          load();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const q = search.trim().toLowerCase();
      if (q) {
        const match =
          p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
        if (!match) return false;
      }
      if (categoryFilter !== 'all' && p.category !== categoryFilter) return false;
      if (typeFilter !== 'all' && (p.product_type || 'Standard') !== typeFilter) {
        return false;
      }
      return true;
    });
  }, [products, search, categoryFilter, typeFilter]);

  const handleRequest = async (e: FormEvent) => {
    e.preventDefault();
    if (!selected) return;

    // Agency always from profile for employees; owner may use profile or picker
    const agencyId =
      profile?.agency_id ||
      (isOwner && !profile?.agency_id ? Number(requestAgencyId) : null);

    if (!agencyId) {
      setToast({
        type: 'error',
        message: isOwner
          ? 'Choisissez une agence pour cette demande.'
          : 'Agence non configurée pour ce compte. Contactez l’administrateur.',
      });
      return;
    }

    const quantity = Number(qty);
    if (!quantity || quantity <= 0) {
      setToast({ type: 'error', message: 'Indiquez une quantité valide.' });
      return;
    }
    setSubmitting(true);
    try {
      await apiFetch('/api/requests', {
        method: 'POST',
        body: JSON.stringify({
          product_id: selected.id,
          agency_id: agencyId,
          quantity,
          note,
        }),
      });
      setToast({ type: 'success', message: "Demande envoyée à l'entrepôt." });
      setSelected(null);
      setQty('1');
      setNote('');
    } catch (err) {
      setToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Envoi impossible',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const showAgencyPicker = isOwner && !profile?.agency_id;

  return (
    <Layout>
      <Toast toast={toast} onClose={() => setToast(null)} />

      <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-2">Stock entrepôt</h2>
      <p className="text-slate-500 text-base mb-4">
        {profile?.agency_name
          ? `Agence : ${profile.agency_name} — recherchez, vérifiez le stock, puis demandez.`
          : 'Recherchez un produit pour voir la quantité disponible.'}
      </p>

      <div className="relative mb-4">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-7 h-7 text-slate-400" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Nom ou code produit..."
          className="w-full text-xl pl-16 pr-4 py-5 rounded-2xl border-2 border-slate-200 focus:border-emerald-500 focus:outline-none bg-white shadow-sm"
          autoFocus
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        <div>
          <label className="block text-sm font-semibold text-slate-600 mb-1.5">Catégorie</label>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full text-base px-4 py-3.5 rounded-xl border-2 border-slate-200 focus:border-emerald-500 focus:outline-none bg-white"
          >
            <option value="all">Toutes les catégories</option>
            {PRODUCT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-600 mb-1.5">Type</label>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full text-base px-4 py-3.5 rounded-xl border-2 border-slate-200 focus:border-emerald-500 focus:outline-none bg-white"
          >
            <option value="all">Tous les types</option>
            {PRODUCT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <Loading />
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center border border-slate-100">
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-lg text-slate-500">Aucun produit trouvé.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((p) => {
            const priceLabel = formatPriceRange(p.minimum_price, p.maximum_price);
            return (
              <li
                key={p.id}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-5"
              >
                <div className="flex gap-4">
                  <div className="w-16 h-16 rounded-xl bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
                    {p.image_url ? (
                      <img src={p.image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-8 h-8 text-slate-300" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h3 className="text-xl font-bold text-slate-900">{p.name}</h3>
                        <p className="text-sm text-slate-500 font-medium">
                          {p.sku} · {p.category} · {p.product_type || 'Standard'}
                        </p>
                      </div>
                      <StockStatus quantity={p.quantity ?? 0} minStock={p.min_stock} />
                    </div>
                    <p className="text-3xl font-bold text-emerald-700 mt-2">
                      {p.quantity ?? 0}{' '}
                      <span className="text-lg font-semibold text-slate-500">{p.unit}</span>
                    </p>
                    {priceLabel && (
                      <div className="mt-2 text-sm text-slate-600">
                        <p className="font-semibold">{priceLabel}</p>
                        <p className="text-slate-400 italic">{PRICE_DISCLAIMER}</p>
                      </div>
                    )}
                    <p className="text-sm text-slate-400 mt-1">
                      Mis à jour : {formatDateTime(p.inventory_updated_at || p.updated_at)}
                    </p>
                    <button
                      type="button"
                      disabled={(p.quantity ?? 0) <= 0}
                      onClick={() => {
                        setSelected(p);
                        setQty('1');
                        setNote('');
                      }}
                      className="mt-3 w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-lg py-3.5 px-6 rounded-xl"
                    >
                      <Send className="w-5 h-5" />
                      Demander ce produit
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Demander</h3>
                <p className="text-slate-600 font-medium">{selected.name}</p>
                <p className="text-sm text-slate-400">
                  Dispo : {selected.quantity} {selected.unit}
                </p>
                {profile?.agency_name && (
                  <p className="text-sm text-emerald-700 font-semibold mt-1">
                    Pour : {profile.agency_name}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="p-2 rounded-xl hover:bg-slate-100"
                aria-label="Fermer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleRequest} className="space-y-4">
              {showAgencyPicker && (
                <div>
                  <label className="block text-base font-semibold text-slate-700 mb-2">
                    Agence *
                  </label>
                  <select
                    value={requestAgencyId}
                    onChange={(e) =>
                      setRequestAgencyId(e.target.value ? Number(e.target.value) : '')
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
                </div>
              )}
              <div>
                <label className="block text-base font-semibold text-slate-700 mb-2">
                  Quantité *
                </label>
                <input
                  type="number"
                  min={1}
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  className="w-full text-2xl font-bold px-4 py-4 rounded-xl border-2 border-slate-200 focus:border-emerald-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-base font-semibold text-slate-700 mb-2">
                  Note (optionnel)
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  className="w-full text-base px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-emerald-500 focus:outline-none resize-none"
                  placeholder="Ex: Urgent pour client..."
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xl font-bold py-4 rounded-xl"
              >
                {submitting ? 'Envoi...' : 'Envoyer la demande'}
              </button>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
