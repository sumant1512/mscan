import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SubdomainService } from './subdomain.service';
import { environment } from '../../environments/environment';

export interface PublicSessionResponse {
  session_id: string;
  coupon_code: string;
  cashback_amount: number;
  status: string;
}

export interface PayoutResult {
  success: boolean;
  cashback_amount: number;
  upi_id: string;
  status: 'COMPLETED' | 'FAILED' | 'PROCESSING';
  transaction_id: string;
  error?: string;
}

export interface CashbackTransaction {
  id: string;
  coupon_code: string;
  amount: number;
  upi_id: string;
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REVERSED';
  gateway_transaction_id: string | null;
  failure_reason?: string;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class CashbackService {
  private get publicApiUrl(): string {
    return `${this.subdomainService.getApiBaseUrl()}/public/cashback`;
  }

  private get mobileApiUrl(): string {
    return `${this.subdomainService.getApiBaseUrl()}/mobile/v1/cashback`;
  }

  // For admin panel calls that use the standard API URL
  private get adminApiUrl(): string {
    return `${this.subdomainService.getApiBaseUrl()}/cashback`;
  }

  constructor(
    private http: HttpClient,
    private subdomainService: SubdomainService
  ) {}

  // ─── Public (no-auth) flow ───────────────────────────────────────────────

  startPublicSession(couponCode: string): Observable<{ data: PublicSessionResponse }> {
    return this.http.post<{ data: PublicSessionResponse }>(`${this.publicApiUrl}/start`, {
      coupon_code: couponCode
    });
  }

  submitMobile(sessionId: string, phoneE164: string): Observable<{ data: { session_id: string; mobile_masked: string } }> {
    return this.http.post<{ data: { session_id: string; mobile_masked: string } }>(
      `${this.publicApiUrl}/${sessionId}/mobile`,
      { phone_e164: phoneE164 }
    );
  }

  verifyOtp(sessionId: string, otp: string): Observable<{ data: { verified: boolean; is_new_user: boolean } }> {
    return this.http.post<{ data: { verified: boolean; is_new_user: boolean } }>(
      `${this.publicApiUrl}/${sessionId}/verify-otp`,
      { otp }
    );
  }

  submitUpi(sessionId: string, upiId: string): Observable<{ data: { upi_id: string; session_status: string } }> {
    return this.http.post<{ data: { upi_id: string; session_status: string } }>(
      `${this.publicApiUrl}/${sessionId}/upi`,
      { upi_id: upiId }
    );
  }

  confirmPayout(sessionId: string): Observable<{ data: PayoutResult }> {
    return this.http.post<{ data: PayoutResult }>(
      `${this.publicApiUrl}/${sessionId}/confirm`,
      {}
    );
  }

  // ─── Admin panel calls ───────────────────────────────────────────────────

  getTransactions(params?: {
    page?: number;
    limit?: number;
    status?: string;
    from?: string;
    to?: string;
  }): Observable<{ data: { transactions: CashbackTransaction[]; total: number } }> {
    let httpParams = new HttpParams();
    if (params?.page) httpParams = httpParams.set('page', params.page.toString());
    if (params?.limit) httpParams = httpParams.set('limit', params.limit.toString());
    if (params?.status) httpParams = httpParams.set('status', params.status);
    if (params?.from) httpParams = httpParams.set('from', params.from);
    if (params?.to) httpParams = httpParams.set('to', params.to);

    return this.http.get<{ data: { transactions: CashbackTransaction[]; total: number } }>(
      `${this.adminApiUrl}/transactions`,
      { params: httpParams }
    );
  }
}
