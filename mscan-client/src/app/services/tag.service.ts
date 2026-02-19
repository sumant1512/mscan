import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SubdomainService } from './subdomain.service';
import { Tag, CreateTagRequest } from '../models/templates.model';

interface TagListResponse {
  success: boolean;
  data: Tag[];
  count: number;
}

interface TagResponse {
  success: boolean;
  data: Tag;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class TagService {
  private get apiUrl(): string {
    return `${this.subdomainService.getApiBaseUrl()}/tags`;
  }

  constructor(
    private http: HttpClient,
    private subdomainService: SubdomainService
  ) {}

  /**
   * Get all tags
   */
  getAllTags(filters?: {
    app_id?: string;
    is_active?: boolean;
  }): Observable<TagListResponse> {
    let params = new HttpParams();

    if (filters?.app_id) {
      params = params.set('app_id', filters.app_id); // Fixed: use 'app_id' to match backend
    }

    if (filters?.is_active !== undefined) {
      params = params.set('is_active', filters.is_active.toString());
    }

    return this.http.get<TagListResponse>(this.apiUrl, { params });
  }

  /**
   * Get tag by ID
   */
  getTagById(id: string): Observable<TagResponse> {
    return this.http.get<TagResponse>(`${this.apiUrl}/${id}`);
  }

  /**
   * Create new tag
   */
  createTag(tag: CreateTagRequest): Observable<TagResponse> {
    return this.http.post<TagResponse>(this.apiUrl, tag);
  }

  /**
   * Update tag
   */
  updateTag(id: string, updates: Partial<CreateTagRequest>): Observable<TagResponse> {
    return this.http.put<TagResponse>(`${this.apiUrl}/${id}`, updates);
  }

  /**
   * Delete tag
   */
  deleteTag(id: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.apiUrl}/${id}`);
  }

  /**
   * Get tags for a verification app
   */
  getTagsForApp(appId: string): Observable<TagListResponse> {
    return this.http.get<TagListResponse>(`${this.apiUrl}/app/${appId}`);
  }

  /**
   * Get product tags
   */
  getProductTags(productId: number): Observable<TagListResponse> {
    return this.http.get<TagListResponse>(`${this.subdomainService.getApiBaseUrl()}/products/${productId}/tags`);
  }
}
