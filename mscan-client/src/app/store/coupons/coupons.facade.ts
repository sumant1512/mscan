/**
 * Coupon Management Facade
 * Provides a clean API for components to interact with the coupons store
 */

import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { Coupon } from '../../models/rewards.model';
import * as CouponsActions from './coupons.actions';
import * as CouponsSelectors from './coupons.selectors';

@Injectable({
  providedIn: 'root',
})
export class CouponsFacade {
  private store = inject(Store)
  // Observables
  coupons$ = this.store.select(CouponsSelectors.selectAllCoupons);
  selectedCoupon$ = this.store.select(CouponsSelectors.selectSelectedCoupon);
  loading$ = this.store.select(CouponsSelectors.selectCouponsLoading);
  error$ = this.store.select(CouponsSelectors.selectCouponsError);
  pagination$ = this.store.select(CouponsSelectors.selectPagination);
  lastCreatedBatchId$ = this.store.select(CouponsSelectors.selectLastCreatedBatchId);
  lastOperationResult$ = this.store.select(CouponsSelectors.selectLastOperationResult);
  couponStats$ = this.store.select(CouponsSelectors.selectCouponStats);
  hasMoreCoupons$ = this.store.select(CouponsSelectors.selectHasMoreCoupons);
  currentPage$ = this.store.select(CouponsSelectors.selectCurrentPage);
  totalCoupons$ = this.store.select(CouponsSelectors.selectTotalCoupons);

  // Status-specific observables
  activeCoupons$ = this.store.select(CouponsSelectors.selectActiveCoupons);
  draftCoupons$ = this.store.select(CouponsSelectors.selectDraftCoupons);
  printedCoupons$ = this.store.select(CouponsSelectors.selectPrintedCoupons);
  expiredCoupons$ = this.store.select(CouponsSelectors.selectExpiredCoupons);
  usedCoupons$ = this.store.select(CouponsSelectors.selectUsedCoupons);

  // Load operations
  loadCoupons(filters?: {
    status?: string;
    verification_app_id?: string;
    page?: number;
    limit?: number;
    search?: string;
  }): void {
    this.store.dispatch(CouponsActions.loadCoupons({ filters: filters || {} }));
  }

  loadCoupon(id: string): void {
    this.store.dispatch(CouponsActions.loadCoupon({ id }));
  }

  loadCouponsByStatus(status: string): void {
    this.loadCoupons({ status });
  }

  loadCouponsByAppId(appId: string): void {
    this.loadCoupons({ verification_app_id: appId });
  }

  // Create operations
  createCoupon(coupon: Partial<Coupon>): void {
    this.store.dispatch(CouponsActions.createCoupon({ coupon }));
  }

  createMultiBatchCoupons(
    verificationAppId: string,
    batches: {
      description: string;
      quantity: number;
      discountAmount: number;
      expiryDate: string;
    }[]
  ): void {
    this.store.dispatch(
      CouponsActions.createMultiBatchCoupons({ verificationAppId, batches })
    );
  }

  // Update operations
  updateCouponStatus(id: string, status: 'active' | 'inactive'): void {
    this.store.dispatch(CouponsActions.updateCouponStatus({ id, status }));
  }

  activateCoupon(id: string): void {
    this.updateCouponStatus(id, 'active');
  }

  deactivateCoupon(id: string): void {
    this.updateCouponStatus(id, 'inactive');
  }

  // Lifecycle operations
  activateCouponRange(
    from_reference: string,
    to_reference: string,
    status_filter?: string,
    activation_note?: string
  ): void {
    this.store.dispatch(
      CouponsActions.activateCouponRange({
        from_reference,
        to_reference,
        status_filter,
        activation_note,
      })
    );
  }

  activateCouponBatch(batchId: string, activationNote?: string): void {
    this.store.dispatch(
      CouponsActions.activateCouponBatch({ batchId, activationNote })
    );
  }

  markCouponAsPrinted(couponId: string): void {
    this.store.dispatch(CouponsActions.markCouponAsPrinted({ couponId }));
  }

  bulkMarkAsPrinted(couponIds: string[]): void {
    this.store.dispatch(CouponsActions.bulkMarkAsPrinted({ couponIds }));
  }

  bulkActivateCoupons(couponIds: string[], activationNote?: string): void {
    this.store.dispatch(
      CouponsActions.bulkActivateCoupons({ couponIds, activationNote })
    );
  }

  deactivateCouponRange(
    from_reference: string,
    to_reference: string,
    deactivation_reason: string
  ): void {
    this.store.dispatch(
      CouponsActions.deactivateCouponRange({
        from_reference,
        to_reference,
        deactivation_reason,
      })
    );
  }

  // Selection operations
  selectCoupon(coupon: Coupon | null): void {
    this.store.dispatch(CouponsActions.selectCoupon({ coupon }));
  }

  clearSelectedCoupon(): void {
    this.store.dispatch(CouponsActions.clearSelectedCoupon());
  }

  // Selector methods (for dynamic parameters)
  getCouponById(id: string): Observable<Coupon | undefined> {
    return this.store.select(CouponsSelectors.selectCouponById(id));
  }

  getCouponsByStatus(status: string): Observable<Coupon[]> {
    return this.store.select(CouponsSelectors.selectCouponsByStatus(status));
  }

  getCouponsByAppId(appId: string): Observable<Coupon[]> {
    return this.store.select(CouponsSelectors.selectCouponsByAppId(appId));
  }

  getCouponsByBatchId(batchId: string): Observable<Coupon[]> {
    return this.store.select(CouponsSelectors.selectCouponsByBatchId(batchId));
  }

  // Utility operations
  clearError(): void {
    this.store.dispatch(CouponsActions.clearError());
  }

  resetState(): void {
    this.store.dispatch(CouponsActions.resetCouponsState());
  }

  // Pagination
  loadNextPage(currentFilters?: any): void {
    this.pagination$.subscribe((pagination) => {
      if (pagination?.hasMore) {
        this.loadCoupons({
          ...currentFilters,
          page: (pagination.page || 0) + 1,
        });
      }
    }).unsubscribe();
  }
}
