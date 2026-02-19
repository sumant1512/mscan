export interface CreditRequest {
  id: string; // UUID
  tenant_id: string;
  requested_by?: string; // User ID (UUID) who requested
  requested_by_name?: string; // Name of tenant admin who requested
  requested_by_email?: string; // Email of requester
  requested_amount: number;
  justification?: string;
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
  processed_at?: string;
  processed_by?: string; // User ID (UUID) who approved/rejected
  processed_by_name?: string; // Name of super admin who approved/rejected
  rejection_reason?: string;
  tenant_name?: string;
  contact_email?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreditBalance {
  tenant_id: string;
  total_credits: number;
  balance: number;
  total_received: number;
  total_spent: number;
  total_coupons_created: number;
  last_updated: string;
}

export interface CreditTransaction {
  id: string; // UUID
  tenant_id: string;
  transaction_type: 'CREDIT' | 'DEBIT' | 'REJECTED' | 'REFUND';
  amount: number;
  balance_before: number;
  balance_after: number;
  reference_id?: string; // UUID
  reference_type?: string;
  description?: string;
  created_at: string;
  created_by?: string; // User ID (UUID)
  created_by_name?: string; // Name of the person who requested the credit
  created_by_email?: string; // Email of the requester
  processed_by_name?: string; // Name of super admin who approved/rejected
  justification?: string; // For rejected requests
  rejection_reason?: string; // For rejected requests
  tenant_name?: string;
}

export interface VerificationApp {
  verification_app_id: string;
  tenant_id?: string;
  app_name: string;
  code?: string;
  description?: string;
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
  welcome_message?: string;
  scan_success_message?: string;
  scan_failure_message?: string;
  post_scan_redirect_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  total_coupons?: number;
  total_scans?: number;
}

export interface Product {
  id: string; // UUID
  tenant_id: string;
  verification_app_id?: string; // UUID
  product_name: string;
  product_sku?: string;
  description?: string;
  price?: number;
  currency?: string;
  image_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  template_id?: string;
  template_name?: string;
  attributes?: any; // Dynamic attributes from template
}

export interface Coupon {
  id: string;
  tenant_id: string;
  verification_app_id?: string;
  coupon_code: string;
  discount_type: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'BUY_X_GET_Y'; // All 3 types from database
  discount_value: number;
  discount_currency?: string;
  buy_quantity?: number;
  get_quantity?: number;
  min_purchase_amount?: number;
  expiry_date: string;
  total_usage_limit?: number;
  per_user_usage_limit?: number;
  current_usage_count: number;
  status: 'draft' | 'printed' | 'active' | 'used' | 'expired' | 'exhausted' | 'inactive';
  qr_code_url?: string;
  description?: string;
  terms?: string;
  product_name?: string;
  product_sku?: string;
  credit_cost: number;
  created_at: string;
  updated_at: string;
  printed_at?: string;
  printed_count?: number;
  activated_at?: string;
  activation_note?: string;
  deactivation_reason?: string;
  app_name?: string;
  total_scans?: number;
  successful_scans?: number;
  coupon_reference?: string;
}

export interface Scan {
  id: string; // UUID
  coupon_id: string; // UUID
  tenant_id: string;
  scanned_at: string; // Renamed from scan_timestamp to match database
  scan_status: 'SUCCESS' | 'EXPIRED' | 'EXHAUSTED' | 'INVALID' | 'INACTIVE' | 'NOT_ACTIVE' | 'NOT_PRINTED' | 'USED';
  latitude?: number; // Renamed from location_lat to match database
  longitude?: number; // Renamed from location_lng to match database
  device_info?: string;
  user_agent?: string;
  ip_address?: string;
  coupon_code?: string;
}

export interface ScanAnalytics {
  total_scans: number;
  successful_scans: number;
  expired_scans: number;
  exhausted_scans: number;
  invalid_scans: number;
}

export interface CreditCostBreakdown {
  total: number;
  breakdown: {
    base: number;
    discountMultiplier: number;
    quantityMultiplier: number;
    timeMultiplier: number;
  };
  minimumCost: number;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
