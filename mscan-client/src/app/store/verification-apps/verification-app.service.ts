import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SubdomainService } from '../../services/subdomain.service';
import { VerificationApp } from './verification-apps.models';

@Injectable({
    providedIn: 'root'
})
export class VerificationAppService {
    private http = inject(HttpClient);
    private get apiUrl(): string {
        return `${this.subdomainService.getApiBaseUrl()}/rewards`;
    }

    constructor(
        private subdomainService: SubdomainService) { }

    getVerificationApps(): Observable<{ apps: VerificationApp[] }> {
        return this.http.get<{ apps: VerificationApp[] }>(`${this.apiUrl}/verification-apps`);
    }

    getVerificationApp(id: string): Observable<{ app: VerificationApp }> {
        return this.http.get<{ app: VerificationApp }>(`${this.apiUrl}/verification-apps/${id}`);
    }

    createVerificationApp(app: Partial<VerificationApp>): Observable<{ app: VerificationApp; message: string }> {
        return this.http.post<{ app: VerificationApp; message: string }>(
            `${this.apiUrl}/verification-apps`,
            app
        );
    }

    updateVerificationApp(id: string, changes: Partial<VerificationApp>): Observable<{ app: VerificationApp; message: string }> {
        return this.http.put<{ app: VerificationApp; message: string }>(
            `${this.apiUrl}/verification-apps/${id}`,
            changes
        );
    }

    deleteVerificationApp(id: string): Observable<{ message: string }> {
        return this.http.delete<{ message: string }>(`${this.apiUrl}/verification-apps/${id}`);
    }
}
