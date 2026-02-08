/**
 * Credit Requests Reducer
 */

import { createReducer, on } from '@ngrx/store';
import { initialCreditRequestsState } from './credit-requests.models';
import * as CreditRequestsActions from './credit-requests.actions';

export const creditRequestsReducer = createReducer(
  initialCreditRequestsState,

  // Load Pending
  on(CreditRequestsActions.loadPendingRequests, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(CreditRequestsActions.loadPendingRequestsSuccess, (state, { requests }) => ({
    ...state,
    pending: requests,
    loading: false
  })),

  // Load Approved
  on(CreditRequestsActions.loadApprovedRequests, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(CreditRequestsActions.loadApprovedRequestsSuccess, (state, { requests }) => ({
    ...state,
    approved: requests,
    loading: false
  })),

  // Load Rejected
  on(CreditRequestsActions.loadRejectedRequests, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(CreditRequestsActions.loadRejectedRequestsSuccess, (state, { requests }) => ({
    ...state,
    rejected: requests,
    loading: false
  })),

  // Load All
  on(CreditRequestsActions.loadAllRequests, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  // Failure
  on(CreditRequestsActions.loadRequestsFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Approve Request
  on(CreditRequestsActions.approveRequest, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(CreditRequestsActions.approveRequestSuccess, (state, { id }) => ({
    ...state,
    pending: state.pending.filter(req => req.id !== id),
    loading: false
  })),

  on(CreditRequestsActions.approveRequestFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Reject Request
  on(CreditRequestsActions.rejectRequest, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(CreditRequestsActions.rejectRequestSuccess, (state, { id }) => ({
    ...state,
    pending: state.pending.filter(req => req.id !== id),
    loading: false
  })),

  on(CreditRequestsActions.rejectRequestFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  on(CreditRequestsActions.clearError, (state) => ({
    ...state,
    error: null
  }))
);
