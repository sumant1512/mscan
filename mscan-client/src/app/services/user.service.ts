/**
 * User Service
 */
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse, Customer, CreateCustomerRequest, User } from '../models';
import { SubdomainService } from './subdomain.service';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private get apiUrl(): string {
    return this.subdomainService.getApiBaseUrl();
  }

  constructor(
    private http: HttpClient,
    private subdomainService: SubdomainService
  ) { }

  /**
   * Create customer (Super Admin only)
   */
  createCustomer(data: CreateCustomerRequest): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/users/customers`, data);
  }

  /**
   * Get all customers (Super Admin only)
   */
  getAllCustomers(): Observable<ApiResponse<Customer[]>> {
    return this.http.get<ApiResponse<Customer[]>>(`${this.apiUrl}/users/customers`);
  }

  /**
   * Get user profile
   */
  getUserProfile(): Observable<ApiResponse<User>> {
    return this.http.get<ApiResponse<User>>(`${this.apiUrl}/users/profile`);
  }

  /**
   * Update user profile
   */
  updateUserProfile(data: { full_name: string; phone?: string }): Observable<ApiResponse<User>> {
    return this.http.put<ApiResponse<User>>(`${this.apiUrl}/users/profile`, data);
  }
}
