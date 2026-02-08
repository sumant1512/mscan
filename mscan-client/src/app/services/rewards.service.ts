import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { VerificationApp, Coupon, Scan, ScanAnalytics } from '../models/rewards.model';
import { SubdomainService } from './subdomain.service';

@Injectable({
  providedIn: 'root'
})
export class RewardsService {
  private get apiUrl(): string {
    return `${this.subdomainService.getApiBaseUrl()}/rewards`;
  }

  constructor(
    private http: HttpClient,
    private subdomainService: SubdomainService
  ) {}

  // Verification App operations
  createVerificationApp(app: Partial<VerificationApp>): Observable<{ message: string; app: VerificationApp }> {
    return this.http.post<{ message: string; app: VerificationApp }>(
      `${this.apiUrl}/verification-apps`,
      app
    );
  }

  getVerificationAppById(id: string): Observable<{ app: VerificationApp }> {
    return this.http.get<{ app: VerificationApp }>(`${this.apiUrl}/verification-apps/${id}`);
  }

  updateVerificationApp(id: string, app: Partial<VerificationApp>): Observable<{ message: string; app: VerificationApp }> {
    return this.http.put<{ message: string; app: VerificationApp }>(
      `${this.apiUrl}/verification-apps/${id}`,
      app
    );
  }

  // Coupon operations
  createCoupon(coupon: Partial<Coupon>): Observable<{ message: string; coupon?: Coupon; coupons?: Coupon[]; batch_id?: string; credit_cost: number; new_balance: number }> {
    return this.http.post<{ message: string; coupon?: Coupon; coupons?: Coupon[]; batch_id?: string; credit_cost: number; new_balance: number }>(
      `${this.apiUrl}/coupons`,
      coupon
    );
  }

  createMultiBatchCoupons(data: { verificationAppId: string; batches: { description: string; quantity: number; discountAmount: number; expiryDate: string }[] }): Observable<{ message: string; coupons: Coupon[]; credit_cost: number; new_balance: number }> {
    return this.http.post<{ message: string; coupons: Coupon[]; credit_cost: number; new_balance: number }>(
      `${this.apiUrl}/coupons/multi-batch`,
      data
    );
  }

  getCoupons(params?: { status?: string; verification_app_id?: string; page?: number; limit?: number; search?: string }): Observable<{ coupons: Coupon[]; pagination?: { page: number; limit: number; total: number; hasMore: boolean } }> {
    let httpParams = new HttpParams();
    if (params?.status) httpParams = httpParams.set('status', params.status);
    if (params?.verification_app_id) httpParams = httpParams.set('verification_app_id', params.verification_app_id);
    if (params?.page) httpParams = httpParams.set('page', params.page.toString());
    if (params?.limit) httpParams = httpParams.set('limit', params.limit.toString());
    if (params?.search) httpParams = httpParams.set('search', params.search);

    return this.http.get<{ coupons: Coupon[]; pagination?: { page: number; limit: number; total: number; hasMore: boolean } }>(`${this.apiUrl}/coupons`, { params: httpParams });
  }

  getCouponById(id: string): Observable<{ coupon: Coupon }> {
    return this.http.get<{ coupon: Coupon }>(`${this.apiUrl}/coupons/${id}`);
  }

  updateCouponStatus(id: string, status: 'active' | 'inactive'): Observable<{ message: string; coupon: Coupon }> {
    return this.http.patch<{ message: string; coupon: Coupon }>(
      `${this.apiUrl}/coupons/${id}/status`,
      { status }
    );
  }

  // Scan operations
  verifyScan(couponCode: string, location?: { lat: number; lng: number }): Observable<any> {
    return this.http.post(`${this.apiUrl}/scans/verify`, {
      coupon_code: couponCode,
      location_lat: location?.lat,
      location_lng: location?.lng
    });
  }

  getScanHistory(params?: { page?: number; limit?: number; status?: string; coupon_id?: string }): Observable<{ scans: Scan[] }> {
    let httpParams = new HttpParams();
    if (params?.page) httpParams = httpParams.set('page', params.page.toString());
    if (params?.limit) httpParams = httpParams.set('limit', params.limit.toString());
    if (params?.status) httpParams = httpParams.set('status', params.status);
    if (params?.coupon_id) httpParams = httpParams.set('coupon_id', params.coupon_id);

    return this.http.get<{ scans: Scan[] }>(`${this.apiUrl}/scans/history`, { params: httpParams });
  }


  // Coupon lifecycle operations
  activateCouponRange(data: { from_reference: string; to_reference: string; status_filter?: string; activation_note?: string }): Observable<{ success: boolean; activated_count: number; skipped_count: number; message: string; activated_codes: string[]; activated_references: string[] }> {
    return this.http.post<{ success: boolean; activated_count: number; skipped_count: number; message: string; activated_codes: string[]; activated_references: string[] }>(
      `${this.apiUrl}/coupons/activate-range`,
      data
    );
  }

  activateCouponBatch(batchId: string, activationNote?: string): Observable<{ success: boolean; batch_id: string; activated_count: number; message: string; activated_codes: string[] }> {
    return this.http.post<{ success: boolean; batch_id: string; activated_count: number; message: string; activated_codes: string[] }>(
      `${this.apiUrl}/coupons/activate-batch`,
      { batch_id: batchId, activation_note: activationNote }
    );
  }

  markCouponAsPrinted(couponId: string): Observable<{ success: boolean; coupon: any; message: string }> {
    return this.http.patch<{ success: boolean; coupon: any; message: string }>(
      `${this.apiUrl}/coupons/${couponId}/print`,
      {}
    );
  }

  bulkMarkAsPrinted(couponIds: string[]): Observable<{ success: boolean; printed_count: number; message: string; coupons: any[] }> {
    return this.http.post<{ success: boolean; printed_count: number; message: string; coupons: any[] }>(
      `${this.apiUrl}/coupons/bulk-print`,
      { coupon_ids: couponIds }
    );
  }

  bulkActivateCoupons(couponIds: string[], activationNote?: string): Observable<{ success: boolean; activated_count: number; skipped_count: number; message: string; activated_coupons: any[] }> {
    return this.http.post<{ success: boolean; activated_count: number; skipped_count: number; message: string; activated_coupons: any[] }>(
      `${this.apiUrl}/coupons/bulk-activate`,
      { coupon_ids: couponIds, activation_note: activationNote }
    );
  }

  deactivateCouponRange(data: { from_reference: string; to_reference: string; deactivation_reason: string }): Observable<{ success: boolean; deactivated_count: number; message: string; deactivated_codes: string[]; deactivated_references: string[] }> {
    return this.http.post<{ success: boolean; deactivated_count: number; message: string; deactivated_codes: string[]; deactivated_references: string[] }>(
      `${this.apiUrl}/coupons/deactivate-range`,
      data
    );
  }
}
