/**
 * Coupon Management Actions
 */

import { createAction, props } from '@ngrx/store';
import { Coupon } from '../../models/rewards.model';

// Load coupons with filters
export const loadCoupons = createAction(
  '[Coupons] Load Coupons',
  props<{
    filters?: {
      status?: string;
      verification_app_id?: string;
      page?: number;
      limit?: number;
      search?: string;
    };
  }>()
);

export const loadCouponsSuccess = createAction(
  '[Coupons] Load Coupons Success',
  props<{
    coupons: Coupon[];
    pagination?: {
      page: number;
      limit: number;
      total: number;
      hasMore: boolean;
    };
  }>()
);

export const loadCouponsFailure = createAction(
  '[Coupons] Load Coupons Failure',
  props<{ error: string }>()
);

// Load single coupon
export const loadCoupon = createAction(
  '[Coupons] Load Coupon',
  props<{ id: string }>()
);

export const loadCouponSuccess = createAction(
  '[Coupons] Load Coupon Success',
  props<{ coupon: Coupon }>()
);

export const loadCouponFailure = createAction(
  '[Coupons] Load Coupon Failure',
  props<{ error: string }>()
);

// Create coupon
export const createCoupon = createAction(
  '[Coupons] Create Coupon',
  props<{ coupon: Partial<Coupon> }>()
);

export const createCouponSuccess = createAction(
  '[Coupons] Create Coupon Success',
  props<{
    coupon?: Coupon;
    coupons?: Coupon[];
    batch_id?: string;
    credit_cost: number;
    new_balance: number;
  }>()
);

export const createCouponFailure = createAction(
  '[Coupons] Create Coupon Failure',
  props<{ error: string }>()
);

// Create multi-batch coupons
export const createMultiBatchCoupons = createAction(
  '[Coupons] Create Multi-Batch Coupons',
  props<{
    verificationAppId: string;
    batches: {
      description: string;
      quantity: number;
      discountAmount: number;
      expiryDate: string;
    }[];
  }>()
);

export const createMultiBatchCouponsSuccess = createAction(
  '[Coupons] Create Multi-Batch Coupons Success',
  props<{
    coupons: Coupon[];
    credit_cost: number;
    new_balance: number;
  }>()
);

export const createMultiBatchCouponsFailure = createAction(
  '[Coupons] Create Multi-Batch Coupons Failure',
  props<{ error: string }>()
);

// Update coupon status
export const updateCouponStatus = createAction(
  '[Coupons] Update Coupon Status',
  props<{ id: string; status: 'active' | 'inactive' }>()
);

export const updateCouponStatusSuccess = createAction(
  '[Coupons] Update Coupon Status Success',
  props<{ coupon: Coupon }>()
);

export const updateCouponStatusFailure = createAction(
  '[Coupons] Update Coupon Status Failure',
  props<{ error: string }>()
);

// Activate coupon range
export const activateCouponRange = createAction(
  '[Coupons] Activate Coupon Range',
  props<{
    from_reference: string;
    to_reference: string;
    status_filter?: string;
    activation_note?: string;
  }>()
);

export const activateCouponRangeSuccess = createAction(
  '[Coupons] Activate Coupon Range Success',
  props<{
    activated_count: number;
    skipped_count: number;
    activated_codes: string[];
    activated_references: string[];
  }>()
);

export const activateCouponRangeFailure = createAction(
  '[Coupons] Activate Coupon Range Failure',
  props<{ error: string }>()
);

// Activate coupon batch
export const activateCouponBatch = createAction(
  '[Coupons] Activate Coupon Batch',
  props<{ batchId: string; activationNote?: string }>()
);

export const activateCouponBatchSuccess = createAction(
  '[Coupons] Activate Coupon Batch Success',
  props<{
    batch_id: string;
    activated_count: number;
    activated_codes: string[];
  }>()
);

export const activateCouponBatchFailure = createAction(
  '[Coupons] Activate Coupon Batch Failure',
  props<{ error: string }>()
);

// Mark coupon as printed
export const markCouponAsPrinted = createAction(
  '[Coupons] Mark Coupon As Printed',
  props<{ couponId: string }>()
);

export const markCouponAsPrintedSuccess = createAction(
  '[Coupons] Mark Coupon As Printed Success',
  props<{ coupon: Coupon }>()
);

export const markCouponAsPrintedFailure = createAction(
  '[Coupons] Mark Coupon As Printed Failure',
  props<{ error: string }>()
);

// Bulk mark as printed
export const bulkMarkAsPrinted = createAction(
  '[Coupons] Bulk Mark As Printed',
  props<{ couponIds: string[] }>()
);

export const bulkMarkAsPrintedSuccess = createAction(
  '[Coupons] Bulk Mark As Printed Success',
  props<{ printed_count: number; coupons: Coupon[] }>()
);

export const bulkMarkAsPrintedFailure = createAction(
  '[Coupons] Bulk Mark As Printed Failure',
  props<{ error: string }>()
);

// Bulk activate coupons
export const bulkActivateCoupons = createAction(
  '[Coupons] Bulk Activate Coupons',
  props<{ couponIds: string[]; activationNote?: string }>()
);

export const bulkActivateCouponsSuccess = createAction(
  '[Coupons] Bulk Activate Coupons Success',
  props<{
    activated_count: number;
    skipped_count: number;
    activated_coupons: Coupon[];
  }>()
);

export const bulkActivateCouponsFailure = createAction(
  '[Coupons] Bulk Activate Coupons Failure',
  props<{ error: string }>()
);

// Deactivate coupon range
export const deactivateCouponRange = createAction(
  '[Coupons] Deactivate Coupon Range',
  props<{
    from_reference: string;
    to_reference: string;
    deactivation_reason: string;
  }>()
);

export const deactivateCouponRangeSuccess = createAction(
  '[Coupons] Deactivate Coupon Range Success',
  props<{
    deactivated_count: number;
    deactivated_codes: string[];
    deactivated_references: string[];
  }>()
);

export const deactivateCouponRangeFailure = createAction(
  '[Coupons] Deactivate Coupon Range Failure',
  props<{ error: string }>()
);

// Select coupon
export const selectCoupon = createAction(
  '[Coupons] Select Coupon',
  props<{ coupon: Coupon | null }>()
);

// Clear selection
export const clearSelectedCoupon = createAction(
  '[Coupons] Clear Selected Coupon'
);

// Clear errors
export const clearError = createAction('[Coupons] Clear Error');

// Reset state
export const resetCouponsState = createAction('[Coupons] Reset State');
