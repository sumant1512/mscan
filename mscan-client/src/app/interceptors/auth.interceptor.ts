/**
 * HTTP Interceptor for JWT Token
 */
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);

  // Skip interceptor for auth endpoints
  if (req.url.includes('/auth/request-otp') || 
      req.url.includes('/auth/verify-otp') ||
      req.url.includes('/auth/refresh')) {
    return next(req);
  }

  // Add access token to request from localStorage directly
  const accessToken = localStorage.getItem('tms_access_token');
  if (accessToken) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${accessToken}`
      }
    });
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Handle 401 - Token expired
      if (error.status === 401) {
        const refreshToken = localStorage.getItem('tms_refresh_token');
        
        if (refreshToken) {
          // Try to refresh token without using AuthService
          const http = inject(HttpClient);
          
          return http.post<any>(`${environment.apiUrl}/auth/refresh`, { refreshToken }).pipe(
            switchMap((response) => {
              if (response.success && response.data) {
                // Store new tokens
                localStorage.setItem('tms_access_token', response.data.accessToken);
                localStorage.setItem('tms_refresh_token', response.data.refreshToken);
                
                // Retry original request with new token
                const retryReq = req.clone({
                  setHeaders: {
                    Authorization: `Bearer ${response.data.accessToken}`
                  }
                });
                return next(retryReq);
              }
              
              // Refresh failed - clear tokens and redirect
              localStorage.removeItem('tms_access_token');
              localStorage.removeItem('tms_refresh_token');
              localStorage.removeItem('tms_user_type');
              router.navigate(['/login']);
              return throwError(() => error);
            }),
            catchError((refreshError) => {
              // Refresh failed - clear tokens and redirect
              localStorage.removeItem('tms_access_token');
              localStorage.removeItem('tms_refresh_token');
              localStorage.removeItem('tms_user_type');
              router.navigate(['/login']);
              return throwError(() => refreshError);
            })
          );
        } else {
          // No refresh token - redirect to login
          router.navigate(['/login']);
        }
      }

      return throwError(() => error);
    })
  );
};
