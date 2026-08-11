# StockAgence

Application web pour quincailleries camerounaises : remplacer Excel + appels par le stock entrepôt en temps réel.

## Stack
- React + TypeScript + Vite + Tailwind
- Supabase (Auth, PostgreSQL, Realtime, Storage)
- API serverless Vercel (`/api`)

---

## Première installation (vous partez du ZIP)

Le ZIP ne contient **pas** de base de données. Il faut créer un projet Supabase gratuit, puis coller le schéma SQL.

### 1. Créer le projet Supabase

1. Allez sur [https://supabase.com](https://supabase.com) → **New project**
2. Choisissez un nom, un mot de passe DB, une région (ex. `eu-west-1`)
3. Attendez que le projet soit prêt

### 2. Créer les tables

1. Dans Supabase : **SQL Editor** → **New query**
2. Ouvrez le fichier `supabase/schema.sql` de ce projet
3. Copiez-collez **tout** le contenu → **Run**

Cela crée : agences, profils, produits, stock, demandes, activité, realtime, bucket images.

### 3. Créer le premier compte Admin (owner)

1. **Authentication** → **Users** → **Add user**
   - Email + mot de passe
   - Cochez **Auto Confirm User**
2. Copiez l’**UUID** de cet utilisateur
3. **SQL Editor** → exécutez (remplacez les valeurs) :

```sql
insert into profiles (id, email, full_name, role, agency_id)
values (
  'COLLER-UUID-ICI',
  'admin@exemple.com',
  'Admin Principal',
  'owner',
  null
);
```

Ensuite, dans l’app, l’Admin pourra créer agences + utilisateurs (entrepôt / employés).

### 4. Récupérer les clés

**Project Settings** → **API** :

| Variable | Où la trouver |
|---|---|
| `VITE_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `VITE_SUPABASE_ANON_KEY` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `anon` `public` |
| `SUPABASE_SERVICE_ROLE_KEY` | `service_role` (secret — ne jamais exposer au navigateur) |

### 5. Fichier `.env`

```bash
cp .env.example .env
```

Remplissez `.env` avec les 3 clés (URL + anon + service_role).  
Les paires `VITE_*` et `NEXT_PUBLIC_*` doivent avoir les **mêmes** valeurs URL/anon.

### 6. Lancer l’application

```bash
npm install
```

**Option A — local avec API (recommandé)**

```bash
npx vercel dev
```

(La première fois, liez le projet ou choisissez un scope. Les routes `/api/*` fonctionnent.)

**Option B — frontend seul**

```bash
npm run dev
```

Sans `vercel dev`, les appels `/api/...` échoueront en local (l’API est conçue pour Vercel).

**Option C — déployer sur Vercel**

1. Poussez le repo / importez le dossier sur Vercel
2. Ajoutez les variables d’environnement (les 5 du `.env.example`)
3. Deploy

---

## Rôles

| Rôle | Usage |
|---|---|
| `owner` | Admin : agences, utilisateurs, prix, audit |
| `warehouse_manager` | Entrepôt : stock, accepter/refuser demandes |
| `agency_employee` | Agence : voir stock, créer/suivre demandes |

## Flux principal

- **Agence** : Rechercher → Voir stock → Demander → Suivre
- **Entrepôt** : Voir demande → Accepter / Refuser → Stock mis à jour
- **Admin** : Gérer utilisateurs/agences → Prix → Journal d’activité

## Structure

```
api/                 API serverless
src/pages/           Écrans
src/components/
src/contexts/        Auth
src/lib/             supabase, types, api, constants
supabase/schema.sql  Schéma complet (première install)
```
