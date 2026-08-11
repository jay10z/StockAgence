import supabase from './db-client.js';
import { setCors, requireProfile } from './auth-helper.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Méthode non autorisée' });
    }
    // Admin sees full audit; warehouse can view operational activity
    const auth = await requireProfile(req, res, ['owner', 'warehouse_manager']);
    if (!auth) return;

    const limit = Math.min(Number(req.query.limit) || 80, 200);
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;

    return res.status(200).json(data || []);
  } catch (err) {
    console.error('activity error:', err);
    return res.status(500).json({ error: err.message });
  }
}
