/**
 * Removes ALL StockAgence MOCK / DEV seed data.
 * Does not touch non-demo production rows.
 *
 * Usage: npm run clear:mock
 */
import {
  createServiceClient,
  DEMO_EMAIL_DOMAIN,
  DEMO_SKU_PREFIX,
  DEMO_MARKER,
  DEMO_AGENCY_NAMES,
} from './mock/_helpers.mjs';

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

async function main() {
  const supabase = createServiceClient();
  console.log(`${DEMO_MARKER} Nettoyage des données mock...\n`);

  // Activity
  const { count: actCount } = await supabase
    .from('activity_logs')
    .delete({ count: 'exact' })
    .like('details', `${DEMO_MARKER}%`);
  console.log(`✓ Activity logs DEMO: ${actCount ?? 0}`);

  // Products + related
  const { data: products } = await supabase
    .from('products')
    .select('id, sku')
    .like('sku', `${DEMO_SKU_PREFIX}%`);
  const productIds = (products || []).map((p) => p.id);

  if (productIds.length) {
    await supabase.from('product_requests').delete().in('product_id', productIds);
    await supabase.from('inventory').delete().in('product_id', productIds);
    const { count } = await supabase
      .from('products')
      .delete({ count: 'exact' })
      .in('id', productIds);
    console.log(`✓ Produits DEMO: ${count ?? productIds.length}`);
  } else {
    console.log('✓ Aucun produit DEMO');
  }

  // Agencies (by known demo names) — also delete leftover requests
  const { data: agencies } = await supabase
    .from('agencies')
    .select('id, name')
    .in('name', DEMO_AGENCY_NAMES);
  const agencyIds = (agencies || []).map((a) => a.id);

  if (agencyIds.length) {
    await supabase.from('product_requests').delete().in('agency_id', agencyIds);
    await supabase.from('profiles').update({ agency_id: null }).in('agency_id', agencyIds);
    const { count } = await supabase
      .from('agencies')
      .delete({ count: 'exact' })
      .in('id', agencyIds);
    console.log(`✓ Agences DEMO: ${count ?? agencyIds.length}`);
  } else {
    console.log('✓ Aucune agence DEMO');
  }

  // Auth users + profiles with demo email domain
  const allUsers = await listAllUsers(supabase);
  const demoUsers = allUsers.filter((u) =>
    (u.email || '').toLowerCase().endsWith(`@${DEMO_EMAIL_DOMAIN}`)
  );

  for (const u of demoUsers) {
    await supabase.from('profiles').delete().eq('id', u.id);
    const { error } = await supabase.auth.admin.deleteUser(u.id);
    if (error) console.warn(`  ! Auth delete ${u.email}: ${error.message}`);
    else console.log(`✓ User supprimé: ${u.email}`);
  }

  // Also remove profiles that might remain without auth
  await supabase.from('profiles').delete().like('email', `%@${DEMO_EMAIL_DOMAIN}`);

  console.log(`
${DEMO_MARKER} Nettoyage terminé.
Les données non-DEMO (production / autres) sont intactes.
`);
}

main().catch((err) => {
  console.error('❌ clear:mock échoué:', err.message || err);
  process.exit(1);
});
