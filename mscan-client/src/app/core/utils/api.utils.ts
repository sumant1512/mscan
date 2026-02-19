/**
 * API Utilities
 * Common utilities for API calls and response handling
 */

import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { HttpErrorResponse } from '@angular/common/http';
import { parseError } from '../errors/app-error';

/**
 * Standard API response interface
 */
export interface ApiResponse<T = any> {
  status: boolean;
  data?: T;
  message?: string;
  error?: {
    message: string;
    code?: string;
    details?: any;
  };
}

/**
 * Paginated response interface
 */
export interface PaginatedResponse<T = any> {
  status: boolean;
  items?: T[];
  pagination?: {
    currentPage: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

/**
 * Extract data from API response
 */
export function extractData<T>(response: ApiResponse<T>): T {
  if (!response.status) {
    throw new Error(response.error?.message || 'Request failed');
  }
  return response.data as T;
}

/**
 * Extract items from paginated response
 */
export function extractPaginatedData<T>(response: PaginatedResponse<T>): {
  items: T[];
  pagination: PaginatedResponse<T>['pagination'];
} {
  return {
    items: response.items || [],
    pagination: response.pagination
  };
}

/**
 * Handle API errors in RxJS pipe
 * NOTE: This is now handled by ErrorInterceptor globally.
 * Only use this if you need custom error handling in a specific service.
 */
export function handleApiError<T>() {
  return (source: Observable<T>): Observable<T> => {
    return source.pipe(
      catchError((error: HttpErrorResponse) => {
        const appError = parseError(error);
        return throwError(() => appError);
      })
    );
  };
}

/**
 * Extract data from API response (simplified - no error handling needed)
 */
export function extractResponseData<T>(key?: string) {
  return (source: Observable<any>): Observable<T> => {
    return source.pipe(
      map((response: any) => {
        // Handle standard API response format
        if (response.status !== undefined) {
          return key ? response[key] : response.data;
        }
        // Handle direct data responses
        return response;
      })
    );
  };
}

/**
 * Build query string from object
 */
export function buildQueryString(params: { [key: string]: any }): string {
  const queryParams = Object.entries(params)
    .filter(([_, value]) => value !== null && value !== undefined && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');

  return queryParams ? `?${queryParams}` : '';
}

/**
 * Format date for API
 */
export function formatDateForApi(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString();
}

/**
 * Parse date from API
 */
export function parseDateFromApi(dateString: string): Date {
  return new Date(dateString);
}

/**
 * Deep clone object
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Check if object is empty
 */
export function isEmpty(obj: any): boolean {
  return !obj || Object.keys(obj).length === 0;
}

/**
 * Remove null/undefined values from object
 */
export function removeEmpty(obj: { [key: string]: any }): { [key: string]: any } {
  const cleaned: { [key: string]: any } = {};

  Object.entries(obj).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      cleaned[key] = value;
    }
  });

  return cleaned;
}
