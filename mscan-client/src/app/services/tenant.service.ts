import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Tenant, PaginationParams } from '../models/rewards.model';
import { SubdomainService } from './subdomain.service';

@Injectable({
  providedIn: 'root'
})
export class TenantService {
  private get apiUrl(): string {
    return `${this.subdomainService.getApiBaseUrl()}/tenants`;
  }

  constructor(
    private http: HttpClient,
    private subdomainService: SubdomainService
  ) { }

  /**
   * Check if a subdomain slug is available
   */
  checkSubdomainAvailability(slug: string): Observable<{available: boolean, error?: string, message?: string}> {
    return this.http.get<{available: boolean, error?: string, message?: string}>(
      `${this.apiUrl}/check-slug/${slug}`
    );
  }

  /**
   * Get subdomain suggestions based on tenant name
   */
  getSubdomainSuggestions(tenantName: string): Observable<{suggestions: string[], count: number}> {
    return this.http.get<{suggestions: string[], count: number}>(
      `${this.apiUrl}/suggest-slugs`,
      { params: { tenantName } }
    );
  }

  createTenant(tenant: Partial<Tenant>): Observable<{ message: string; tenant: Tenant }> {
    return this.http.post<{ message: string; tenant: Tenant }>(this.apiUrl, tenant);
  }

  getAllTenants(params?: PaginationParams): Observable<{ tenants: Tenant[]; total: number; page: number; limit: number; total_pages: number }> {
    let httpParams = new HttpParams();
    if (params?.page) httpParams = httpParams.set('page', params.page.toString());
    if (params?.limit) httpParams = httpParams.set('limit', params.limit.toString());
    if (params?.status) httpParams = httpParams.set('status', params.status);
    if (params?.search) httpParams = httpParams.set('search', params.search);

    return this.http.get<{ tenants: Tenant[]; total: number; page: number; limit: number; total_pages: number }>(this.apiUrl, { params: httpParams });
  }

  getTenantById(id: string): Observable<{ tenant: Tenant }> {
    return this.http.get<{ tenant: Tenant }>(`${this.apiUrl}/${id}`);
  }

  updateTenant(id: string, tenant: Partial<Tenant>): Observable<{ message: string; tenant: Tenant }> {
    return this.http.put<{ message: string; tenant: Tenant }>(`${this.apiUrl}/${id}`, tenant);
  }

  toggleTenantStatus(id: number): Observable<{ message: string; tenant: Tenant }> {
    return this.http.patch<{ message: string; tenant: Tenant }>(
      `${this.apiUrl}/${id}/toggle-status`,
      {}
    );
  }
}
