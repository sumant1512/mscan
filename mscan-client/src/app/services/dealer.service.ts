/**
 * Dealer Service
 * Handles dealer management API calls for tenant admin
 */
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SubdomainService } from './subdomain.service';
import {
  Dealer,
  DealerDetail,
  CreateDealerRequest,
  UpdateDealerRequest,
  DealerPoints,
  ListDealersFilters,
  DealersListResponse,
  DealerTransactionsListResponse,
  ApiResponse
} from '../models';

@Injectable({
  providedIn: 'root'
})
export class DealerService {
  private get apiUrl(): string {
    return `${this.subdomainService.getApiBaseUrl()}/v1/tenants`;
  }

  constructor(
    private http: HttpClient,
    private subdomainService: SubdomainService
  ) {}

  /**
   * Create a new dealer
   */
  createDealer(
    tenantId: string,
    data: CreateDealerRequest
  ): Observable<ApiResponse<Dealer>> {
    return this.http.post<ApiResponse<Dealer>>(
      `${this.apiUrl}/${tenantId}/dealers`,
      data
    );
  }

  /**
   * List dealers with search and pagination
   */
  listDealers(
    tenantId: string,
    filters?: ListDealersFilters
  ): Observable<DealersListResponse> {
    let params = new HttpParams();

    if (filters?.search) {
      params = params.set('search', filters.search);
    }
    if (filters?.page) {
      params = params.set('page', filters.page.toString());
    }
    if (filters?.limit) {
      params = params.set('limit', filters.limit.toString());
    }

    return this.http.get<DealersListResponse>(
      `${this.apiUrl}/${tenantId}/dealers`,
      { params }
    );
  }

  /**
   * Get single dealer details
   */
  getDealer(tenantId: string, dealerId: string): Observable<ApiResponse<DealerDetail>> {
    return this.http.get<ApiResponse<DealerDetail>>(
      `${this.apiUrl}/${tenantId}/dealers/${dealerId}`
    );
  }

  /**
   * Update dealer
   */
  updateDealer(
    tenantId: string,
    dealerId: string,
    data: UpdateDealerRequest
  ): Observable<ApiResponse<DealerDetail>> {
    return this.http.put<ApiResponse<DealerDetail>>(
      `${this.apiUrl}/${tenantId}/dealers/${dealerId}`,
      data
    );
  }

  /**
   * Toggle dealer active status
   */
  toggleDealerStatus(
    tenantId: string,
    dealerId: string,
    isActive: boolean
  ): Observable<ApiResponse<Dealer>> {
    return this.http.patch<ApiResponse<Dealer>>(
      `${this.apiUrl}/${tenantId}/dealers/${dealerId}/status`,
      { is_active: isActive }
    );
  }

  /**
   * Get dealer points balance
   */
  getDealerPoints(
    tenantId: string,
    dealerId: string
  ): Observable<ApiResponse<DealerPoints>> {
    return this.http.get<ApiResponse<DealerPoints>>(
      `${this.apiUrl}/${tenantId}/dealers/${dealerId}/points`
    );
  }

  /**
   * Get dealer point transactions
   */
  getDealerTransactions(
    tenantId: string,
    dealerId: string,
    page: number = 1,
    limit: number = 10
  ): Observable<DealerTransactionsListResponse> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    return this.http.get<DealerTransactionsListResponse>(
      `${this.apiUrl}/${tenantId}/dealers/${dealerId}/transactions`,
      { params }
    );
  }
}
