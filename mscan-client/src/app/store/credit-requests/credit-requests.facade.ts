/**
 * Credit Requests Facade
 */

import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { CreditRequest } from '../../models/rewards.model';
import * as CreditRequestsActions from './credit-requests.actions';
import * as CreditRequestsSelectors from './credit-requests.selectors';

@Injectable({
  providedIn: 'root',
})
export class CreditRequestsFacade {
  private store = inject(Store);

  // Selectors
  pendingRequests$: Observable<CreditRequest[]> = this.store.select(
    CreditRequestsSelectors.selectPendingRequests
  );

  approvedRequests$: Observable<CreditRequest[]> = this.store.select(
    CreditRequestsSelectors.selectApprovedRequests
  );

  rejectedRequests$: Observable<CreditRequest[]> = this.store.select(
    CreditRequestsSelectors.selectRejectedRequests
  );

  historyRequests$: Observable<CreditRequest[]> = this.store.select(
    CreditRequestsSelectors.selectHistoryRequests
  );

  loading$: Observable<boolean> = this.store.select(CreditRequestsSelectors.selectLoading);

  error$: Observable<string | null> = this.store.select(CreditRequestsSelectors.selectError);

  // Methods for filtered data
  getPendingRequestsByTenant(tenantId: string | null): Observable<CreditRequest[]> {
    return this.store.select(CreditRequestsSelectors.selectPendingRequestsByTenant(tenantId));
  }

  getHistoryRequestsByTenant(tenantId: string | null): Observable<CreditRequest[]> {
    return this.store.select(CreditRequestsSelectors.selectHistoryRequestsByTenant(tenantId));
  }

  // Actions
  loadPendingRequests(): void {
    this.store.dispatch(CreditRequestsActions.loadPendingRequests());
  }

  loadApprovedRequests(): void {
    this.store.dispatch(CreditRequestsActions.loadApprovedRequests());
  }

  loadRejectedRequests(): void {
    this.store.dispatch(CreditRequestsActions.loadRejectedRequests());
  }

  loadAllRequests(): void {
    this.store.dispatch(CreditRequestsActions.loadAllRequests());
  }

  approveRequest(id: number): void {
    this.store.dispatch(CreditRequestsActions.approveRequest({ id }));
  }

  rejectRequest(id: number, reason: string): void {
    this.store.dispatch(CreditRequestsActions.rejectRequest({ id, reason }));
  }

  clearError(): void {
    this.store.dispatch(CreditRequestsActions.clearError());
  }
}
