export type UserRole = 'owner' | 'warehouse_manager' | 'agency_employee';

export type RequestStatus = 'pending' | 'approved' | 'rejected';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  agency_id: number | null;
  created_at?: string;
  agency_name?: string;
}

export interface Agency {
  id: number;
  name: string;
  city: string;
  phone: string;
  created_at?: string;
}

export interface Product {
  id: number;
  name: string;
  sku: string;
  category: string;
  product_type: string;
  unit: string;
  min_stock: number;
  image_url: string | null;
  minimum_price: number | null;
  maximum_price: number | null;
  created_at?: string;
  updated_at?: string;
  quantity?: number;
  inventory_id?: number;
  inventory_updated_at?: string;
}

export interface ProductRequest {
  id: number;
  product_id: number;
  agency_id: number;
  user_id: string;
  quantity: number;
  note: string | null;
  status: RequestStatus;
  created_at: string;
  updated_at?: string;
  processed_by: string | null;
  processed_at: string | null;
  rejection_reason: string | null;
  rejection_reason_code: string | null;
  product_name?: string;
  product_sku?: string;
  product_unit?: string;
  agency_name?: string;
  user_name?: string;
  processed_by_name?: string;
  current_stock?: number;
}

export interface ActivityLog {
  id: number;
  user_id: string | null;
  user_name: string;
  user_role?: string | null;
  agency_id?: number | null;
  agency_name?: string | null;
  action: string;
  details: string;
  product_name?: string | null;
  quantity?: number | null;
  previous_value?: string | null;
  new_value?: string | null;
  rejection_reason?: string | null;
  created_at: string;
}

export interface DashboardStats {
  totalProducts: number;
  lowStock: number;
  pendingRequests: number;
  totalAgencies?: number;
  recentActivity: ActivityLog[];
  recentPending?: ProductRequest[];
}

export interface ManagedUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  agency_id: number | null;
  agency_name?: string | null;
  created_at?: string;
}
