/**
 * Coupon Management Effects
 */

import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, catchError, switchMap, tap } from 'rxjs/operators';
import { RewardsService } from '../../services/rewards.service';
import * as CouponsActions from './coupons.actions';

@Injectable()
export class CouponsEffects {
  private actions$ = inject(Actions);
  private rewardsService = inject(RewardsService);

  // Load coupons
  loadCoupons$ = createEffect(() =>
    this.actions$.pipe(
      ofType(CouponsActions.loadCoupons),
      switchMap(({ filters }) =>
        this.rewardsService.getCoupons(filters).pipe(
          map((response) =>
            CouponsActions.loadCouponsSuccess({
              coupons: response?.data?.coupons || [],
              pagination: response?.data?.pagination,
            })
          ),
          catchError((error) =>
            of(
              CouponsActions.loadCouponsFailure({
                error: error.message || 'Failed to load coupons',
              })
            )
          )
        )
      )
    )
  );

  // Load single coupon
  loadCoupon$ = createEffect(() =>
    this.actions$.pipe(
      ofType(CouponsActions.loadCoupon),
      switchMap(({ id }) =>
        this.rewardsService.getCouponById(id).pipe(
          map((response) => {
            if (response?.data?.coupon) {
              return CouponsActions.loadCouponSuccess({ coupon: response.data.coupon });
            } else {
              return CouponsActions.loadCouponFailure({ error: 'Coupon not found' });
            }
          }),
          catchError((error) =>
            of(
              CouponsActions.loadCouponFailure({
                error: error.message || 'Failed to load coupon',
              })
            )
          )
        )
      )
    )
  );

  // Create coupon
  createCoupon$ = createEffect(() =>
    this.actions$.pipe(
      ofType(CouponsActions.createCoupon),
      switchMap(({ coupon }) =>
        this.rewardsService.createCoupon(coupon).pipe(
          map((response) =>
            CouponsActions.createCouponSuccess({
              coupon: response.coupon,
              coupons: response.coupons,
              batch_id: response.batch_id,
              credit_cost: response.credit_cost,
              new_balance: response.new_balance,
            })
          ),
          catchError((error) =>
            of(
              CouponsActions.createCouponFailure({
                error: error.message || 'Failed to create coupon',
              })
            )
          )
        )
      )
    )
  );

  // Create multi-batch coupons
  createMultiBatchCoupons$ = createEffect(() =>
    this.actions$.pipe(
      ofType(CouponsActions.createMultiBatchCoupons),
      switchMap(({ verificationAppId, batches }) =>
        this.rewardsService
          .createMultiBatchCoupons({ verificationAppId, batches })
          .pipe(
            map((response) =>
              CouponsActions.createMultiBatchCouponsSuccess({
                coupons: response.coupons,
                credit_cost: response.credit_cost,
                new_balance: response.new_balance,
              })
            ),
            catchError((error) =>
              of(
                CouponsActions.createMultiBatchCouponsFailure({
                  error: error.message || 'Failed to create multi-batch coupons',
                })
              )
            )
          )
      )
    )
  );

  // Update coupon status
  updateCouponStatus$ = createEffect(() =>
    this.actions$.pipe(
      ofType(CouponsActions.updateCouponStatus),
      switchMap(({ id, status }) =>
        this.rewardsService.updateCouponStatus(id, status).pipe(
          map((response) =>
            CouponsActions.updateCouponStatusSuccess({
              coupon: response.coupon,
            })
          ),
          catchError((error) =>
            of(
              CouponsActions.updateCouponStatusFailure({
                error: error.message || 'Failed to update coupon status',
              })
            )
          )
        )
      )
    )
  );

  // Activate coupon range
  activateCouponRange$ = createEffect(() =>
    this.actions$.pipe(
      ofType(CouponsActions.activateCouponRange),
      switchMap((data) =>
        this.rewardsService.activateCouponRange(data).pipe(
          map((response) =>
            CouponsActions.activateCouponRangeSuccess({
              activated_count: response.activated_count,
              skipped_count: response.skipped_count,
              activated_codes: response.activated_codes,
              activated_references: response.activated_references,
            })
          ),
          catchError((error) =>
            of(
              CouponsActions.activateCouponRangeFailure({
                error: error.message || 'Failed to activate coupon range',
              })
            )
          )
        )
      )
    )
  );

  // Activate coupon batch
  activateCouponBatch$ = createEffect(() =>
    this.actions$.pipe(
      ofType(CouponsActions.activateCouponBatch),
      switchMap(({ batchId, activationNote }) =>
        this.rewardsService.activateCouponBatch(batchId, activationNote).pipe(
          map((response) =>
            CouponsActions.activateCouponBatchSuccess({
              batch_id: response.batch_id,
              activated_count: response.activated_count,
              activated_codes: response.activated_codes,
            })
          ),
          catchError((error) =>
            of(
              CouponsActions.activateCouponBatchFailure({
                error: error.message || 'Failed to activate coupon batch',
              })
            )
          )
        )
      )
    )
  );

  // Mark coupon as printed
  markCouponAsPrinted$ = createEffect(() =>
    this.actions$.pipe(
      ofType(CouponsActions.markCouponAsPrinted),
      switchMap(({ couponId }) =>
        this.rewardsService.markCouponAsPrinted(couponId).pipe(
          map((response) =>
            CouponsActions.markCouponAsPrintedSuccess({
              coupon: response.coupon,
            })
          ),
          catchError((error) =>
            of(
              CouponsActions.markCouponAsPrintedFailure({
                error: error.message || 'Failed to mark coupon as printed',
              })
            )
          )
        )
      )
    )
  );

  // Bulk mark as printed
  bulkMarkAsPrinted$ = createEffect(() =>
    this.actions$.pipe(
      ofType(CouponsActions.bulkMarkAsPrinted),
      switchMap(({ couponIds }) =>
        this.rewardsService.bulkMarkAsPrinted(couponIds).pipe(
          map((response) =>
            CouponsActions.bulkMarkAsPrintedSuccess({
              printed_count: response.printed_count,
              coupons: response.coupons,
            })
          ),
          catchError((error) =>
            of(
              CouponsActions.bulkMarkAsPrintedFailure({
                error: error.message || 'Failed to bulk mark as printed',
              })
            )
          )
        )
      )
    )
  );

  // Bulk activate coupons
  bulkActivateCoupons$ = createEffect(() =>
    this.actions$.pipe(
      ofType(CouponsActions.bulkActivateCoupons),
      switchMap(({ couponIds, activationNote }) =>
        this.rewardsService.bulkActivateCoupons(couponIds, activationNote).pipe(
          map((response) =>
            CouponsActions.bulkActivateCouponsSuccess({
              activated_count: response.activated_count,
              skipped_count: response.skipped_count,
              activated_coupons: response.activated_coupons,
            })
          ),
          catchError((error) =>
            of(
              CouponsActions.bulkActivateCouponsFailure({
                error: error.message || 'Failed to bulk activate coupons',
              })
            )
          )
        )
      )
    )
  );

  // Deactivate coupon range
  deactivateCouponRange$ = createEffect(() =>
    this.actions$.pipe(
      ofType(CouponsActions.deactivateCouponRange),
      switchMap((data) =>
        this.rewardsService.deactivateCouponRange(data).pipe(
          map((response) =>
            CouponsActions.deactivateCouponRangeSuccess({
              deactivated_count: response.deactivated_count,
              deactivated_codes: response.deactivated_codes,
              deactivated_references: response.deactivated_references,
            })
          ),
          catchError((error) =>
            of(
              CouponsActions.deactivateCouponRangeFailure({
                error: error.message || 'Failed to deactivate coupon range',
              })
            )
          )
        )
      )
    )
  );

  // Reload coupons after successful operations
  reloadAfterSuccess$ = createEffect(() =>
    this.actions$.pipe(
      ofType(
        CouponsActions.createCouponSuccess,
        CouponsActions.createMultiBatchCouponsSuccess,
        CouponsActions.activateCouponRangeSuccess,
        CouponsActions.activateCouponBatchSuccess,
        CouponsActions.bulkActivateCouponsSuccess,
        CouponsActions.deactivateCouponRangeSuccess
      ),
      map(() => CouponsActions.loadCoupons({ filters: {} }))
    )
  );
}
