/**
 * Credit Requests Actions
 */

import { createAction, props } from '@ngrx/store';
import { CreditRequest } from '../../models/rewards.model';

// Load Actions
export const loadPendingRequests = createAction(
  '[Credit Requests] Load Pending Requests',
  props<{ tenantId?: string }>()
);

export const loadApprovedRequests = createAction(
  '[Credit Requests] Load Approved Requests',
  props<{ tenantId?: string }>()
);

export const loadRejectedRequests = createAction(
  '[Credit Requests] Load Rejected Requests',
  props<{ tenantId?: string }>()
);

export const loadAllRequests = createAction(
  '[Credit Requests] Load All Requests',
  props<{ tenantId?: string }>()
);

// Success Actions
export const loadPendingRequestsSuccess = createAction(
  '[Credit Requests] Load Pending Requests Success',
  props<{ requests: CreditRequest[] }>()
);

export const loadApprovedRequestsSuccess = createAction(
  '[Credit Requests] Load Approved Requests Success',
  props<{ requests: CreditRequest[] }>()
);

export const loadRejectedRequestsSuccess = createAction(
  '[Credit Requests] Load Rejected Requests Success',
  props<{ requests: CreditRequest[] }>()
);

// Failure Actions
export const loadRequestsFailure = createAction(
  '[Credit Requests] Load Requests Failure',
  props<{ error: string }>()
);

// Approve Request
export const approveRequest = createAction(
  '[Credit Requests] Approve Request',
  props<{ id: string }>()
);

export const approveRequestSuccess = createAction(
  '[Credit Requests] Approve Request Success',
  props<{ id: string }>()
);

export const approveRequestFailure = createAction(
  '[Credit Requests] Approve Request Failure',
  props<{ error: string }>()
);

// Reject Request
export const rejectRequest = createAction(
  '[Credit Requests] Reject Request',
  props<{ id: string; reason: string }>()
);

export const rejectRequestSuccess = createAction(
  '[Credit Requests] Reject Request Success',
  props<{ id: string }>()
);

export const rejectRequestFailure = createAction(
  '[Credit Requests] Reject Request Failure',
  props<{ error: string }>()
);

export const clearError = createAction(
  '[Credit Requests] Clear Error'
);
