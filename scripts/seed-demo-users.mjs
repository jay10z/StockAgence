/**
 * Creates the 3 demo accounts shown on the login page.
 * Requires a filled .env with real Supabase keys.
 *
 * Usage: npm run seed:demo
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

function loadEnv() {
  const path = resolve(process.cwd(), '.env');
  if (!existsSync(path)) {
    throw new Error('Fichier .env introuvable. Faites: cp .env.example .env puis remplissez vos clés Supabase.');
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

const DEMO_USERS = [
  {
    email: 'owner@stockagence.cm',
    password: 'password123',
    full_name: 'Admin Propriétaire',
    role: 'owner',
    agency: false,
  },
  {
    email: 'entrepot@stockagence.cm',
    password: 'password123',
    full_name: 'Responsable Entrepôt',
    role: 'warehouse_manager',
    agency: false,
  },
  {
    email: 'agence@stockagence.cm',
    password: 'password123',
    full_name: 'Employé Agence Douala',
    role: 'agency_employee',
    agency: true,
  },
];

async function ensureUser(supabase, { email, password, full_name }) {
  const { data: listed, error: listErr } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (listErr) throw listErr;

  const existing = (listed.users || []).find(
    (u) => u.email?.toLowerCase() === email.toLowerCase()
  );

  if (existing) {
    // Reset password so demo always works
    const { error } = await supabase.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      user_metadata: { full_name },
    });
    if (error) throw error;
    return existing.id;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name },
  });
  if (error) throw error;
  return data.user.id;
}

async function main() {
  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL || env.VITE_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || url.includes('YOUR_PROJECT') || !serviceKey || serviceKey.includes('your_service')) {
    console.error(`
❌ Vos clés Supabase ne sont pas configurées dans .env

1. Ouvrez .env
2. Remplacez YOUR_PROJECT / your_anon_key / your_service_role_key
   par les vraies valeurs (Supabase → Project Settings → API)
3. Relancez: npm run seed:demo
`);
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Agency for the agency employee
  let agencyId = null;
  const { data: agencies } = await supabase
    .from('agencies')
    .select('id, name')
    .ilike('name', '%Douala%')
    .limit(1);

  if (agencies?.length) {
    agencyId = agencies[0].id;
    console.log(`✓ Agence existante: ${agencies[0].name} (#${agencyId})`);
  } else {
    const { data: created, error } = await supabase
      .from('agencies')
      .insert({
        name: 'Agence Douala Akwa',
        city: 'Douala',
        phone: '+237 6 00 00 00 00',
      })
      .select('id, name')
      .single();
    if (error) throw error;
    agencyId = created.id;
    console.log(`✓ Agence créée: ${created.name} (#${agencyId})`);
  }

  for (const demo of DEMO_USERS) {
    const userId = await ensureUser(supabase, demo);
    const { error } = await supabase.from('profiles').upsert({
      id: userId,
      email: demo.email,
      full_name: demo.full_name,
      role: demo.role,
      agency_id: demo.agency ? agencyId : null,
    });
    if (error) throw error;
    console.log(`✓ ${demo.role.padEnd(20)} ${demo.email}`);
  }

  // Sample product + stock if empty
  const { count } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true });

  if (!count) {
    const { data: product, error: pErr } = await supabase
      .from('products')
      .insert({
        name: 'Ciment 50kg',
        sku: 'CIM-50',
        category: 'Construction',
        product_type: 'Matériau',
        unit: 'sac',
        min_stock: 20,
        minimum_price: 4500,
        maximum_price: 5500,
      })
      .select('id')
      .single();
    if (pErr) throw pErr;
    await supabase.from('inventory').insert({
      product_id: product.id,
      quantity: 120,
    });
    console.log('✓ Produit démo ajouté: Ciment 50kg (120 sacs)');
  }

  console.log(`
✅ Comptes démo prêts — mot de passe pour tous: password123

  Propriétaire : owner@stockagence.cm
  Entrepôt     : entrepot@stockagence.cm
  Agence       : agence@stockagence.cm

Redémarrez npx vercel dev puis connectez-vous.
`);
}

main().catch((err) => {
  console.error('❌ Erreur seed:', err.message || err);
  process.exit(1);
});
