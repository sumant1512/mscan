/**
 * Tenant Users Service
 * Handles tenant user management and permission assignments
 */
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SubdomainService } from './subdomain.service';
import {
  TenantUser,
  CreateTenantUserRequest,
  ListTenantUsersFilters,
  TenantUsersListResponse,
  AssignPermissionsRequest,
  UserPermissionsResponse,
  PermissionAssignment,
  ApiResponse
} from '../models';

@Injectable({
  providedIn: 'root'
})
export class TenantUsersService {
  private get apiUrl(): string {
    return `${this.subdomainService.getApiBaseUrl()}/v1/tenants`;
  }

  constructor(
    private http: HttpClient,
    private subdomainService: SubdomainService
  ) {}

  /**
   * Create a tenant user with initial permissions
   * Requires: manage_tenant_users permission
   */
  createTenantUser(
    tenantId: string,
    data: CreateTenantUserRequest
  ): Observable<ApiResponse<{ user: TenantUser; assigned_permissions: number }>> {
    return this.http.post<ApiResponse<{ user: TenantUser; assigned_permissions: number }>>(
      `${this.apiUrl}/${tenantId}/users`,
      data
    );
  }

  /**
   * List users in a tenant
   * Requires: view_tenant_users permission
   */
  listTenantUsers(
    tenantId: string,
    filters?: ListTenantUsersFilters
  ): Observable<TenantUsersListResponse> {
    let params = new HttpParams();

    if (filters?.role) {
      params = params.set('role', filters.role);
    }

    if (filters?.search) {
      params = params.set('search', filters.search);
    }

    if (filters?.page) {
      params = params.set('page', filters.page.toString());
    }

    if (filters?.limit) {
      params = params.set('limit', filters.limit.toString());
    }

    return this.http.get<TenantUsersListResponse>(
      `${this.apiUrl}/${tenantId}/users`,
      { params }
    );
  }

  /**
   * Get user details with permissions
   * Requires: view_tenant_users permission
   */
  getTenantUser(tenantId: string, userId: string): Observable<ApiResponse<{ user: TenantUser }>> {
    return this.http.get<ApiResponse<{ user: TenantUser }>>(
      `${this.apiUrl}/${tenantId}/users/${userId}`
    );
  }

  /**
   * Delete a tenant user (soft delete)
   * Requires: manage_tenant_users permission
   */
  deleteTenantUser(tenantId: string, userId: string): Observable<ApiResponse<{ user: TenantUser }>> {
    return this.http.delete<ApiResponse<{ user: TenantUser }>>(
      `${this.apiUrl}/${tenantId}/users/${userId}`
    );
  }

  /**
   * Get effective permissions for a user
   * Requires: view_permissions permission
   */
  getUserPermissions(tenantId: string, userId: string): Observable<UserPermissionsResponse> {
    return this.http.get<UserPermissionsResponse>(
      `${this.apiUrl}/${tenantId}/users/${userId}/permissions`
    );
  }

  /**
   * Assign permissions to a specific user
   * Requires: assign_permissions permission
   */
  assignUserPermissions(
    tenantId: string,
    userId: string,
    data: AssignPermissionsRequest
  ): Observable<ApiResponse<{ assignments: PermissionAssignment[] }>> {
    return this.http.post<ApiResponse<{ assignments: PermissionAssignment[] }>>(
      `${this.apiUrl}/${tenantId}/users/${userId}/permissions`,
      data
    );
  }

  /**
   * Assign tenant-level permissions (inherited by all users)
   * Requires: assign_permissions permission
   */
  assignTenantPermissions(
    tenantId: string,
    data: AssignPermissionsRequest
  ): Observable<ApiResponse<{ assignments: PermissionAssignment[] }>> {
    return this.http.post<ApiResponse<{ assignments: PermissionAssignment[] }>>(
      `${this.apiUrl}/${tenantId}/permissions`,
      data
    );
  }
}
