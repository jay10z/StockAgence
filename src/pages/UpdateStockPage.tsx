import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Search } from 'lucide-react';
import Layout from '../components/Layout';
import Loading from '../components/Loading';
import Toast, { ToastState } from '../components/Toast';
import { apiFetch } from '../lib/api';
import type { Product } from '../lib/types';

export default function UpdateStockPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<number | ''>('');
  const [mode, setMode] = useState<'set' | 'add' | 'remove'>('set');
  const [quantity, setQuantity] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<Product[]>('/api/products');
      setProducts(data);
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

  const filtered = products.filter((p) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
  });

  const selected = products.find((p) => p.id === selectedId);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedId) {
      setToast({ type: 'error', message: 'Choisissez un produit.' });
      return;
    }
    const qty = Number(quantity);
    if (Number.isNaN(qty) || qty < 0 || (mode !== 'set' && qty === 0)) {
      setToast({ type: 'error', message: 'Quantité invalide.' });
      return;
    }
    setSubmitting(true);
    try {
      await apiFetch('/api/inventory', {
        method: 'PUT',
        body: JSON.stringify({
          product_id: selectedId,
          quantity: qty,
          mode,
        }),
      });
      setToast({ type: 'success', message: 'Stock mis à jour avec succès.' });
      setQuantity('');
      await load();
    } catch (err) {
      setToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Mise à jour impossible',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <Toast toast={toast} onClose={() => setToast(null)} />

      <Link
        to="/entrepot"
        className="inline-flex items-center gap-2 text-slate-600 font-semibold mb-4 text-base"
      >
        <ArrowLeft className="w-5 h-5" />
        Tableau de bord
      </Link>

      <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-5">Mettre à jour le stock</h2>

      {loading ? (
        <Loading />
      ) : (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sm:p-6 space-y-5">
          <div>
            <label className="block text-base font-semibold text-slate-700 mb-2">Chercher un produit</label>
            <div className="relative mb-3">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nom ou SKU..."
                className="w-full text-lg pl-12 pr-4 py-3.5 rounded-xl border-2 border-slate-200 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value ? Number(e.target.value) : '')}
              className="w-full text-lg px-4 py-4 rounded-xl border-2 border-slate-200 focus:border-emerald-500 focus:outline-none bg-white"
              required
            >
              <option value="">— Choisir un produit —</option>
              {filtered.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku}) — {p.quantity ?? 0} {p.unit}
                </option>
              ))}
            </select>
          </div>

          {selected && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 text-base">
              Stock actuel :{' '}
              <strong className="text-emerald-800 text-xl">
                {selected.quantity ?? 0} {selected.unit}
              </strong>
            </div>
          )}

          <div>
            <label className="block text-base font-semibold text-slate-700 mb-2">Action</label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: 'set', label: 'Fixer' },
                  { id: 'add', label: 'Ajouter' },
                  { id: 'remove', label: 'Retirer' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setMode(opt.id)}
                  className={`py-3.5 rounded-xl text-base font-bold border-2 ${
                    mode === opt.id
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : 'bg-white border-slate-200 text-slate-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-base font-semibold text-slate-700 mb-2">Quantité</label>
            <input
              type="number"
              min={0}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full text-2xl font-bold px-4 py-4 rounded-xl border-2 border-slate-200 focus:border-emerald-500 focus:outline-none"
              placeholder="0"
              required
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xl font-bold py-4 rounded-xl"
          >
            {submitting ? 'Mise à jour...' : 'Enregistrer le stock'}
          </button>
        </form>
      )}
    </Layout>
  );
}
