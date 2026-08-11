/**
 * StockAgence — MOCK / DEV seed data
 * ==================================
 * Safe to remove later with: npm run clear:mock
 *
 * Markers:
 * - User emails: *@demo.stockagence.cm
 * - Product SKUs: DM-*
 * - Activity details: start with [DEMO]
 * - Agency names: Agence Akwa / Bonabéri / Bépanda / Makepe (demo set)
 *
 * Usage: npm run seed:mock
 */
import {
  createServiceClient,
  DEMO_PASSWORD,
  DEMO_EMAIL_DOMAIN,
  DEMO_SKU_PREFIX,
  DEMO_MARKER,
  DEMO_AGENCY_NAMES,
  hoursAgo,
  daysAgo,
} from './mock/_helpers.mjs';

const AGENCIES = [
  { name: 'Agence Akwa', city: 'Douala', phone: '+237 6 70 11 22 01' },
  { name: 'Agence Bonabéri', city: 'Douala', phone: '+237 6 70 11 22 02' },
  { name: 'Agence Bépanda', city: 'Douala', phone: '+237 6 70 11 22 03' },
  { name: 'Agence Makepe', city: 'Douala', phone: '+237 6 70 11 22 04' },
];

const STAFF = [
  {
    email: `admin@${DEMO_EMAIL_DOMAIN}`,
    full_name: 'Admin Principal',
    role: 'owner',
    agency: null,
  },
  {
    email: `jeanpaul@${DEMO_EMAIL_DOMAIN}`,
    full_name: 'Jean-Paul — Gestionnaire Entrepôt',
    role: 'warehouse_manager',
    agency: null,
  },
  {
    email: `marc@${DEMO_EMAIL_DOMAIN}`,
    full_name: 'Marc — Assistant Entrepôt',
    role: 'warehouse_manager',
    agency: null,
  },
];

const AGENCY_USERS = [
  // Akwa
  { email: `akwa1@${DEMO_EMAIL_DOMAIN}`, full_name: 'Pauline Ngo', agency: 'Agence Akwa' },
  { email: `akwa2@${DEMO_EMAIL_DOMAIN}`, full_name: 'Serge Mbarga', agency: 'Agence Akwa' },
  { email: `akwa3@${DEMO_EMAIL_DOMAIN}`, full_name: 'Grace Fotso', agency: 'Agence Akwa' },
  // Bonabéri
  { email: `bonaberi1@${DEMO_EMAIL_DOMAIN}`, full_name: 'Ibrahim Ouattara', agency: 'Agence Bonabéri' },
  { email: `bonaberi2@${DEMO_EMAIL_DOMAIN}`, full_name: 'Claire Etoa', agency: 'Agence Bonabéri' },
  // Bépanda
  { email: `bepanda1@${DEMO_EMAIL_DOMAIN}`, full_name: 'Alain Kamga', agency: 'Agence Bépanda' },
  { email: `bepanda2@${DEMO_EMAIL_DOMAIN}`, full_name: 'Nadège Tchinda', agency: 'Agence Bépanda' },
  { email: `bepanda3@${DEMO_EMAIL_DOMAIN}`, full_name: 'Bruno Fomekong', agency: 'Agence Bépanda' },
  // Makepe
  { email: `makepe1@${DEMO_EMAIL_DOMAIN}`, full_name: 'Sandrine Ekedi', agency: 'Agence Makepe' },
  { email: `makepe2@${DEMO_EMAIL_DOMAIN}`, full_name: 'Yves Ndongo', agency: 'Agence Makepe' },
];

/** ~30 products: name, sku suffix, category, type, unit, qty, min, minPrice, maxPrice */
const PRODUCTS = [
  ['Ciment 42.5', 'CIM-425', 'Ciment', 'Matériau', 'sac', 420, 50, 5500, 6500],
  ['Ciment 32.5', 'CIM-325', 'Ciment', 'Matériau', 'sac', 280, 40, 4800, 5800],
  ['Fer à béton 6mm', 'FER-06', 'Matériaux de construction', 'Matériau', 'pièce', 260, 40, 1200, 1800],
  ['Fer à béton 8mm', 'FER-08', 'Matériaux de construction', 'Matériau', 'pièce', 210, 35, 1800, 2500],
  ['Fer à béton 10mm', 'FER-10', 'Matériaux de construction', 'Matériau', 'pièce', 195, 30, 2800, 3600],
  ['Fer à béton 12mm', 'FER-12', 'Matériaux de construction', 'Matériau', 'pièce', 180, 30, 3500, 4500],
  ['Fer à béton 14mm', 'FER-14', 'Matériaux de construction', 'Matériau', 'pièce', 95, 25, 4800, 6200],
  ['Tuyau PVC 20mm', 'PVC-T20', 'Plomberie', 'Matériau', 'pièce', 35, 40, 1500, 2500], // low
  ['Tuyau PVC 25mm', 'PVC-T25', 'Plomberie', 'Matériau', 'pièce', 88, 25, 1800, 2800],
  ['Tuyau PVC 32mm', 'PVC-T32', 'Plomberie', 'Matériau', 'pièce', 64, 20, 2200, 3200],
  ['Tuyau PVC 40mm', 'PVC-T40', 'Plomberie', 'Matériau', 'pièce', 42, 15, 2800, 4000],
  ['Coude PVC 20mm', 'PVC-C20', 'Plomberie', 'Accessoire', 'pièce', 120, 30, 400, 800],
  ['Coude PVC 25mm', 'PVC-C25', 'Plomberie', 'Accessoire', 'pièce', 95, 25, 500, 900],
  ['Raccord PVC 32mm', 'PVC-R32', 'Plomberie', 'Accessoire', 'pièce', 70, 20, 700, 1200],
  ['Robinet 1/2', 'ROB-12', 'Plomberie', 'Équipement', 'pièce', 0, 10, 3000, 5000], // OOS
  ['Robinet 3/4', 'ROB-34', 'Plomberie', 'Équipement', 'pièce', 0, 8, 4500, 7000], // OOS
  ['Câble électrique 1.5mm', 'CAB-15', 'Électricité', 'Consommable', 'rouleau', 28, 10, 8000, 12000],
  ['Câble électrique 2.5mm', 'CAB-25', 'Électricité', 'Consommable', 'rouleau', 12, 15, 12000, 18000], // low
  ['Interrupteur simple', 'INT-S1', 'Électricité', 'Accessoire', 'pièce', 150, 40, 800, 1500],
  ['Prise électrique', 'PRI-S1', 'Électricité', 'Accessoire', 'pièce', 140, 40, 900, 1600],
  ['Ampoule LED 9W', 'LED-9W', 'Électricité', 'Consommable', 'pièce', 200, 50, 500, 900],
  ['Peinture blanche 20L', 'PEI-B20', 'Peinture', 'Consommable', 'bidon', 6, 10, 18000, 25000], // low
  ['Peinture blanche 5L', 'PEI-B5', 'Peinture', 'Consommable', 'bidon', 24, 12, 5500, 8000],
  ['Peinture bleue 20L', 'PEI-BL20', 'Peinture', 'Consommable', 'bidon', 9, 8, 19000, 27000],
  ['Marteau', 'OUT-MAR', 'Outillage', 'Outillage', 'pièce', 45, 10, 2500, 4500],
  ['Tournevis', 'OUT-TOU', 'Outillage', 'Outillage', 'pièce', 60, 15, 1000, 2500],
  ['Pince', 'OUT-PIN', 'Outillage', 'Outillage', 'pièce', 38, 10, 2000, 4000],
  ['Mèche béton', 'OUT-MEC', 'Outillage', 'Consommable', 'pièce', 80, 20, 800, 2000],
  ['Disque à meuler', 'OUT-DIS', 'Outillage', 'Consommable', 'pièce', 55, 15, 1500, 3000],
  ['Clous 50mm', 'QUI-CL50', 'Quincaillerie', 'Consommable', 'kg', 110, 25, 1200, 2000],
];

async function listAllUsers(supabase) {
  const users = [];
  let page = 1;
  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    users.push(...(data.users || []));
    if (!data.users?.length || data.users.length < 200) break;
    page += 1;
  }
  return users;
}

async function ensureAuthUser(supabase, { email, password, full_name }, existingUsers) {
  const found = existingUsers.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (found) {
    await supabase.auth.admin.updateUserById(found.id, {
      password,
      email_confirm: true,
      user_metadata: { full_name, demo: true },
    });
    return found.id;
  }
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, demo: true },
  });
  if (error) throw error;
  return data.user.id;
}

async function main() {
  const supabase = createServiceClient();
  console.log(`${DEMO_MARKER} Seed mock data — démarrage...\n`);

  // ---- Agencies ----
  const agencyByName = new Map();
  for (const a of AGENCIES) {
    const { data: existing } = await supabase
      .from('agencies')
      .select('id, name')
      .eq('name', a.name)
      .maybeSingle();

    let row = existing;
    if (!row) {
      const { data, error } = await supabase.from('agencies').insert(a).select('id, name').single();
      if (error) throw error;
      row = data;
      console.log(`✓ Agence créée: ${row.name}`);
    } else {
      await supabase.from('agencies').update({ city: a.city, phone: a.phone }).eq('id', row.id);
      console.log(`✓ Agence existante: ${row.name}`);
    }
    agencyByName.set(row.name, row.id);
  }

  // ---- Users ----
  const existingUsers = await listAllUsers(supabase);
  const profileIds = {};

  for (const u of STAFF) {
    const id = await ensureAuthUser(supabase, { ...u, password: DEMO_PASSWORD }, existingUsers);
    const { error } = await supabase.from('profiles').upsert({
      id,
      email: u.email,
      full_name: u.full_name,
      role: u.role,
      agency_id: null,
    });
    if (error) throw error;
    profileIds[u.email] = id;
    console.log(`✓ ${u.role.padEnd(20)} ${u.email}`);
  }

  for (const u of AGENCY_USERS) {
    const agencyId = agencyByName.get(u.agency);
    const id = await ensureAuthUser(
      supabase,
      { email: u.email, password: DEMO_PASSWORD, full_name: u.full_name },
      existingUsers
    );
    const { error } = await supabase.from('profiles').upsert({
      id,
      email: u.email,
      full_name: u.full_name,
      role: 'agency_employee',
      agency_id: agencyId,
    });
    if (error) throw error;
    profileIds[u.email] = id;
    console.log(`✓ agency_employee     ${u.email} → ${u.agency}`);
  }

  const adminId = profileIds[`admin@${DEMO_EMAIL_DOMAIN}`];
  const jeanId = profileIds[`jeanpaul@${DEMO_EMAIL_DOMAIN}`];
  const marcId = profileIds[`marc@${DEMO_EMAIL_DOMAIN}`];

  // ---- Products + inventory ----
  const productBySku = new Map();
  for (const [name, skuSuffix, category, product_type, unit, qty, min_stock, minimum_price, maximum_price] of PRODUCTS) {
    const sku = `${DEMO_SKU_PREFIX}${skuSuffix}`;
    const { data: existing } = await supabase.from('products').select('id, sku').eq('sku', sku).maybeSingle();

    let productId;
    if (existing) {
      const { data, error } = await supabase
        .from('products')
        .update({
          name,
          category,
          product_type,
          unit,
          min_stock,
          minimum_price,
          maximum_price,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select('id')
        .single();
      if (error) throw error;
      productId = data.id;
    } else {
      const { data, error } = await supabase
        .from('products')
        .insert({
          name,
          sku,
          category,
          product_type,
          unit,
          min_stock,
          minimum_price,
          maximum_price,
        })
        .select('id')
        .single();
      if (error) throw error;
      productId = data.id;
    }

    const { data: inv } = await supabase
      .from('inventory')
      .select('id')
      .eq('product_id', productId)
      .maybeSingle();

    if (inv) {
      await supabase
        .from('inventory')
        .update({ quantity: qty, updated_at: new Date().toISOString() })
        .eq('id', inv.id);
    } else {
      await supabase.from('inventory').insert({ product_id: productId, quantity: qty });
    }

    productBySku.set(sku, { id: productId, name, unit, qty });
    console.log(`✓ Produit ${sku} — stock ${qty} ${unit}`);
  }

  // For approved Makepe request: reduce Fer 12mm by 30 from seeded qty if we want history consistent
  // Seed qty is already "after approval" style OR we set qty then subtract. Spec: Fer 12mm → 180, approved 30.
  // Keep stock at 180 as current (post-approval), and record approved request historically.

  // ---- Clear previous DEMO requests (idempotent re-seed) ----
  const demoProductIds = [...productBySku.values()].map((p) => p.id);
  const demoAgencyIds = [...agencyByName.values()];
  if (demoProductIds.length) {
    await supabase.from('product_requests').delete().in('product_id', demoProductIds);
  }

  const ciment425 = productBySku.get(`${DEMO_SKU_PREFIX}CIM-425`);
  const pvc25 = productBySku.get(`${DEMO_SKU_PREFIX}PVC-T25`);
  const robinet12 = productBySku.get(`${DEMO_SKU_PREFIX}ROB-12`);
  const fer12 = productBySku.get(`${DEMO_SKU_PREFIX}FER-12`);
  const pvc20 = productBySku.get(`${DEMO_SKU_PREFIX}PVC-T20`);

  const akwaId = agencyByName.get('Agence Akwa');
  const bonaberiId = agencyByName.get('Agence Bonabéri');
  const bepandaId = agencyByName.get('Agence Bépanda');
  const makepeId = agencyByName.get('Agence Makepe');

  const akwaUser = profileIds[`akwa1@${DEMO_EMAIL_DOMAIN}`];
  const bonaberiUser = profileIds[`bonaberi1@${DEMO_EMAIL_DOMAIN}`];
  const bepandaUser = profileIds[`bepanda1@${DEMO_EMAIL_DOMAIN}`];
  const makepeUser = profileIds[`makepe1@${DEMO_EMAIL_DOMAIN}`];

  const requests = [
    // PENDING
    {
      product_id: ciment425.id,
      agency_id: akwaId,
      user_id: akwaUser,
      quantity: 50,
      note: 'Chantier Akwa — livraison urgente',
      status: 'pending',
      created_at: hoursAgo(5),
    },
    {
      product_id: pvc25.id,
      agency_id: bonaberiId,
      user_id: bonaberiUser,
      quantity: 20,
      note: 'Réassort plomberie',
      status: 'pending',
      created_at: hoursAgo(3),
    },
    {
      product_id: robinet12.id,
      agency_id: bepandaId,
      user_id: bepandaUser,
      quantity: 10,
      note: 'Client attend en magasin',
      status: 'pending',
      created_at: hoursAgo(2),
    },
    // APPROVED
    {
      product_id: fer12.id,
      agency_id: makepeId,
      user_id: makepeUser,
      quantity: 30,
      note: 'Fondations villa Makepe',
      status: 'approved',
      created_at: daysAgo(2, 9),
      processed_by: jeanId,
      processed_at: daysAgo(2, 11),
    },
    // REJECTED
    {
      product_id: ciment425.id,
      agency_id: akwaId,
      user_id: profileIds[`akwa2@${DEMO_EMAIL_DOMAIN}`],
      quantity: 100,
      note: 'Gros chantier — besoin fort',
      status: 'rejected',
      rejection_reason: 'Stock insuffisant',
      rejection_reason_code: 'stock_insuffisant',
      created_at: daysAgo(1, 14),
      processed_by: jeanId,
      processed_at: daysAgo(1, 16),
    },
    {
      product_id: robinet12.id,
      agency_id: bonaberiId,
      user_id: profileIds[`bonaberi2@${DEMO_EMAIL_DOMAIN}`],
      quantity: 5,
      note: null,
      status: 'rejected',
      rejection_reason: 'Produit indisponible',
      rejection_reason_code: 'produit_indisponible',
      created_at: daysAgo(1, 10),
      processed_by: marcId,
      processed_at: daysAgo(1, 12),
    },
    {
      product_id: pvc20.id,
      agency_id: bepandaId,
      user_id: profileIds[`bepanda2@${DEMO_EMAIL_DOMAIN}`],
      quantity: 500,
      note: 'Commande trop importante',
      status: 'rejected',
      rejection_reason: 'Quantité demandée trop élevée',
      rejection_reason_code: 'quantite_trop_elevee',
      created_at: daysAgo(3, 15),
      processed_by: jeanId,
      processed_at: daysAgo(3, 17),
    },
  ];

  for (const r of requests) {
    const row = {
      ...r,
      updated_at: r.processed_at || r.created_at,
    };
    const { error } = await supabase.from('product_requests').insert(row);
    if (error) throw error;
  }
  console.log(`✓ ${requests.length} demandes (pending / approved / rejected)`);

  // ---- Activity logs (clear previous DEMO markers first) ----
  await supabase.from('activity_logs').delete().like('details', `${DEMO_MARKER}%`);

  const logs = [
    {
      user_id: adminId,
      user_name: 'Admin Principal',
      user_role: 'owner',
      action: 'agency_created',
      details: `${DEMO_MARKER} Agence créée : Agence Akwa (Douala)`,
      agency_name: 'Agence Akwa',
      created_at: daysAgo(5, 9),
    },
    {
      user_id: adminId,
      user_name: 'Admin Principal',
      user_role: 'owner',
      action: 'user_created',
      details: `${DEMO_MARKER} Utilisateur créé : Jean-Paul — Gestionnaire Entrepôt`,
      created_at: daysAgo(5, 10),
    },
    {
      user_id: adminId,
      user_name: 'Admin Principal',
      user_role: 'owner',
      action: 'product_added',
      details: `${DEMO_MARKER} Produit ajouté : Ciment 42.5 (${DEMO_SKU_PREFIX}CIM-425) — stock initial 450 sac`,
      product_name: 'Ciment 42.5',
      quantity: 450,
      new_value: '450',
      created_at: daysAgo(4, 11),
    },
    {
      user_id: jeanId,
      user_name: 'Jean-Paul — Gestionnaire Entrepôt',
      user_role: 'warehouse_manager',
      action: 'stock_updated',
      details: `${DEMO_MARKER} Stock mis à jour : Ciment 42.5 — 450 → 420 sac`,
      product_name: 'Ciment 42.5',
      quantity: 30,
      previous_value: '450',
      new_value: '420',
      created_at: daysAgo(3, 8),
    },
    {
      user_id: marcId,
      user_name: 'Marc — Assistant Entrepôt',
      user_role: 'warehouse_manager',
      action: 'stock_updated',
      details: `${DEMO_MARKER} Stock mis à jour : Peinture blanche 20L — 4 → 6 bidon`,
      product_name: 'Peinture blanche 20L',
      previous_value: '4',
      new_value: '6',
      created_at: daysAgo(2, 15),
    },
    {
      user_id: adminId,
      user_name: 'Admin Principal',
      user_role: 'owner',
      action: 'price_updated',
      details: `${DEMO_MARKER} Prix indicatif modifié : Ciment 42.5 — 5000–6000 → 5500–6500`,
      product_name: 'Ciment 42.5',
      previous_value: '5000–6000',
      new_value: '5500–6500',
      created_at: daysAgo(2, 16),
    },
    {
      user_id: makepeUser,
      user_name: 'Sandrine Ekedi',
      user_role: 'agency_employee',
      agency_id: makepeId,
      agency_name: 'Agence Makepe',
      action: 'request_created',
      details: `${DEMO_MARKER} Demande de 30 pièce de Fer à béton 12mm — Agence Makepe`,
      product_name: 'Fer à béton 12mm',
      quantity: 30,
      created_at: daysAgo(2, 9),
    },
    {
      user_id: jeanId,
      user_name: 'Jean-Paul — Gestionnaire Entrepôt',
      user_role: 'warehouse_manager',
      agency_id: makepeId,
      agency_name: 'Agence Makepe',
      action: 'request_approved',
      details: `${DEMO_MARKER} Demande acceptée : 30 pièce de Fer à béton 12mm pour Agence Makepe — stock 210 → 180`,
      product_name: 'Fer à béton 12mm',
      quantity: 30,
      previous_value: '210',
      new_value: '180',
      created_at: daysAgo(2, 11),
    },
    {
      user_id: profileIds[`akwa2@${DEMO_EMAIL_DOMAIN}`],
      user_name: 'Serge Mbarga',
      user_role: 'agency_employee',
      agency_id: akwaId,
      agency_name: 'Agence Akwa',
      action: 'request_created',
      details: `${DEMO_MARKER} Demande de 100 sac de Ciment 42.5 — Agence Akwa`,
      product_name: 'Ciment 42.5',
      quantity: 100,
      created_at: daysAgo(1, 14),
    },
    {
      user_id: jeanId,
      user_name: 'Jean-Paul — Gestionnaire Entrepôt',
      user_role: 'warehouse_manager',
      agency_id: akwaId,
      agency_name: 'Agence Akwa',
      action: 'request_rejected',
      details: `${DEMO_MARKER} Demande refusée : 100 sac de Ciment 42.5 — Agence Akwa — Motif : Stock insuffisant`,
      product_name: 'Ciment 42.5',
      quantity: 100,
      rejection_reason: 'Stock insuffisant',
      previous_value: 'pending',
      new_value: 'rejected',
      created_at: daysAgo(1, 16),
    },
    {
      user_id: marcId,
      user_name: 'Marc — Assistant Entrepôt',
      user_role: 'warehouse_manager',
      agency_id: bonaberiId,
      agency_name: 'Agence Bonabéri',
      action: 'request_rejected',
      details: `${DEMO_MARKER} Demande refusée : 5 pièce de Robinet 1/2 — Agence Bonabéri — Motif : Produit indisponible`,
      product_name: 'Robinet 1/2',
      quantity: 5,
      rejection_reason: 'Produit indisponible',
      previous_value: 'pending',
      new_value: 'rejected',
      created_at: daysAgo(1, 12),
    },
    {
      user_id: akwaUser,
      user_name: 'Pauline Ngo',
      user_role: 'agency_employee',
      agency_id: akwaId,
      agency_name: 'Agence Akwa',
      action: 'request_created',
      details: `${DEMO_MARKER} Demande de 50 sac de Ciment 42.5 — Agence Akwa`,
      product_name: 'Ciment 42.5',
      quantity: 50,
      created_at: hoursAgo(5),
    },
  ];

  const { error: logErr } = await supabase.from('activity_logs').insert(logs);
  if (logErr) throw logErr;
  console.log(`✓ ${logs.length} lignes d'activité [DEMO]`);

  console.log(`
${DEMO_MARKER} Seed terminé.

Comptes de test (mot de passe pour TOUS : ${DEMO_PASSWORD})
────────────────────────────────────────────────────────
Admin        admin@${DEMO_EMAIL_DOMAIN}
Entrepôt     jeanpaul@${DEMO_EMAIL_DOMAIN}   (Jean-Paul)
             marc@${DEMO_EMAIL_DOMAIN}        (Marc)
Agence Akwa  akwa1@${DEMO_EMAIL_DOMAIN}      (Pauline — scénario principal)
             akwa2@${DEMO_EMAIL_DOMAIN}
             akwa3@${DEMO_EMAIL_DOMAIN}
Bonabéri     bonaberi1@${DEMO_EMAIL_DOMAIN}
Bépanda      bepanda1@${DEMO_EMAIL_DOMAIN}
Makepe       makepe1@${DEMO_EMAIL_DOMAIN}

Produits     ${PRODUCTS.length} (SKU ${DEMO_SKU_PREFIX}*)
Agences      ${DEMO_AGENCY_NAMES.join(', ')}

Pour supprimer TOUTES ces données mock :
  npm run clear:mock
`);
}

main().catch((err) => {
  console.error('❌ Seed mock échoué:', err.message || err);
  process.exit(1);
});
