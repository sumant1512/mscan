/**
 * Dashboard Service
 */
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse, SuperAdminDashboard, TenantDashboard } from '../models';
import { SubdomainService } from './subdomain.service';

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private get apiUrl(): string {
    return this.subdomainService.getApiBaseUrl();
  }

  constructor(private http: HttpClient, private subdomainService: SubdomainService) {}

  /**
   * Get dashboard stats (role-based)
   */
  getDashboardStats(): Observable<ApiResponse<SuperAdminDashboard | TenantDashboard>> {
    return this.http.get<ApiResponse<SuperAdminDashboard | TenantDashboard>>(
      `${this.apiUrl}/dashboard/stats`
    );
  }
}
