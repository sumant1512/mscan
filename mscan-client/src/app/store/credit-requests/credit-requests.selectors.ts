/**
 * Credit Requests Selectors
 */

import { createFeatureSelector, createSelector } from '@ngrx/store';
import { CreditRequestsState } from './credit-requests.models';

export const selectCreditRequestsState = createFeatureSelector<CreditRequestsState>('creditRequests');

// Base selectors
export const selectPendingRequests = createSelector(
  selectCreditRequestsState,
  (state) => state.pending
);

export const selectApprovedRequests = createSelector(
  selectCreditRequestsState,
  (state) => state.approved
);

export const selectRejectedRequests = createSelector(
  selectCreditRequestsState,
  (state) => state.rejected
);

export const selectLoading = createSelector(
  selectCreditRequestsState,
  (state) => state.loading
);

export const selectError = createSelector(
  selectCreditRequestsState,
  (state) => state.error
);

// Combined history selector (approved + rejected)
export const selectHistoryRequests = createSelector(
  selectApprovedRequests,
  selectRejectedRequests,
  (approved, rejected) => {
    // Combine and sort by processed_at (most recent first)
    return [...approved, ...rejected].sort((a, b) => {
      const dateA = new Date(a.processed_at || 0).getTime();
      const dateB = new Date(b.processed_at || 0).getTime();
      return dateB - dateA;
    });
  }
);

// Selector factories for filtering by tenant ID
export const selectPendingRequestsByTenant = (tenantId: string | null) =>
  createSelector(selectPendingRequests, (requests) => {
    if (!tenantId || tenantId === 'all') return requests;
    const tenantIdNum = tenantId;
    return requests.filter((req) => req.tenant_id === tenantIdNum);
  });

export const selectHistoryRequestsByTenant = (tenantId: string | null) =>
  createSelector(selectHistoryRequests, (requests) => {
    if (!tenantId || tenantId === 'all') return requests;
    const tenantIdNum = tenantId;
    return requests.filter((req) => req.tenant_id === tenantIdNum);
  });
