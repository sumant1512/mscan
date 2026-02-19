/**
 * Credit Service
 * NO ERROR HANDLING NEEDED - ErrorInterceptor handles everything!
 * NO SUCCESS MESSAGES NEEDED - SuccessInterceptor handles everything!
 */

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { CreditRequest, CreditBalance, CreditTransaction } from '../models/rewards.model';
import { SubdomainService } from './subdomain.service';
import { buildQueryString, extractResponseData } from '../core/utils/api.utils';

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

  /**
   * Request credits (Tenant Admin)
   */
  requestCredits(amount: number, justification?: string): Observable<CreditRequest> {
    return this.http.post<any>(
      `${this.apiUrl}/request`,
      { requested_amount: amount, justification }
    ).pipe(
      map(response => response.data?.request || response.request)
    );
  }

  /**
   * Get credit balance
   */
  getBalance(): Observable<CreditBalance> {
    return this.http.get<any>(`${this.apiUrl}/balance`).pipe(
      extractResponseData<CreditBalance>()
    );
  }

  /**
   * Get credit requests with filtering
   */
  getRequests(params?: {
    status?: string;
    page?: number;
    limit?: number;
    tenant_id?: string;
  }): Observable<{ requests: CreditRequest[]; pagination: any }> {
    const queryString = buildQueryString(params || {});
    return this.http.get<any>(`${this.apiUrl}/requests${queryString}`).pipe(
      extractResponseData()
    );
  }

  /**
   * Get credit transactions with filtering
   */
  getTransactions(params?: {
    page?: number;
    limit?: number;
    type?: string;
    tenant_id?: string;
    app_id?: string;
  }): Observable<{ transactions: CreditTransaction[]; pagination: any }> {
    const queryString = buildQueryString(params || {});
    return this.http.get<any>(`${this.apiUrl}/transactions${queryString}`).pipe(
      extractResponseData()
    );
  }

  /**
   * Approve credit request (Super Admin)
   */
  approveRequest(id: string): Observable<{ credits_added: number; new_balance: number }> {
    return this.http.post<any>(`${this.apiUrl}/approve/${id}`, {}).pipe(
      extractResponseData()
    );
  }

  /**
   * Reject credit request (Super Admin)
   */
  rejectRequest(id: string, reason: string): Observable<CreditRequest> {
    return this.http.post<any>(
      `${this.apiUrl}/reject/${id}`,
      { rejection_reason: reason }
    ).pipe(
      map(response => response.data?.request || response.request)
    );
  }
}
