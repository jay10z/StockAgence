import supabase from './db-client.js';
import { setCors, requireProfile, logActivity } from './auth-helper.js';

const VALID_ROLES = ['owner', 'warehouse_manager', 'agency_employee'];

async function enrichUsers(rows) {
  if (!rows?.length) return [];
  const agencyIds = [...new Set(rows.map((r) => r.agency_id).filter(Boolean))];
  let agencyMap = new Map();
  if (agencyIds.length) {
    const { data } = await supabase.from('agencies').select('id, name').in('id', agencyIds);
    agencyMap = new Map((data || []).map((a) => [a.id, a.name]));
  }
  return rows.map((u) => ({
    ...u,
    agency_name: u.agency_id ? agencyMap.get(u.agency_id) || null : null,
  }));
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    // Admin / owner only
    if (req.method === 'GET') {
      const auth = await requireProfile(req, res, ['owner']);
      if (!auth) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, agency_id, created_at')
        .order('full_name', { ascending: true });
      if (error) throw error;

      return res.status(200).json(await enrichUsers(data || []));
    }

    if (req.method === 'POST') {
      const auth = await requireProfile(req, res, ['owner']);
      if (!auth) return;

      const { email, password, full_name, role, agency_id } = req.body || {};
      if (!email?.trim() || !password || !full_name?.trim() || !role) {
        return res.status(400).json({
          error: 'Email, mot de passe, nom et rôle sont obligatoires.',
        });
      }
      if (!VALID_ROLES.includes(role)) {
        return res.status(400).json({ error: 'Rôle invalide.' });
      }
      if (password.length < 6) {
        return res.status(400).json({
          error: 'Le mot de passe doit contenir au moins 6 caractères.',
        });
      }

      let finalAgencyId = agency_id || null;
      if (role === 'agency_employee') {
        if (!finalAgencyId) {
          return res.status(400).json({
            error: 'Un employé agence doit être rattaché à une agence.',
          });
        }
      } else {
        // Warehouse / owner are not tied to an agency
        finalAgencyId = null;
      }

      if (finalAgencyId) {
        const { data: agency } = await supabase
          .from('agencies')
          .select('id, name')
          .eq('id', finalAgencyId)
          .maybeSingle();
        if (!agency) {
          return res.status(400).json({ error: 'Agence introuvable.' });
        }
      }

      const { data: created, error: createErr } = await supabase.auth.admin.createUser({
        email: email.trim().toLowerCase(),
        password,
        email_confirm: true,
        user_metadata: { full_name: full_name.trim() },
      });
      if (createErr) {
        return res.status(400).json({
          error: createErr.message || 'Impossible de créer le compte.',
        });
      }

      const userId = created.user.id;
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          email: email.trim().toLowerCase(),
          full_name: full_name.trim(),
          role,
          agency_id: finalAgencyId,
          created_at: new Date().toISOString(),
        })
        .select('id, email, full_name, role, agency_id, created_at')
        .single();

      if (profileErr) {
        // Cleanup auth user if profile insert fails
        await supabase.auth.admin.deleteUser(userId);
        throw profileErr;
      }

      const [enriched] = await enrichUsers([profile]);
      await logActivity(
        auth.user.id,
        auth.profile.full_name,
        'user_created',
        `Utilisateur créé : ${profile.full_name} (${profile.email}) — rôle ${role}${
          enriched.agency_name ? ` — agence ${enriched.agency_name}` : ''
        }`,
        {
          agencyId: finalAgencyId,
          agencyName: enriched.agency_name,
          newValue: role,
        }
      );

      return res.status(201).json(enriched);
    }

    if (req.method === 'PUT') {
      const auth = await requireProfile(req, res, ['owner']);
      if (!auth) return;

      const { id, full_name, role, agency_id } = req.body || {};
      if (!id) return res.status(400).json({ error: 'ID utilisateur requis.' });
      if (!full_name?.trim() || !role) {
        return res.status(400).json({ error: 'Nom et rôle sont obligatoires.' });
      }
      if (!VALID_ROLES.includes(role)) {
        return res.status(400).json({ error: 'Rôle invalide.' });
      }

      const { data: existing } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (!existing) {
        return res.status(404).json({ error: 'Utilisateur introuvable.' });
      }

      // Prevent removing the last owner (self demotion of sole admin)
      if (existing.role === 'owner' && role !== 'owner') {
        const { count } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'owner');
        if ((count || 0) <= 1) {
          return res.status(400).json({
            error: 'Impossible de retirer le dernier compte administrateur.',
          });
        }
      }

      let finalAgencyId = agency_id || null;
      if (role === 'agency_employee') {
        if (!finalAgencyId) {
          return res.status(400).json({
            error: 'Un employé agence doit être rattaché à une agence.',
          });
        }
      } else {
        finalAgencyId = null;
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .update({
          full_name: full_name.trim(),
          role,
          agency_id: finalAgencyId,
        })
        .eq('id', id)
        .select('id, email, full_name, role, agency_id, created_at')
        .single();
      if (error) throw error;

      const [enriched] = await enrichUsers([profile]);
      await logActivity(
        auth.user.id,
        auth.profile.full_name,
        'user_updated',
        `Utilisateur modifié : ${profile.full_name} — rôle ${existing.role} → ${role}`,
        {
          agencyId: finalAgencyId,
          agencyName: enriched.agency_name,
          previousValue: existing.role,
          newValue: role,
        }
      );

      return res.status(200).json(enriched);
    }

    return res.status(405).json({ error: 'Méthode non autorisée' });
  } catch (err) {
    console.error('users error:', err);
    return res.status(500).json({ error: err.message });
  }
}
