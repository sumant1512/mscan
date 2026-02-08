import { Tenant } from './tenant-admin.model';

/**
 * User Model
 */
export interface User {
  id: string;
  email: string;
  fullName: string;
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
  success: boolean;
  message: string;
  data: {
    accessToken: string;
    refreshToken: string;
    userType: string;
    subdomain?: string | null;
  };
}

export interface UserContext {
  success: boolean;
  data: User;
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
  companyName: string;
  contactEmail: string;
  createdAt: string;
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
 */
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}

/**
 * Export Permission and Tenant User Models
 */
export * from './permissions.model';

/**
 * Export Template Models
 */
export * from './templates.model';
