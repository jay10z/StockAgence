import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Pencil, Trash2, Package } from 'lucide-react';
import Layout from '../components/Layout';
import Loading from '../components/Loading';
import Toast, { ToastState } from '../components/Toast';
import { StockStatus } from '../components/StatusBadge';
import { apiFetch } from '../lib/api';
import type { Product } from '../lib/types';
import { PRODUCT_CATEGORIES, PRODUCT_TYPES } from '../lib/constants';
import supabase from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function ProductsPage() {
  const { profile } = useAuth();
  const isOwner = profile?.role === 'owner';
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

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

  useEffect(() => {
    const channel = supabase
      .channel('products-inventory-list')
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
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q);
        if (!match) return false;
      }
      if (categoryFilter !== 'all' && p.category !== categoryFilter) return false;
      if (typeFilter !== 'all' && (p.product_type || 'Standard') !== typeFilter) {
        return false;
      }
      return true;
    });
  }, [products, search, categoryFilter, typeFilter]);

  const handleDelete = async (product: Product) => {
    if (!confirm(`Supprimer « ${product.name} » ?`)) return;
    setDeletingId(product.id);
    try {
      await apiFetch('/api/products', {
        method: 'DELETE',
        body: JSON.stringify({ id: product.id }),
      });
      setToast({ type: 'success', message: 'Produit supprimé.' });
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
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-800">Produits</h2>
        <Link
          to="/entrepot/produits/nouveau"
          className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-lg font-bold py-3.5 px-5 rounded-xl"
        >
          <Plus className="w-5 h-5" />
          Ajouter
        </Link>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher nom, SKU, catégorie..."
          className="w-full text-lg pl-14 pr-4 py-4 rounded-2xl border-2 border-slate-200 focus:border-emerald-500 focus:outline-none bg-white"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
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

      {loading ? (
        <Loading />
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center border border-slate-100">
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-lg text-slate-500">Aucun produit trouvé.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((p) => (
            <li
              key={p.id}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex gap-4"
            >
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
                {p.image_url ? (
                  <img src={p.image_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Package className="w-8 h-8 text-slate-300" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 truncate">{p.name}</h3>
                    <p className="text-sm text-slate-500 font-medium">
                      {p.sku} · {p.category} · {p.product_type || 'Standard'}
                    </p>
                    {isOwner && (p.minimum_price != null || p.maximum_price != null) && (
                      <p className="text-sm text-amber-800 font-medium mt-0.5">
                        Prix indicatif : {p.minimum_price ?? '—'} – {p.maximum_price ?? '—'} FCFA
                      </p>
                    )}
                  </div>
                  <StockStatus quantity={p.quantity ?? 0} minStock={p.min_stock} />
                </div>
                <p className="text-2xl font-bold text-emerald-700 mt-1">
                  {p.quantity ?? 0}{' '}
                  <span className="text-base font-semibold text-slate-500">{p.unit}</span>
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <Link
                    to={`/entrepot/produits/${p.id}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-base"
                  >
                    <Pencil className="w-4 h-4" />
                    Modifier
                  </Link>
                  <button
                    type="button"
                    disabled={deletingId === p.id}
                    onClick={() => handleDelete(p)}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 font-semibold text-base disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    {deletingId === p.id ? '...' : 'Supprimer'}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Layout>
  );
}
