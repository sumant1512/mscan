import { Tenant } from '../../models/tenant-admin.model';

export interface TenantsState {
  tenants: Tenant[];
  filteredTenants: Tenant[];
  selectedTenant: Tenant | null;
  loading: boolean;
  error: string | null;
  loaded: boolean;
  filters: TenantFilters;
  successMessage: string | null; // For showing success notifications
  operationInProgress: boolean; // For create/update/delete operations
}

export interface TenantFilters {
  searchQuery: string;
  statusFilter: 'all' | 'active' | 'inactive';
  sortBy: 'name' | 'created_at';
  sortOrder: 'asc' | 'desc';
}

export const initialFilters: TenantFilters = {
  searchQuery: '',
  statusFilter: 'all',
  sortBy: 'created_at',
  sortOrder: 'desc'
};
