import supabase from './db-client.js';
import { setCors, requireProfile } from './auth-helper.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Méthode non autorisée' });
    }
    const auth = await requireProfile(req, res, ['owner', 'warehouse_manager']);
    if (!auth) return;

    const [
      { data: products, error: pErr },
      { data: inventory, error: iErr },
      pendingRes,
      activityRes,
      agenciesRes,
      pendingListRes,
    ] = await Promise.all([
      supabase.from('products').select('id, min_stock'),
      supabase.from('inventory').select('product_id, quantity'),
      supabase
        .from('product_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending'),
      supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(8),
      supabase.from('agencies').select('*', { count: 'exact', head: true }),
      supabase
        .from('product_requests')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(5),
    ]);

    if (pErr) throw pErr;
    if (iErr) throw iErr;
    if (pendingRes.error) throw pendingRes.error;
    if (activityRes.error) throw activityRes.error;
    if (agenciesRes.error) throw agenciesRes.error;
    if (pendingListRes.error) throw pendingListRes.error;

    const invMap = new Map((inventory || []).map((r) => [r.product_id, r.quantity]));
    const totalProducts = products?.length || 0;
    let lowStock = 0;
    for (const p of products || []) {
      const qty = invMap.get(p.id) ?? 0;
      if (qty <= (p.min_stock ?? 0)) lowStock += 1;
    }

    // Light enrich pending for dashboard preview
    const pendingRows = pendingListRes.data || [];
    let recentPending = [];
    if (pendingRows.length) {
      const productIds = [...new Set(pendingRows.map((r) => r.product_id))];
      const agencyIds = [...new Set(pendingRows.map((r) => r.agency_id))];
      const userIds = [...new Set(pendingRows.map((r) => r.user_id))];
      const [prods, ags, profiles] = await Promise.all([
        supabase.from('products').select('id, name, sku, unit').in('id', productIds),
        supabase.from('agencies').select('id, name').in('id', agencyIds),
        supabase.from('profiles').select('id, full_name').in('id', userIds),
      ]);
      const pMap = new Map((prods.data || []).map((p) => [p.id, p]));
      const aMap = new Map((ags.data || []).map((a) => [a.id, a]));
      const uMap = new Map((profiles.data || []).map((u) => [u.id, u]));
      recentPending = pendingRows.map((r) => {
        const p = pMap.get(r.product_id);
        return {
          ...r,
          product_name: p?.name,
          product_sku: p?.sku,
          product_unit: p?.unit,
          agency_name: aMap.get(r.agency_id)?.name,
          user_name: uMap.get(r.user_id)?.full_name,
          current_stock: invMap.get(r.product_id) ?? 0,
        };
      });
    }

    return res.status(200).json({
      totalProducts,
      lowStock,
      pendingRequests: pendingRes.count || 0,
      totalAgencies: agenciesRes.count || 0,
      recentActivity: activityRes.data || [],
      recentPending,
    });
  } catch (err) {
    console.error('dashboard error:', err);
    return res.status(500).json({ error: err.message });
  }
}
