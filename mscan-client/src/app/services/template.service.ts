import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SubdomainService } from './subdomain.service';
import {
  ProductTemplate,
  CreateTemplateRequest,
  TemplateListResponse,
  TemplateResponse
} from '../models/templates.model';
import { ApiResponse } from '../models';

@Injectable({
  providedIn: 'root'
})
export class TemplateService {
  private get apiUrl(): string {
    return `${this.subdomainService.getApiBaseUrl()}/templates`;
  }

  constructor(
    private http: HttpClient,
    private subdomainService: SubdomainService
  ) {}

  /**
   * Get all templates with pagination and filtering
   */
  getAllTemplates(filters?: {
    page?: number;
    limit?: number;
    is_active?: boolean;
    search?: string;
    include_system?: boolean;
  }): Observable<ApiResponse<TemplateListResponse>> {
    let params = new HttpParams();

    if (filters) {
      if (filters.page !== undefined) {
        params = params.set('page', filters.page.toString());
      }
      if (filters.limit !== undefined) {
        params = params.set('limit', filters.limit.toString());
      }
      if (filters.is_active !== undefined) {
        params = params.set('is_active', filters.is_active.toString());
      }
      if (filters.search) {
        params = params.set('search', filters.search);
      }
      if (filters.include_system !== undefined) {
        params = params.set('include_system', filters.include_system.toString());
      }
    }

    return this.http.get<ApiResponse<TemplateListResponse>>(this.apiUrl, { params });
  }

  /**
   * Get all templates (legacy method for backward compatibility)
   * Maps to getAllTemplates with default pagination
   */
  getTemplates(params?: {
    page?: number;
    limit?: number;
    include_system?: boolean;
    search?: string;
  }): Observable<ApiResponse<TemplateListResponse>> {
    return this.getAllTemplates(params);
  }

  /**
   * Get template by ID
   */
  getTemplateById(id: string): Observable<ApiResponse<ProductTemplate>> {
    return this.http.get<ApiResponse<ProductTemplate>>(`${this.apiUrl}/${id}`);
  }

  /**
   * Get template (legacy method for backward compatibility)
   */
  getTemplate(id: string): Observable<ApiResponse<ProductTemplate>> {
    return this.getTemplateById(id);
  }

  /**
   * Create new template
   */
  createTemplate(template: CreateTemplateRequest): Observable<TemplateResponse> {
    return this.http.post<TemplateResponse>(this.apiUrl, template);
  }

  /**
   * Update template
   */
  updateTemplate(id: string, updates: Partial<CreateTemplateRequest>): Observable<TemplateResponse> {
    return this.http.put<TemplateResponse>(`${this.apiUrl}/${id}`, updates);
  }

  /**
   * Delete template
   */
  deleteTemplate(id: string): Observable<{ status: boolean; message: string }> {
    return this.http.delete<{ status: boolean; message: string }>(`${this.apiUrl}/${id}`);
  }

  /**
   * Get templates for a verification app
   */
  getTemplatesForApp(appId: string): Observable<TemplateListResponse> {
    return this.http.get<TemplateListResponse>(`${this.apiUrl}/app/${appId}`);
  }

  /**
   * Search templates by name
   */
  searchTemplates(searchTerm: string): Observable<ApiResponse<TemplateListResponse>> {
    return this.getAllTemplates({ search: searchTerm });
  }

  /**
   * Duplicate template
   */
  duplicateTemplate(id: string, newName: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/duplicate`, { name: newName });
  }

  /**
   * Toggle template status (activate/deactivate)
   */
  toggleTemplateStatus(id: string): Observable<TemplateResponse> {
    return this.http.patch<TemplateResponse>(`${this.apiUrl}/${id}/toggle-status`, {});
  }
}
