import { createFeatureSelector, createSelector } from '@ngrx/store';
import { TenantsState } from './tenants.models';

export const selectTenantsState = createFeatureSelector<TenantsState>('tenants');

// All tenants (unfiltered)
export const selectAllTenants = createSelector(
  selectTenantsState,
  (state) => state.tenants
);

// Filtered tenants (with search and filters applied)
export const selectFilteredTenants = createSelector(
  selectTenantsState,
  (state) => state.filteredTenants
);

// Active tenants only (from filtered list)
export const selectActiveTenants = createSelector(
  selectFilteredTenants,
  (tenants) => tenants.filter(t => t.status === 'active')
);

// Selected tenant
export const selectSelectedTenant = createSelector(
  selectTenantsState,
  (state) => state.selectedTenant
);

// Loading state
export const selectTenantsLoading = createSelector(
  selectTenantsState,
  (state) => state.loading
);

// Error state
export const selectTenantsError = createSelector(
  selectTenantsState,
  (state) => state.error
);

// Loaded state
export const selectTenantsLoaded = createSelector(
  selectTenantsState,
  (state) => state.loaded
);

// Current filters
export const selectTenantsFilters = createSelector(
  selectTenantsState,
  (state) => state.filters
);

// Tenant by ID
export const selectTenantById = (id: string) => createSelector(
  selectAllTenants,
  (tenants) => tenants.find(t => t.id === id) || null
);

// Tenant with admins by ID
export const selectTenantAdminsById = (id: string) => createSelector(
  selectTenantById(id),
  (tenant) => tenant?.admins || []
);

// Tenant statistics
export const selectTenantStats = createSelector(
  selectAllTenants,
  (tenants) => ({
    total: tenants.length,
    active: tenants.filter(t => t.status === 'active').length,
    inactive: tenants.filter(t => t.status === 'inactive').length,
    totalAdmins: tenants.reduce((sum, t) => sum + (t.tenant_admin_count || 0), 0),
    tenantsWithAdmins: tenants.filter(t => (t.tenant_admin_count || 0) > 0).length,
    tenantsWithoutAdmins: tenants.filter(t => (t.tenant_admin_count || 0) === 0).length
  })
);
