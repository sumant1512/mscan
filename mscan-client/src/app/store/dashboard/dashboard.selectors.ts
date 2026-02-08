import { createFeatureSelector, createSelector } from '@ngrx/store';
import { DashboardState } from './dashboard.models';
import { SuperAdminDashboard, TenantDashboard } from '../../models';

export const selectDashboardState = createFeatureSelector<DashboardState>('dashboard');

// Dashboard stats
export const selectDashboardStats = createSelector(
  selectDashboardState,
  (state) => state.stats
);

// Super admin specific stats
export const selectSuperAdminStats = createSelector(
  selectDashboardStats,
  (stats) => {
    if (stats && 'totalTenants' in stats) {
      return stats as SuperAdminDashboard;
    }
    return null;
  }
);

// Tenant admin specific stats
export const selectTenantStats = createSelector(
  selectDashboardStats,
  (stats) => {
    if (stats && 'tenant' in stats) {
      return stats as TenantDashboard;
    }
    return null;
  }
);

// Loading state
export const selectDashboardLoading = createSelector(
  selectDashboardState,
  (state) => state.loading
);

// Error state
export const selectDashboardError = createSelector(
  selectDashboardState,
  (state) => state.error
);

// Loaded state
export const selectDashboardLoaded = createSelector(
  selectDashboardState,
  (state) => state.loaded
);

// Last updated timestamp
export const selectDashboardLastUpdated = createSelector(
  selectDashboardState,
  (state) => state.lastUpdated
);

// Is data stale (older than 5 minutes)
export const selectDashboardIsStale = createSelector(
  selectDashboardLastUpdated,
  (lastUpdated) => {
    if (!lastUpdated) return true;
    const fiveMinutes = 5 * 60 * 1000;
    return Date.now() - lastUpdated.getTime() > fiveMinutes;
  }
);

// Recent tenants (for super admin)
export const selectRecentTenants = createSelector(
  selectSuperAdminStats,
  (stats) => stats?.recentTenants || []
);

// Recent activity (for tenant admin)
export const selectRecentActivity = createSelector(
  selectTenantStats,
  (stats) => stats?.recentActivity || []
);

// System health (for super admin)
export const selectSystemHealth = createSelector(
  selectSuperAdminStats,
  (stats) => stats?.systemHealth || 'unknown'
);

// Total users count (works for both roles)
export const selectTotalUsers = createSelector(
  selectDashboardStats,
  (stats) => {
    if (!stats) return 0;
    return 'totalUsers' in stats ? stats.totalUsers : 0;
  }
);

// Active users count (works for both roles)
export const selectActiveUsers = createSelector(
  selectDashboardStats,
  (stats) => {
    if (!stats) return 0;
    if ('activeSessions24h' in stats) return stats.activeSessions24h;
    if ('activeUsers24h' in stats) return stats.activeUsers24h;
    return 0;
  }
);
