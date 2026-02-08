import { createAction, props } from '@ngrx/store';
import { Tenant } from '../../models/tenant-admin.model';
import { TenantFilters } from './tenants.models';

// Load tenants
export const loadTenants = createAction(
  '[Tenants] Load Tenants'
);

export const loadTenantsSuccess = createAction(
  '[Tenants] Load Tenants Success',
  props<{ tenants: Tenant[] }>()
);

export const loadTenantsFailure = createAction(
  '[Tenants] Load Tenants Failure',
  props<{ error: string }>()
);

// Select tenant
export const selectTenant = createAction(
  '[Tenants] Select Tenant',
  props<{ tenant: Tenant | null }>()
);

// Filter tenants
export const setSearchQuery = createAction(
  '[Tenants] Set Search Query',
  props<{ searchQuery: string }>()
);

export const setStatusFilter = createAction(
  '[Tenants] Set Status Filter',
  props<{ statusFilter: 'all' | 'active' | 'inactive' }>()
);

export const setSortBy = createAction(
  '[Tenants] Set Sort By',
  props<{ sortBy: 'name' | 'created_at' }>()
);

export const setSortOrder = createAction(
  '[Tenants] Set Sort Order',
  props<{ sortOrder: 'asc' | 'desc' }>()
);

export const toggleSortOrder = createAction(
  '[Tenants] Toggle Sort Order'
);

export const setFilters = createAction(
  '[Tenants] Set Filters',
  props<{ filters: Partial<TenantFilters> }>()
);

export const resetFilters = createAction(
  '[Tenants] Reset Filters'
);

// Clear error
export const clearError = createAction(
  '[Tenants] Clear Error'
);
