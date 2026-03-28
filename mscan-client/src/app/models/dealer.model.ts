/**
 * Dealer Management Models
 */

/**
 * Dealer (list item from API)
 */
export interface Dealer {
  id: string;
  dealer_code: string;
  full_name: string;
  email: string | null;
  phone_e164: string;
  shop_name: string;
  city: string;
  state: string;
  is_active: boolean;
  points_balance: number;
}

/**
 * Dealer detail (full record from API)
 */
export interface DealerDetail extends Dealer {
  user_id: string;
  address: string;
  pincode: string;
  metadata?: any;
  user_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Create Dealer Request
 */
export interface CreateDealerRequest {
  full_name: string;
  email: string;
  phone_e164: string;
  shop_name: string;
  address: string;
  pincode: string;
  city: string;
  state: string;
  dealer_code?: string;
}

/**
 * Update Dealer Request
 */
export interface UpdateDealerRequest {
  full_name?: string;
  email?: string;
  shop_name?: string;
  address?: string;
  pincode?: string;
  city?: string;
  state?: string;
}

/**
 * Dealer Points
 */
export interface DealerPoints {
  balance: number;
  currency: string;
}

/**
 * Dealer Point Transaction
 */
export interface DealerPointTransaction {
  id: string;
  amount: number;
  type: 'CREDIT' | 'DEBIT';
  reason: string;
  reference_id: string;
  reference_type: string;
  metadata: any;
  created_at: string;
}

/**
 * List Dealers Filters
 */
export interface ListDealersFilters {
  search?: string;
  page?: number;
  limit?: number;
}

/**
 * Dealers List Response
 */
export interface DealersListResponse {
  status: boolean;
  data: {
    dealers: Dealer[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      pages: number;
    };
  };
}

/**
 * Dealer Transactions List Response
 */
export interface DealerTransactionsListResponse {
  status: boolean;
  data: {
    transactions: DealerPointTransaction[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      pages: number;
    };
  };
}
