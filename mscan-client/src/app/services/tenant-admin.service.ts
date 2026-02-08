/**
 * Tenant Admin Service
 * Handles API calls for Super Admin tenant admin management
 */
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import {
  TenantAdmin,
  Tenant,
  CreateTenantAdminRequest,
  TenantAdminResponse,
  TenantAdminsListResponse,
  TenantsListResponse,
  AdminStats
} from '../models/tenant-admin.model';

@Injectable({
  providedIn: 'root'
})
export class TenantAdminService {
  private apiUrl = environment.apiUrl;
  
  // Observable state for tenant list with admin counts
  private tenantsWithCountSubject = new BehaviorSubject<Tenant[]>([]);
  public tenantsWithCount$ = this.tenantsWithCountSubject.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * Get all tenants with admin count and admin details (no pagination)
   */
  getTenants(): Observable<TenantsListResponse> {
    return this.http.get<TenantsListResponse>(`${this.apiUrl}/tenants`).pipe(
      tap(response => {
        this.tenantsWithCountSubject.next(response.tenants);
      })
    );
  }

  /**
   * Get tenant admins from cached tenant data (no API call needed)
   */
  getTenantAdminsFromCache(tenantId: string): TenantAdmin[] {
    const tenants = this.tenantsWithCountSubject.value;
    const tenant = tenants.find(t => t.id === tenantId);
    return tenant?.admins || [];
  }

  /**
   * Create a new Tenant Admin
   */
  createTenantAdmin(tenantId: string, data: CreateTenantAdminRequest): Observable<TenantAdminResponse> {
    const payload = {
      ...data,
      role: 'TENANT_ADMIN' // Ensure role is always TENANT_ADMIN
    };
    
    return this.http.post<TenantAdminResponse>(`${this.apiUrl}/v1/tenants/${tenantId}/users`, payload);
  }

  /**
   * Calculate admin statistics from tenant list
   */
  calculateAdminStats(tenants: Tenant[]): AdminStats {
    const stats: AdminStats = {
      total_tenants: tenants.length,
      tenants_with_admins: 0,
      tenants_without_admins: 0,
      total_tenant_admins: 0
    };

    tenants.forEach(tenant => {
      const adminCount = tenant.tenant_admin_count || 0;
      stats.total_tenant_admins += adminCount;
      
      if (adminCount > 0) {
        stats.tenants_with_admins++;
      } else {
        stats.tenants_without_admins++;
      }
    });

    return stats;
  }

  /**
   * Filter tenants without admins
   */
  filterTenantsWithoutAdmins(tenants: Tenant[]): Tenant[] {
    return tenants.filter(t => !t.tenant_admin_count || t.tenant_admin_count === 0);
  }

  /**
   * Search tenants by name or domain
   */
  searchTenants(tenants: Tenant[], searchTerm: string): Tenant[] {
    if (!searchTerm) {
      return tenants;
    }

    const term = searchTerm.toLowerCase();
    return tenants.filter(t => 
      t.tenant_name.toLowerCase().includes(term) ||
      (t.subdomain_slug && t.subdomain_slug.toLowerCase().includes(term)) ||
      (t.email && t.email.toLowerCase().includes(term))
    );
  }
}
