/**
 * Authentication Service
 */
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';
import { LoginResponse, UserContext, User, ApiResponse } from '../models';
import { SubdomainService } from './subdomain.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private get apiUrl(): string {
    return this.subdomainService.getApiBaseUrl();
  }
  
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  private accessTokenKey = 'tms_access_token';
  private refreshTokenKey = 'tms_refresh_token';
  private userTypeKey = 'tms_user_type';
  private subdomainKey = 'tms_tenant_subdomain';
  
  private tokenRefreshTimer: any = null;
  private readonly TOKEN_REFRESH_INTERVAL = 25 * 60 * 1000; // 25 minutes in milliseconds

  constructor(
    private http: HttpClient,
    private router: Router,
    private subdomainService: SubdomainService
  ) {
    // Check if user is already logged in
    if (this.getAccessToken()) {
      // Validate subdomain matches stored value
      const storedSubdomain = this.getTenantSubdomain();
      const currentSubdomain = this.subdomainService.getCurrentSubdomain();
      
      if (storedSubdomain && currentSubdomain !== storedSubdomain) {
        console.warn('Subdomain mismatch detected - clearing tokens');
        // Clear tokens on subdomain mismatch to allow login on different tenant
        this.clearTokens();
        this.currentUserSubject.next(null);
        return;
      }
      
      this.loadUserContext();
      this.startTokenRefreshTimer();
    }
  }

  /**
   * Request OTP
   */
  requestOTP(email: string): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/auth/request-otp`, { email });
  }

  /**
   * Verify OTP and Login
   */
  verifyOTP(email: string, otp: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/verify-otp`, { email, otp })
      .pipe(
        tap(response => {
          if (response.success && response.data) {
            // Issue 2: Clear old tokens first to prevent subdomain persistence
            this.clearTokens();
            this.stopTokenRefreshTimer();
            
            // Store new tokens
            this.storeTokens(
              response.data.accessToken,
              response.data.refreshToken,
              response.data.userType,
              response.data.subdomain
            );
            this.loadUserContext();
            this.startTokenRefreshTimer();

            // Redirect tenant users to their subdomain
            const userType = response.data.userType;
            const subdomain = response.data.subdomain;
            
            if (userType !== 'SUPER_ADMIN' && subdomain) {
              const currentSubdomain = this.subdomainService.getCurrentSubdomain();
              
              // Only redirect if not already on the correct subdomain
              if (currentSubdomain !== subdomain) {
                this.subdomainService.redirectToSubdomain(subdomain, '/tenant/dashboard');
              }
            }
          }
        })
      );
  }

  /**
   * Load user context
   */
  loadUserContext(): void {
    this.http.get<UserContext>(`${this.apiUrl}/auth/context`)
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.currentUserSubject.next(response.data);
          }
        },
        error: (error) => {
          if (error.status !== 401) {
            this.clearTokens();
            this.currentUserSubject.next(null);
            this.router.navigate(['/login']);
          }
        }
      });
  }

  /**
   * Refresh access token
   */
  refreshToken(): Observable<ApiResponse<{ accessToken: string; refreshToken: string }>> {
    const refreshToken = this.getRefreshToken();
    return this.http.post<ApiResponse<{ accessToken: string; refreshToken: string }>>(
      `${this.apiUrl}/auth/refresh`,
      { refreshToken }
    ).pipe(
      tap(response => {
        if (response.success && response.data) {
          this.storeTokens(
            response.data.accessToken,
            response.data.refreshToken,
            this.getUserType() || ''
          );
        }
      })
    );
  }

  /**
   * Logout
   */
  logout(): void {
    const refreshToken = this.getRefreshToken();
    if (refreshToken) {
      this.http.post(`${this.apiUrl}/auth/logout`, { refreshToken }).subscribe();
    }
    
    this.stopTokenRefreshTimer();
    this.clearTokens();
    this.currentUserSubject.next(null);
    
    // Stay on the same domain (tenant subdomain or root) and navigate to login
    this.router.navigate(['/login']);
  }

  /**
   * Token management
   */
  private storeTokens(accessToken: string, refreshToken: string, userType: string, subdomain?: string | null): void {
    localStorage.setItem(this.accessTokenKey, accessToken);
    localStorage.setItem(this.refreshTokenKey, refreshToken);
    localStorage.setItem(this.userTypeKey, userType);
    if (subdomain) {
      localStorage.setItem(this.subdomainKey, subdomain);
    }
  }

  private clearTokens(): void {
    localStorage.removeItem(this.accessTokenKey);
    localStorage.removeItem(this.refreshTokenKey);
    localStorage.removeItem(this.userTypeKey);
    localStorage.removeItem(this.subdomainKey);
  }

  getAccessToken(): string | null {
    return localStorage.getItem(this.accessTokenKey);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.refreshTokenKey);
  }

  getUserType(): string | null {
    return localStorage.getItem(this.userTypeKey);
  }

  isLoggedIn(): boolean {
    return !!this.getAccessToken();
  }

  isSuperAdmin(): boolean {
    // Check current user if available, otherwise fallback to localStorage
    const currentUser = this.currentUserSubject.value;
    if (currentUser) {
      return currentUser.role === 'SUPER_ADMIN';
    }
    return this.getUserType() === 'SUPER_ADMIN';
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  /**
   * Get tenant subdomain from localStorage
   */
  getTenantSubdomain(): string | null {
    return localStorage.getItem(this.subdomainKey);
  }

  /**
   * Start automatic token refresh timer
   * Refreshes token every 25 minutes (before 30-minute expiration)
   */
  private startTokenRefreshTimer(): void {
    // Clear any existing timer
    this.stopTokenRefreshTimer();
    
    // Set up new timer
    this.tokenRefreshTimer = setInterval(() => {
      if (this.getRefreshToken()) {
        this.refreshToken().subscribe({
          next: () => {
            console.log('Token refreshed automatically');
          },
          error: (err) => {
            console.error('Auto token refresh failed:', err);
            // If refresh fails, stop timer and logout
            this.stopTokenRefreshTimer();
            this.logout();
          }
        });
      } else {
        // No refresh token available, stop timer
        this.stopTokenRefreshTimer();
      }
    }, this.TOKEN_REFRESH_INTERVAL);
  }

  /**
   * Stop automatic token refresh timer
   */
  private stopTokenRefreshTimer(): void {
    if (this.tokenRefreshTimer) {
      clearInterval(this.tokenRefreshTimer);
      this.tokenRefreshTimer = null;
    }
  }
}
