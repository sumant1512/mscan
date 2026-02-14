import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { CreditRequest, CreditBalance, CreditTransaction } from '../models/rewards.model';
import { SubdomainService } from './subdomain.service';

@Injectable({
  providedIn: 'root'
})
export class CreditService {
  private get apiUrl(): string {
    return `${this.subdomainService.getApiBaseUrl()}/credits`;
  }

  constructor(
    private http: HttpClient,
    private subdomainService: SubdomainService
  ) { }

  // Tenant operations
  requestCredits(amount: number, justification?: string): Observable<{ message: string; request: CreditRequest }> {
    return this.http.post<{ message: string; request: CreditRequest }>(
      `${this.apiUrl}/request`,
      { requested_amount: amount, justification }
    );
  }

  getBalance(): Observable<CreditBalance> {
    return this.http.get<CreditBalance>(`${this.apiUrl}/balance`);
  }

  // Unified method for getting requests with status filtering
  // Works for both Super Admin and Tenant Admin with automatic tenant isolation
  // Status: pending|approved|rejected|history|all
  getRequests(params?: {
    status?: string;
    page?: number;
    limit?: number;
    tenant_id?: string;
  }): Observable<{ requests: CreditRequest[]; pagination: any }> {
    let httpParams = new HttpParams();
    if (params?.status) httpParams = httpParams.set('status', params.status);
    if (params?.page) httpParams = httpParams.set('page', params.page.toString());
    if (params?.limit) httpParams = httpParams.set('limit', params.limit.toString());
    if (params?.tenant_id) httpParams = httpParams.set('tenant_id', params.tenant_id);

    return this.http.get<{ requests: CreditRequest[]; pagination: any }>(
      `${this.apiUrl}/requests`,
      { params: httpParams }
    );
  }

  // Unified method for getting transactions with type filtering
  // Works for both Super Admin and Tenant Admin with automatic tenant isolation
  // Type: CREDIT|DEBIT|REFUND|all
  getTransactions(params?: {
    page?: number;
    limit?: number;
    type?: string;
    tenant_id?: string;
    app_id?: string;
  }): Observable<{ transactions: CreditTransaction[]; pagination: any }> {
    let httpParams = new HttpParams();
    if (params?.page) httpParams = httpParams.set('page', params.page.toString());
    if (params?.limit) httpParams = httpParams.set('limit', params.limit.toString());
    if (params?.type) httpParams = httpParams.set('type', params.type);
    if (params?.tenant_id) httpParams = httpParams.set('tenant_id', params.tenant_id);
    if (params?.app_id) httpParams = httpParams.set('app_id', params.app_id);

    return this.http.get<{ transactions: CreditTransaction[]; pagination: any }>(
      `${this.apiUrl}/transactions`,
      { params: httpParams }
    );
  }

  approveRequest(id: number): Observable<{ message: string; credits_added: number; new_balance: number }> {
    return this.http.post<{ message: string; credits_added: number; new_balance: number }>(
      `${this.apiUrl}/approve/${id}`,
      {}
    );
  }

  rejectRequest(id: number, reason: string): Observable<{ message: string; request: CreditRequest }> {
    return this.http.post<{ message: string; request: CreditRequest }>(
      `${this.apiUrl}/reject/${id}`,
      { rejection_reason: reason }
    );
  }
}
