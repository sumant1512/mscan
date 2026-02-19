import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SubdomainService } from '../../services/subdomain.service';
import { VerificationApp, VerificationAppResponse } from './verification-apps.models';
import { ApiResponse } from '../../models';

@Injectable({
  providedIn: 'root',
})
export class VerificationAppService {
  private http = inject(HttpClient);
  private get apiUrl(): string {
    return `${this.subdomainService.getApiBaseUrl()}/rewards`;
  }

  constructor(private subdomainService: SubdomainService) {}

  getVerificationApps(): Observable<ApiResponse<VerificationAppResponse>> {
    return this.http.get<ApiResponse<VerificationAppResponse>>(`${this.apiUrl}/verification-apps`);
  }

  getVerificationApp(id: string): Observable<ApiResponse<{ app: VerificationApp }>> {
    return this.http.get<ApiResponse<{ app: VerificationApp }>>(`${this.apiUrl}/verification-apps/${id}`);
  }

  createVerificationApp(
    app: Partial<VerificationApp>,
  ): Observable<ApiResponse<{ app: VerificationApp }>> {
    return this.http.post<ApiResponse<{ app: VerificationApp }>>(
      `${this.apiUrl}/verification-apps`,
      app,
    );
  }

  updateVerificationApp(
    id: string,
    changes: Partial<VerificationApp>,
  ): Observable<ApiResponse<{ app: VerificationApp }>> {
    return this.http.put<ApiResponse<{ app: VerificationApp }>>(
      `${this.apiUrl}/verification-apps/${id}`,
      changes,
    );
  }

  deleteVerificationApp(id: string): Observable<ApiResponse<{ message: string }>> {
    return this.http.delete<ApiResponse<{ message: string }>>(`${this.apiUrl}/verification-apps/${id}`);
  }
}
