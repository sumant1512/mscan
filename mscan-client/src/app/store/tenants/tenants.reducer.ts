import { createReducer, on } from '@ngrx/store';
import { TenantsState, initialFilters } from './tenants.models';
import * as TenantsActions from './tenants.actions';
import { Tenant } from '../../models/tenant-admin.model';

export const initialState: TenantsState = {
  tenants: [],
  filteredTenants: [],
  selectedTenant: null,
  loading: false,
  error: null,
  loaded: false,
  filters: initialFilters,
  successMessage: null,
  operationInProgress: false
};

/**
 * Apply filters to tenants list
 */
function applyFilters(tenants: Tenant[], filters: typeof initialFilters): Tenant[] {
  if (!Array.isArray(tenants)) {
    return [];
  }

  let filtered = [...tenants];

  // Apply search filter
  if (filters.searchQuery) {
    const query = filters.searchQuery.toLowerCase();
    filtered = filtered.filter(
      (t) =>
        (t.tenant_name || '').toLowerCase().includes(query) ||
        (t.email || '').toLowerCase().includes(query) ||
        (t.subdomain_slug || '').toLowerCase().includes(query)
    );
  }

  // Apply status filter
  if (filters.statusFilter !== 'all') {
    filtered = filtered.filter((t) => t.status === filters.statusFilter);
  }

  // Apply sorting
  filtered.sort((a, b) => {
    let compareValue = 0;

    if (filters.sortBy === 'name') {
      compareValue = (a.tenant_name || '').localeCompare(b.tenant_name || '');
    } else if (filters.sortBy === 'created_at') {
      compareValue = new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
    }

    return filters.sortOrder === 'asc' ? compareValue : -compareValue;
  });

  return filtered;
}

export const tenantsReducer = createReducer(
  initialState,

  // Load tenants
  on(TenantsActions.loadTenants, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(TenantsActions.loadTenantsSuccess, (state, { tenants }) => {
    const safeTenants = Array.isArray(tenants) ? tenants : [];
    return {
      ...state,
      tenants: safeTenants,
      filteredTenants: applyFilters(safeTenants, state.filters),
      loading: false,
      loaded: true,
      error: null
    };
  }),

  on(TenantsActions.loadTenantsFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
    loaded: false
  })),

  // Select tenant
  on(TenantsActions.selectTenant, (state, { tenant }) => ({
    ...state,
    selectedTenant: tenant
  })),

  // Filter actions
  on(TenantsActions.setSearchQuery, (state, { searchQuery }) => {
    const newFilters = { ...state.filters, searchQuery };
    return {
      ...state,
      filters: newFilters,
      filteredTenants: applyFilters(state.tenants, newFilters)
    };
  }),

  on(TenantsActions.setStatusFilter, (state, { statusFilter }) => {
    const newFilters = { ...state.filters, statusFilter };
    return {
      ...state,
      filters: newFilters,
      filteredTenants: applyFilters(state.tenants, newFilters)
    };
  }),

  on(TenantsActions.setSortBy, (state, { sortBy }) => {
    const newFilters = { ...state.filters, sortBy };
    return {
      ...state,
      filters: newFilters,
      filteredTenants: applyFilters(state.tenants, newFilters)
    };
  }),

  on(TenantsActions.setSortOrder, (state, { sortOrder }) => {
    const newFilters = { ...state.filters, sortOrder };
    return {
      ...state,
      filters: newFilters,
      filteredTenants: applyFilters(state.tenants, newFilters)
    };
  }),

  on(TenantsActions.toggleSortOrder, (state) => {
    const newSortOrder: 'asc' | 'desc' = state.filters.sortOrder === 'asc' ? 'desc' : 'asc';
    const newFilters: typeof initialFilters = { ...state.filters, sortOrder: newSortOrder };
    return {
      ...state,
      filters: newFilters,
      filteredTenants: applyFilters(state.tenants, newFilters)
    };
  }),

  on(TenantsActions.setFilters, (state, { filters }) => {
    const newFilters = { ...state.filters, ...filters };
    return {
      ...state,
      filters: newFilters,
      filteredTenants: applyFilters(state.tenants, newFilters)
    };
  }),

  on(TenantsActions.resetFilters, (state) => ({
    ...state,
    filters: initialFilters,
    filteredTenants: applyFilters(state.tenants, initialFilters)
  })),

  // Clear error
  on(TenantsActions.clearError, (state) => ({
    ...state,
    error: null
  })),

  // Clear success message
  on(TenantsActions.clearSuccess, (state) => ({
    ...state,
    successMessage: null
  })),

  // Create tenant
  on(TenantsActions.createTenant, (state) => ({
    ...state,
    operationInProgress: true,
    error: null,
    successMessage: null
  })),

  on(TenantsActions.createTenantSuccess, (state, { message }) => ({
    ...state,
    operationInProgress: false,
    successMessage: message,
    error: null
  })),

  on(TenantsActions.createTenantFailure, (state, { error }) => ({
    ...state,
    operationInProgress: false,
    error,
    successMessage: null
  })),

  // Update tenant
  on(TenantsActions.updateTenant, (state) => ({
    ...state,
    operationInProgress: true,
    error: null,
    successMessage: null
  })),

  on(TenantsActions.updateTenantSuccess, (state, { message }) => ({
    ...state,
    operationInProgress: false,
    successMessage: message,
    error: null
  })),

  on(TenantsActions.updateTenantFailure, (state, { error }) => ({
    ...state,
    operationInProgress: false,
    error,
    successMessage: null
  })),

  // Toggle tenant status
  on(TenantsActions.toggleTenantStatus, (state) => ({
    ...state,
    operationInProgress: true,
    error: null,
    successMessage: null
  })),

  on(TenantsActions.toggleTenantStatusSuccess, (state, { message }) => ({
    ...state,
    operationInProgress: false,
    successMessage: message,
    error: null
  })),

  on(TenantsActions.toggleTenantStatusFailure, (state, { error }) => ({
    ...state,
    operationInProgress: false,
    error,
    successMessage: null
  })),

  // Delete tenant
  on(TenantsActions.deleteTenant, (state) => ({
    ...state,
    operationInProgress: true,
    error: null,
    successMessage: null
  })),

  on(TenantsActions.deleteTenantSuccess, (state, { message }) => ({
    ...state,
    operationInProgress: false,
    successMessage: message,
    error: null
  })),

  on(TenantsActions.deleteTenantFailure, (state, { error }) => ({
    ...state,
    operationInProgress: false,
    error,
    successMessage: null
  }))
);
