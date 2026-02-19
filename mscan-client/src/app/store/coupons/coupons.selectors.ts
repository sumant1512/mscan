/**
 * Coupon Management Selectors
 */

import { createFeatureSelector, createSelector } from '@ngrx/store';
import { CouponsState } from './coupons.state';

export const selectCouponsState = createFeatureSelector<CouponsState>('coupons');

// Basic selectors
export const selectAllCoupons = createSelector(
  selectCouponsState,
  (state: CouponsState) => state.coupons
);

export const selectSelectedCoupon = createSelector(
  selectCouponsState,
  (state: CouponsState) => state.selectedCoupon
);

export const selectCouponsLoading = createSelector(
  selectCouponsState,
  (state: CouponsState) => state.loading
);

export const selectCouponsError = createSelector(
  selectCouponsState,
  (state: CouponsState) => state.error
);

export const selectPagination = createSelector(
  selectCouponsState,
  (state: CouponsState) => state.pagination
);

export const selectLastCreatedBatchId = createSelector(
  selectCouponsState,
  (state: CouponsState) => state.lastCreatedBatchId
);

export const selectLastOperationResult = createSelector(
  selectCouponsState,
  (state: CouponsState) => state.lastOperationResult
);

// Computed selectors
export const selectCouponById = (id: string) =>
  createSelector(selectAllCoupons, (coupons) =>
    coupons.find((coupon) => coupon.id === id)
  );

export const selectCouponsByStatus = (status: string) =>
  createSelector(selectAllCoupons, (coupons) =>
    coupons.filter((coupon) => coupon.status === status)
  );

export const selectCouponsByAppId = (appId: string) =>
  createSelector(selectAllCoupons, (coupons) =>
    coupons.filter((coupon) => coupon.verification_app_id === appId)
  );

export const selectActiveCoupons = createSelector(
  selectAllCoupons,
  (coupons) => coupons.filter((coupon) => coupon.status === 'active')
);

export const selectDraftCoupons = createSelector(
  selectAllCoupons,
  (coupons) => coupons.filter((coupon) => coupon.status === 'draft')
);

export const selectPrintedCoupons = createSelector(
  selectAllCoupons,
  (coupons) => coupons.filter((coupon) => coupon.status === 'printed')
);

export const selectExpiredCoupons = createSelector(
  selectAllCoupons,
  (coupons) => coupons.filter((coupon) => coupon.status === 'expired')
);

export const selectUsedCoupons = createSelector(
  selectAllCoupons,
  (coupons) => coupons.filter((coupon) => coupon.status === 'used')
);

export const selectCouponsCount = createSelector(
  selectAllCoupons,
  (coupons) => coupons.length
);

export const selectCouponsByBatchId = (batchId: string) =>
  createSelector(selectAllCoupons, (coupons) =>
    coupons.filter((coupon) => {
      // Assuming batch_id is stored in a property - adjust if needed
      return (coupon as any).batch_id === batchId;
    })
  );

// Statistics selectors
export const selectCouponStats = createSelector(
  selectAllCoupons,
  (coupons) => {
    const stats = {
      total: coupons.length,
      active: 0,
      draft: 0,
      printed: 0,
      used: 0,
      expired: 0,
      inactive: 0,
      exhausted: 0,
    };

    coupons.forEach((coupon) => {
      switch (coupon.status) {
        case 'active':
          stats.active++;
          break;
        case 'draft':
          stats.draft++;
          break;
        case 'printed':
          stats.printed++;
          break;
        case 'used':
          stats.used++;
          break;
        case 'expired':
          stats.expired++;
          break;
        case 'inactive':
          stats.inactive++;
          break;
        case 'exhausted':
          stats.exhausted++;
          break;
      }
    });

    return stats;
  }
);

export const selectHasMoreCoupons = createSelector(
  selectPagination,
  (pagination) => pagination?.hasMore || false
);

export const selectCurrentPage = createSelector(
  selectPagination,
  (pagination) => pagination?.page || 1
);

export const selectTotalCoupons = createSelector(
  selectPagination,
  (pagination) => pagination?.total || 0
);
