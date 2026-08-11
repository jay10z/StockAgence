import supabase from './db-client.js';
import { setCors, requireProfile, logActivity } from './auth-helper.js';

function mapWithInventory(product, invMap) {
  const inv = invMap.get(product.id) || null;
  return {
    id: product.id,
    name: product.name,
    sku: product.sku,
    category: product.category,
    product_type: product.product_type || 'Standard',
    unit: product.unit,
    min_stock: product.min_stock,
    image_url: product.image_url,
    minimum_price: product.minimum_price ?? null,
    maximum_price: product.maximum_price ?? null,
    created_at: product.created_at,
    updated_at: product.updated_at,
    quantity: inv?.quantity ?? 0,
    inventory_id: inv?.id ?? null,
    inventory_updated_at: inv?.updated_at ?? null,
  };
}

async function loadInventoryMap(productIds = null) {
  let query = supabase.from('inventory').select('id, product_id, quantity, updated_at');
  if (productIds && productIds.length > 0) {
    query = query.in('product_id', productIds);
  }
  const { data, error } = await query;
  if (error) throw error;
  const map = new Map();
  for (const row of data || []) {
    map.set(row.product_id, row);
  }
  return map;
}

function parseOptionalPrice(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  if (Number.isNaN(n) || n < 0) return undefined; // invalid
  return n;
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      const auth = await requireProfile(req, res);
      if (!auth) return;

      const { search, id, category, product_type } = req.query;

      if (id) {
        const { data: product, error } = await supabase
          .from('products')
          .select('*')
          .eq('id', id)
          .maybeSingle();
        if (error) throw error;
        if (!product) return res.status(404).json({ error: 'Produit introuvable.' });
        const invMap = await loadInventoryMap([Number(id)]);
        const mapped = mapWithInventory(product, invMap);
        // Warehouse managers see products but prices are admin-managed;
        // still return prices so owner UI can edit; agency sees them for display.
        return res.status(200).json(mapped);
      }

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;

      const products = data || [];
      const invMap = await loadInventoryMap(products.map((p) => p.id));
      let result = products.map((p) => mapWithInventory(p, invMap));

      if (search && String(search).trim()) {
        const q = String(search).trim().toLowerCase();
        result = result.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.sku.toLowerCase().includes(q) ||
            (p.category || '').toLowerCase().includes(q) ||
            (p.product_type || '').toLowerCase().includes(q)
        );
      }

      if (category && category !== 'all') {
        result = result.filter((p) => p.category === category);
      }
      if (product_type && product_type !== 'all') {
        result = result.filter((p) => (p.product_type || 'Standard') === product_type);
      }

      return res.status(200).json(result);
    }

    if (req.method === 'POST') {
      const auth = await requireProfile(req, res, ['owner', 'warehouse_manager']);
      if (!auth) return;

      const {
        name,
        sku,
        category,
        product_type,
        unit,
        quantity,
        min_stock,
        image_url,
        minimum_price,
        maximum_price,
      } = req.body || {};

      if (!name?.trim() || !sku?.trim() || !category?.trim() || !unit?.trim()) {
        return res.status(400).json({ error: 'Nom, SKU, catégorie et unité sont obligatoires.' });
      }

      const qty = Number(quantity) || 0;
      const minStock = Number(min_stock) || 0;
      if (qty < 0 || minStock < 0) {
        return res.status(400).json({ error: 'Les quantités ne peuvent pas être négatives.' });
      }

      const insertRow = {
        name: name.trim(),
        sku: sku.trim().toUpperCase(),
        category: category.trim(),
        product_type: (product_type || 'Standard').trim(),
        unit: unit.trim(),
        min_stock: minStock,
        image_url: image_url || null,
        updated_at: new Date().toISOString(),
      };

      // Prices: owner/admin only
      if (auth.profile.role === 'owner') {
        const minP = parseOptionalPrice(minimum_price);
        const maxP = parseOptionalPrice(maximum_price);
        if (minP === undefined || maxP === undefined) {
          return res.status(400).json({ error: 'Prix indicatif invalide.' });
        }
        if (minP != null && maxP != null && minP > maxP) {
          return res.status(400).json({
            error: 'Le prix minimum ne peut pas dépasser le prix maximum.',
          });
        }
        insertRow.minimum_price = minP;
        insertRow.maximum_price = maxP;
      }

      let product;
      let error;
      const firstTry = await supabase.from('products').insert(insertRow).select().single();
      if (firstTry.error && /product_type|minimum_price|maximum_price/i.test(firstTry.error.message || '')) {
        // Schema not migrated — insert without new columns
        const legacy = { ...insertRow };
        delete legacy.product_type;
        delete legacy.minimum_price;
        delete legacy.maximum_price;
        const second = await supabase.from('products').insert(legacy).select().single();
        product = second.data;
        error = second.error;
      } else {
        product = firstTry.data;
        error = firstTry.error;
      }

      if (error) {
        if (error.code === '23505') {
          return res.status(400).json({ error: 'Ce SKU existe déjà.' });
        }
        throw error;
      }

      const { data: inv, error: invErr } = await supabase
        .from('inventory')
        .insert({
          product_id: product.id,
          quantity: qty,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (invErr) throw invErr;

      await logActivity(
        auth.user.id,
        auth.profile.full_name,
        'product_added',
        `Produit ajouté : ${product.name} (${product.sku}) — stock initial ${qty} ${product.unit}`,
        {
          productName: product.name,
          quantity: qty,
          newValue: qty,
        }
      );

      return res.status(201).json({
        ...mapWithInventory(product, new Map([[product.id, inv]])),
      });
    }

    if (req.method === 'PUT') {
      const auth = await requireProfile(req, res, ['owner', 'warehouse_manager']);
      if (!auth) return;

      const {
        id,
        name,
        sku,
        category,
        product_type,
        unit,
        min_stock,
        image_url,
        minimum_price,
        maximum_price,
      } = req.body || {};

      if (!id) return res.status(400).json({ error: 'ID produit requis.' });
      if (!name?.trim() || !sku?.trim() || !category?.trim() || !unit?.trim()) {
        return res.status(400).json({ error: 'Nom, SKU, catégorie et unité sont obligatoires.' });
      }

      const { data: existing } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      const updateRow = {
        name: name.trim(),
        sku: sku.trim().toUpperCase(),
        category: category.trim(),
        product_type: (product_type || existing?.product_type || 'Standard').trim(),
        unit: unit.trim(),
        min_stock: Number(min_stock) || 0,
        image_url: image_url ?? null,
        updated_at: new Date().toISOString(),
      };

      let priceChanged = false;
      if (auth.profile.role === 'owner') {
        const minP = parseOptionalPrice(minimum_price);
        const maxP = parseOptionalPrice(maximum_price);
        if (minP === undefined || maxP === undefined) {
          return res.status(400).json({ error: 'Prix indicatif invalide.' });
        }
        if (minP != null && maxP != null && minP > maxP) {
          return res.status(400).json({
            error: 'Le prix minimum ne peut pas dépasser le prix maximum.',
          });
        }
        updateRow.minimum_price = minP;
        updateRow.maximum_price = maxP;
        priceChanged =
          String(existing?.minimum_price ?? '') !== String(minP ?? '') ||
          String(existing?.maximum_price ?? '') !== String(maxP ?? '');
      }

      let product;
      let error;
      const firstTry = await supabase
        .from('products')
        .update(updateRow)
        .eq('id', id)
        .select()
        .single();

      if (firstTry.error && /product_type|minimum_price|maximum_price/i.test(firstTry.error.message || '')) {
        const legacy = { ...updateRow };
        delete legacy.product_type;
        delete legacy.minimum_price;
        delete legacy.maximum_price;
        const second = await supabase.from('products').update(legacy).eq('id', id).select().single();
        product = second.data;
        error = second.error;
      } else {
        product = firstTry.data;
        error = firstTry.error;
      }

      if (error) {
        if (error.code === '23505') {
          return res.status(400).json({ error: 'Ce SKU existe déjà.' });
        }
        throw error;
      }

      const invMap = await loadInventoryMap([id]);
      await logActivity(
        auth.user.id,
        auth.profile.full_name,
        priceChanged ? 'price_updated' : 'product_updated',
        priceChanged
          ? `Prix indicatif modifié : ${product.name} (${product.sku}) — ${updateRow.minimum_price ?? '—'} → ${updateRow.maximum_price ?? '—'}`
          : `Produit modifié : ${product.name} (${product.sku})`,
        {
          productName: product.name,
          previousValue: priceChanged
            ? `${existing?.minimum_price ?? '—'}–${existing?.maximum_price ?? '—'}`
            : null,
          newValue: priceChanged
            ? `${updateRow.minimum_price ?? '—'}–${updateRow.maximum_price ?? '—'}`
            : null,
        }
      );

      return res.status(200).json(mapWithInventory(product, invMap));
    }

    if (req.method === 'DELETE') {
      const auth = await requireProfile(req, res, ['owner', 'warehouse_manager']);
      if (!auth) return;

      const { id } = req.body || {};
      if (!id) return res.status(400).json({ error: 'ID produit requis.' });

      const { data: existing } = await supabase
        .from('products')
        .select('name, sku')
        .eq('id', id)
        .maybeSingle();

      // Keep request history for traceability — block delete if requests exist
      const { count: reqCount } = await supabase
        .from('product_requests')
        .select('*', { count: 'exact', head: true })
        .eq('product_id', id);

      if (reqCount && reqCount > 0) {
        return res.status(400).json({
          error:
            'Impossible de supprimer ce produit : des demandes y sont liées (historique conservé).',
        });
      }

      const { error: invDel } = await supabase.from('inventory').delete().eq('product_id', id);
      if (invDel) throw invDel;

      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;

      await logActivity(
        auth.user.id,
        auth.profile.full_name,
        'product_updated',
        `Produit supprimé : ${existing?.name || id} (${existing?.sku || ''})`,
        { productName: existing?.name }
      );

      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Méthode non autorisée' });
  } catch (err) {
    console.error('products error:', err);
    return res.status(500).json({ error: err.message });
  }
}
