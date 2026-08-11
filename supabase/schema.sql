-- ============================================================
-- StockAgence — schéma COMPLET (première installation)
-- À coller dans : Supabase → SQL Editor → New query → Run
-- ============================================================

-- 1) Tables
create table if not exists agencies (
  id serial primary key,
  name text not null,
  city text default '',
  phone text default '',
  created_at timestamptz default now()
);

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null,
  role text not null check (role in ('owner', 'warehouse_manager', 'agency_employee')),
  agency_id integer references agencies(id) on delete set null,
  created_at timestamptz default now()
);

create table if not exists products (
  id serial primary key,
  name text not null,
  sku text not null unique,
  category text not null,
  product_type text not null default 'Standard',
  unit text not null,
  min_stock integer default 0,
  image_url text,
  minimum_price numeric,
  maximum_price numeric,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists inventory (
  id serial primary key,
  product_id integer not null references products(id) on delete cascade,
  quantity integer not null default 0,
  updated_at timestamptz default now(),
  unique (product_id)
);

create table if not exists product_requests (
  id serial primary key,
  product_id integer not null references products(id),
  agency_id integer not null references agencies(id),
  user_id uuid not null references profiles(id),
  quantity integer not null,
  note text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  processed_by uuid references profiles(id),
  processed_at timestamptz,
  rejection_reason text,
  rejection_reason_code text
);

create table if not exists activity_logs (
  id serial primary key,
  user_id uuid,
  user_name text not null,
  user_role text,
  agency_id integer,
  agency_name text,
  action text not null,
  details text not null,
  product_name text,
  quantity numeric,
  previous_value text,
  new_value text,
  rejection_reason text,
  created_at timestamptz default now()
);

-- 2) Indexes utiles
create index if not exists idx_profiles_agency on profiles(agency_id);
create index if not exists idx_profiles_role on profiles(role);
create index if not exists idx_inventory_product on inventory(product_id);
create index if not exists idx_requests_status on product_requests(status);
create index if not exists idx_requests_agency on product_requests(agency_id);
create index if not exists idx_requests_created on product_requests(created_at desc);
create index if not exists idx_activity_created on activity_logs(created_at desc);

-- 3) Realtime (stock + demandes en direct)
do $$
begin
  begin
    alter publication supabase_realtime add table inventory;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table products;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table product_requests;
  exception when duplicate_object then null;
  end;
end $$;

-- 4) Storage : bucket public pour images produits
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = true;

-- Politique lecture publique des images
drop policy if exists "Public read product images" on storage.objects;
create policy "Public read product images"
  on storage.objects for select
  using (bucket_id = 'product-images');

-- Upload via service role (API) : pas besoin de policy user pour insert
-- Si vous uploadez aussi côté client, décommentez :
-- create policy "Authenticated upload product images"
--   on storage.objects for insert
--   to authenticated
--   with check (bucket_id = 'product-images');

-- 5) RLS : l’API utilise la SERVICE ROLE KEY (contourne RLS).
-- On active RLS quand même, avec lecture profil pour le client Auth.
alter table agencies enable row level security;
alter table profiles enable row level security;
alter table products enable row level security;
alter table inventory enable row level security;
alter table product_requests enable row level security;
alter table activity_logs enable row level security;

drop policy if exists "Users read own profile" on profiles;
create policy "Users read own profile"
  on profiles for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "Users read agencies" on agencies;
create policy "Users read agencies"
  on agencies for select
  to authenticated
  using (true);

drop policy if exists "Users read products" on products;
create policy "Users read products"
  on products for select
  to authenticated
  using (true);

drop policy if exists "Users read inventory" on inventory;
create policy "Users read inventory"
  on inventory for select
  to authenticated
  using (true);

-- ============================================================
-- ÉTAPE SUIVANTE (après ce script) :
-- 1. Authentication → Users → Add user (email + mot de passe)
-- 2. Copiez l’UUID du user, puis exécutez (en remplaçant) :
--
-- insert into profiles (id, email, full_name, role, agency_id)
-- values (
--   'COLLER-UUID-ICI',
--   'admin@votredomaine.com',
--   'Admin Principal',
--   'owner',
--   null
-- );
-- ============================================================
