import { Tenant } from '../../models/tenant-admin.model';

export interface TenantsState {
  tenants: Tenant[];
  filteredTenants: Tenant[];
  selectedTenant: Tenant | null;
  loading: boolean;
  error: string | null;
  loaded: boolean;
  filters: TenantFilters;
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
