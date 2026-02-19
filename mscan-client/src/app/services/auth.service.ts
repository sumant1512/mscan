/**
 * Authentication Service
 */
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';
import { LoginResponse, UserContext, User, ApiResponse } from '../models';
import { SubdomainService } from './subdomain.service';
import { AuthContextFacade } from '../store/auth-context';
import { InactivityService } from './inactivity.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private authContextFacade = inject(AuthContextFacade);

  private get apiUrl(): string {
    return this.subdomainService.getApiBaseUrl();
  }

  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  // Permissions observable - derived from current user
  public permissions$ = this.currentUser$.pipe(
    tap(user => user ? user.permissions : [])
  );

  private accessTokenKey = 'tms_access_token';
  private refreshTokenKey = 'tms_refresh_token';
  private userTypeKey = 'tms_user_type';
  private subdomainKey = 'tms_tenant_subdomain';

  private tokenRefreshTimer: any = null;
  private readonly TOKEN_REFRESH_INTERVAL = 25 * 60 * 1000; // 25 minutes in milliseconds

  constructor(
    private http: HttpClient,
    private router: Router,
    private subdomainService: SubdomainService,
    private inactivityService: InactivityService
  ) {
    // Sync NgRx store user to currentUserSubject for backward compatibility
    this.authContextFacade.currentUser$.subscribe(user => {
      this.currentUserSubject.next(user);

      // Handle subdomain redirect when user context is loaded
      if (user) {
        const userType = user.role;
        const subdomain = this.getTenantSubdomain();

        if (userType !== 'SUPER_ADMIN' && subdomain) {
          const currentSubdomain = this.subdomainService.getCurrentSubdomain();

          // Only redirect if not already on the correct subdomain
          if (currentSubdomain !== subdomain) {
            this.subdomainService.redirectToSubdomain(subdomain, '/tenant/dashboard');
          }
        }
      }
    });

    // Subscribe to inactivity events to auto-logout
    this.inactivityService.inactive$.subscribe(() => {
      console.log('User inactive for 30 minutes - auto logout');
      this.logout();
    });

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
      this.inactivityService.startMonitoring();
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
          if (response.status && response.data) {
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
            this.inactivityService.startMonitoring();

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
   * Load user context using NgRx facade
   */
  loadUserContext(): void {
    // Dispatch action to load user context via NgRx
    // Error handling is now done by the userContextGuard
    this.authContextFacade.loadUserContext();
  }

  /**
   * Get user context (returns Observable for NgRx)
   */
  getUserContext(): Observable<UserContext> {
    return this.http.get<UserContext>(`${this.apiUrl}/auth/context`);
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
        if (response.status && response.data) {
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
    this.inactivityService.stopMonitoring();
    this.clearTokens();
    this.currentUserSubject.next(null);

    // Clear user context from NgRx store
    this.authContextFacade.clearUserContext();

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
   * ONLY if user is active - prevents refresh for inactive users
   */
  private startTokenRefreshTimer(): void {
    // Clear any existing timer
    this.stopTokenRefreshTimer();

    // Set up new timer
    this.tokenRefreshTimer = setInterval(() => {
      if (this.getRefreshToken()) {
        // Check if user is active before refreshing token
        if (this.inactivityService.isUserActive()) {
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
          console.log('User is inactive - skipping token refresh (will auto-logout soon)');
          // Don't refresh token for inactive users
          // The inactivity service will trigger logout when timeout is reached
        }
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

  /**
   * Permission checking methods
   */

  /**
   * Check if current user has a specific permission
   * @param permission Permission code to check (e.g., 'create_coupon')
   * @returns true if user has permission, false otherwise
   */
  hasPermission(permission: string): boolean {
    const currentUser = this.currentUserSubject.value;

    // Super Admin has all permissions
    if (currentUser?.role === 'SUPER_ADMIN') {
      return true;
    }

    // Check if user has the permission
    return currentUser?.permissions?.includes(permission) ?? false;
  }

  /**
   * Check if current user has ANY of the specified permissions (OR logic)
   * @param permissions Array of permission codes
   * @returns true if user has at least one permission, false otherwise
   */
  hasAnyPermission(permissions: string[]): boolean {
    const currentUser = this.currentUserSubject.value;

    // Super Admin has all permissions
    if (currentUser?.role === 'SUPER_ADMIN') {
      return true;
    }

    // Check if user has any of the permissions
    return permissions.some(permission =>
      currentUser?.permissions?.includes(permission) ?? false
    );
  }

  /**
   * Check if current user has ALL of the specified permissions (AND logic)
   * @param permissions Array of permission codes
   * @returns true if user has all permissions, false otherwise
   */
  hasAllPermissions(permissions: string[]): boolean {
    const currentUser = this.currentUserSubject.value;

    // Super Admin has all permissions
    if (currentUser?.role === 'SUPER_ADMIN') {
      return true;
    }

    // Check if user has all of the permissions
    return permissions.every(permission =>
      currentUser?.permissions?.includes(permission) ?? false
    );
  }

  /**
   * Get all permissions for current user
   * @returns Array of permission codes
   */
  getPermissions(): string[] {
    const currentUser = this.currentUserSubject.value;
    return currentUser?.permissions ?? [];
  }
}
