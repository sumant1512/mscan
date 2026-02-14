import { Injectable, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { Tenant, TenantAdmin } from '../../models/tenant-admin.model';
import { TenantFilters } from './tenants.models';
import * as TenantsActions from './tenants.actions';
import * as TenantsSelectors from './tenants.selectors';

/**
 * Facade service for Tenants state management
 * 
 * This service provides a simplified API for components to interact
 * with the NgRx store without directly dispatching actions or selecting state.
 * 
 * Usage in components:
 * 
 * @example
 * ```typescript
 * export class TenantListComponent implements OnInit {
 *   private facade = inject(TenantsFacade);
 *   
 *   tenants$ = this.facade.filteredTenants$;
 *   loading$ = this.facade.loading$;
 *   filters$ = this.facade.filters$;
 *   
 *   ngOnInit() {
 *     this.facade.loadTenants();
 *   }
 *   
 *   onSearch(query: string) {
 *     this.facade.setSearchQuery(query);
 *   }
 * }
 * ```
 */
@Injectable({
  providedIn: 'root'
})
export class TenantsFacade {
  private store = inject(Store);

  // Selectors - Observables for component consumption
  
  /** All tenants (unfiltered) */
  readonly allTenants$: Observable<Tenant[]> = this.store.select(
    TenantsSelectors.selectAllTenants
  );

  /** Filtered tenants (with search and filters applied) */
  readonly filteredTenants$: Observable<Tenant[]> = this.store.select(
    TenantsSelectors.selectFilteredTenants
  );

  /** Active tenants only */
  readonly activeTenants$: Observable<Tenant[]> = this.store.select(
    TenantsSelectors.selectActiveTenants
  );

  /** Currently selected tenant */
  readonly selectedTenant$: Observable<Tenant | null> = this.store.select(
    TenantsSelectors.selectSelectedTenant
  );

  /** Loading state */
  readonly loading$: Observable<boolean> = this.store.select(
    TenantsSelectors.selectTenantsLoading
  );

  /** Error state */
  readonly error$: Observable<string | null> = this.store.select(
    TenantsSelectors.selectTenantsError
  );

  /** Whether tenants have been loaded */
  readonly loaded$: Observable<boolean> = this.store.select(
    TenantsSelectors.selectTenantsLoaded
  );

  /** Current filters */
  readonly filters$: Observable<TenantFilters> = this.store.select(
    TenantsSelectors.selectTenantsFilters
  );

  /** Tenant statistics */
  readonly stats$: Observable<any> = this.store.select(
    TenantsSelectors.selectTenantStats
  );

  /** Success message state */
  readonly successMessage$: Observable<string | null> = this.store.select(
    TenantsSelectors.selectSuccessMessage
  );

  /** Operation in progress state (for create/update/delete) */
  readonly operationInProgress$: Observable<boolean> = this.store.select(
    TenantsSelectors.selectOperationInProgress
  );

  // Action dispatchers

  /**
   * Load all tenants from the API
   *
   * @example
   * ```typescript
   * ngOnInit() {
   *   this.facade.loadTenants();
   * }
   * ```
   */
  loadTenants(): void {
    this.store.dispatch(TenantsActions.loadTenants());
  }

  /**
   * Create a new tenant
   *
   * @param tenant - Partial tenant object with required fields
   *
   * @example
   * ```typescript
   * onSubmit() {
   *   this.facade.createTenant({
   *     tenant_name: 'Acme Corp',
   *     email: 'admin@acme.com',
   *     contact_person: 'John Doe',
   *     subdomain_slug: 'acme'
   *   });
   * }
   * ```
   */
  createTenant(tenant: Partial<Tenant>): void {
    this.store.dispatch(TenantsActions.createTenant({ tenant }));
  }

  /**
   * Update an existing tenant
   *
   * @param id - Tenant ID
   * @param tenant - Partial tenant object with fields to update
   *
   * @example
   * ```typescript
   * onUpdate() {
   *   this.facade.updateTenant(this.tenantId, {
   *     tenant_name: 'Updated Name',
   *     contact_person: 'Jane Doe'
   *   });
   * }
   * ```
   */
  updateTenant(id: string, tenant: Partial<Tenant>): void {
    this.store.dispatch(TenantsActions.updateTenant({ id, tenant }));
  }

  /**
   * Toggle tenant status (activate/deactivate)
   *
   * @param id - Tenant ID
   *
   * @example
   * ```typescript
   * onToggleStatus(tenantId: string) {
   *   this.facade.toggleTenantStatus(tenantId);
   * }
   * ```
   */
  toggleTenantStatus(id: string): void {
    this.store.dispatch(TenantsActions.toggleTenantStatus({ id }));
  }

  /**
   * Delete a tenant (if backend supports it)
   *
   * @param id - Tenant ID
   *
   * @example
   * ```typescript
   * onDelete(tenantId: string) {
   *   if (confirm('Are you sure?')) {
   *     this.facade.deleteTenant(tenantId);
   *   }
   * }
   * ```
   */
  deleteTenant(id: string): void {
    this.store.dispatch(TenantsActions.deleteTenant({ id }));
  }

  /**
   * Select a tenant (sets it as the currently selected tenant)
   * 
   * @param tenant - The tenant to select, or null to deselect
   * 
   * @example
   * ```typescript
   * onTenantClick(tenant: Tenant) {
   *   this.facade.selectTenant(tenant);
   * }
   * ```
   */
  selectTenant(tenant: Tenant | null): void {
    this.store.dispatch(TenantsActions.selectTenant({ tenant }));
  }

  /**
   * Set search query filter
   * 
   * @param searchQuery - The search query string
   * 
   * @example
   * ```typescript
   * onSearch(query: string) {
   *   this.facade.setSearchQuery(query);
   * }
   * ```
   */
  setSearchQuery(searchQuery: string): void {
    this.store.dispatch(TenantsActions.setSearchQuery({ searchQuery }));
  }

  /**
   * Set status filter
   * 
   * @param statusFilter - The status filter ('all', 'active', or 'inactive')
   * 
   * @example
   * ```typescript
   * onStatusChange(status: 'all' | 'active' | 'inactive') {
   *   this.facade.setStatusFilter(status);
   * }
   * ```
   */
  setStatusFilter(statusFilter: 'all' | 'active' | 'inactive'): void {
    this.store.dispatch(TenantsActions.setStatusFilter({ statusFilter }));
  }

  /**
   * Set sort by field
   * 
   * @param sortBy - The field to sort by
   * 
   * @example
   * ```typescript
   * onSortChange(field: 'name' | 'created_at') {
   *   this.facade.setSortBy(field);
   * }
   * ```
   */
  setSortBy(sortBy: 'name' | 'created_at'): void {
    this.store.dispatch(TenantsActions.setSortBy({ sortBy }));
  }

  /**
   * Set sort order
   * 
   * @param sortOrder - The sort order ('asc' or 'desc')
   * 
   * @example
   * ```typescript
   * this.facade.setSortOrder('desc');
   * ```
   */
  setSortOrder(sortOrder: 'asc' | 'desc'): void {
    this.store.dispatch(TenantsActions.setSortOrder({ sortOrder }));
  }

  /**
   * Toggle sort order (asc <-> desc)
   * 
   * @example
   * ```typescript
   * onToggleSortOrder() {
   *   this.facade.toggleSortOrder();
   * }
   * ```
   */
  toggleSortOrder(): void {
    this.store.dispatch(TenantsActions.toggleSortOrder());
  }

  /**
   * Set multiple filters at once
   * 
   * @param filters - Partial filter object
   * 
   * @example
   * ```typescript
   * this.facade.setFilters({ 
   *   searchQuery: 'acme', 
   *   statusFilter: 'active' 
   * });
   * ```
   */
  setFilters(filters: Partial<TenantFilters>): void {
    this.store.dispatch(TenantsActions.setFilters({ filters }));
  }

  /**
   * Reset all filters to default values
   * 
   * @example
   * ```typescript
   * onResetFilters() {
   *   this.facade.resetFilters();
   * }
   * ```
   */
  resetFilters(): void {
    this.store.dispatch(TenantsActions.resetFilters());
  }

  /**
   * Get a specific tenant by ID
   * 
   * @param id - Tenant ID
   * @returns Observable of tenant or null
   * 
   * @example
   * ```typescript
   * tenant$ = this.facade.getTenantById(this.tenantId);
   * ```
   */
  getTenantById(id: string): Observable<Tenant | null> {
    return this.store.select(TenantsSelectors.selectTenantById(id));
  }

  /**
   * Get admins for a specific tenant
   * 
   * @param id - Tenant ID
   * @returns Observable of tenant admins array
   * 
   * @example
   * ```typescript
   * admins$ = this.facade.getTenantAdminsById(this.tenantId);
   * ```
   */
  getTenantAdminsById(id: string): Observable<TenantAdmin[]> {
    return this.store.select(TenantsSelectors.selectTenantAdminsById(id));
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
    this.store.dispatch(TenantsActions.clearError());
  }

  /**
   * Clear success message
   *
   * @example
   * ```typescript
   * this.facade.clearSuccess();
   * ```
   */
  clearSuccess(): void {
    this.store.dispatch(TenantsActions.clearSuccess());
  }
}
