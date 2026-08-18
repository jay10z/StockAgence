/**
 * Warehouse stock level used by the UI badges.
 * Keep this as a pure function so CI can test it without React or Supabase.
 */
export type StockLevel = 'out' | 'low' | 'ok';

export function getStockStatus(quantity: number, minStock: number): StockLevel {
  if (quantity <= 0) return 'out';
  if (quantity <= minStock) return 'low';
  return 'ok';
}
