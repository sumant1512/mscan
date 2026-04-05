import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SubdomainService } from './subdomain.service';

export interface RedemptionApp {
  id: string;
  name: string;
}

export interface RedemptionCustomer {
  phone: string;
  name: string | null;
  email: string | null;
  current_balance: number | null;
}

export interface RedemptionRequest {
  id: string;
  points_requested: number;
  status: 'pending' | 'approved' | 'rejected';
  notes: string | null;
  rejection_reason: string | null;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
  app: RedemptionApp;
  customer: RedemptionCustomer;
}

export interface RedemptionSummaryApp {
  app_id: string;
  app_name: string;
  pending: number;
  approved: number;
  rejected: number;
}

@Injectable({ providedIn: 'root' })
export class RedemptionService {
  private get apiUrl(): string {
    return `${this.subdomainService.getApiBaseUrl()}/redemptions`;
  }

  constructor(
    private http: HttpClient,
    private subdomainService: SubdomainService
  ) {}

  listRequests(params?: {
    app_id?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Observable<any> {
    let httpParams = new HttpParams();
    if (params?.app_id) httpParams = httpParams.set('app_id', params.app_id);
    if (params?.status) httpParams = httpParams.set('status', params.status);
    if (params?.page) httpParams = httpParams.set('page', params.page.toString());
    if (params?.limit) httpParams = httpParams.set('limit', params.limit.toString());
    return this.http.get<any>(this.apiUrl, { params: httpParams });
  }

  getSummary(appId?: string): Observable<any> {
    let httpParams = new HttpParams();
    if (appId) httpParams = httpParams.set('app_id', appId);
    return this.http.get<any>(`${this.apiUrl}/summary`, { params: httpParams });
  }

  approveRequest(id: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${id}/approve`, {});
  }

  rejectRequest(id: string, reason?: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${id}/reject`, { reason: reason || null });
  }
}
