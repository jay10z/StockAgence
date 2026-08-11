import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ImagePlus } from 'lucide-react';
import Layout from '../components/Layout';
import Loading from '../components/Loading';
import Toast, { ToastState } from '../components/Toast';
import { apiFetch, authHeaders } from '../lib/api';
import type { Product } from '../lib/types';
import {
  PRICE_DISCLAIMER,
  PRODUCT_CATEGORIES,
  PRODUCT_TYPES,
  PRODUCT_UNITS,
} from '../lib/constants';
import { useAuth } from '../contexts/AuthContext';

export default function ProductFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { profile } = useAuth();
  const isOwner = profile?.role === 'owner';

  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState<string>(PRODUCT_CATEGORIES[0]);
  const [productType, setProductType] = useState<string>(PRODUCT_TYPES[0]);
  const [unit, setUnit] = useState<string>(PRODUCT_UNITS[0]);
  const [quantity, setQuantity] = useState('0');
  const [minStock, setMinStock] = useState('5');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [minimumPrice, setMinimumPrice] = useState('');
  const [maximumPrice, setMaximumPrice] = useState('');

  useEffect(() => {
    if (!isEdit || !id) return;
    (async () => {
      try {
        const p = await apiFetch<Product>(`/api/products?id=${id}`);
        setName(p.name);
        setSku(p.sku);
        setCategory(p.category);
        setProductType(p.product_type || PRODUCT_TYPES[0]);
        setUnit(p.unit);
        setQuantity(String(p.quantity ?? 0));
        setMinStock(String(p.min_stock));
        setImageUrl(p.image_url);
        setMinimumPrice(p.minimum_price != null ? String(p.minimum_price) : '');
        setMaximumPrice(p.maximum_price != null ? String(p.maximum_price) : '');
      } catch (err) {
        setToast({
          type: 'error',
          message: err instanceof Error ? err.message : 'Produit introuvable',
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isEdit]);

  const handleImage = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    try {
      const reader = new FileReader();
      const base64: string = await new Promise((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const headers = await authHeaders();
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          fileName: file.name,
          fileBase64: base64,
          contentType: file.type,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Échec du téléversement');
      setImageUrl(data.url);
      setToast({ type: 'success', message: 'Image ajoutée.' });
    } catch (err) {
      setToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Erreur image',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !sku.trim()) {
      setToast({ type: 'error', message: 'Nom et SKU sont obligatoires.' });
      return;
    }
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        name,
        sku,
        category,
        product_type: productType,
        unit,
        min_stock: Number(minStock) || 0,
        image_url: imageUrl,
      };

      if (isOwner) {
        payload.minimum_price = minimumPrice === '' ? null : Number(minimumPrice);
        payload.maximum_price = maximumPrice === '' ? null : Number(maximumPrice);
      }

      if (isEdit) {
        await apiFetch('/api/products', {
          method: 'PUT',
          body: JSON.stringify({ id: Number(id), ...payload }),
        });
        setToast({ type: 'success', message: 'Produit mis à jour.' });
      } else {
        await apiFetch('/api/products', {
          method: 'POST',
          body: JSON.stringify({
            ...payload,
            quantity: Number(quantity) || 0,
          }),
        });
        setToast({ type: 'success', message: 'Produit ajouté.' });
      }
      setTimeout(() => navigate('/entrepot/produits'), 600);
    } catch (err) {
      setToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Enregistrement impossible',
      });
    } finally {
      setSubmitting(false);
    }
  };

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

      <Link
        to="/entrepot/produits"
        className="inline-flex items-center gap-2 text-slate-600 font-semibold mb-4 text-base"
      >
        <ArrowLeft className="w-5 h-5" />
        Retour aux produits
      </Link>

      <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-5">
        {isEdit ? 'Modifier le produit' : 'Nouveau produit'}
      </h2>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sm:p-6 space-y-5"
      >
        <div>
          <label className="block text-base font-semibold text-slate-700 mb-2">
            Nom du produit *
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full text-lg px-4 py-4 rounded-xl border-2 border-slate-200 focus:border-emerald-500 focus:outline-none"
            placeholder="Ex: Ciment 50kg"
            required
          />
        </div>

        <div>
          <label className="block text-base font-semibold text-slate-700 mb-2">
            SKU / Code *
          </label>
          <input
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            className="w-full text-lg px-4 py-4 rounded-xl border-2 border-slate-200 focus:border-emerald-500 focus:outline-none uppercase"
            placeholder="Ex: CIM-50"
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-base font-semibold text-slate-700 mb-2">Catégorie</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full text-lg px-4 py-4 rounded-xl border-2 border-slate-200 focus:border-emerald-500 focus:outline-none bg-white"
            >
              {PRODUCT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-base font-semibold text-slate-700 mb-2">Type</label>
            <select
              value={productType}
              onChange={(e) => setProductType(e.target.value)}
              className="w-full text-lg px-4 py-4 rounded-xl border-2 border-slate-200 focus:border-emerald-500 focus:outline-none bg-white"
            >
              {PRODUCT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-base font-semibold text-slate-700 mb-2">Unité</label>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full text-lg px-4 py-4 rounded-xl border-2 border-slate-200 focus:border-emerald-500 focus:outline-none bg-white"
            >
              {PRODUCT_UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-base font-semibold text-slate-700 mb-2">
              Stock minimum
            </label>
            <input
              type="number"
              min={0}
              value={minStock}
              onChange={(e) => setMinStock(e.target.value)}
              className="w-full text-lg px-4 py-4 rounded-xl border-2 border-slate-200 focus:border-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        {!isEdit && (
          <div>
            <label className="block text-base font-semibold text-slate-700 mb-2">
              Quantité initiale (stock actuel)
            </label>
            <input
              type="number"
              min={0}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full text-lg px-4 py-4 rounded-xl border-2 border-slate-200 focus:border-emerald-500 focus:outline-none"
            />
          </div>
        )}

        {isOwner ? (
          <div className="rounded-2xl border-2 border-amber-100 bg-amber-50/60 p-4 space-y-3">
            <div>
              <p className="text-base font-bold text-slate-800">Prix indicatif (Admin)</p>
              <p className="text-sm text-slate-600 italic">{PRICE_DISCLAIMER}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-base font-semibold text-slate-700 mb-2">
                  Prix minimum
                </label>
                <input
                  type="number"
                  min={0}
                  value={minimumPrice}
                  onChange={(e) => setMinimumPrice(e.target.value)}
                  className="w-full text-lg px-4 py-4 rounded-xl border-2 border-slate-200 focus:border-emerald-500 focus:outline-none bg-white"
                  placeholder="Optionnel"
                />
              </div>
              <div>
                <label className="block text-base font-semibold text-slate-700 mb-2">
                  Prix maximum
                </label>
                <input
                  type="number"
                  min={0}
                  value={maximumPrice}
                  onChange={(e) => setMaximumPrice(e.target.value)}
                  className="w-full text-lg px-4 py-4 rounded-xl border-2 border-slate-200 focus:border-emerald-500 focus:outline-none bg-white"
                  placeholder="Optionnel"
                />
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500 bg-slate-50 rounded-xl px-4 py-3">
            Les prix indicatifs sont gérés uniquement par l’administrateur.
          </p>
        )}

        <div>
          <label className="block text-base font-semibold text-slate-700 mb-2">
            Image (optionnel)
          </label>
          <div className="flex items-center gap-4">
            <div className="w-24 h-24 rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center border border-slate-200">
              {imageUrl ? (
                <img src={imageUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <ImagePlus className="w-8 h-8 text-slate-300" />
              )}
            </div>
            <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold px-5 py-3.5 rounded-xl text-base">
              {uploading ? 'Envoi...' : 'Choisir une photo'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading}
                onChange={(e) => handleImage(e.target.files?.[0] || null)}
              />
            </label>
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting || uploading}
          className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xl font-bold py-4 rounded-xl"
        >
          {submitting ? 'Enregistrement...' : isEdit ? 'Enregistrer' : 'Ajouter le produit'}
        </button>
      </form>
    </Layout>
  );
}
