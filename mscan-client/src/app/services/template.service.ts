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
  }): Observable<TemplateListResponse> {
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

    return this.http.get<TemplateListResponse>(this.apiUrl, { params });
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
  }): Observable<TemplateListResponse> {
    return this.getAllTemplates(params);
  }

  /**
   * Get template by ID
   */
  getTemplateById(id: string): Observable<TemplateResponse> {
    return this.http.get<TemplateResponse>(`${this.apiUrl}/${id}`);
  }

  /**
   * Get template (legacy method for backward compatibility)
   */
  getTemplate(id: string): Observable<TemplateResponse> {
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
  deleteTemplate(id: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.apiUrl}/${id}`);
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
  searchTemplates(searchTerm: string): Observable<TemplateListResponse> {
    return this.getAllTemplates({ search: searchTerm });
  }

  /**
   * Duplicate template
   */
  duplicateTemplate(id: string, newName: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/duplicate`, { name: newName });
  }

  /**
   * Attribute management methods (No-op in JSONB system)
   * In JSONB system, attributes are managed as part of the template's custom_fields JSONB column
   * Components should directly update the template with modified custom_fields array
   */

  /**
   * @deprecated Attributes are now part of template's custom_fields JSONB column. Update template instead.
   */
  addAttribute(templateId: string, attribute: any): Observable<any> {
    console.warn('addAttribute is deprecated. Attributes are managed via template update with custom_fields');
    throw new Error('Use updateTemplate() to modify custom_fields array instead');
  }

  /**
   * @deprecated Attributes are now part of template's custom_fields JSONB column. Update template instead.
   */
  updateAttribute(templateId: string, attributeId: string, data: any): Observable<any> {
    console.warn('updateAttribute is deprecated. Attributes are managed via template update with custom_fields');
    throw new Error('Use updateTemplate() to modify custom_fields array instead');
  }

  /**
   * @deprecated Attributes are now part of template's custom_fields JSONB column. Update template instead.
   */
  deleteAttribute(templateId: string, attributeId: string): Observable<any> {
    console.warn('deleteAttribute is deprecated. Attributes are managed via template update with custom_fields');
    throw new Error('Use updateTemplate() to modify custom_fields array instead');
  }
}
