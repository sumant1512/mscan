/**
 * Tenant Admin Management Models
 */

export interface Tenant {
  id: string;
  tenant_name: string;
  contact_person: string;
  email: string;
  phone?: string;
  address?: string;
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
  updated_at: string;
  created_by?: string; // UUID of the super admin who created this tenant
  created_by_name?: string; // Full name of the creator
  created_by_email?: string; // Email of the creator
  total_credits_received?: number;
  pending_credit_requests?: number;
  total_credits_spent?: number;
  credit_balance?: number;
  total_coupons?: number;
  total_scans?: number;
  subdomain_slug?: string;
  verification_apps_count?: number;
  is_active: boolean;
  tenant_admin_count?: number;
  admins?: TenantAdmin[];
}

export interface TenantDetailsResponse {
  status: boolean;
  data: {
    tenant: Tenant;
  };
}

export interface TenantAdmin {
  id: string;
  email: string;
  full_name: string;
  phone_number?: string;
  tenant_id: string;
  role: 'TENANT_ADMIN';
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  last_login?: string;
  created_by_name?: string;
}

export interface CreateTenantAdminRequest {
  email: string;
  full_name: string;
  phone_number?: string;
  password: string;
  role: 'TENANT_ADMIN';
  send_welcome_email?: boolean;
}

export interface TenantAdminResponse {
  success: boolean;
  message?: string;
  data: {
    user: TenantAdmin;
    assigned_permissions: number;
    tenant: {
      id: string;
      name: string;
      subdomain: string;
      domain: string;
    };
    welcome_email_sent?: boolean;
  };
  warnings?: Array<{
    code: string;
    message: string;
  }>;
}

export interface TenantAdminsListResponse {
  tenant: {
    id: string;
    name: string;
    domain: string;
    subdomain: string;
  };
  admins: TenantAdmin[];
}

export interface TenantsListResponse {
  status: boolean;
  data: {
    tenants: Tenant[];
    total: number;
  };
}

export interface AdminStats {
  total_tenants: number;
  tenants_with_admins: number;
  tenants_without_admins: number;
  total_tenant_admins: number;
}
