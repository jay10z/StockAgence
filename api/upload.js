import supabase from './db-client.js';
import { setCors, requireProfile } from './auth-helper.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Méthode non autorisée' });
    }

    const auth = await requireProfile(req, res, ['owner', 'warehouse_manager']);
    if (!auth) return;

    const { fileName, fileBase64, contentType } = req.body || {};
    if (!fileName || !fileBase64) {
      return res.status(400).json({ error: 'Fichier manquant.' });
    }

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (contentType && !allowed.includes(contentType)) {
      return res.status(400).json({ error: 'Format image non supporté.' });
    }

    const ext = fileName.split('.').pop() || 'jpg';
    const path = `products/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const buffer = Buffer.from(fileBase64, 'base64');

    if (buffer.length > 3 * 1024 * 1024) {
      return res.status(400).json({ error: 'Image trop grande (max 3 Mo).' });
    }

    const { error } = await supabase.storage
      .from('product-images')
      .upload(path, buffer, {
        contentType: contentType || 'image/jpeg',
        upsert: true,
      });
    if (error) throw error;

    const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(path);
    return res.status(200).json({ url: urlData.publicUrl });
  } catch (err) {
    console.error('upload error:', err);
    return res.status(500).json({ error: err.message });
  }
}
