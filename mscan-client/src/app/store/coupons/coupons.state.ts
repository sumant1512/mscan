/**
 * Coupon Management State
 */

import { Coupon } from '../../models/rewards.model';

export interface CouponsState {
  coupons: Coupon[];
  selectedCoupon: Coupon | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  } | null;
  loading: boolean;
  error: string | null;
  lastCreatedBatchId: string | null;
  lastOperationResult: {
    type: 'activate' | 'deactivate' | 'print' | 'create' | null;
    count: number;
    message: string;
  } | null;
}

export const initialCouponsState: CouponsState = {
  coupons: [],
  selectedCoupon: null,
  pagination: null,
  loading: false,
  error: null,
  lastCreatedBatchId: null,
  lastOperationResult: null,
};
