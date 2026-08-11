import supabase from './db-client.js';

export function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export async function requireUser(req, res) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    res.status(401).json({ error: 'Non autorisé. Veuillez vous connecter.' });
    return null;
  }
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    res.status(401).json({ error: 'Session invalide. Reconnectez-vous.' });
    return null;
  }
  return user;
}

export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, agency_id, created_at')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) return null;

  let agency_name = null;
  if (data.agency_id) {
    const { data: agency } = await supabase
      .from('agencies')
      .select('name')
      .eq('id', data.agency_id)
      .maybeSingle();
    agency_name = agency?.name || null;
  }

  return {
    ...data,
    agency_name,
  };
}

export async function requireProfile(req, res, roles = null) {
  const user = await requireUser(req, res);
  if (!user) return null;
  const profile = await getProfile(user.id);
  if (!profile) {
    res.status(403).json({ error: 'Profil introuvable.' });
    return null;
  }
  if (roles && !roles.includes(profile.role)) {
    res.status(403).json({ error: 'Accès non autorisé pour votre rôle.' });
    return null;
  }
  return { user, profile };
}

/**
 * Structured activity log.
 * meta: { agencyId, agencyName, productName, quantity, previousValue, newValue, rejectionReason }
 */
export async function logActivity(userId, userName, action, details, meta = {}) {
  try {
    const profile = userId ? await getProfile(userId) : null;
    const row = {
      user_id: userId || null,
      user_name: userName || profile?.full_name || 'Système',
      action,
      details,
      user_role: profile?.role || meta.userRole || null,
      agency_id: meta.agencyId ?? profile?.agency_id ?? null,
      agency_name: meta.agencyName ?? profile?.agency_name ?? null,
      product_name: meta.productName ?? null,
      quantity: meta.quantity ?? null,
      previous_value: meta.previousValue != null ? String(meta.previousValue) : null,
      new_value: meta.newValue != null ? String(meta.newValue) : null,
      rejection_reason: meta.rejectionReason ?? null,
    };

    const { error } = await supabase.from('activity_logs').insert(row);
    if (error) {
      // Fallback if new columns are not migrated yet
      await supabase.from('activity_logs').insert({
        user_id: row.user_id,
        user_name: row.user_name,
        action: row.action,
        details: row.details,
      });
    }
  } catch (err) {
    console.error('logActivity error:', err);
  }
}

export const REJECTION_REASONS = [
  { code: 'stock_insuffisant', label: 'Stock insuffisant' },
  { code: 'produit_indisponible', label: 'Produit indisponible' },
  { code: 'quantite_trop_elevee', label: 'Quantité demandée trop élevée' },
  { code: 'produit_reserve', label: 'Produit réservé' },
  { code: 'autre', label: 'Autre' },
];

export function resolveRejectionReason(code, customText) {
  const found = REJECTION_REASONS.find((r) => r.code === code);
  if (!found) return null;
  if (code === 'autre') {
    const text = (customText || '').trim();
    if (!text) return null;
    return { code, label: text, display: text };
  }
  return { code, label: found.label, display: found.label };
}
