import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Product } from '../models/rewards.model';
import { SubdomainService } from './subdomain.service';

@Injectable({
  providedIn: 'root'
})
export class ProductsService {
  private get apiUrl(): string {
    return `${this.subdomainService.getApiBaseUrl()}/products`;
  }

  constructor(
    private http: HttpClient,
    private subdomainService: SubdomainService
  ) {}

  getProducts(params?: { page?: number; limit?: number; search?: string; app_id?: string }): Observable<any> {
    return this.http.get(this.apiUrl, { params: params as any });
  }

  getProduct(id: number): Observable<{ product: Product }> {
    return this.http.get<{ product: Product }>(`${this.apiUrl}/${id}`);
  }

  createProduct(data: Partial<Product>): Observable<{ message: string; product: Product }> {
    return this.http.post<{ message: string; product: Product }>(this.apiUrl, data);
  }

  updateProduct(id: number, data: Partial<Product>): Observable<{ message: string; product: Product }> {
    return this.http.put<{ message: string; product: Product }>(`${this.apiUrl}/${id}`, data);
  }

  deleteProduct(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }
}
