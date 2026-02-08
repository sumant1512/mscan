import { createAction, props } from '@ngrx/store';
import { SuperAdminDashboard, TenantDashboard } from '../../models';

// Load dashboard stats
export const loadDashboardStats = createAction(
  '[Dashboard] Load Stats'
);

export const loadDashboardStatsSuccess = createAction(
  '[Dashboard] Load Stats Success',
  props<{ stats: SuperAdminDashboard | TenantDashboard }>()
);

export const loadDashboardStatsFailure = createAction(
  '[Dashboard] Load Stats Failure',
  props<{ error: string }>()
);

// Refresh dashboard stats (force reload)
export const refreshDashboardStats = createAction(
  '[Dashboard] Refresh Stats'
);

// Clear dashboard stats
export const clearDashboardStats = createAction(
  '[Dashboard] Clear Stats'
);

// Clear error
export const clearError = createAction(
  '[Dashboard] Clear Error'
);
