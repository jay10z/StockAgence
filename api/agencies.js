import supabase from './db-client.js';
import { setCors, requireProfile, logActivity } from './auth-helper.js';

async function enrichAgencies(rows) {
  if (!rows?.length) return [];

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, agency_id')
    .eq('role', 'agency_employee');

  const byAgency = new Map();
  for (const p of profiles || []) {
    if (!p.agency_id) continue;
    if (!byAgency.has(p.agency_id)) byAgency.set(p.agency_id, []);
    byAgency.get(p.agency_id).push({
      id: p.id,
      full_name: p.full_name,
      email: p.email,
    });
  }

  const { data: requests } = await supabase
    .from('product_requests')
    .select('agency_id, status');

  const pendingByAgency = new Map();
  for (const r of requests || []) {
    if (r.status !== 'pending') continue;
    pendingByAgency.set(r.agency_id, (pendingByAgency.get(r.agency_id) || 0) + 1);
  }

  return rows.map((a) => {
    const employees = byAgency.get(a.id) || [];
    return {
      ...a,
      employee_count: employees.length,
      employees,
      pending_requests: pendingByAgency.get(a.id) || 0,
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

      const { id } = req.query;

      if (id) {
        const { data, error } = await supabase
          .from('agencies')
          .select('*')
          .eq('id', id)
          .maybeSingle();
        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Agence introuvable.' });
        const [enriched] = await enrichAgencies([data]);
        return res.status(200).json(enriched);
      }

      const { data, error } = await supabase
        .from('agencies')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;

      if (auth.profile.role === 'owner' || auth.profile.role === 'warehouse_manager') {
        return res.status(200).json(await enrichAgencies(data || []));
      }
      return res.status(200).json(data || []);
    }

    if (req.method === 'POST') {
      const auth = await requireProfile(req, res, ['owner']);
      if (!auth) return;

      const { name, city, phone } = req.body || {};
      if (!name?.trim()) {
        return res.status(400).json({ error: 'Le nom de l’agence est obligatoire.' });
      }

      const { data, error } = await supabase
        .from('agencies')
        .insert({
          name: name.trim(),
          city: city?.trim() || '',
          phone: phone?.trim() || '',
        })
        .select()
        .single();
      if (error) throw error;

      await logActivity(
        auth.user.id,
        auth.profile.full_name,
        'agency_created',
        `Agence créée : ${data.name}${data.city ? ` (${data.city})` : ''}`,
        { agencyId: data.id, agencyName: data.name }
      );

      const [enriched] = await enrichAgencies([data]);
      return res.status(201).json(enriched);
    }

    if (req.method === 'PUT') {
      const auth = await requireProfile(req, res, ['owner']);
      if (!auth) return;

      const { id, name, city, phone } = req.body || {};
      if (!id) return res.status(400).json({ error: 'ID agence requis.' });
      if (!name?.trim()) {
        return res.status(400).json({ error: 'Le nom de l’agence est obligatoire.' });
      }

      const { data, error } = await supabase
        .from('agencies')
        .update({
          name: name.trim(),
          city: city?.trim() || '',
          phone: phone?.trim() || '',
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;

      await logActivity(
        auth.user.id,
        auth.profile.full_name,
        'agency_updated',
        `Agence modifiée : ${data.name}`,
        { agencyId: data.id, agencyName: data.name }
      );

      const [enriched] = await enrichAgencies([data]);
      return res.status(200).json(enriched);
    }

    if (req.method === 'DELETE') {
      const auth = await requireProfile(req, res, ['owner']);
      if (!auth) return;

      const { id } = req.body || {};
      if (!id) return res.status(400).json({ error: 'ID agence requis.' });

      const { data: existing } = await supabase
        .from('agencies')
        .select('name')
        .eq('id', id)
        .maybeSingle();

      // Keep request history — do not delete product_requests
      const { count: reqCount } = await supabase
        .from('product_requests')
        .select('*', { count: 'exact', head: true })
        .eq('agency_id', id);

      if (reqCount && reqCount > 0) {
        return res.status(400).json({
          error:
            'Impossible de supprimer cette agence : des demandes existent (historique conservé). Détachez d’abord les employés si besoin.',
        });
      }

      await supabase.from('profiles').update({ agency_id: null }).eq('agency_id', id);

      const { error } = await supabase.from('agencies').delete().eq('id', id);
      if (error) throw error;

      await logActivity(
        auth.user.id,
        auth.profile.full_name,
        'agency_deleted',
        `Agence supprimée : ${existing?.name || id}`,
        { agencyName: existing?.name }
      );

      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Méthode non autorisée' });
  } catch (err) {
    console.error('agencies error:', err);
    return res.status(500).json({ error: err.message });
  }
}
