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

// Create tenant
export const createTenant = createAction(
  '[Tenants] Create Tenant',
  props<{ tenant: Partial<Tenant> }>()
);

export const createTenantSuccess = createAction(
  '[Tenants] Create Tenant Success',
  props<{ tenant: Tenant; message: string }>()
);

export const createTenantFailure = createAction(
  '[Tenants] Create Tenant Failure',
  props<{ error: string }>()
);

// Update tenant
export const updateTenant = createAction(
  '[Tenants] Update Tenant',
  props<{ id: string; tenant: Partial<Tenant> }>()
);

export const updateTenantSuccess = createAction(
  '[Tenants] Update Tenant Success',
  props<{ tenant: Tenant; message: string }>()
);

export const updateTenantFailure = createAction(
  '[Tenants] Update Tenant Failure',
  props<{ error: string }>()
);

// Toggle tenant status (activate/deactivate)
export const toggleTenantStatus = createAction(
  '[Tenants] Toggle Tenant Status',
  props<{ id: string }>()
);

export const toggleTenantStatusSuccess = createAction(
  '[Tenants] Toggle Tenant Status Success',
  props<{ tenant: Tenant; message: string }>()
);

export const toggleTenantStatusFailure = createAction(
  '[Tenants] Toggle Tenant Status Failure',
  props<{ error: string }>()
);

// Delete tenant (if needed in future)
export const deleteTenant = createAction(
  '[Tenants] Delete Tenant',
  props<{ id: string }>()
);

export const deleteTenantSuccess = createAction(
  '[Tenants] Delete Tenant Success',
  props<{ id: string; message: string }>()
);

export const deleteTenantFailure = createAction(
  '[Tenants] Delete Tenant Failure',
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

// Clear error and success message
export const clearError = createAction(
  '[Tenants] Clear Error'
);

export const clearSuccess = createAction(
  '[Tenants] Clear Success'
);
