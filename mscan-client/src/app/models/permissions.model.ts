/**
 * Permission and Tenant User Management Models
 */

/**
 * Permission Definition
 */
export interface Permission {
  id: string;
  code: string;
  name: string;
  description?: string;
  scope: PermissionScope;
  allowed_assigners: string[];
  metadata?: any;
  created_at: string;
  created_by?: string;
  updated_at: string;
}

export enum PermissionScope {
  GLOBAL = 'GLOBAL',
  TENANT = 'TENANT',
  USER = 'USER'
}

/**
 * Permission Assignment
 */
export interface PermissionAssignment {
  id: string;
  permission_id: string;
  tenant_id?: string;
  user_id?: string;
  assigned_by: string;
  assigned_at: string;
  is_tenant_level: boolean;
  metadata?: any;
}

/**
 * Create Permission Request
 */
export interface CreatePermissionRequest {
  code: string;
  name: string;
  description?: string;
  scope: PermissionScope;
  allowed_assigners?: string[];
}

/**
 * Update Permission Request
 */
export interface UpdatePermissionRequest {
  name?: string;
  description?: string;
  allowed_assigners?: string[];
}

/**
 * List Permissions Filters
 */
export interface ListPermissionsFilters {
  scope?: PermissionScope;
  search?: string;
  page?: number;
  limit?: number;
}

/**
 * Permissions List Response
 */
export interface PermissionsListResponse {
  status: boolean;
  data: {
    permissions: Permission[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      pages: number;
    };
  };
}

/**
 * Tenant User
 */
export interface TenantUser {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  role: string;
  tenant_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  permissions?: string[];
}

/**
 * Create Tenant User Request
 */
export interface CreateTenantUserRequest {
  email: string;
  full_name: string;
  phone?: string;
  role: string;
  permission_ids?: string[];
}

/**
 * List Tenant Users Filters
 */
export interface ListTenantUsersFilters {
  role?: string;
  search?: string;
  page?: number;
  limit?: number;
}

/**
 * Tenant Users List Response
 */
export interface TenantUsersListResponse {
  status: boolean;
  data: {
    users: TenantUser[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      pages: number;
    };
  };
}

/**
 * Assign Permissions Request
 */
export interface AssignPermissionsRequest {
  permission_ids: string[];
}

/**
 * User Permissions Response
 */
export interface UserPermissionsResponse {
  status: boolean;
  data: {
    user_id: string;
    tenant_id: string;
    permissions: Permission[];
  };
}
