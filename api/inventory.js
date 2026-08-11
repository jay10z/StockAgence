import supabase from './db-client.js';
import { setCors, requireProfile, logActivity } from './auth-helper.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method !== 'PUT' && req.method !== 'POST') {
      return res.status(405).json({ error: 'Méthode non autorisée' });
    }

    // Agency users cannot modify warehouse stock
    const auth = await requireProfile(req, res, ['owner', 'warehouse_manager']);
    if (!auth) return;

    const { product_id, quantity, mode } = req.body || {};
    if (!product_id) {
      return res.status(400).json({ error: 'Produit requis.' });
    }

    const qty = Number(quantity);
    if (Number.isNaN(qty)) {
      return res.status(400).json({ error: 'Quantité invalide.' });
    }

    const { data: product, error: pErr } = await supabase
      .from('products')
      .select('id, name, sku, unit')
      .eq('id', product_id)
      .maybeSingle();
    if (pErr || !product) {
      return res.status(404).json({ error: 'Produit introuvable.' });
    }

    const { data: inv } = await supabase
      .from('inventory')
      .select('id, quantity')
      .eq('product_id', product_id)
      .maybeSingle();

    const current = inv?.quantity ?? 0;
    let newQty = qty;

    if (mode === 'add') {
      newQty = current + qty;
    } else if (mode === 'remove') {
      newQty = current - qty;
    } else if (mode === 'set' || !mode) {
      newQty = qty;
    }

    if (newQty < 0) {
      return res.status(400).json({
        error: `Stock insuffisant. Disponible : ${current} ${product.unit}`,
      });
    }

    const now = new Date().toISOString();
    let result;

    if (inv?.id) {
      const { data, error } = await supabase
        .from('inventory')
        .update({ quantity: newQty, updated_at: now })
        .eq('id', inv.id)
        .select()
        .single();
      if (error) throw error;
      result = data;
    } else {
      const { data, error } = await supabase
        .from('inventory')
        .insert({ product_id, quantity: newQty, updated_at: now })
        .select()
        .single();
      if (error) throw error;
      result = data;
    }

    await supabase.from('products').update({ updated_at: now }).eq('id', product_id);

    await logActivity(
      auth.user.id,
      auth.profile.full_name,
      'stock_updated',
      `Stock mis à jour : ${product.name} (${product.sku}) — ${current} → ${newQty} ${product.unit}`,
      {
        productName: product.name,
        quantity: Math.abs(newQty - current),
        previousValue: current,
        newValue: newQty,
      }
    );

    return res.status(200).json({
      ...result,
      product_name: product.name,
      product_sku: product.sku,
      unit: product.unit,
      previous_quantity: current,
    });
  } catch (err) {
    console.error('inventory error:', err);
    return res.status(500).json({ error: err.message });
  }
}
