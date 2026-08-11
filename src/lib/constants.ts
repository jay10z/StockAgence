export const REJECTION_REASONS = [
  { code: 'stock_insuffisant', label: 'Stock insuffisant' },
  { code: 'produit_indisponible', label: 'Produit indisponible' },
  { code: 'quantite_trop_elevee', label: 'Quantité demandée trop élevée' },
  { code: 'produit_reserve', label: 'Produit réservé' },
  { code: 'autre', label: 'Autre' },
] as const;

export type RejectionReasonCode = (typeof REJECTION_REASONS)[number]['code'];

export const PRODUCT_CATEGORIES = [
  'Ciment',
  'Matériaux de construction',
  'Plomberie',
  'Électricité',
  'Peinture',
  'Quincaillerie',
  'Outillage',
  'Construction',
  'Serrurerie',
  'Divers',
] as const;

export const PRODUCT_TYPES = [
  'Standard',
  'Matériau',
  'Outillage',
  'Accessoire',
  'Consommable',
  'Équipement',
] as const;

export const PRODUCT_UNITS = [
  'pièce',
  'carton',
  'sac',
  'kg',
  'mètre',
  'litre',
  'boîte',
  'rouleau',
  'paquet',
  'bidon',
] as const;

export const ROLE_LABELS: Record<string, string> = {
  owner: 'Propriétaire / Admin',
  warehouse_manager: 'Responsable entrepôt',
  agency_employee: 'Employé agence',
};

export const ACTION_LABELS: Record<string, string> = {
  product_added: 'Produit ajouté',
  product_updated: 'Produit modifié',
  stock_updated: 'Stock modifié',
  request_created: 'Demande créée',
  request_approved: 'Demande acceptée',
  request_rejected: 'Demande refusée',
  agency_created: 'Agence créée',
  agency_updated: 'Agence modifiée',
  agency_deleted: 'Agence supprimée',
  user_created: 'Utilisateur créé',
  user_updated: 'Utilisateur modifié',
  price_updated: 'Prix indicatif modifié',
};

export const PRICE_DISCLAIMER =
  'Prix indicatif — à confirmer avec l’administration.';
