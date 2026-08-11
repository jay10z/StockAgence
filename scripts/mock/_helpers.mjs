/**
 * Shared helpers for DEMO/MOCK seed scripts.
 * Marker: emails @demo.stockagence.cm, SKUs DM-*, activity details start with [DEMO]
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

export const DEMO_EMAIL_DOMAIN = 'demo.stockagence.cm';
export const DEMO_SKU_PREFIX = 'DM-';
export const DEMO_MARKER = '[DEMO]';
export const DEMO_PASSWORD = 'Demo1234!';

export const DEMO_AGENCY_NAMES = [
  'Agence Akwa',
  'Agence Bonabéri',
  'Agence Bépanda',
  'Agence Makepe',
];

export function loadEnv() {
  const path = resolve(process.cwd(), '.env');
  if (!existsSync(path)) {
    throw new Error('Fichier .env introuvable.');
  }
  const env = {};
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const i = trimmed.indexOf('=');
    if (i === -1) continue;
    env[trimmed.slice(0, i).trim()] = trimmed.slice(i + 1).trim();
  }
  return env;
}

export function createServiceClient() {
  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL || env.VITE_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || url.includes('YOUR_PROJECT') || !serviceKey || serviceKey.includes('your_service')) {
    throw new Error('Clés Supabase invalides dans .env');
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function hoursAgo(h) {
  return new Date(Date.now() - h * 60 * 60 * 1000).toISOString();
}

export function daysAgo(d, hour = 10) {
  const dt = new Date();
  dt.setDate(dt.getDate() - d);
  dt.setHours(hour, Math.floor(Math.random() * 50), 0, 0);
  return dt.toISOString();
}
