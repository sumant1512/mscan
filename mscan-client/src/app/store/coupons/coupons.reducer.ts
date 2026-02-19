/**
 * Coupon Management Reducer
 */

import { createReducer, on } from '@ngrx/store';
import { initialCouponsState } from './coupons.state';
import * as CouponsActions from './coupons.actions';

export const couponsReducer = createReducer(
  initialCouponsState,

  // Load coupons
  on(CouponsActions.loadCoupons, (state) => ({
    ...state,
    loading: true,
    error: null,
  })),

  on(CouponsActions.loadCouponsSuccess, (state, { coupons, pagination }) => ({
    ...state,
    coupons,
    pagination: pagination || null,
    loading: false,
    error: null,
  })),

  on(CouponsActions.loadCouponsFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),

  // Load single coupon
  on(CouponsActions.loadCoupon, (state) => ({
    ...state,
    loading: true,
    error: null,
  })),

  on(CouponsActions.loadCouponSuccess, (state, { coupon }) => ({
    ...state,
    selectedCoupon: coupon,
    loading: false,
    error: null,
  })),

  on(CouponsActions.loadCouponFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),

  // Create coupon
  on(CouponsActions.createCoupon, (state) => ({
    ...state,
    loading: true,
    error: null,
    lastCreatedBatchId: null,
  })),

  on(CouponsActions.createCouponSuccess, (state, { coupon, coupons, batch_id }) => {
    const newCoupons = coupons || (coupon ? [coupon] : []);
    return {
      ...state,
      coupons: [...newCoupons, ...state.coupons],
      lastCreatedBatchId: batch_id || null,
      lastOperationResult: {
        type: 'create' as const,
        count: newCoupons.length,
        message: `Successfully created ${newCoupons.length} coupon(s)`,
      },
      loading: false,
      error: null,
    };
  }),

  on(CouponsActions.createCouponFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),

  // Create multi-batch coupons
  on(CouponsActions.createMultiBatchCoupons, (state) => ({
    ...state,
    loading: true,
    error: null,
  })),

  on(CouponsActions.createMultiBatchCouponsSuccess, (state, { coupons }) => ({
    ...state,
    coupons: [...coupons, ...state.coupons],
    lastOperationResult: {
      type: 'create' as const,
      count: coupons.length,
      message: `Successfully created ${coupons.length} coupons in multiple batches`,
    },
    loading: false,
    error: null,
  })),

  on(CouponsActions.createMultiBatchCouponsFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),

  // Update coupon status
  on(CouponsActions.updateCouponStatus, (state) => ({
    ...state,
    loading: true,
    error: null,
  })),

  on(CouponsActions.updateCouponStatusSuccess, (state, { coupon }) => ({
    ...state,
    coupons: state.coupons.map((c) => (c.id === coupon.id ? coupon : c)),
    selectedCoupon: state.selectedCoupon?.id === coupon.id ? coupon : state.selectedCoupon,
    loading: false,
    error: null,
  })),

  on(CouponsActions.updateCouponStatusFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),

  // Activate coupon range
  on(CouponsActions.activateCouponRange, (state) => ({
    ...state,
    loading: true,
    error: null,
  })),

  on(CouponsActions.activateCouponRangeSuccess, (state, { activated_count, skipped_count }) => ({
    ...state,
    lastOperationResult: {
      type: 'activate' as const,
      count: activated_count,
      message: `Activated ${activated_count} coupon(s)${skipped_count > 0 ? `, skipped ${skipped_count}` : ''}`,
    },
    loading: false,
    error: null,
  })),

  on(CouponsActions.activateCouponRangeFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),

  // Activate coupon batch
  on(CouponsActions.activateCouponBatch, (state) => ({
    ...state,
    loading: true,
    error: null,
  })),

  on(CouponsActions.activateCouponBatchSuccess, (state, { activated_count }) => ({
    ...state,
    lastOperationResult: {
      type: 'activate' as const,
      count: activated_count,
      message: `Activated ${activated_count} coupon(s) in batch`,
    },
    loading: false,
    error: null,
  })),

  on(CouponsActions.activateCouponBatchFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),

  // Mark coupon as printed
  on(CouponsActions.markCouponAsPrinted, (state) => ({
    ...state,
    loading: true,
    error: null,
  })),

  on(CouponsActions.markCouponAsPrintedSuccess, (state, { coupon }) => ({
    ...state,
    coupons: state.coupons.map((c) => (c.id === coupon.id ? coupon : c)),
    selectedCoupon: state.selectedCoupon?.id === coupon.id ? coupon : state.selectedCoupon,
    loading: false,
    error: null,
  })),

  on(CouponsActions.markCouponAsPrintedFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),

  // Bulk mark as printed
  on(CouponsActions.bulkMarkAsPrinted, (state) => ({
    ...state,
    loading: true,
    error: null,
  })),

  on(CouponsActions.bulkMarkAsPrintedSuccess, (state, { printed_count, coupons }) => {
    const updatedCouponIds = new Set(coupons.map((c) => c.id));
    return {
      ...state,
      coupons: state.coupons.map((c) => {
        const updated = coupons.find((uc) => uc.id === c.id);
        return updated || c;
      }),
      lastOperationResult: {
        type: 'print' as const,
        count: printed_count,
        message: `Marked ${printed_count} coupon(s) as printed`,
      },
      loading: false,
      error: null,
    };
  }),

  on(CouponsActions.bulkMarkAsPrintedFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),

  // Bulk activate coupons
  on(CouponsActions.bulkActivateCoupons, (state) => ({
    ...state,
    loading: true,
    error: null,
  })),

  on(CouponsActions.bulkActivateCouponsSuccess, (state, { activated_count, skipped_count, activated_coupons }) => {
    const activatedIds = new Set(activated_coupons.map((c) => c.id));
    return {
      ...state,
      coupons: state.coupons.map((c) => {
        const activated = activated_coupons.find((ac) => ac.id === c.id);
        return activated || c;
      }),
      lastOperationResult: {
        type: 'activate' as const,
        count: activated_count,
        message: `Activated ${activated_count} coupon(s)${skipped_count > 0 ? `, skipped ${skipped_count}` : ''}`,
      },
      loading: false,
      error: null,
    };
  }),

  on(CouponsActions.bulkActivateCouponsFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),

  // Deactivate coupon range
  on(CouponsActions.deactivateCouponRange, (state) => ({
    ...state,
    loading: true,
    error: null,
  })),

  on(CouponsActions.deactivateCouponRangeSuccess, (state, { deactivated_count }) => ({
    ...state,
    lastOperationResult: {
      type: 'deactivate' as const,
      count: deactivated_count,
      message: `Deactivated ${deactivated_count} coupon(s)`,
    },
    loading: false,
    error: null,
  })),

  on(CouponsActions.deactivateCouponRangeFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),

  // Select coupon
  on(CouponsActions.selectCoupon, (state, { coupon }) => ({
    ...state,
    selectedCoupon: coupon,
  })),

  // Clear selection
  on(CouponsActions.clearSelectedCoupon, (state) => ({
    ...state,
    selectedCoupon: null,
  })),

  // Clear error
  on(CouponsActions.clearError, (state) => ({
    ...state,
    error: null,
  })),

  // Reset state
  on(CouponsActions.resetCouponsState, () => initialCouponsState)
);
