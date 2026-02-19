import { Tenant } from './tenant-admin.model';

/**
 * User Model
 */
export interface User {
  id: string;
  email: string;
  full_name: string; // Matches backend snake_case convention
  phone?: string;
  role: UserRole;
  permissions: string[];
  tenant?: Tenant;
}

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  TENANT_ADMIN = 'TENANT_ADMIN',
  TENANT_USER = 'TENANT_USER'
}

/**
 * Authentication Models
 */
export interface LoginResponse {
  status: boolean;
  data: {
    accessToken: string;
    refreshToken: string;
    userType: string;
    subdomain?: string | null;
  };
  message?: string;
}

export interface UserContext {
  status: boolean;
  data: User;
  message?: string;
}

/**
 * Dashboard Models
 */
export interface SuperAdminDashboard {
  totalTenants: number;
  totalUsers: number;
  activeSessions24h: number;
  systemHealth: string;
  recentTenants: RecentTenant[];
}

export interface RecentTenant {
  id: string;
  tenant_name: string;
  email: string;
  created_at: string;
}

export interface TenantDashboard {
  tenant: {
    companyName: string;
    contactEmail: string;
    memberSince: string;
  };
  totalUsers: number;
  activeUsers24h: number;
  recentActivity: Activity[];
}

export interface Activity {
  action: string;
  user: string;
  email: string;
  timestamp: string;
}

/**
 * Customer Model
 */
export interface Customer {
  id: string;
  companyName: string;
  contactEmail: string;
  contactPhone?: string;
  address?: string;
  isActive: boolean;
  userCount: number;
  createdAt: string;
}

export interface CreateCustomerRequest {
  companyName: string;
  adminEmail: string;
  adminName: string;
  contactPhone?: string;
  address?: string;
}

/**
 * API Response Models
 * Standardized response format for all API endpoints
 */
export interface ApiResponse<T = any> {
  status: boolean;
  data?: T;
  message?: string;
}

/**
 * Export Permission and Tenant User Models
 */
export * from './permissions.model';

/**
 * Export Template Models
 */
export * from './templates.model';
