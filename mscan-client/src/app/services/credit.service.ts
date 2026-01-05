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

  getMyRequests(): Observable<{ requests: CreditRequest[] }> {
    return this.http.get<{ requests: CreditRequest[] }>(`${this.apiUrl}/requests/my`);
  }

  getBalance(): Observable<CreditBalance> {
    return this.http.get<CreditBalance>(`${this.apiUrl}/balance`);
  }

  getTransactions(params?: { page?: number; limit?: number; type?: string; tenant_id?: string }): Observable<{ transactions: CreditTransaction[] }> {
    let httpParams = new HttpParams();
    if (params?.page) httpParams = httpParams.set('page', params.page.toString());
    if (params?.limit) httpParams = httpParams.set('limit', params.limit.toString());
    if (params?.type) httpParams = httpParams.set('type', params.type);
    if (params?.tenant_id) httpParams = httpParams.set('tenant_id', params.tenant_id);

    return this.http.get<{ transactions: CreditTransaction[] }>(
      `${this.apiUrl}/transactions`,
      { params: httpParams }
    );
  }

  // Super Admin operations
  getAllRequests(status: string = 'pending', page: number = 1, limit: number = 20): Observable<{ requests: CreditRequest[]; pagination: any }> {
    const params = new HttpParams()
      .set('status', status)
      .set('page', page.toString())
      .set('limit', limit.toString());

    return this.http.get<{ requests: CreditRequest[]; pagination: any }>(
      `${this.apiUrl}/requests`,
      { params }
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
