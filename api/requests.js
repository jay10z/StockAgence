import supabase from './db-client.js';
import {
  setCors,
  requireProfile,
  logActivity,
  resolveRejectionReason,
} from './auth-helper.js';

async function enrichRequests(rows) {
  if (!rows?.length) return [];

  const productIds = [...new Set(rows.map((r) => r.product_id).filter(Boolean))];
  const agencyIds = [...new Set(rows.map((r) => r.agency_id).filter(Boolean))];
  const userIds = [
    ...new Set(
      rows
        .flatMap((r) => [r.user_id, r.processed_by])
        .filter(Boolean)
    ),
  ];

  const [productsRes, agenciesRes, profilesRes, invRes] = await Promise.all([
    productIds.length
      ? supabase.from('products').select('id, name, sku, unit').in('id', productIds)
      : Promise.resolve({ data: [] }),
    agencyIds.length
      ? supabase.from('agencies').select('id, name').in('id', agencyIds)
      : Promise.resolve({ data: [] }),
    userIds.length
      ? supabase.from('profiles').select('id, full_name').in('id', userIds)
      : Promise.resolve({ data: [] }),
    productIds.length
      ? supabase.from('inventory').select('product_id, quantity').in('product_id', productIds)
      : Promise.resolve({ data: [] }),
  ]);

  const productMap = new Map((productsRes.data || []).map((p) => [p.id, p]));
  const agencyMap = new Map((agenciesRes.data || []).map((a) => [a.id, a]));
  const profileMap = new Map((profilesRes.data || []).map((p) => [p.id, p]));
  const invMap = new Map((invRes.data || []).map((i) => [i.product_id, i.quantity]));

  return rows.map((row) => {
    const product = productMap.get(row.product_id);
    const agency = agencyMap.get(row.agency_id);
    const profile = profileMap.get(row.user_id);
    const processor = row.processed_by ? profileMap.get(row.processed_by) : null;
    return {
      id: row.id,
      product_id: row.product_id,
      agency_id: row.agency_id,
      user_id: row.user_id,
      quantity: row.quantity,
      note: row.note,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
      processed_by: row.processed_by,
      processed_at: row.processed_at,
      rejection_reason: row.rejection_reason || null,
      rejection_reason_code: row.rejection_reason_code || null,
      product_name: product?.name || 'Produit',
      product_sku: product?.sku || '',
      product_unit: product?.unit || '',
      agency_name: agency?.name || '',
      user_name: profile?.full_name || '',
      processed_by_name: processor?.full_name || null,
      current_stock: invMap.get(row.product_id) ?? 0,
    };
  });
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      const auth = await requireProfile(req, res);
      if (!auth) return;

      const { status } = req.query;
      let query = supabase
        .from('product_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (auth.profile.role === 'agency_employee') {
        if (!auth.profile.agency_id) {
          return res.status(400).json({ error: 'Aucune agence associée à votre compte.' });
        }
        query = query.eq('agency_id', auth.profile.agency_id);
      }

      if (status && status !== 'all') {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      if (error) throw error;
      const enriched = await enrichRequests(data || []);
      return res.status(200).json(enriched);
    }

    if (req.method === 'POST') {
      const auth = await requireProfile(req, res, ['agency_employee', 'owner']);
      if (!auth) return;

      const { product_id, quantity, note, agency_id } = req.body || {};

      // Agency always comes from the logged-in employee's profile
      let finalAgencyId = auth.profile.agency_id;
      if (auth.profile.role === 'agency_employee') {
        if (!finalAgencyId) {
          return res.status(400).json({ error: 'Aucune agence associée à votre compte.' });
        }
      } else if (auth.profile.role === 'owner') {
        // Owner (vue agence) may pick an agency if their profile has none
        finalAgencyId = auth.profile.agency_id || agency_id || null;
      }

      if (!product_id || !finalAgencyId) {
        return res.status(400).json({ error: 'Produit et agence requis.' });
      }

      const qty = Number(quantity);
      if (!qty || qty <= 0) {
        return res.status(400).json({ error: 'Indiquez une quantité valide.' });
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
        .select('quantity')
        .eq('product_id', product_id)
        .maybeSingle();

      const available = inv?.quantity ?? 0;
      if (available <= 0) {
        return res.status(400).json({ error: 'Ce produit est en rupture de stock.' });
      }

      const { data: agency } = await supabase
        .from('agencies')
        .select('id, name')
        .eq('id', finalAgencyId)
        .maybeSingle();

      const now = new Date().toISOString();
      const { data: request, error } = await supabase
        .from('product_requests')
        .insert({
          product_id,
          agency_id: finalAgencyId,
          user_id: auth.user.id,
          quantity: qty,
          note: note?.trim() || null,
          status: 'pending',
          created_at: now,
          updated_at: now,
        })
        .select('*')
        .single();
      if (error) throw error;

      await logActivity(
        auth.user.id,
        auth.profile.full_name,
        'request_created',
        `Demande de ${qty} ${product.unit} de ${product.name} (${product.sku}) — ${agency?.name || ''}`,
        {
          agencyId: finalAgencyId,
          agencyName: agency?.name || auth.profile.agency_name,
          productName: product.name,
          quantity: qty,
        }
      );

      const [enriched] = await enrichRequests([request]);
      return res.status(201).json(enriched);
    }

    if (req.method === 'PUT') {
      const auth = await requireProfile(req, res, ['owner', 'warehouse_manager']);
      if (!auth) return;

      const { id, action, rejection_reason_code, rejection_reason_custom } = req.body || {};
      if (!id || !['approve', 'reject'].includes(action)) {
        return res.status(400).json({ error: 'Action invalide.' });
      }

      const { data: request, error: rErr } = await supabase
        .from('product_requests')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (rErr || !request) {
        return res.status(404).json({ error: 'Demande introuvable.' });
      }
      if (request.status !== 'pending') {
        return res.status(400).json({ error: 'Cette demande a déjà été traitée.' });
      }

      const { data: product } = await supabase
        .from('products')
        .select('id, name, sku, unit')
        .eq('id', request.product_id)
        .maybeSingle();

      const { data: agency } = await supabase
        .from('agencies')
        .select('id, name')
        .eq('id', request.agency_id)
        .maybeSingle();

      const now = new Date().toISOString();

      if (action === 'reject') {
        const resolved = resolveRejectionReason(
          rejection_reason_code,
          rejection_reason_custom
        );
        if (!resolved) {
          return res.status(400).json({
            error:
              rejection_reason_code === 'autre'
                ? 'Précisez la raison du refus.'
                : 'Choisissez une raison de refus.',
          });
        }

        // Never delete — mark rejected and keep permanently for history
        let updated;
        let updateError;
        const withReason = await supabase
          .from('product_requests')
          .update({
            status: 'rejected',
            processed_by: auth.user.id,
            processed_at: now,
            updated_at: now,
            rejection_reason: resolved.display,
            rejection_reason_code: resolved.code,
          })
          .eq('id', id)
          .select('*')
          .single();

        if (withReason.error) {
          // Fallback if rejection columns not migrated yet — store reason in note suffix
          const fallbackNote = request.note
            ? `${request.note}\n[Refus] ${resolved.display}`
            : `[Refus] ${resolved.display}`;
          const fb = await supabase
            .from('product_requests')
            .update({
              status: 'rejected',
              processed_by: auth.user.id,
              processed_at: now,
              updated_at: now,
              note: fallbackNote,
            })
            .eq('id', id)
            .select('*')
            .single();
          updated = fb.data;
          updateError = fb.error;
          if (updated) {
            updated.rejection_reason = resolved.display;
            updated.rejection_reason_code = resolved.code;
          }
        } else {
          updated = withReason.data;
          updateError = withReason.error;
        }
        if (updateError) throw updateError;

        await logActivity(
          auth.user.id,
          auth.profile.full_name,
          'request_rejected',
          `Demande refusée : ${request.quantity} ${product?.unit || ''} de ${product?.name || ''} — ${agency?.name || ''} — Motif : ${resolved.display}`,
          {
            agencyId: request.agency_id,
            agencyName: agency?.name,
            productName: product?.name,
            quantity: request.quantity,
            rejectionReason: resolved.display,
            previousValue: 'pending',
            newValue: 'rejected',
          }
        );

        const [enriched] = await enrichRequests([updated]);
        return res.status(200).json(enriched);
      }

      // approve — re-verify stock, reduce inventory, mark approved
      const { data: invRow, error: invErr } = await supabase
        .from('inventory')
        .select('*')
        .eq('product_id', request.product_id)
        .maybeSingle();
      if (invErr || !invRow) {
        return res.status(400).json({ error: 'Inventaire introuvable pour ce produit.' });
      }
      if (invRow.quantity < request.quantity) {
        return res.status(400).json({
          error: `Stock insuffisant. Disponible : ${invRow.quantity}, demandé : ${request.quantity}`,
        });
      }

      const previousQty = invRow.quantity;
      const newQty = invRow.quantity - request.quantity;
      const { error: updInvErr } = await supabase
        .from('inventory')
        .update({ quantity: newQty, updated_at: now })
        .eq('id', invRow.id);
      if (updInvErr) throw updInvErr;

      await supabase.from('products').update({ updated_at: now }).eq('id', request.product_id);

      const { data: updated, error } = await supabase
        .from('product_requests')
        .update({
          status: 'approved',
          processed_by: auth.user.id,
          processed_at: now,
          updated_at: now,
        })
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;

      await logActivity(
        auth.user.id,
        auth.profile.full_name,
        'request_approved',
        `Demande acceptée : ${request.quantity} ${product?.unit || ''} de ${product?.name || ''} pour ${agency?.name || ''} — stock ${previousQty} → ${newQty}`,
        {
          agencyId: request.agency_id,
          agencyName: agency?.name,
          productName: product?.name,
          quantity: request.quantity,
          previousValue: previousQty,
          newValue: newQty,
        }
      );

      const [enriched] = await enrichRequests([updated]);
      return res.status(200).json(enriched);
    }

    // DELETE intentionally not supported — requests are kept for traceability
    if (req.method === 'DELETE') {
      return res.status(405).json({
        error: 'Les demandes ne peuvent pas être supprimées (traçabilité).',
      });
    }

    return res.status(405).json({ error: 'Méthode non autorisée' });
  } catch (err) {
    console.error('requests error:', err);
    return res.status(500).json({ error: err.message });
  }
}
