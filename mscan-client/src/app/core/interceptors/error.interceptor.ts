/**
 * HTTP Error Interceptor
 * Handles ALL HTTP errors globally - components don't need error handling!
 */

import { Injectable, inject } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { parseError, AuthenticationError, ValidationError, AppError } from '../errors/app-error';
import { NotificationService } from '../services/notification.service';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  private router = inject(Router);
  private notification = inject(NotificationService);

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        const appError = parseError(error);

        // Log error in development
        if (!this.isProduction()) {
          console.error('HTTP Error:', {
            url: request.url,
            method: request.method,
            status: error.status,
            error: appError
          });
        }

        // Handle different error types
        this.handleError(appError, request);

        // Re-throw error for components that want to handle it specifically
        return throwError(() => appError);
      })
    );
  }

  private handleError(error: AppError, request: HttpRequest<any>): void {
    // Skip error display for silent requests
    if (request.headers.has('X-Silent-Error')) {
      return;
    }

    // Handle authentication errors
    if (error instanceof AuthenticationError) {
      this.notification.error('Your session has expired. Please login again.');

      // Clear auth data
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      // Redirect to login
      setTimeout(() => {
        this.router.navigate(['/login']);
      }, 1500);
      return;
    }

    // Handle validation errors
    if (error instanceof ValidationError) {
      if (error.details && Array.isArray(error.details)) {
        // Show first validation error
        const firstError = error.details[0];
        this.notification.error(firstError.message || error.message);
      } else {
        this.notification.error(error.message);
      }
      return;
    }

    // Handle all other errors
    this.notification.error(error.message || 'An unexpected error occurred');
  }

  private isProduction(): boolean {
    return false; // Set based on environment
  }
}
