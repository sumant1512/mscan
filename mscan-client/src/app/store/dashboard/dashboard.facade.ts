import { Injectable, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { SuperAdminDashboard, TenantDashboard, RecentTenant, Activity } from '../../models';
import * as DashboardActions from './dashboard.actions';
import * as DashboardSelectors from './dashboard.selectors';

/**
 * Facade service for Dashboard state management
 *
 * This service provides a simplified API for components to interact
 * with the dashboard statistics stored in NgRx.
 *
 * Usage in components:
 *
 * @example
 * ```typescript
 * export class DashboardComponent implements OnInit {
 *   private facade = inject(DashboardFacade);
 *
 *   stats$ = this.facade.stats$;
 *   loading$ = this.facade.loading$;
 *   totalUsers$ = this.facade.totalUsers$;
 *
 *   ngOnInit() {
 *     this.facade.loadStats();
 *   }
 *
 *   onRefresh() {
 *     this.facade.refreshStats();
 *   }
 * }
 * ```
 */
@Injectable({
  providedIn: 'root'
})
export class DashboardFacade {
  private store = inject(Store);

  // Selectors - Observables for component consumption

  /** Dashboard stats (role-based) */
  readonly stats$: Observable<SuperAdminDashboard | TenantDashboard | null> = this.store.select(
    DashboardSelectors.selectDashboardStats
  );

  /** Super admin specific stats */
  readonly superAdminStats$: Observable<SuperAdminDashboard | null> = this.store.select(
    DashboardSelectors.selectSuperAdminStats
  );

  /** Tenant admin specific stats */
  readonly tenantStats$: Observable<TenantDashboard | null> = this.store.select(
    DashboardSelectors.selectTenantStats
  );

  /** Loading state */
  readonly loading$: Observable<boolean> = this.store.select(
    DashboardSelectors.selectDashboardLoading
  );

  /** Error state */
  readonly error$: Observable<string | null> = this.store.select(
    DashboardSelectors.selectDashboardError
  );

  /** Whether stats have been loaded */
  readonly loaded$: Observable<boolean> = this.store.select(
    DashboardSelectors.selectDashboardLoaded
  );

  /** Last updated timestamp */
  readonly lastUpdated$: Observable<Date | null> = this.store.select(
    DashboardSelectors.selectDashboardLastUpdated
  );

  /** Whether data is stale (older than 5 minutes) */
  readonly isStale$: Observable<boolean> = this.store.select(
    DashboardSelectors.selectDashboardIsStale
  );

  /** Recent tenants (super admin only) */
  readonly recentTenants$: Observable<RecentTenant[]> = this.store.select(
    DashboardSelectors.selectRecentTenants
  );

  /** Recent activity (tenant admin only) */
  readonly recentActivity$: Observable<Activity[]> = this.store.select(
    DashboardSelectors.selectRecentActivity
  );

  /** System health status (super admin only) */
  readonly systemHealth$: Observable<string> = this.store.select(
    DashboardSelectors.selectSystemHealth
  );

  /** Total users count */
  readonly totalUsers$: Observable<number> = this.store.select(
    DashboardSelectors.selectTotalUsers
  );

  /** Active users count */
  readonly activeUsers$: Observable<number> = this.store.select(
    DashboardSelectors.selectActiveUsers
  );

  // Action dispatchers

  /**
   * Load dashboard stats from the API
   *
   * @example
   * ```typescript
   * ngOnInit() {
   *   this.facade.loadStats();
   * }
   * ```
   */
  loadStats(): void {
    this.store.dispatch(DashboardActions.loadDashboardStats());
  }

  /**
   * Refresh dashboard stats (force reload)
   *
   * @example
   * ```typescript
   * onRefresh() {
   *   this.facade.refreshStats();
   * }
   * ```
   */
  refreshStats(): void {
    this.store.dispatch(DashboardActions.refreshDashboardStats());
  }

  /**
   * Clear dashboard stats
   *
   * @example
   * ```typescript
   * ngOnDestroy() {
   *   this.facade.clearStats();
   * }
   * ```
   */
  clearStats(): void {
    this.store.dispatch(DashboardActions.clearDashboardStats());
  }

  /**
   * Clear any error state
   *
   * @example
   * ```typescript
   * this.facade.clearError();
   * ```
   */
  clearError(): void {
    this.store.dispatch(DashboardActions.clearError());
  }
}
