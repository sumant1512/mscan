/**
 * Features Service
 * Handles feature flag management
 */
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SubdomainService } from './subdomain.service';

export interface Feature {
  id: string;
  code: string;
  name: string;
  description?: string;
  is_active: boolean;
  default_enabled: boolean;
  parent_id?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface FeatureTree extends Feature {
  children?: FeatureTree[];
}

export interface TenantFeature {
  id?: string;
  tenant_id?: string;
  feature_id: string;
  enabled_at?: string;
  enabled_by?: string;
  code: string;
  name: string;
  description?: string;
  is_active: boolean;
  default_enabled: boolean;
  enabled_for_tenant: boolean;
  parent_id?: string;
  created_at: string;
  updated_at: string;
}

export interface TenantFeatureTree extends TenantFeature {
  children?: TenantFeatureTree[];
  isExpanded?: boolean;
}

export interface CreateFeatureRequest {
  code: string;
  name: string;
  description?: string;
  is_active?: boolean;
  default_enabled?: boolean;
  parent_id?: string;
}

export interface UpdateFeatureRequest {
  name?: string;
  description?: string;
  is_active?: boolean;
  default_enabled?: boolean;
  parent_id?: string;
}

export interface ToggleFeatureRequest {
  enabled: boolean;
}

export interface ApiResponse<T> {
  status: boolean;
  message: string;
  data: T;
}

@Injectable({
  providedIn: 'root',
})
export class FeaturesService {
  private get apiUrl(): string {
    return `${this.subdomainService.getApiBaseUrl()}/features`;
  }

  constructor(
    private http: HttpClient,
    private subdomainService: SubdomainService,
  ) {}

  /**
   * Create a new feature definition
   * Requires: SUPER_ADMIN role
   */
  createFeature(data: CreateFeatureRequest): Observable<ApiResponse<{ feature: Feature }>> {
    return this.http.post<ApiResponse<{ feature: Feature }>>(this.apiUrl, data);
  }

  /**
   * List all features
   */
  listFeatures(): Observable<ApiResponse<{ features: Feature[] }>> {
    return this.http.get<ApiResponse<{ features: Feature[] }>>(this.apiUrl);
  }

  /**
   * Get feature by ID
   */
  getFeature(id: string): Observable<ApiResponse<{ feature: Feature }>> {
    return this.http.get<ApiResponse<{ feature: Feature }>>(`${this.apiUrl}/${id}`);
  }

  /**
   * Update feature
   * Requires: SUPER_ADMIN role
   */
  updateFeature(
    id: string,
    data: UpdateFeatureRequest,
  ): Observable<ApiResponse<{ feature: Feature }>> {
    return this.http.put<ApiResponse<{ feature: Feature }>>(`${this.apiUrl}/${id}`, data);
  }

  /**
   * Delete feature
   * Requires: SUPER_ADMIN role
   */
  deleteFeature(id: string): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${this.apiUrl}/${id}`);
  }

  /**
   * Enable feature for tenant
   * Requires: SUPER_ADMIN role
   */
  enableFeatureForTenant(
    tenantId: string,
    featureId: string,
  ): Observable<ApiResponse<{ tenant_feature: any }>> {
    return this.http.post<ApiResponse<{ tenant_feature: any }>>(
      `${this.apiUrl}/tenants/${tenantId}/features/${featureId}`,
      {},
    );
  }

  /**
   * Disable feature for tenant
   * Requires: SUPER_ADMIN role
   */
  disableFeatureForTenant(tenantId: string, featureId: string): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(
      `${this.apiUrl}/tenants/${tenantId}/features/${featureId}`,
    );
  }

  /**
   * Get features for tenant
   */
  getTenantFeatures(tenantId: string): Observable<ApiResponse<{ features: TenantFeature[] }>> {
    return this.http.get<ApiResponse<{ features: TenantFeature[] }>>(
      `${this.apiUrl}/tenants/${tenantId}/features`,
    );
  }

  /**
   * Check if feature is enabled for tenant
   */
  checkFeatureForTenant(
    tenantId: string,
    featureCode: string,
  ): Observable<ApiResponse<{ enabled: boolean }>> {
    return this.http.get<ApiResponse<{ enabled: boolean }>>(
      `${this.apiUrl}/tenants/${tenantId}/features/${featureCode}/check`,
    );
  }

  /**
   * Toggle feature for tenant (enable/disable)
   * Requires: SUPER_ADMIN or TENANT_ADMIN (if assigned)
   */
  toggleFeatureForTenant(
    tenantId: string,
    featureId: string,
    enabled: boolean,
  ): Observable<ApiResponse<{ feature: TenantFeature }>> {
    return this.http.patch<ApiResponse<{ feature: TenantFeature }>>(
      `${this.apiUrl}/tenants/${tenantId}/features/${featureId}`,
      { enabled },
    );
  }

  /**
   * Get feature tree
   */
  getFeatureTree(): Observable<ApiResponse<{ features: FeatureTree[] }>> {
    return this.http.get<ApiResponse<{ features: FeatureTree[] }>>(`${this.apiUrl}/tree`);
  }

  /**
   * Get feature children
   */
  getFeatureChildren(featureId: string): Observable<ApiResponse<{ features: Feature[] }>> {
    return this.http.get<ApiResponse<{ features: Feature[] }>>(
      `${this.apiUrl}/${featureId}/children`,
    );
  }
}
