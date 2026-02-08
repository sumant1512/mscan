import { createReducer, on } from '@ngrx/store';
import { DashboardState } from './dashboard.models';
import * as DashboardActions from './dashboard.actions';

export const initialState: DashboardState = {
  stats: null,
  loading: false,
  error: null,
  loaded: false,
  lastUpdated: null
};

export const dashboardReducer = createReducer(
  initialState,

  // Load dashboard stats
  on(DashboardActions.loadDashboardStats, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(DashboardActions.loadDashboardStatsSuccess, (state, { stats }) => ({
    ...state,
    stats,
    loading: false,
    loaded: true,
    error: null,
    lastUpdated: new Date()
  })),

  on(DashboardActions.loadDashboardStatsFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
    loaded: false
  })),

  // Refresh dashboard stats
  on(DashboardActions.refreshDashboardStats, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  // Clear dashboard stats
  on(DashboardActions.clearDashboardStats, () => initialState),

  // Clear error
  on(DashboardActions.clearError, (state) => ({
    ...state,
    error: null
  }))
);
