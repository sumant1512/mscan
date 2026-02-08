/**
 * Permissions Service
 * Handles permission definition management
 */
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SubdomainService } from './subdomain.service';
import {
  Permission,
  CreatePermissionRequest,
  UpdatePermissionRequest,
  ListPermissionsFilters,
  PermissionsListResponse,
  ApiResponse
} from '../models';

@Injectable({
  providedIn: 'root'
})
export class PermissionsService {
  private get apiUrl(): string {
    return `${this.subdomainService.getApiBaseUrl()}/v1/permissions`;
  }

  constructor(
    private http: HttpClient,
    private subdomainService: SubdomainService
  ) {}

  /**
   * Create a new permission definition
   * Requires: SUPER_ADMIN role
   */
  createPermission(data: CreatePermissionRequest): Observable<ApiResponse<{ permission: Permission }>> {
    return this.http.post<ApiResponse<{ permission: Permission }>>(
      this.apiUrl,
      data
    );
  }

  /**
   * List permissions with filtering
   */
  listPermissions(filters?: ListPermissionsFilters): Observable<PermissionsListResponse> {
    let params = new HttpParams();

    if (filters?.scope) {
      params = params.set('scope', filters.scope);
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

    return this.http.get<PermissionsListResponse>(this.apiUrl, { params });
  }

  /**
   * Get permission by code
   */
  getPermissionByCode(code: string): Observable<ApiResponse<{ permission: Permission }>> {
    return this.http.get<ApiResponse<{ permission: Permission }>>(
      `${this.apiUrl}/${code}`
    );
  }

  /**
   * Update permission metadata
   * Requires: SUPER_ADMIN role
   * Note: Permission code is immutable
   */
  updatePermission(id: string, data: UpdatePermissionRequest): Observable<ApiResponse<{ permission: Permission }>> {
    return this.http.put<ApiResponse<{ permission: Permission }>>(
      `${this.apiUrl}/${id}`,
      data
    );
  }
}
