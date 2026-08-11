import { setCors, requireUser, getProfile } from './auth-helper.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Méthode non autorisée' });
    }
    const user = await requireUser(req, res);
    if (!user) return;
    const profile = await getProfile(user.id);
    if (!profile) {
      return res.status(404).json({ error: 'Profil introuvable' });
    }
    // Short cache at edge/browser for repeat hits in same session
    res.setHeader('Cache-Control', 'private, max-age=30');
    return res.status(200).json(profile);
  } catch (err) {
    console.error('profile error:', err);
    return res.status(500).json({ error: err.message });
  }
}
