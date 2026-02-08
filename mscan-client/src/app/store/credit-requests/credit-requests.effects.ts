/**
 * Credit Requests Effects
 */

import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { catchError, map, mergeMap, switchMap } from 'rxjs/operators';
import { CreditService } from '../../services/credit.service';
import * as CreditRequestsActions from './credit-requests.actions';

@Injectable()
export class CreditRequestsEffects {
  private actions$ = inject(Actions);
  private creditService = inject(CreditService);

  loadPendingRequests$ = createEffect(() =>
    this.actions$.pipe(
      ofType(CreditRequestsActions.loadPendingRequests),
      switchMap(() =>
        this.creditService.getAllRequests('pending', 1, 100).pipe(
          map((response) =>
            CreditRequestsActions.loadPendingRequestsSuccess({ requests: response.requests })
          ),
          catchError((error) =>
            of(
              CreditRequestsActions.loadRequestsFailure({
                error: error.error?.error || error.message || 'Failed to load pending requests',
              })
            )
          )
        )
      )
    )
  );

  loadApprovedRequests$ = createEffect(() =>
    this.actions$.pipe(
      ofType(CreditRequestsActions.loadApprovedRequests),
      switchMap(() =>
        this.creditService.getAllRequests('approved', 1, 100).pipe(
          map((response) =>
            CreditRequestsActions.loadApprovedRequestsSuccess({ requests: response.requests })
          ),
          catchError((error) =>
            of(
              CreditRequestsActions.loadRequestsFailure({
                error: error.error?.error || error.message || 'Failed to load approved requests',
              })
            )
          )
        )
      )
    )
  );

  loadRejectedRequests$ = createEffect(() =>
    this.actions$.pipe(
      ofType(CreditRequestsActions.loadRejectedRequests),
      switchMap(() =>
        this.creditService.getAllRequests('rejected', 1, 100).pipe(
          map((response) =>
            CreditRequestsActions.loadRejectedRequestsSuccess({ requests: response.requests })
          ),
          catchError((error) =>
            of(
              CreditRequestsActions.loadRequestsFailure({
                error: error.error?.error || error.message || 'Failed to load rejected requests',
              })
            )
          )
        )
      )
    )
  );

  loadAllRequests$ = createEffect(() =>
    this.actions$.pipe(
      ofType(CreditRequestsActions.loadAllRequests),
      mergeMap(() => [
        CreditRequestsActions.loadPendingRequests(),
        CreditRequestsActions.loadApprovedRequests(),
        CreditRequestsActions.loadRejectedRequests(),
      ])
    )
  );

  approveRequest$ = createEffect(() =>
    this.actions$.pipe(
      ofType(CreditRequestsActions.approveRequest),
      switchMap(({ id }) =>
        this.creditService.approveRequest(id).pipe(
          mergeMap(() => [
            CreditRequestsActions.approveRequestSuccess({ id }),
            CreditRequestsActions.loadApprovedRequests(),
          ]),
          catchError((error) =>
            of(
              CreditRequestsActions.approveRequestFailure({
                error: error.error?.error || error.message || 'Failed to approve request',
              })
            )
          )
        )
      )
    )
  );

  rejectRequest$ = createEffect(() =>
    this.actions$.pipe(
      ofType(CreditRequestsActions.rejectRequest),
      switchMap(({ id, reason }) =>
        this.creditService.rejectRequest(id, reason).pipe(
          mergeMap(() => [
            CreditRequestsActions.rejectRequestSuccess({ id }),
            CreditRequestsActions.loadRejectedRequests(),
          ]),
          catchError((error) =>
            of(
              CreditRequestsActions.rejectRequestFailure({
                error: error.error?.error || error.message || 'Failed to reject request',
              })
            )
          )
        )
      )
    )
  );
}
